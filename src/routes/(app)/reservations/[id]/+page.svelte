<!-- routes/(app)/reservations/[id]/+page.svelte -->
<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import {
    ArrowLeft,
    Store,
    MapPin,
    Phone,
    CheckCircle2,
    Clock,
    Package,
    Truck,
    MessageSquare,
    FileText,
    RotateCcw,
    XCircle,
    Receipt,
  } from "lucide-svelte";

  const resId = $derived(page.params.id);

  // Mock reservation data
  const reservation = {
    id: resId,
    pharmacyName: "HealthPlus Pharmacy",
    pharmacyAddress: "42 Mirpur Road, Dhaka 1205",
    pharmacyPhone: "+880 1712-345678",
    status: "approved" as const,
    requestDate: Date.now() - 24 * 60 * 60 * 1000,
    pickupDate: Date.now() + 12 * 60 * 60 * 1000,
    totalAmount: 45.5,
    invoiceNumber: "INV-2026-0042",
    pharmacistNote: "All items verified. Please bring your NID card for pickup.",
    interactionWarnings: [] as string[],
    items: [
      { name: "Paracetamol 500mg", generic: "Acetaminophen", qty: 10, unitPrice: 2.5, subtotal: 25.0, rx: false },
      { name: "Cetirizine 10mg", generic: "Cetirizine HCl", qty: 5, unitPrice: 5.0, subtotal: 25.0, rx: false },
      { name: "Amoxicillin 250mg", generic: "Amoxicillin Trihydrate", qty: 7, unitPrice: 8.0, subtotal: 56.0, rx: true },
    ],
  };

  // Timeline steps
  const steps = [
    { key: "pending", label: "Placed", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
    { key: "ready", label: "Ready", icon: Package },
    { key: "delivered", label: "Delivered", icon: Truck },
  ];

  const statusOrder = ["pending", "approved", "ready", "delivered"];
  const currentIdx = $derived(statusOrder.indexOf(reservation.status));
  const isTerminal = $derived(
    ["rejected", "expired", "cancelled"].includes(reservation.status)
  );

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
</script>

<div class="space-y-6 max-w-4xl mx-auto">
  <!-- Back -->
  <a
    href="/reservations"
    class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
  >
    <ArrowLeft class="h-3.5 w-3.5" />
    Back to Reservations
  </a>

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h1 class="text-xl font-bold text-foreground">Reservation #{reservation.invoiceNumber}</h1>
      <p class="text-xs text-muted-foreground mt-0.5">Placed {formatDate(reservation.requestDate)}</p>
    </div>
    <StatusBadge status={reservation.status} />
  </div>

  <!-- Status Timeline -->
  {#if !isTerminal}
    <Card.Root class="p-5">
      <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Order Progress
      </h3>
      <div class="flex items-center justify-between relative">
        <!-- Connection line -->
        <div class="absolute top-4 left-8 right-8 h-0.5 bg-border"></div>
        <div
          class="absolute top-4 left-8 h-0.5 bg-primary transition-all duration-500"
          style="width: {currentIdx >= 0 ? (currentIdx / (steps.length - 1)) * (100 - 16) : 0}%"
        ></div>

        {#each steps as step, idx (step.key)}
          <div class="relative flex flex-col items-center gap-2 z-10">
            <div
              class="h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                {idx <= currentIdx
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-border text-muted-foreground'}
                {idx === currentIdx ? 'ring-4 ring-primary/20 scale-110' : ''}"
            >
              <step.icon class="h-3.5 w-3.5" />
            </div>
            <span
              class="text-[10px] font-semibold {idx <= currentIdx
                ? 'text-foreground'
                : 'text-muted-foreground'}"
            >
              {step.label}
            </span>
          </div>
        {/each}
      </div>
    </Card.Root>
  {:else}
    <Card.Root class="p-4 border-destructive/30 bg-destructive/5">
      <div class="flex items-center gap-2">
        <XCircle class="h-4 w-4 text-destructive" />
        <span class="text-sm font-semibold text-destructive capitalize">{reservation.status}</span>
      </div>
    </Card.Root>
  {/if}

  <!-- Pharmacy Info -->
  <Card.Root class="p-4">
    <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
      Pharmacy
    </h3>
    <div class="flex items-start gap-3">
      <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Store class="h-5 w-5 text-primary" />
      </div>
      <div>
        <p class="text-sm font-semibold text-foreground">{reservation.pharmacyName}</p>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
          <span class="flex items-center gap-1"><MapPin class="h-3 w-3" />{reservation.pharmacyAddress}</span>
          <span class="flex items-center gap-1"><Phone class="h-3 w-3" />{reservation.pharmacyPhone}</span>
        </div>
      </div>
    </div>
  </Card.Root>

  <!-- Items Table -->
  <Card.Root class="overflow-hidden">
    <div class="p-4 border-b">
      <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Items ({reservation.items.length})
      </h3>
    </div>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="text-xs">Medicine</Table.Head>
          <Table.Head class="text-xs text-center">Qty</Table.Head>
          <Table.Head class="text-xs text-right">Price</Table.Head>
          <Table.Head class="text-xs text-right">Subtotal</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each reservation.items as item}
          <Table.Row>
            <Table.Cell>
              <div>
                <span class="text-sm font-medium text-foreground">{item.name}</span>
                <span class="block text-[11px] text-muted-foreground">{item.generic}</span>
                {#if item.rx}
                  <span class="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    <FileText class="h-2.5 w-2.5" /> Rx
                  </span>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="text-center text-sm">{item.qty}</Table.Cell>
            <Table.Cell class="text-right text-sm">৳{item.unitPrice.toFixed(2)}</Table.Cell>
            <Table.Cell class="text-right text-sm font-semibold">৳{item.subtotal.toFixed(2)}</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
    <div class="p-4 border-t flex justify-between items-center">
      <span class="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        <Receipt class="h-3.5 w-3.5" /> Total
      </span>
      <span class="text-xl font-bold text-foreground">৳{reservation.totalAmount.toFixed(2)}</span>
    </div>
  </Card.Root>

  <!-- Pharmacist Note -->
  {#if reservation.pharmacistNote}
    <Card.Root class="p-4">
      <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <MessageSquare class="h-3.5 w-3.5" /> Pharmacist Note
      </h3>
      <blockquote class="border-l-2 border-primary pl-3 text-sm text-muted-foreground italic">
        "{reservation.pharmacistNote}"
      </blockquote>
    </Card.Root>
  {/if}

  <!-- Actions -->
  <div class="flex gap-3">
    {#if reservation.status === "pending"}
      <Button variant="destructive" class="text-xs font-semibold gap-1.5">
        <XCircle class="h-3.5 w-3.5" /> Cancel Reservation
      </Button>
    {/if}
    {#if reservation.status === "delivered"}
      <Button variant="outline" class="text-xs font-semibold gap-1.5">
        <RotateCcw class="h-3.5 w-3.5" /> Reorder
      </Button>
    {/if}
  </div>
</div>
