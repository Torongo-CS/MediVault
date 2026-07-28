<!-- routes/(app)/complaint/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
  import * as Accordion from "$lib/components/ui/accordion";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Send,
    Shield,
    CheckCircle2,
    Clock,
    MessageSquare,
  } from "lucide-svelte";

  // Form state
  let subject = $state("");
  let category = $state("");
  let pharmacyFilter = $state("");
  let message = $state("");
  let isSubmitting = $state(false);

  const categories = [
    { value: "service", label: "Poor Service" },
    { value: "quality", label: "Medicine Quality" },
    { value: "delivery", label: "Delivery Issue" },
    { value: "pricing", label: "Pricing Concern" },
    { value: "other", label: "Other" },
  ];

  const pharmacies = [
    { value: "ph-1", label: "HealthPlus Pharmacy" },
    { value: "ph-2", label: "CarePoint Medical Store" },
    { value: "ph-4", label: "Green Cross Dispensary" },
  ];

  // Mock past complaints
  let complaints = $state([
    {
      id: "cmp-1",
      subject: "Wrong medicine quantity",
      category: "service",
      pharmacy: "HealthPlus Pharmacy",
      message: "I received 8 tablets instead of 10 in my last order.",
      status: "resolved" as const,
      createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
      response: "We apologize for the inconvenience. The missing 2 tablets have been reserved for your next pickup.",
    },
    {
      id: "cmp-2",
      subject: "Late pickup availability",
      category: "delivery",
      pharmacy: "CarePoint Medical Store",
      message: "My order was marked ready but wasn't available when I visited.",
      status: "open" as const,
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      response: null,
    },
  ]);

  function handleSubmit() {
    if (!subject.trim() || !category || !message.trim()) return;
    isSubmitting = true;

    setTimeout(() => {
      complaints = [
        {
          id: `cmp-${Date.now()}`,
          subject,
          category,
          pharmacy: pharmacies.find((p) => p.value === pharmacyFilter)?.label ?? "General",
          message,
          status: "open" as const,
          createdAt: Date.now(),
          response: null,
        },
        ...complaints,
      ];
      subject = "";
      category = "";
      pharmacyFilter = "";
      message = "";
      isSubmitting = false;
    }, 800);
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
</script>

<div class="space-y-6 max-w-3xl mx-auto">
  <PageHeader title="Complaints" subtitle="Submit feedback or report an issue" showBack={true} backHref="/dashboard" />

  <!-- Complaint Form -->
  <Card.Root class="p-5">
    <h3 class="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
      <MessageSquare class="h-4 w-4 text-primary" />
      New Complaint
    </h3>

    <div class="space-y-4">
      <div>
        <label for="subject" class="text-xs font-semibold text-foreground block mb-1.5">Subject *</label>
        <Input id="subject" placeholder="Brief description of the issue" bind:value={subject} />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-xs font-semibold text-foreground block mb-1.5">Category *</label>
          <Select.Root type="single" value={category} onValueChange={(v) => { if (v) category = v; }}>
            <Select.Trigger class="w-full text-xs">
              <span>{categories.find((c) => c.value === category)?.label ?? "Select category"}</span>
            </Select.Trigger>
            <Select.Content>
              {#each categories as cat}
                <Select.Item value={cat.value}>{cat.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div>
          <label class="text-xs font-semibold text-foreground block mb-1.5">Pharmacy (optional)</label>
          <Select.Root type="single" value={pharmacyFilter} onValueChange={(v) => { if (v) pharmacyFilter = v; }}>
            <Select.Trigger class="w-full text-xs">
              <span>{pharmacies.find((p) => p.value === pharmacyFilter)?.label ?? "Select pharmacy"}</span>
            </Select.Trigger>
            <Select.Content>
              {#each pharmacies as ph}
                <Select.Item value={ph.value}>{ph.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div>
        <label for="message" class="text-xs font-semibold text-foreground block mb-1.5">Description *</label>
        <Textarea
          id="message"
          placeholder="Describe the issue in detail..."
          bind:value={message}
          rows={4}
        />
      </div>

      <Button
        class="font-semibold gap-1.5"
        onclick={handleSubmit}
        disabled={!subject.trim() || !category || !message.trim() || isSubmitting}
      >
        <Send class="h-3.5 w-3.5" />
        {isSubmitting ? "Submitting..." : "Submit Complaint"}
      </Button>
    </div>
  </Card.Root>

  <!-- Past Complaints -->
  <div>
    <h3 class="text-sm font-bold text-foreground mb-4">Past Complaints</h3>

    {#if complaints.length === 0}
      <p class="text-xs text-muted-foreground">No previous complaints filed.</p>
    {:else}
      <Accordion.Root type="single">
        {#each complaints as cmp (cmp.id)}
          <Accordion.Item value={cmp.id} class="border rounded-lg mb-2 px-4">
            <Accordion.Trigger class="py-3">
              <div class="flex items-center gap-3 text-left flex-1">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-foreground">{cmp.subject}</p>
                  <p class="text-[11px] text-muted-foreground">{cmp.pharmacy} · {formatDate(cmp.createdAt)}</p>
                </div>
                {#if cmp.status === "resolved"}
                  <Badge variant="secondary" class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] shrink-0">
                    <CheckCircle2 class="h-3 w-3 mr-1" /> Resolved
                  </Badge>
                {:else}
                  <Badge variant="secondary" class="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] shrink-0">
                    <Clock class="h-3 w-3 mr-1" /> Open
                  </Badge>
                {/if}
              </div>
            </Accordion.Trigger>
            <Accordion.Content class="pb-4">
              <p class="text-sm text-muted-foreground mb-3">{cmp.message}</p>
              {#if cmp.response}
                <div class="p-3 rounded-lg bg-muted border-l-2 border-l-primary">
                  <p class="text-[11px] font-bold text-primary mb-1">Admin Response:</p>
                  <p class="text-xs text-foreground">{cmp.response}</p>
                </div>
              {:else}
                <p class="text-[11px] text-muted-foreground italic">Awaiting review...</p>
              {/if}
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    {/if}
  </div>
</div>