<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Textarea } from "$lib/components/ui/textarea";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../convex/dummyData.json";
  import {
    Brain,
    Send,
    Sparkles,
    FileText,
    Upload,
    CheckCircle2,
    AlertTriangle,
    Bot,
    User,
    Pill,
    ShieldAlert,
  } from "lucide-svelte";

  interface ChatMessage {
    id: string;
    role: "assistant" | "user";
    content: string;
    timestamp: string;
    suggestedMeds: Array<{
      name: string;
      generic: string;
      rx: boolean;
      price: string;
    }>;
  }

  // Reactive state for chat conversation
  let activeTab = $state<"chat" | "ocr">("chat");

  let messages = $state<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I am your MediVault AI Health Assistant. Tell me your symptoms, ask about drug interactions, or upload a prescription for instant OCR analysis.",
      timestamp: "10:00 AM",
      suggestedMeds: [],
    },
  ]);

  let userInput = $state("");
  let isAnalyzing = $state(false);

  // Prescription OCR scanner mock state
  let isDragOver = $state(false);
  let uploadedFile = $state<string | null>(null);
  let isScanningOcr = $state(false);
  let ocrResults = $state<any>(null);

  // Quick suggestion chips
  const quickPrompts = [
    "Recommend medicine for high fever and body ache",
    "Do Paracetamol and Ibuprofen interact?",
    "Over-the-counter allergy treatment",
    "Dosage rules for Amoxicillin 250mg",
  ];

  function sendPrompt(promptText?: string) {
    const textToSend = promptText || userInput;
    if (!textToSend.trim()) return;

    // Push user message
    messages = [
      ...messages,
      {
        id: Date.now().toString(),
        role: "user",
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        suggestedMeds: [],
      },
    ];

    if (!promptText) userInput = "";
    isAnalyzing = true;

    // Simulate AI response
    setTimeout(() => {
      let botResponse =
        "Based on your prompt, here is the clinical information from our database:";
      let suggested: Array<{
        name: string;
        generic: string;
        rx: boolean;
        price: string;
      }> = [];

      const queryLower = textToSend.toLowerCase();

      if (
        queryLower.includes("fever") ||
        queryLower.includes("ache") ||
        queryLower.includes("pain")
      ) {
        botResponse =
          "For fever and body pain, Paracetamol 500mg or Ibuprofen 400mg are commonly recommended over-the-counter analgesics. Ensure you stay hydrated and follow recommended daily dosage limits.";
        suggested = [
          {
            name: "Paracetamol 500mg",
            generic: "Paracetamol",
            rx: false,
            price: "$5.00",
          },
          {
            name: "Ibuprofen 400mg",
            generic: "Ibuprofen",
            rx: false,
            price: "$6.50",
          },
        ];
      } else if (
        queryLower.includes("interact") ||
        queryLower.includes("conflict") ||
        queryLower.includes("warfarin")
      ) {
        botResponse =
          "⚠️ Interaction Warning: High-dose Paracetamol or Aspirin may enhance the anticoagulant effect of Warfarin. Always consult your pharmacist or physician before combining NSAIDs with blood thinners.";
        suggested = [
          {
            name: "Warfarin Interaction Warning",
            generic: "High Risk Combination",
            rx: true,
            price: "Consult Pharmacist",
          },
        ];
      } else {
        botResponse =
          "I have analyzed your request against MediVault's medicine database. For chronic symptoms or prescription antibiotics, please consult a registered medical practitioner.";
        suggested = [
          {
            name: "Amoxicillin 250mg",
            generic: "Amoxicillin",
            rx: true,
            price: "$15.00",
          },
        ];
      }

      messages = [
        ...messages,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: botResponse,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          suggestedMeds: suggested,
        },
      ];

      isAnalyzing = false;
    }, 800);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      processFile(target.files[0]);
    }
  }

  function processFile(file: File) {
    uploadedFile = file.name;
    isScanningOcr = true;
    ocrResults = null;

    setTimeout(() => {
      isScanningOcr = false;
      ocrResults = {
        doctor: "Dr. A. Rahman, MBBS, FCPS",
        date: "2026-07-25",
        patient: "Customer Profile #user_3",
        extractedMeds: [
          {
            name: "Amoxicillin 250mg",
            dosage: "1 capsule 3x daily after meals",
            duration: "7 Days",
            status: "Prescription Required",
          },
          {
            name: "Paracetamol 500mg",
            dosage: "1 tablet as needed for fever (max 4/day)",
            duration: "5 Days",
            status: "OTC Available",
          },
        ],
        interactionWarning:
          "No severe drug-drug interactions detected between prescribed items.",
      };
      toast.success("Prescription OCR scan completed!");
    }, 1200);
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
  <!-- Header -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6"
  >
    <div>
      <h1
        class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3"
      >
        <Brain class="w-8 h-8 text-primary" /> MediVault AI Health Assistant
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Smart AI symptom checker, drug interaction warnings, and prescription
        OCR reader.
      </p>
    </div>

    <!-- Mode Selector -->
    <div class="flex items-center gap-2 bg-muted p-1 rounded-lg">
      <Button
        variant={activeTab === "chat" ? "default" : "ghost"}
        size="sm"
        onclick={() => (activeTab = "chat")}
        class="text-xs gap-1.5 rounded-md"
      >
        <Sparkles class="w-4 h-4" /> Symptom Advisor Chat
      </Button>
      <Button
        variant={activeTab === "ocr" ? "default" : "ghost"}
        size="sm"
        onclick={() => (activeTab = "ocr")}
        class="text-xs gap-1.5 rounded-md"
      >
        <FileText class="w-4 h-4" /> Prescription OCR Scanner
      </Button>
    </div>
  </div>

  {#if activeTab === "chat"}
    <!-- AI Chat View -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Main Chat Area (3 columns) -->
      <Card.Root
        class="lg:col-span-3 border-border/60 shadow-sm flex flex-col h-[650px]"
      >
        <Card.Header class="border-b bg-muted/20 pb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="p-2 rounded-lg bg-primary/10 text-primary">
                <Bot class="w-5 h-5" />
              </div>
              <div>
                <Card.Title class="text-base font-bold"
                  >AI Clinical Assistant</Card.Title
                >
                <Card.Description class="text-xs"
                  >Powered by MediVault Codex Drug Rules</Card.Description
                >
              </div>
            </div>
            <Badge
              variant="outline"
              class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs"
            >
              AI Active
            </Badge>
          </div>
        </Card.Header>

        <!-- Messages Container -->
        <Card.Content class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {#each messages as msg}
            <div
              class={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              <div
                class={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
              >
                {#if msg.role === "user"}
                  <User class="w-4 h-4" />
                {:else}
                  <Bot class="w-4 h-4 text-primary" />
                {/if}
              </div>

              <div class="space-y-2">
                <div
                  class={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted/50 border border-border rounded-tl-none text-foreground"
                  }`}
                >
                  {msg.content}
                </div>

                <!-- Suggested Medicines Widget inside chat -->
                {#if msg.suggestedMeds && msg.suggestedMeds.length > 0}
                  <div class="space-y-2 pt-1">
                    <div
                      class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      Suggested Medicines
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {#each msg.suggestedMeds as med}
                        <div
                          class="p-3 rounded-xl border border-border/80 bg-card shadow-xs flex items-center justify-between text-xs"
                        >
                          <div>
                            <div
                              class="font-bold text-foreground flex items-center gap-1"
                            >
                              <Pill class="w-3.5 h-3.5 text-primary" />
                              {med.name}
                            </div>
                            <div class="text-[10px] text-muted-foreground">
                              {med.generic}
                            </div>
                          </div>
                          <div class="text-right">
                            <Badge
                              variant="outline"
                              class="text-[10px] bg-emerald-500/10 text-emerald-700"
                              >{med.price}</Badge
                            >
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <div
                  class={`text-[10px] text-muted-foreground px-1 ${msg.role === "user" ? "text-right" : ""}`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          {/each}

          {#if isAnalyzing}
            <div
              class="flex items-center gap-2 text-xs text-muted-foreground p-2"
            >
              <Sparkles class="w-4 h-4 text-primary animate-pulse" /> AI is analyzing
              drug database...
            </div>
          {/if}
        </Card.Content>

        <!-- Input Bar -->
        <div class="p-4 border-t bg-card space-y-3">
          <div class="flex gap-2">
            <Textarea
              bind:value={userInput}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendPrompt();
                }
              }}
              placeholder="Describe your symptoms or ask a drug safety question..."
              class="text-xs min-h-[44px] max-h-32 resize-none"
            />
            <Button
              onclick={() => sendPrompt()}
              disabled={isAnalyzing}
              class="px-5 bg-primary text-primary-foreground"
            >
              <Send class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card.Root>

      <!-- Right Column: Quick Prompt Shortcuts & Safety Tips (1 column) -->
      <div class="space-y-6">
        <Card.Root class="border-border/60 shadow-sm">
          <Card.Header class="pb-3">
            <Card.Title class="text-base font-bold flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-primary" /> Quick Suggestions
            </Card.Title>
            <Card.Description class="text-xs"
              >Click to ask common medical queries</Card.Description
            >
          </Card.Header>
          <Card.Content class="space-y-2">
            {#each quickPrompts as prompt}
              <button
                onclick={() => sendPrompt(prompt)}
                class="w-full text-left p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-primary/50 text-xs transition-all text-foreground font-medium"
              >
                "{prompt}"
              </button>
            {/each}
          </Card.Content>
        </Card.Root>

        <Card.Root
          class="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900 shadow-sm"
        >
          <Card.Header class="pb-2">
            <Card.Title
              class="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5"
            >
              <ShieldAlert class="w-4 h-4 text-amber-600" /> Medical Disclaimer
            </Card.Title>
          </Card.Header>
          <Card.Content
            class="text-[11px] text-amber-900/80 dark:text-amber-300/80 space-y-1"
          >
            <p>
              MediVault AI provides informational recommendations based on
              pharmacy catalog rules.
            </p>
            <p class="font-semibold pt-1">
              For acute emergencies, call 999 or consult a registered physician.
            </p>
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  {:else}
    <!-- Prescription OCR Scanner View -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Upload Box -->
      <Card.Root class="border-border/60 shadow-sm">
        <Card.Header>
          <Card.Title class="text-xl font-bold flex items-center gap-2">
            <Upload class="w-5 h-5 text-primary" /> Upload Prescription Image / PDF
          </Card.Title>
          <Card.Description class="text-xs">
            Extract medicine names, doctor instructions, and check conflicts
            using OCR.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div
            ondragover={(e: DragEvent) => {
              e.preventDefault();
              isDragOver = true;
            }}
            ondragleave={() => (isDragOver = false)}
            ondrop={handleDrop}
            class={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border/80 hover:border-primary/50 bg-muted/20"
            }`}
          >
            <FileText class="w-12 h-12 text-primary mb-3 opacity-80" />
            <p class="font-semibold text-xs text-foreground">
              Drag and drop prescription file here
            </p>
            <p class="text-[11px] text-muted-foreground mt-1">
              Supports JPG, PNG, WEBP, or PDF up to 10MB
            </p>

            <label class="mt-4">
              <span
                class="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer shadow-sm"
              >
                Browse Files
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onchange={handleFileSelect}
                class="hidden"
              />
            </label>
          </div>

          {#if uploadedFile}
            <div
              class="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
            >
              <span
                class="font-semibold text-foreground flex items-center gap-2"
              >
                <FileText class="w-4 h-4 text-purple-600" />
                {uploadedFile}
              </span>
              <Badge variant="outline" class="bg-purple-500/10 text-purple-700"
                >Ready</Badge
              >
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- OCR Results Panel -->
      <Card.Root class="border-border/60 shadow-sm">
        <Card.Header>
          <Card.Title class="text-xl font-bold flex items-center gap-2">
            <Sparkles class="w-5 h-5 text-primary" /> Extracted Clinical Data
          </Card.Title>
          <Card.Description class="text-xs"
            >OCR text parsing & structured result</Card.Description
          >
        </Card.Header>
        <Card.Content>
          {#if isScanningOcr}
            <div
              class="h-64 flex flex-col items-center justify-center text-center space-y-3"
            >
              <Sparkles class="w-8 h-8 text-primary animate-spin" />
              <p class="text-xs font-semibold text-foreground">
                Analyzing prescription text & dosage...
              </p>
            </div>
          {:else if ocrResults}
            <div class="space-y-4 text-xs">
              <!-- Meta info -->
              <div class="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Prescribing Doctor:</span>
                  <strong class="text-foreground">{ocrResults.doctor}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Prescription Date:</span>
                  <strong class="text-foreground">{ocrResults.date}</strong>
                </div>
              </div>

              <!-- Extracted Items -->
              <div class="space-y-2">
                <h4
                  class="font-bold uppercase text-[11px] tracking-wider text-muted-foreground"
                >
                  Extracted Medicines
                </h4>
                {#each ocrResults.extractedMeds as med}
                  <div
                    class="p-3 rounded-lg border border-border/80 bg-card space-y-1"
                  >
                    <div
                      class="flex justify-between items-center font-bold text-foreground"
                    >
                      <span>{med.name}</span>
                      <Badge
                        variant="outline"
                        class="text-[10px] bg-purple-500/10 text-purple-700"
                        >{med.status}</Badge
                      >
                    </div>
                    <p class="text-muted-foreground text-[11px]">
                      Dosage: {med.dosage}
                    </p>
                    <p class="text-muted-foreground text-[11px]">
                      Duration: {med.duration}
                    </p>
                  </div>
                {/each}
              </div>

              <!-- Conflict Check -->
              <div
                class="p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-2"
              >
                <CheckCircle2 class="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{ocrResults.interactionWarning}</span>
              </div>
            </div>
          {:else}
            <div
              class="h-64 flex flex-col items-center justify-center text-center text-muted-foreground text-xs space-y-2"
            >
              <FileText class="w-10 h-10 opacity-40" />
              <p>
                Upload a prescription to view extracted medicines and dosage
                information.
              </p>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  {/if}
</div>
