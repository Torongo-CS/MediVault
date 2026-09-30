<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import {
    Brain,
    Send,
    Sparkles,
    X,
    Bot,
    User,
    Pill,
    ExternalLink,
    Database,
    ShieldAlert,
    ChevronDown
  } from "lucide-svelte";

  interface ChatMessage {
    id: string;
    role: "assistant" | "user";
    content: string;
    timestamp: string;
    suggestedMeds?: Array<{
      name: string;
      generic: string;
      rx: boolean;
      price: string;
    }>;
  }

  let isOpen = $state(false);
  let userInput = $state("");
  let isAnalyzing = $state(false);

  let messages = $state<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hi there! 👋 I am your MediVault AI Assistant. Tell me your symptoms (e.g. fever, headache, acid reflux, cough) and I'll suggest matching medicines from our pharmacy database.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedMeds: [],
    },
  ]);

  const quickSymptoms = [
    "Fever & headache",
    "Acid reflux / heartburn",
    "Cough & throat infection",
    "Stomach pain & diarrhea",
  ];

  async function handleSend(textOverride?: string) {
    const queryText = textOverride || userInput;
    if (!queryText.trim() || isAnalyzing) return;

    const chatHistory = messages
      .filter((m) => m.id !== "init")
      .map((m) => ({ role: m.role, content: m.content }));

    messages = [
      ...messages,
      {
        id: Date.now().toString(),
        role: "user",
        content: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];

    if (!textOverride) userInput = "";
    isAnalyzing = true;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          history: chatHistory,
        }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = await res.json();
      if (data.notice) {
        toast.info(data.notice, { duration: 3000 });
      }

      messages = [
        ...messages,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply || "No clinical content returned.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedMeds: data.suggestedMeds || [],
        },
      ];
    } catch (err) {
      toast.error("AI Assistant connection error");
      messages = [
        ...messages,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I ran into a network error accessing the clinical RAG database. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedMeds: [],
        },
      ];
    } finally {
      isAnalyzing = false;
    }
  }
</script>

<!-- Floating Toggle Button -->
<div class="fixed bottom-6 right-6 z-50">
  {#if !isOpen}
    <button
      onclick={() => (isOpen = true)}
      class="h-14 px-4 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 transition-all duration-200 flex items-center gap-2.5 font-bold text-sm border-2 border-primary-foreground/20"
      aria-label="Open AI Health Assistant"
    >
      <Brain class="w-6 h-6 animate-pulse" />
      <span class="hidden sm:inline">Ask AI Assistant</span>
      <Badge variant="secondary" class="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5">
        RAG
      </Badge>
    </button>
  {:else}
    <!-- Floating Chat Modal Window -->
    <div
      class="w-[360px] sm:w-[420px] h-[580px] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
    >
      <!-- Header -->
      <div class="p-4 bg-primary text-primary-foreground flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-2.5">
          <div class="p-2 bg-primary-foreground/10 rounded-lg">
            <Bot class="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 class="font-extrabold text-sm leading-none flex items-center gap-1.5">
              MediVault AI Chatbot
              <span class="text-[10px] bg-emerald-400/20 text-emerald-200 px-1.5 rounded font-bold">Clinical RAG</span>
            </h3>
            <p class="text-[11px] opacity-80 mt-0.5">Symptom checker & drug advisor</p>
          </div>
        </div>

        <button
          onclick={() => (isOpen = false)}
          class="p-1.5 hover:bg-primary-foreground/10 rounded-lg text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          aria-label="Close Assistant"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Messages Body -->
      <div class="flex-1 p-4 overflow-y-auto space-y-3.5 bg-muted/20 text-xs">
        {#each messages as msg}
          <div class={`flex gap-2.5 ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
            <div
              class={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {#if msg.role === "user"}
                <User class="w-3.5 h-3.5" />
              {:else}
                <Bot class="w-3.5 h-3.5 text-primary" />
              {/if}
            </div>

            <div class="space-y-1.5 max-w-[82%]">
              <div
                class={`p-3 rounded-2xl leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
                    : "bg-card border border-border/70 rounded-tl-none text-foreground"
                }`}
              >
                {msg.content}
              </div>

              <!-- Suggested Meds Carousel / List -->
              {#if msg.suggestedMeds && msg.suggestedMeds.length > 0}
                <div class="space-y-1.5 pt-1">
                  <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Suggested Medicines ({msg.suggestedMeds.length})</span>
                  </div>
                  <div class="space-y-1.5">
                    {#each msg.suggestedMeds as med}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div
                        class="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-primary/5 hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-between text-xs"
                        onclick={() => {
                          isOpen = false;
                          goto(`/pharmacy?search=${encodeURIComponent(med.generic || med.name)}`);
                        }}
                      >
                        <div class="min-w-0 pr-2">
                          <div class="font-bold text-foreground truncate flex items-center gap-1">
                            <Pill class="w-3 h-3 text-primary shrink-0" />
                            <span class="truncate">{med.name}</span>
                          </div>
                          <div class="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <span>{med.generic}</span>
                            {#if med.rx}
                              <span class="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] px-1 rounded font-bold">Rx</span>
                            {:else}
                              <span class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] px-1 rounded font-bold">OTC</span>
                            {/if}
                          </div>
                        </div>
                        <div class="shrink-0 flex items-center gap-1">
                          <Badge variant="outline" class="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            {med.price}
                          </Badge>
                          <ExternalLink class="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class={`text-[9px] text-muted-foreground px-1 ${msg.role === "user" ? "text-right" : ""}`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        {/each}

        {#if isAnalyzing}
          <div class="flex items-center gap-2 text-[11px] text-muted-foreground p-2">
            <Sparkles class="w-3.5 h-3.5 text-primary animate-spin" /> Retrieving clinical database context...
          </div>
        {/if}
      </div>

      <!-- Quick Prompt Chips -->
      <div class="px-3 py-2 bg-muted/40 border-t border-border/50 flex gap-1.5 overflow-x-auto no-scrollbar">
        {#each quickSymptoms as symptom}
          <button
            onclick={() => handleSend(`Recommend medicine for ${symptom}`)}
            class="text-[10px] font-semibold whitespace-nowrap px-2.5 py-1 rounded-full bg-card hover:bg-primary/10 hover:text-primary border border-border/60 transition-colors"
          >
            {symptom}
          </button>
        {/each}
      </div>

      <!-- Input Footer -->
      <div class="p-3 bg-card border-t border-border flex items-center gap-2">
        <Input
          bind:value={userInput}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type symptoms or ask about drugs..."
          class="text-xs h-9 flex-1"
        />
        <Button
          size="sm"
          onclick={() => handleSend()}
          disabled={isAnalyzing}
          class="h-9 px-3 bg-primary text-primary-foreground shrink-0"
        >
          <Send class="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  {/if}
</div>
