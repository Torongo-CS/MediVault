<!-- routes/(app)/pharmacy/[pharmacyID]/+page.svelte -->
<script lang="ts">
  import { page } from "$app/state";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import MedicineCard from "$lib/components/shared/MedicineCard.svelte";
  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { cart } from "$lib/stores/cartStore.svelte";
  import {
    Search,
    MapPin,
    Phone,
    Heart,
    ShoppingCart,
    Pill,
    Shield,
  } from "lucide-svelte";

  const pharmacyId = $derived(page.params.pharmacyID ?? "");

  // Mock pharmacy data — will be replaced with Convex query
  const pharmacy = $derived({
    id: pharmacyId,
    name: "HealthPlus Pharmacy",
    address: "42 Mirpur Road, Dhaka 1205",
    phone: "+880 1712-345678",
    description:
      "Your trusted neighborhood pharmacy with 24/7 service, competitive prices, and a wide range of prescription and OTC medicines.",
    licenseNumber: "DGDA-2024-0042",
  });

  // Search & filter state
  let searchQuery = $state("");
  let activeFilter = $state("all");

  // Mock medicines data
  const medicines = [
    {
      medicineId: "med-1",
      name: "Paracetamol 500mg",
      genericName: "Acetaminophen",
      unitPrice: 2.5,
      stock: 150,
      requiresPrescription: false,
      symptoms: ["Headache", "Fever", "Body pain"],
    },
    {
      medicineId: "med-2",
      name: "Amoxicillin 250mg",
      genericName: "Amoxicillin Trihydrate",
      unitPrice: 8.0,
      stock: 80,
      requiresPrescription: true,
      symptoms: ["Bacterial infection", "Sinusitis", "UTI"],
    },
    {
      medicineId: "med-3",
      name: "Cetirizine 10mg",
      genericName: "Cetirizine Hydrochloride",
      unitPrice: 5.0,
      stock: 200,
      requiresPrescription: false,
      symptoms: ["Allergies", "Runny nose", "Hay fever", "Itching"],
    },
    {
      medicineId: "med-4",
      name: "Omeprazole 20mg",
      genericName: "Omeprazole",
      unitPrice: 6.5,
      stock: 120,
      requiresPrescription: false,
      symptoms: ["Acid reflux", "Heartburn", "GERD"],
    },
    {
      medicineId: "med-5",
      name: "Metformin 500mg",
      genericName: "Metformin Hydrochloride",
      unitPrice: 4.0,
      stock: 0,
      requiresPrescription: true,
      symptoms: ["Type 2 Diabetes"],
    },
    {
      medicineId: "med-6",
      name: "Ciprofloxacin 500mg",
      genericName: "Ciprofloxacin Hydrochloride",
      unitPrice: 12.0,
      stock: 45,
      requiresPrescription: true,
      symptoms: ["Bacterial infection", "UTI", "Respiratory infection"],
    },
    {
      medicineId: "med-7",
      name: "Losartan 50mg",
      genericName: "Losartan Potassium",
      unitPrice: 7.0,
      stock: 90,
      requiresPrescription: true,
      symptoms: ["Hypertension", "High blood pressure"],
    },
    {
      medicineId: "med-8",
      name: "Ibuprofen 400mg",
      genericName: "Ibuprofen",
      unitPrice: 3.0,
      stock: 300,
      requiresPrescription: false,
      symptoms: ["Pain", "Inflammation", "Fever", "Headache"],
    },
  ];

  const filteredMedicines = $derived(() => {
    let results = [...medicines];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.symptoms.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (activeFilter === "otc") {
      results = results.filter((m) => !m.requiresPrescription);
    } else if (activeFilter === "rx") {
      results = results.filter((m) => m.requiresPrescription);
    } else if (activeFilter === "in-stock") {
      results = results.filter((m) => m.stock > 0);
    }

    return results;
  });

  const filters = [
    { key: "all", label: "All" },
    { key: "otc", label: "OTC" },
    { key: "rx", label: "Rx Required" },
    { key: "in-stock", label: "In Stock" },
  ];

  // Cart summary for this pharmacy
  const cartItemsHere = $derived(
    cart.pharmacyId === pharmacyId ? cart.itemCount : 0
  );
  const cartTotalHere = $derived(
    cart.pharmacyId === pharmacyId ? cart.subtotal : 0
  );

  // Pharmacy gradient
  function getGradient(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const opacity = 0.8 + (Math.abs(hash % 20) / 100);
    return `linear-gradient(135deg, hsl(var(--primary) / ${opacity.toFixed(2)}), hsl(var(--accent) / 0.95))`;
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
</script>

<div class="space-y-6">
  <PageHeader
    title=""
    showBack={true}
    backHref="/pharmacy"
  />

  <!-- Pharmacy Banner -->
  <div class="rounded-xl border overflow-hidden bg-card shadow-sm">
    <div
      class="h-36 sm:h-44 flex items-center justify-center relative"
      style:background={getGradient(pharmacy.name)}
    >
      <span class="text-primary-foreground font-black text-6xl drop-shadow-md select-none">
        {getInitials(pharmacy.name)}
      </span>
    </div>

    <div class="p-5 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-foreground mb-1">{pharmacy.name}</h1>
          <p class="text-sm text-muted-foreground mb-4 max-w-xl leading-relaxed">{pharmacy.description}</p>
          <div class="flex flex-wrap gap-x-6 gap-y-2">
            <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <MapPin class="h-3.5 w-3.5 text-primary shrink-0" />
              {pharmacy.address}
            </span>
            <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Phone class="h-3.5 w-3.5 text-primary shrink-0" />
              {pharmacy.phone}
            </span>
            {#if pharmacy.licenseNumber}
              <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Shield class="h-3.5 w-3.5 text-primary shrink-0" />
                {pharmacy.licenseNumber}
              </span>
            {/if}
          </div>
        </div>

        <Button variant="outline" size="sm" class="shrink-0 gap-1.5 text-xs font-semibold hover:border-primary/50 hover:text-primary">
          <Heart class="h-3.5 w-3.5" />
          Favorite
        </Button>
      </div>
    </div>
  </div>

  <!-- Search & Filter -->
  <div class="space-y-3">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search medicines by name, generic name, or symptom..."
        bind:value={searchQuery}
        class="pl-9"
      />
    </div>

    <div class="flex gap-2 flex-wrap">
      {#each filters as filter (filter.key)}
        <Button
          variant={activeFilter === filter.key ? "default" : "outline"}
          size="sm"
          class="text-xs font-semibold h-8"
          onclick={() => (activeFilter = filter.key)}
        >
          {filter.label}
        </Button>
      {/each}
    </div>
  </div>

  <!-- Results -->
  <p class="text-xs text-muted-foreground">
    Showing <strong class="text-foreground">{filteredMedicines().length}</strong> medicines
  </p>

  {#if filteredMedicines().length === 0}
    <EmptyState
      icon={Pill}
      headline="No medicines found"
      description="Try adjusting your search or removing filters."
    />
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {#each filteredMedicines() as med (med.medicineId)}
        <MedicineCard
          medicineId={med.medicineId}
          name={med.name}
          genericName={med.genericName}
          unitPrice={med.unitPrice}
          stock={med.stock}
          requiresPrescription={med.requiresPrescription}
          symptoms={med.symptoms}
          pharmacyId={pharmacyId}
          pharmacyName={pharmacy?.name ?? "Pharmacy"}
          detailHref="/pharmacy/{pharmacyId}/{med.medicineId}"
        />
      {/each}
    </div>
  {/if}

  <!-- Sticky Cart Summary Bar -->
  {#if cartItemsHere > 0}
    <div
      class="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm shadow-lg"
    >
      <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart class="h-4 w-4 text-primary" />
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">
              {cartItemsHere} item{cartItemsHere === 1 ? "" : "s"} in cart
            </p>
            <p class="text-xs text-muted-foreground">৳{cartTotalHere.toFixed(2)} estimated</p>
          </div>
        </div>
        <Button class="text-xs font-semibold gap-1.5" onclick={() => cart.open()}>
          <ShoppingCart class="h-3.5 w-3.5" />
          View Cart
        </Button>
      </div>
    </div>
  {/if}
</div>