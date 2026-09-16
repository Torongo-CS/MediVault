<!-- routes/(app)/history/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { onMount } from "svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";
  import type { Id } from "../../../../convex/_generated/dataModel";
  import {
    Search, Store, Calendar, TrendingUp, ShoppingBag, Pill, History as HistoryIcon, Loader2,
  } from "lucide-svelte";

  let { data } = $props();

  let rawReservations = $state<any[]>([]);
  let isLoading = $state(true);
  let searchQuery = $state("");

  onMount(() => {
    const args = data.user?._id
      ? { customerId: data.user._id as Id<"users"> }
      : { customerEmail: "customer@medivault.com" };

    const unsub = convex.onUpdate(
      api.reservations.getByCustomerWithDetails,
      args,
      (items) => {
        rawReservations = items;
        isLoading = false;
      }
    );
    return () => unsub();
  });

  // Only show completed/cancelled orders in history
  const completedStatuses = new Set(["delivered", "completed", "cancelled", "rejected"]);

  const orders = $derived(
    rawReservations
      .filter(r => completedStatuses.has(r.status))
      .map(r => {
        const itemsSummary = r.medsList.map((m: any) => `${m.name} x${m.quantity}`).join(", ");
        return {
          id: r._id,
          pharmacyName: "MediVault Pharmacy",
          itemsSummary,
          itemCount: r.medsList.length,
          totalAmount: r.totalCosting,
          status: r.status,
          date: r.createdAt,
        };
      })
  );

  const filteredOrders = $derived(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) =>
      o.pharmacyName.toLowerCase().includes(q) || o.itemsSummary.toLowerCase().includes(q)
    );
  });

  const totalSpent = $derived(orders.reduce((sum, o) => sum + o.totalAmount, 0));

  // Find most ordered medicine
  const mostOrdered = $derived(() => {
    const counts = new Map<string, number>();
    for (const r of rawReservations) {
      for (const m of r.medsList as any[]) {
        counts.set(m.name, (counts.get(m.name) || 0) + m.quantity);
      }
    }
    if (counts.size === 0) return "—";
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(" ")[0]; // first word of name
  });

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
</script>

<div class="page-root">
  <PageHeader title="Order History" subtitle="View past orders and reorder with one click" showBack={true} backHref="/dashboard" />

  {#if isLoading}
    <div class="flex justify-center items-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>
  {:else}
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
            <p class="history-stat-card__value">{orders.length}</p>
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
            <p class="history-stat-card__value">{mostOrdered()}</p>
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
        description={rawReservations.length > 0 ? "Your active orders haven't been completed yet." : "Your completed orders will appear here."}
        ctaLabel="Browse Medicines"
        ctaHref="/pharmacy"
      />
    {:else}
      <div class="space-y-3">
        {#each filteredOrders() as order (order.id)}
          <a href="/reservations/{order.id}" class="block">
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
              </div>
            </Card.Root>
          </a>
        {/each}
      </div>
    {/if}
  {/if}
</div>
