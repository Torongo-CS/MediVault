<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { 
    Sparkles, 
    Brain, 
    Stethoscope, 
    Search, 
    Activity, 
    ShieldAlert, 
    ClipboardCheck,
    FolderKanban
  } from "lucide-svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  // Svelte 5 Reactive States
  let searchQuery = $state("");
  let suggestions = $state<string[]>([]);
  let isChecking = $state(false);

  function simulateSymptomCheck(e: Event) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    isChecking = true;
    setTimeout(() => {
      const q = searchQuery.toLowerCase();
      if (q.includes("head") || q.includes("migraine") || q.includes("fever")) {
        suggestions = ["Paracetamol 500mg (OTC)", "Ibuprofen 400mg (OTC)"];
      } else if (q.includes("cough") || q.includes("sore throat") || q.includes("cold")) {
        suggestions = ["Dextromethorphan Cough Syrup", "Cetirizine 10mg"];
      } else if (q.includes("stomach") || q.includes("acid") || q.includes("heartburn")) {
        suggestions = ["Famotidine 20mg", "Magnesium Hydroxide Oral Suspension"];
      } else {
        suggestions = ["No immediate matches. Try searching by medicine name, or consult our AI Assistant."];
      }
      isChecking = false;
    }, 600);
  }
</script>


<!-- Main Container -->
<main class="min-h-screen bg-background text-foreground px-6">
  <!-- Hero Section -->
  <section class="max-w-4xl mx-auto text-center pt-20 pb-16">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted mb-6 animate-fade">
      <Badge variant="outline" class="border-border bg-background text-foreground flex gap-1 items-center px-2 py-0.5">
        <Sparkles class="h-3.5 w-3.5 text-primary" />
        AI Engine Active
      </Badge>
      <span class="text-xs text-muted-foreground font-medium">Symptom suggested & prescription read-out integrated</span>
    </div>

    <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-foreground">
      Next-Gen Intelligent <span class="text-primary">Pharmacy</span> Workspace.
    </h1>
    
    <p class="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
      Securely reserve medicine inventory, upload prescriptions to your Vault, and leverage AI symptom suggestions with built-in drug-drug interaction safeguards.
    </p>

    <!-- Interactive AI Symptom Checker Simulation -->
    <div class="max-w-xl mx-auto mb-16 p-6 rounded-xl border bg-card text-left">
      <h3 class="text-sm font-bold text-card-foreground mb-3 flex items-center gap-2">
        <Brain class="h-4 w-4 text-primary" />
        Interactive Symptom Simulator
      </h3>
      
      <form onsubmit={simulateSymptomCheck} class="flex gap-2 mb-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Describe symptoms (e.g. headache, cold, stomach acid)..." 
            bind:value={searchQuery}
            class="pl-9 bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <Button type="submit" disabled={isChecking} class="font-semibold">
          {isChecking ? "Analyzing..." : "Check"}
        </Button>
      </form>

      <!-- Simulation results -->
      {#if isChecking}
        <div class="py-3 text-sm text-muted-foreground flex items-center gap-2">
          <Activity class="h-4 w-4 animate-pulse text-primary" /> Running NLP diagnostic checker...
        </div>
      {:else if suggestions.length > 0}
        <div class="p-3 bg-muted rounded-lg border animate-slideup">
          <div class="text-xs text-muted-foreground font-bold mb-2">AI-SUGGESTED OVER-THE-COUNTER MEDICINES:</div>
          <ul class="space-y-1.5">
            {#each suggestions as item}
              <li class="text-sm flex items-center gap-2 text-foreground">
                <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
                {item}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </section>

  <!-- Core System Pillars -->
  <section class="max-w-6xl mx-auto pb-24 border-t pt-16">
    <h2 class="text-2xl font-bold tracking-tight text-center mb-12 text-foreground">
      Engineered for Patients, Pharmacists, and Admins
    </h2>

    <div class="grid md:grid-cols-3 gap-6">
      <!-- Patients -->
      <Card.Root class="bg-card border-border">
        <Card.Header>
          <div class="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border mb-2">
            <Stethoscope class="h-5 w-5 text-primary" />
          </div>
          <Card.Title class="text-lg font-bold text-foreground">Customer Portal</Card.Title>
          <Card.Description class="text-muted-foreground text-sm">
            Quick search, checkout cart verification, and automated refills tracker.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ul class="text-xs space-y-2 text-muted-foreground">
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Prescription vault storage</li>
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Favorite item shelves</li>
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Multi-stage pickup indicators</li>
          </ul>
        </Card.Content>
      </Card.Root>

      <!-- Pharmacists -->
      <Card.Root class="bg-card border-border">
        <Card.Header>
          <div class="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border mb-2">
            <ClipboardCheck class="h-5 w-5 text-primary" />
          </div>
          <Card.Title class="text-lg font-bold text-foreground">Pharmacist Workspace</Card.Title>
          <Card.Description class="text-muted-foreground text-sm">
            Complete review queue for restricted approvals and medical logs.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ul class="text-xs space-y-2 text-muted-foreground">
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Side-by-side prescription reviewer</li>
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Expiry warning triggers</li>
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Patient medication matrices</li>
          </ul>
        </Card.Content>
      </Card.Root>

      <!-- Admins -->
      <Card.Root class="bg-card border-border">
        <Card.Header>
          <div class="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border mb-2">
            <FolderKanban class="h-5 w-5 text-primary" />
          </div>
          <Card.Title class="text-lg font-bold text-foreground">Admin Dashboard</Card.Title>
          <Card.Description class="text-muted-foreground text-sm">
            Inventory controls, user role definitions, and interaction databases.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ul class="text-xs space-y-2 text-muted-foreground">
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Real-time analytics charts</li>
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Interaction rules database (CRUD)</li>
            <li class="flex items-center gap-2"><span class="h-1 w-1 bg-primary rounded-full"></span> Pharmacist access toggles</li>
          </ul>
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- Highlight: Drug Interaction matrix -->
  <section class="max-w-5xl mx-auto pb-32">
    <div class="p-8 md:p-12 rounded-xl border bg-card flex flex-col md:flex-row gap-8 items-center">
      <div class="flex-1">
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-muted text-xs text-foreground font-medium mb-4">
          <ShieldAlert class="h-3 w-3 text-destructive" />
          Real-time safety guard
        </div>
        <h3 class="text-2xl md:text-3xl font-extrabold text-foreground mb-4">
          Intelligent Drug Interaction Matrix
        </h3>
        <p class="text-muted-foreground text-sm md:text-base leading-relaxed mb-6">
          Never worry about adverse drug mixtures again. MediVault automatically checks items in your active reservation cart against one another, and warns you if there's a conflict with medicines ordered over the past 7 days.
        </p>
        <div class="flex gap-4">
          <div class="border-l pl-4">
            <div class="text-xl font-bold text-foreground">100%</div>
            <div class="text-xs text-muted-foreground uppercase">Automatic verification</div>
          </div>
          <div class="border-l pl-4">
            <div class="text-xl font-bold text-foreground">7 Days</div>
            <div class="text-xs text-muted-foreground uppercase">Lookup history range</div>
          </div>
        </div>
      </div>
      
      <div class="w-full md:w-80 p-5 rounded-lg border bg-background flex flex-col gap-3">
        <div class="text-xs font-bold text-muted-foreground uppercase">Checkout Warning (Demo)</div>
        <div class="p-3.5 rounded bg-destructive/20 border border-destructive/50 flex gap-3 text-left">
          <ShieldAlert class="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div class="text-xs font-extrabold text-destructive">POTENTIAL DRUG CONFLICT</div>
            <div class="text-xs text-muted-foreground mt-1">Aspirin conflicts with Warfarin. Co-administration increases bleeding risk.</div>
          </div>
        </div>
        <div class="text-xs text-muted-foreground leading-relaxed bg-card p-2.5 rounded border">
          The app will alert you with clinical reasons on the checkout panel, rather than hard blocking.
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="border-t bg-background py-8 text-center text-xs text-muted-foreground">
  <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
    <div>&copy; 2026 MediVault. All rights reserved. Built with Svelte 5 and Convex.</div>
    <div class="flex gap-6">
      <a href="/privacy" class="hover:underline text-foreground">Privacy Policy</a>
      <a href="/terms" class="hover:underline text-foreground">Terms of Service</a>
    </div>
  </div>
</footer>
