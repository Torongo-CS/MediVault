<!-- routes/(app)/pharmacy/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import PharmacyCard from "$lib/components/shared/PharmacyCard.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import { Search, SlidersHorizontal, Store } from "lucide-svelte";

  import { onMount } from "svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";

  // Search & filter state
  let searchQuery = $state("");
  let sortBy = $state("name-asc");
  let showFavoritesOnly = $state(false);

  let favoriteIds = $state<Set<string>>(new Set());
  let pharmaciesList = $state<any[]>([]);

  onMount(() => {
    const unsub = convex.onUpdate(api.users.listPharmacies, {}, (data) => {
      if (data && data.length > 0) {
        pharmaciesList = data;
      }
    });
    return () => unsub();
  });

  function toggleFavorite(id: string) {
    const next = new Set(favoriteIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    favoriteIds = next;
  }

  // Filtered & sorted pharmacies
  const filteredPharmacies = $derived(() => {
    let results = pharmaciesList.map((p) => ({
      id: p._id,
      name: p.name,
      address: p.address,
      phone: p.phone,
      description: p.description,
      operatingHours: p.operatingHours,
      rating: p.rating,
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    if (showFavoritesOnly) {
      results = results.filter((p) => favoriteIds.has(p.id));
    }

    if (sortBy === "name-asc") {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => b.name.localeCompare(a.name));
    }

    return results;
  });
</script>

<div class="space-y-6">
  <PageHeader
    title="Search Pharmacies"
    subtitle="Browse and discover pharmacies near you"
    showBack={true}
    backHref="/dashboard"
  />

  <!-- Search & Filter Bar -->
  <div class="flex flex-col sm:flex-row gap-3">
    <div class="relative flex-1">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
      />
      <Input
        type="text"
        placeholder="Search by name, location..."
        bind:value={searchQuery}
        class="pl-9"
      />
    </div>

    <div class="flex gap-2">
      <Button
        variant={showFavoritesOnly ? "default" : "outline"}
        size="sm"
        class="text-xs font-semibold shrink-0"
        onclick={() => (showFavoritesOnly = !showFavoritesOnly)}
      >
        ❤️ Favorites Only
      </Button>

      <Select.Root
        type="single"
        value={sortBy}
        onValueChange={(v) => { if (v) sortBy = v; }}
      >
        <Select.Trigger class="w-[150px] text-xs h-9">
          <SlidersHorizontal class="h-3.5 w-3.5 mr-1.5" />
          <span>Sort</span>
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="name-asc">Name A → Z</Select.Item>
          <Select.Item value="name-desc">Name Z → A</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <!-- Results count -->
  <p class="text-xs text-muted-foreground">
    Showing <strong class="text-foreground">{filteredPharmacies().length}</strong> pharmacies
  </p>

  <!-- Pharmacy Grid -->
  {#if filteredPharmacies().length === 0}
    <EmptyState
      icon={Store}
      headline="No pharmacies found"
      description="Try adjusting your search or removing filters."
    />
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {#each filteredPharmacies() as pharmacy (pharmacy.id)}
        <PharmacyCard
          id={pharmacy.id}
          name={pharmacy.name}
          address={pharmacy.address}
          phone={pharmacy.phone}
          description={pharmacy.description}
          isFavorite={favoriteIds.has(pharmacy.id)}
          onToggleFavorite={toggleFavorite}
        />
      {/each}
    </div>
  {/if}
</div>