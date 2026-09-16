<!-- routes/(app)/reservations/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Card from "$lib/components/ui/card";
  import { CalendarCheck, Store, Package, ChevronRight, Clock, Loader2 } from "lucide-svelte";
  import { onMount } from "svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";

  type Status = "pending" | "approved" | "rejected" | "expired" | "ready" | "delivered" | "cancelled" | "completed";

  let { data } = $props();
  // data.user is the server-loaded logged-in user (id, email, role)

  let rawReservations = $state<any[]>([]);
  let isLoading = $state(true);

  onMount(() => {
    const args = data.user?._id
      ? { customerId: data.user._id as any }
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

  const reservations = $derived(
    rawReservations.map(r => {
      const topItems = r.medsList.slice(0, 2).map((m: any) => `${m.name} x${m.quantity}`).join(", ");
      const moreCount = r.medsList.length > 2 ? ` +${r.medsList.length - 2} more` : "";
      return {
        id: r._id,
        itemsDescription: `${topItems}${moreCount}`,
        totalAmount: r.totalCosting,
        status: r.status as Status,
        requestDate: r.createdAt,
        pickupDate: r.pickupDate,
      };
    })
  );

  let activeTab = $state("active");
  const activeStatuses = new Set<Status>(["pending", "approved", "ready"]);
  const completedStatuses = new Set<Status>(["delivered", "completed", "cancelled", "rejected"]);

  const filteredReservations = $derived(() => {
    if (activeTab === "active") return reservations.filter((r) => activeStatuses.has(r.status));
    if (activeTab === "completed") return reservations.filter((r) => completedStatuses.has(r.status));
    return reservations;
  });

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
</script>

<div class="page-root">
  <PageHeader title="My Reservations" subtitle="Track and manage your medicine reservations" showBack={true} backHref="/dashboard" />

  {#if isLoading}
    <div class="flex justify-center items-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>
  {:else}
    <Tabs.Root bind:value={activeTab}>
      <Tabs.List class="mb-4">
        <Tabs.Trigger value="active">Active ({reservations.filter(r => activeStatuses.has(r.status)).length})</Tabs.Trigger>
        <Tabs.Trigger value="completed">Completed</Tabs.Trigger>
        <Tabs.Trigger value="all">All ({reservations.length})</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value={activeTab}>
        {#if filteredReservations().length === 0}
          <EmptyState
            icon={CalendarCheck}
            headline="No reservations found"
            description={activeTab === "active" ? "You don't have any active reservations right now." : "No reservations match this filter."}
            ctaLabel="Browse Medicines"
            ctaHref="/pharmacy"
          />
        {:else}
          <div class="space-y-4">
            {#each filteredReservations() as res (res.id)}
              <a href="/reservations/{res.id}" class="block group">
                <Card.Root class="p-5 card-interactive">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="reservation-card__header">
                        <Store class="h-4 w-4 text-primary/60 shrink-0" />
                        <span class="reservation-card__pharmacy">MediVault Pharmacy</span>
                      </div>
                      <div class="reservation-card__counts">
                        <span class="flex items-center gap-1.5">
                          <Package class="h-3.5 w-3.5" />
                          {res.itemsDescription}
                        </span>
                        <span class="font-bold text-foreground text-base">৳{res.totalAmount.toFixed(2)}</span>
                      </div>
                      <div class="reservation-card__times">
                        <span class="flex items-center gap-1.5">
                          <Clock class="h-3 w-3" /> Requested {timeAgo(res.requestDate)}
                        </span>
                        <span>Pickup: {formatDate(res.pickupDate)}</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-3 shrink-0">
                      <StatusBadge status={res.status} size="sm" />
                      <ChevronRight class="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Card.Root>
              </a>
            {/each}
          </div>
        {/if}
      </Tabs.Content>
    </Tabs.Root>
  {/if}
</div>
