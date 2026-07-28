<!-- routes/(app)/favorites/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import PharmacyCard from "$lib/components/shared/PharmacyCard.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Heart } from "lucide-svelte";

  // Mock favorites — will be replaced with Convex query
  let favoritePharmacies = $state([
    {
      id: "ph-2",
      name: "CarePoint Medical Store",
      address: "15 Gulshan Avenue, Dhaka 1212",
      phone: "+880 1898-765432",
      description: "Premium pharmacy specializing in imported medicines and healthcare products.",
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
  ]);

  function removeFavorite(id: string) {
    favoritePharmacies = favoritePharmacies.filter((p) => p.id !== id);
  }
</script>

<div class="space-y-6">
  <PageHeader title="Favorites" subtitle="Your saved pharmacies for quick access" showBack={true} backHref="/dashboard" />

  <p class="text-xs text-muted-foreground">
    You have <strong class="text-foreground">{favoritePharmacies.length}</strong> saved
    {favoritePharmacies.length === 1 ? "pharmacy" : "pharmacies"}
  </p>

  {#if favoritePharmacies.length === 0}
    <EmptyState
      icon={Heart}
      headline="No favorites yet"
      description="Heart a pharmacy while browsing to save it here for quick access."
      ctaLabel="Discover Pharmacies"
      ctaHref="/pharmacy"
    />
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {#each favoritePharmacies as pharmacy (pharmacy.id)}
        <PharmacyCard
          id={pharmacy.id}
          name={pharmacy.name}
          address={pharmacy.address}
          phone={pharmacy.phone}
          description={pharmacy.description}
          isFavorite={true}
          onToggleFavorite={removeFavorite}
        />
      {/each}
    </div>
  {/if}
</div>
