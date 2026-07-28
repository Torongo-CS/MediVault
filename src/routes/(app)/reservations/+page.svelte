<!-- routes/(app)/reservations/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import StatusBadge from "$lib/components/shared/StatusBadge.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { CalendarCheck, Store, Package, ChevronRight, Clock } from "lucide-svelte";

  type Status = "pending" | "approved" | "rejected" | "expired" | "ready" | "delivered" | "cancelled";

  interface Reservation {
    id: string; pharmacyName: string; itemCount: number;
    totalAmount: number; status: Status; requestDate: number; pickupDate: number;
  }

  const reservations: Reservation[] = [
    { id: "res-1", pharmacyName: "HealthPlus Pharmacy", itemCount: 3, totalAmount: 45.5, status: "pending", requestDate: Date.now() - 2 * 60 * 60 * 1000, pickupDate: Date.now() + 24 * 60 * 60 * 1000 },
    { id: "res-2", pharmacyName: "CarePoint Medical Store", itemCount: 1, totalAmount: 12.0, status: "approved", requestDate: Date.now() - 24 * 60 * 60 * 1000, pickupDate: Date.now() + 12 * 60 * 60 * 1000 },
    { id: "res-3", pharmacyName: "Green Cross Dispensary", itemCount: 5, totalAmount: 89.0, status: "ready", requestDate: Date.now() - 48 * 60 * 60 * 1000, pickupDate: Date.now() + 6 * 60 * 60 * 1000 },
    { id: "res-4", pharmacyName: "HealthPlus Pharmacy", itemCount: 2, totalAmount: 25.0, status: "delivered", requestDate: Date.now() - 7 * 24 * 60 * 60 * 1000, pickupDate: Date.now() - 6 * 24 * 60 * 60 * 1000 },
    { id: "res-5", pharmacyName: "Lazz Pharma", itemCount: 4, totalAmount: 62.5, status: "rejected", requestDate: Date.now() - 3 * 24 * 60 * 60 * 1000, pickupDate: Date.now() - 2 * 24 * 60 * 60 * 1000 },
  ];

  let activeTab = $state("active");
  const activeStatuses = new Set<Status>(["pending", "approved", "ready"]);
  const completedStatuses = new Set<Status>(["delivered"]);

  const filteredReservations = $derived(() => {
    if (activeTab === "active") return reservations.filter((r) => activeStatuses.has(r.status));
    if (activeTab === "completed") return reservations.filter((r) => completedStatuses.has(r.status));
    return reservations;
  });

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
</script>

<div class="page-root">
  <PageHeader title="My Reservations" subtitle="Track and manage your medicine reservations" showBack={true} backHref="/dashboard" />

  <Tabs.Root bind:value={activeTab}>
    <Tabs.List class="mb-4">
      <Tabs.Trigger value="active">Active</Tabs.Trigger>
      <Tabs.Trigger value="completed">Completed</Tabs.Trigger>
      <Tabs.Trigger value="all">All</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value={activeTab}>
      {#if filteredReservations().length === 0}
        <EmptyState
          icon={CalendarCheck}
          headline="No reservations found"
          description={activeTab === "active" ? "You don't have any active reservations right now." : "No reservations match this filter."}
          ctaLabel="Search Pharmacies"
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
                      <span class="reservation-card__pharmacy">{res.pharmacyName}</span>
                    </div>
                    <div class="reservation-card__counts">
                      <span class="flex items-center gap-1.5">
                        <Package class="h-3.5 w-3.5" />
                        {res.itemCount} item{res.itemCount === 1 ? "" : "s"}
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
</div>
