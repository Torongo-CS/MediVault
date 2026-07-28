<!-- routes/(app)/history/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import {
    Search, RotateCcw, Store, Calendar, TrendingUp, ShoppingBag, Pill, History as HistoryIcon,
  } from "lucide-svelte";

  let searchQuery = $state("");

  const orders = [
    { id: "res-10", pharmacyName: "HealthPlus Pharmacy", itemsSummary: "Paracetamol 500mg, Cetirizine 10mg", itemCount: 2, totalAmount: 35.0, status: "delivered" as const, date: Date.now() - 3 * 24 * 60 * 60 * 1000 },
    { id: "res-11", pharmacyName: "CarePoint Medical Store", itemsSummary: "Amoxicillin 250mg", itemCount: 1, totalAmount: 56.0, status: "delivered" as const, date: Date.now() - 10 * 24 * 60 * 60 * 1000 },
    { id: "res-12", pharmacyName: "Lazz Pharma", itemsSummary: "Omeprazole 20mg, Losartan 50mg, Ibuprofen 400mg", itemCount: 3, totalAmount: 72.5, status: "delivered" as const, date: Date.now() - 18 * 24 * 60 * 60 * 1000 },
    { id: "res-13", pharmacyName: "HealthPlus Pharmacy", itemsSummary: "Ciprofloxacin 500mg, Paracetamol 500mg", itemCount: 2, totalAmount: 49.0, status: "delivered" as const, date: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  ];

  const filteredOrders = $derived(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) =>
      o.pharmacyName.toLowerCase().includes(q) || o.itemsSummary.toLowerCase().includes(q)
    );
  });

  const totalSpent = $derived(orders.reduce((sum, o) => sum + o.totalAmount, 0));
  const totalOrders = orders.length;

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
</script>

<div class="page-root">
  <PageHeader title="Order History" subtitle="View past orders and reorder with one click" showBack={true} backHref="/dashboard" />

  <!-- Spending Stats -->
  <div class="history-stats-grid">
    <Card.Root class="p-4">
      <div class="history-stat-card__inner">
        <div class="icon-box bg-primary/10">
          <TrendingUp class="h-5 w-5 text-primary" />
        </div>
        <div>
          <p class="history-stat-card__value">৳{totalSpent.toFixed(2)}</p>
          <p class="history-stat-card__label">Total Spent</p>
        </div>
      </div>
    </Card.Root>
    <Card.Root class="p-4">
      <div class="history-stat-card__inner">
        <div class="icon-box bg-primary/10">
          <ShoppingBag class="h-5 w-5 text-primary" />
        </div>
        <div>
          <p class="history-stat-card__value">{totalOrders}</p>
          <p class="history-stat-card__label">Total Orders</p>
        </div>
      </div>
    </Card.Root>
    <Card.Root class="p-4">
      <div class="history-stat-card__inner">
        <div class="icon-box bg-primary/10">
          <Pill class="h-5 w-5 text-primary" />
        </div>
        <div>
          <p class="history-stat-card__value">Paracetamol</p>
          <p class="history-stat-card__label">Most Ordered</p>
        </div>
      </div>
    </Card.Root>
  </div>

  <!-- Search -->
  <div class="relative">
    <Search class="search-icon" />
    <Input type="text" placeholder="Search by pharmacy or medicine name..." bind:value={searchQuery} class="pl-9" />
  </div>

  <!-- Orders -->
  {#if filteredOrders().length === 0}
    <EmptyState
      icon={HistoryIcon}
      headline="No order history"
      description="Your completed orders will appear here."
      ctaLabel="Browse Pharmacies"
      ctaHref="/pharmacy"
    />
  {:else}
    <div class="space-y-3">
      {#each filteredOrders() as order (order.id)}
        <Card.Root class="p-4 card-interactive">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="order-card__header">
                <Store class="h-3.5 w-3.5 text-primary/60 shrink-0" />
                <span class="order-card__pharmacy">{order.pharmacyName}</span>
              </div>
              <p class="order-card__summary">{order.itemsSummary}</p>
              <div class="order-card__meta">
                <span class="flex items-center gap-1">
                  <Calendar class="h-3 w-3" /> {formatDate(order.date)}
                </span>
                <span class="order-card__amount">৳{order.totalAmount.toFixed(2)}</span>
                <StatusBadge status={order.status} size="sm" />
              </div>
            </div>
            <Button variant="outline" size="sm" class="text-xs font-semibold gap-1 shrink-0">
              <RotateCcw class="h-3 w-3" /> Reorder
            </Button>
          </div>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
