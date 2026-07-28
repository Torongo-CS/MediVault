<!-- routes/(app)/pharmacy/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import PharmacyCard from "$lib/components/shared/PharmacyCard.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import { Search, SlidersHorizontal, Store } from "lucide-svelte";

  // Search & filter state
  let searchQuery = $state("");
  let sortBy = $state("name-asc");
  let showFavoritesOnly = $state(false);

  // Track favorites locally (will connect to Convex later)
  let favoriteIds = $state<Set<string>>(new Set(["ph-2", "ph-5"]));

  function toggleFavorite(id: string) {
    const next = new Set(favoriteIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    favoriteIds = next;
  }

  // Mock pharmacy data — will be replaced with Convex query
  const pharmacies = [
    {
      id: "ph-1",
      name: "HealthPlus Pharmacy",
      address: "42 Mirpur Road, Dhaka 1205",
      phone: "+880 1712-345678",
      description: "Your trusted neighborhood pharmacy with 24/7 service and competitive prices.",
    },
    {
      id: "ph-2",
      name: "CarePoint Medical Store",
      address: "15 Gulshan Avenue, Dhaka 1212",
      phone: "+880 1898-765432",
      description: "Premium pharmacy specializing in imported medicines and healthcare products.",
    },
    {
      id: "ph-3",
      name: "MediCare Pharmacy",
      address: "7 Dhanmondi R/A, Dhaka 1209",
      phone: "+880 1555-112233",
      description: "Family-owned pharmacy serving the community for over 20 years.",
    },
    {
      id: "ph-4",
      name: "Green Cross Dispensary",
      address: "89 Banani Model Town, Dhaka 1213",
      phone: "+880 1678-998877",
      description: "Modern dispensary with digital prescription management and home delivery.",
    },
    {
      id: "ph-5",
      name: "University Health Center",
      address: "BUET Campus, Polashi, Dhaka 1000",
      phone: "+880 1911-445566",
      description: "Campus health center providing affordable medicines for students and staff.",
    },
    {
      id: "ph-6",
      name: "Lazz Pharma",
      address: "156 Motijheel C/A, Dhaka 1000",
      phone: "+880 1811-223344",
      description: "One of the largest pharmacy chains in Bangladesh with extensive stock.",
    },
  ];

  // Filtered & sorted pharmacies
  const filteredPharmacies = $derived(() => {
    let results = [...pharmacies];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      results = results.filter((p) => favoriteIds.has(p.id));
    }

    // Sort
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