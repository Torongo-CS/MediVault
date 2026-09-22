import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";
import { convexServer } from "$lib/server/convex";
import { api } from "../../../../../convex/_generated/api";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const BASE_SYSTEM_PROMPT = `You are MediVault AI, an expert clinical and pharmaceutical RAG assistant.

MANDATORY RULES:
1. CLINICAL & RAG ACCURACY: Rely strictly on the RETRIEVED CLINICAL KNOWLEDGE BASE (RAG CONTEXT) provided in the prompt to suggest medicines, dosage guidelines, price tags, and Rx vs OTC classifications.
2. PRECISE & DIRECT: Provide concise, clear, and direct clinical recommendations. Avoid unnecessary meta-explanations.
3. DRUG CONFLICT WARNINGS: If any retrieved medicine has drug conflicts or contraindications, highlight them clearly with warning emoji (⚠️).
4. SUGGESTED MEDICINES FORMAT: Wrap recommended medicines in a JSON array inside a <suggested_medicines> tag at the end of your message. Example:

<suggested_medicines>
[
  {
    "name": "Paracetamol Extra 650mg",
    "generic": "Paracetamol",
    "rx": false,
    "price": "$5.50"
  }
]
</suggested_medicines>`;

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

    // Step 1: Execute RAG Knowledge Retriever query from Convex Medicines DB
    let ragResult = { medicines: [] as any[], conflictAlerts: [] as string[], ragContextText: "" };
    try {
      ragResult = await convexServer.query(api.rag.searchMedicineKnowledgeBase, { query: message });
    } catch (ragErr) {
      console.warn("RAG retriever warning:", ragErr);
    }

    const apiKey = (env.OPENROUTER_API_KEY || (globalThis as any).process?.env?.OPENROUTER_API_KEY || "").trim();
    const model = (env.OPENROUTER_MODEL || (globalThis as any).process?.env?.OPENROUTER_MODEL || DEFAULT_MODEL).trim();

    // Step 2: Build RAG-augmented system prompt
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (ragResult.ragContextText) {
      systemPrompt += `\n\n${ragResult.ragContextText}`;
    }

    if (ragResult.conflictAlerts && ragResult.conflictAlerts.length > 0) {
      systemPrompt += `\n\nACTIVE DRUG CONTRAINDICATION ALERTS:\n${ragResult.conflictAlerts.join("\n")}`;
    }

    const recentHistory: ChatTurn[] = (history || [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6);

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Step 3: Check API Key; use RAG Offline Engine if key is missing
    if (!apiKey) {
      const fallback = getRagFallbackResponse(message, ragResult);
      return json({
        reply: fallback.reply,
        suggestedMeds: fallback.suggestedMeds,
        retrievedCount: ragResult.medicines.length,
        notice: "OPENROUTER_API_KEY is not set. Operating in Offline Clinical RAG Mode powered by Convex DB.",
      });
    }

    // Step 4: Request OpenRouter LLM with RAG-Augmented Context & Model Fallback Chain
    const candidateModels = Array.from(
      new Set([
        model,
        "openrouter/auto",
        "google/gemini-2.0-flash-exp:free",
        "google/gemini-2.5-flash:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-chat",
        "mistralai/mistral-7b-instruct",
      ])
    );

    let rawText = "";
    let lastStatus = 200;

    for (const modelCandidate of candidateModels) {
      if (!modelCandidate) continue;
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://medivault.com",
            "X-Title": "MediVault AI Health Assistant",
          },
          body: JSON.stringify({
            model: modelCandidate,
            messages: apiMessages,
            temperature: 0.2,
            max_tokens: 1000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content || "";
          if (rawText.trim()) {
            console.log(`Successfully generated response using OpenRouter model '${modelCandidate}'`);
            break; // Success!
          }
        } else {
          lastStatus = response.status;
          const errBody = await response.text();
          console.warn(`OpenRouter model '${modelCandidate}' returned status ${response.status}: ${errBody.slice(0, 200)}`);
        }
      } catch (e) {
        console.warn(`Error fetching candidate model ${modelCandidate}:`, e);
      }
    }

    if (!rawText.trim()) {
      const fallback = getRagFallbackResponse(message, ragResult);
      return json({
        reply: fallback.reply,
        suggestedMeds: fallback.suggestedMeds,
        retrievedCount: ragResult.medicines.length,
        notice: `OpenRouter API status ${lastStatus}. Displaying local clinical RAG response from Convex DB.`,
      });
    }

    const { text, suggestedMeds } = parseSuggestedMedicines(rawText);

    // If model didn't format suggestedMeds JSON, populate from RAG top matches
    const finalMeds = suggestedMeds.length > 0 ? suggestedMeds : ragResult.medicines.map((m) => ({
      name: m.name,
      generic: m.genericName,
      rx: m.requiresPrescription,
      price: `$${m.unitSellingPrice.toFixed(2)}`,
    }));

    return json({
      reply: text,
      suggestedMeds: finalMeds,
      retrievedCount: ragResult.medicines.length,
    });
  } catch (error: any) {
    console.error("AI Chat handler error:", error);
    return json(
      { error: "Internal AI RAG processing error", details: error?.message },
      { status: 500 }
    );
  }
};

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
 * Offline Clinical RAG Engine generator
 */
function getRagFallbackResponse(userQuery: string, ragResult: { medicines: any[]; conflictAlerts: string[]; ragContextText: string }) {
  if (ragResult.medicines.length > 0) {
    const top = ragResult.medicines[0];
    let reply = `Based on your symptoms, our clinical database retrieved **${top.name}** (${top.genericName}).\n\n`;
    reply += `• **Indicated Symptoms:** ${top.symptoms.join(", ")}\n`;
    reply += `• **Description:** ${top.description}\n`;
    reply += `• **Classification:** ${top.requiresPrescription ? "Prescription Medication (Rx Required)" : "Over-The-Counter (OTC)"}\n`;
    reply += `• **Pharmacy Price:** $${top.unitSellingPrice.toFixed(2)} (In Stock: ${top.stock} units)\n`;

    if (ragResult.conflictAlerts.length > 0) {
      reply += `\n${ragResult.conflictAlerts.join("\n")}`;
    }

    reply += `\n\n*Note: Always consult a registered healthcare provider before taking new prescription drugs.*`;

    const suggestedMeds = ragResult.medicines.map((m) => ({
      name: m.name,
      generic: m.genericName,
      rx: m.requiresPrescription,
      price: `$${m.unitSellingPrice.toFixed(2)}`,
    }));

    return { reply, suggestedMeds };
  }

  return {
    reply: "MediVault Clinical RAG System: Please specify your symptoms (e.g. fever, headache, gastric acidity, cough, pain). We will retrieve matching medicines and drug interaction warnings directly from our pharmacy database.",
    suggestedMeds: [],
  };
}
