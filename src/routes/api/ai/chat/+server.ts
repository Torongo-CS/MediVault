import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const SYSTEM_PROMPT = `You are MediVault AI, an expert clinical and pharmaceutical assistant.

MANDATORY RULES:
1. PHARMACEUTICAL ACCURACY: Always be 100% pharmaceutically accurate regarding drug interactions, contraindications, dosage recommendations, generic names, and Over-The-Counter (OTC) vs Prescription (Rx) classifications.
2. PRECISE & DIRECT: Keep your answers concise, direct, clear, and focused. Avoid unnecessary preamble, conversational filler, or verbose meta-explanations.
3. CONVERSATION CONTEXT: You will receive the recent conversation history (last 3 user questions and assistant answers). Maintain context seamlessly across turn pairs.
4. SUGGESTED MEDICINES FORMAT: If your answer references or recommends specific medicines, include a JSON array at the end of your response wrapped in a <suggested_medicines> tag. Example:

<suggested_medicines>
[
  {
    "name": "Paracetamol 500mg",
    "generic": "Paracetamol",
    "rx": false,
    "price": "$5.00"
  }
]
</suggested_medicines>

If no specific medicines are recommended, do not include the <suggested_medicines> tag.`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message, history } = (await request.json()) as {
      message: string;
      history?: ChatTurn[];
    };

    if (!message || typeof message !== "string") {
      return json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = (env.OPENROUTER_API_KEY || (globalThis as any).process?.env?.OPENROUTER_API_KEY || "").trim();
    const model = (env.OPENROUTER_MODEL || (globalThis as any).process?.env?.OPENROUTER_MODEL || DEFAULT_MODEL).trim();

    // Retrieve up to last 3 turn pairs (6 messages max: 3 user + 3 assistant)
    const recentHistory: ChatTurn[] = (history || [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6);

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    if (!apiKey) {
      // Fallback mode when OPENROUTER_API_KEY is missing in env
      const fallbackResponse = getFallbackPharmaceuticalResponse(message);
      return json({
        reply: fallbackResponse.reply,
        suggestedMeds: fallbackResponse.suggestedMeds,
        notice: "OPENROUTER_API_KEY environment variable is not set. Using offline pharmaceutical fallback mode.",
      });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medivault.com",
        "X-Title": "MediVault AI Health Assistant",
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);

      // Attempt fallback model if the primary free model failed
      const fallbackRes = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-lite-preview-02-05:free",
          messages: apiMessages,
          temperature: 0.2,
        }),
      });

      if (!fallbackRes.ok) {
        const localFallback = getFallbackPharmaceuticalResponse(message);
        return json({
          reply: localFallback.reply,
          suggestedMeds: localFallback.suggestedMeds,
          notice: `OpenRouter returned status ${response.status}. Displaying offline pharmaceutical advice.`,
        });
      }

      const fallbackData = await fallbackRes.json();
      const rawText = fallbackData.choices?.[0]?.message?.content || "";
      const { text, suggestedMeds } = parseSuggestedMedicines(rawText);
      return json({ reply: text, suggestedMeds });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "No response received from AI model.";
    const { text, suggestedMeds } = parseSuggestedMedicines(rawText);

    return json({ reply: text, suggestedMeds });
  } catch (error: any) {
    console.error("AI Chat handler error:", error);
    return json(
      { error: "Internal AI processing error", details: error?.message },
      { status: 500 }
    );
  }
};

/**
 * Extracts <suggested_medicines>[...]</suggested_medicines> block from model output
 */
function parseSuggestedMedicines(rawText: string): {
  text: string;
  suggestedMeds: Array<{ name: string; generic: string; rx: boolean; price: string }>;
} {
  const match = rawText.match(/<suggested_medicines>([\s\S]*?)<\/suggested_medicines>/i);
  let suggestedMeds: Array<{ name: string; generic: string; rx: boolean; price: string }> = [];

  let cleanText = rawText;
  if (match) {
    cleanText = rawText.replace(/<suggested_medicines>[\s\S]*?<\/suggested_medicines>/gi, "").trim();
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        suggestedMeds = parsed;
      }
    } catch (e) {
      console.warn("Failed to parse suggested medicines JSON:", e);
    }
  }

  return { text: cleanText, suggestedMeds };
}

/**
 * Offline pharmaceutical fallback response generator
 */
function getFallbackPharmaceuticalResponse(userQuery: string): {
  reply: string;
  suggestedMeds: Array<{ name: string; generic: string; rx: boolean; price: string }>;
} {
  const queryLower = userQuery.toLowerCase();

  if (queryLower.includes("fever") || queryLower.includes("ache") || queryLower.includes("pain")) {
    return {
      reply: "For acute fever and systemic pain, Paracetamol (500mg-1000mg every 4-6 hours, max 4000mg/day) or Ibuprofen (200mg-400mg every 6-8 hours with food) are first-line OTC analgesics. Ensure adequate hydration and monitor temperature.",
      suggestedMeds: [
        { name: "Paracetamol 500mg", generic: "Paracetamol", rx: false, price: "$5.00" },
        { name: "Ibuprofen 400mg", generic: "Ibuprofen", rx: false, price: "$6.50" },
      ],
    };
  }

  if (queryLower.includes("interact") || queryLower.includes("conflict") || queryLower.includes("warfarin")) {
    return {
      reply: "⚠️ High Risk Drug Interaction: Combining NSAIDs (e.g. Ibuprofen, Aspirin) or high-dose Paracetamol with Warfarin significantly increases bleeding risk by enhancing anticoagulant efficacy. Avoid concurrent use without clinical monitoring.",
      suggestedMeds: [
        { name: "Warfarin 5mg", generic: "Warfarin", rx: true, price: "$25.00" },
      ],
    };
  }

  if (queryLower.includes("infection") || queryLower.includes("amoxicillin") || queryLower.includes("antibiotic")) {
    return {
      reply: "Amoxicillin is a broad-spectrum beta-lactam antibiotic used for bacterial infections. Standard adult dosage is 250mg-500mg every 8 hours. Complete the full prescribed course to prevent bacterial resistance.",
      suggestedMeds: [
        { name: "Amoxicillin 250mg", generic: "Amoxicillin", rx: true, price: "$15.00" },
      ],
    };
  }

  return {
    reply: "MediVault AI Clinical System: Please state your symptoms or medication query. Always verify prescription medications with a registered pharmacist before administration.",
    suggestedMeds: [],
  };
}
