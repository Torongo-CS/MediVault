<!-- routes/(app)/pharmacy/[pharmacyID]/[MedicineID]/+page.svelte -->
<script lang="ts">
  import { page } from "$app/state";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import QuantitySelector from "$lib/components/shared/QuantitySelector.svelte";
  import { cart } from "$lib/stores/cartStore.svelte";
  import {
    Pill,
    ShoppingCart,
    FileText,
    Calendar,
    AlertTriangle,
    Brain,
    Sparkles,
    Info,
    Tag,
    Upload,
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../../../convex/_generated/api";

  const pharmacyId = $derived(page.params.pharmacyID ?? "");
  const medicineId = $derived(page.params.MedicineID ?? "");

  let dbPharmacies = $state<any[]>([]);
  let dbMedicine = $state<any | null>(null);

  onMount(() => {
    const unsubP = convex.onUpdate(api.users.listPharmacies, {}, (data) => {
      if (data) dbPharmacies = data;
    });

    const unsubM = convex.onUpdate(
      api.medicines.getById,
      { medicineId: medicineId as any },
      (medData) => {
        if (medData) dbMedicine = medData;
      }
    );

    return () => {
      unsubP();
      unsubM();
    };
  });

  const pharmacyObj = $derived(() => {
    const found = dbPharmacies.find((p) => p._id === pharmacyId);
    return {
      id: pharmacyId,
      name: found ? found.name : "Pharmacy Store",
    };
  });

  const medicineObj = $derived(() => {
    if (dbMedicine) {
      return {
        medicineId: dbMedicine._id,
        name: dbMedicine.name,
        genericName: dbMedicine.genericName,
        description: dbMedicine.description || "No detailed description available.",
        unitPrice: dbMedicine.unitSellingPrice ?? 0,
        stock: dbMedicine.stock ?? 0,
        requiresPrescription: !!dbMedicine.requiresPrescription,
        symptoms: dbMedicine.symptoms || [],
        mfgDate: Date.now() - 180 * 24 * 60 * 60 * 1000,
        expiryDate: dbMedicine.expiryDate || Date.now() + 540 * 24 * 60 * 60 * 1000,
      };
    }
    return {
      medicineId,
      name: "Loading Medicine...",
      genericName: "",
      description: "Fetching medicine details from database...",
      unitPrice: 0,
      stock: 0,
      requiresPrescription: false,
      symptoms: [],
      mfgDate: Date.now(),
      expiryDate: Date.now(),
    };
  });

  const inStock = $derived(medicineObj().stock > 0);
  const cartQty = $derived(cart.getItemQuantity(medicineId));
  const isInCart = $derived(cartQty > 0);

  let selectedQty = $state(1);
  let showFullDescription = $state(false);
  let aiExplanation = $state("");
  let isExplaining = $state(false);

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleAddToCart() {
    const med = medicineObj();
    const pharm = pharmacyObj();
    const result = cart.addItem(pharmacyId, pharm.name, {
      medicineId: med.medicineId,
      medicineName: med.name,
      genericName: med.genericName,
      unitPrice: med.unitPrice,
      requiresPrescription: med.requiresPrescription,
      stock: med.stock,
    }, selectedQty);

    if (result === "pharmacy_conflict") {
      const confirmed = confirm(
        `Your cart has items from "${cart.pharmacyName}". Switch to "${pharm.name}" and clear the current cart?`
      );
      if (confirmed) {
        cart.switchPharmacyAndAdd(pharmacyId, pharm.name, {
          medicineId: med.medicineId,
          medicineName: med.name,
          genericName: med.genericName,
          unitPrice: med.unitPrice,
          requiresPrescription: med.requiresPrescription,
          stock: med.stock,
        }, selectedQty);
      }
    }
  }

  function handleExplain() {
    isExplaining = true;
    aiExplanation = "";
    setTimeout(() => {
      const med = medicineObj();
      aiExplanation =
        `${med.name} (${med.genericName}) is prescribed or used for ${med.symptoms.join(", ") || "general symptoms"}. ` +
        `It is available from ${pharmacyObj().name} for ৳${med.unitPrice.toFixed(2)} per unit. ` +
        (med.requiresPrescription ? "Note: A valid doctor prescription is required to fulfill this medicine." : "This is an OTC medicine and does not require a prescription.");
      isExplaining = false;
    }, 1200);
  }

  // Gradient for medicine placeholder
  function getGradient(n: string): string {
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs((hash * 7) % 360);
    const h2 = (h1 + 35) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 50%, 60%), hsl(${h2}, 60%, 50%))`;
  }
</script>

<div class="space-y-6 max-w-5xl">
  <PageHeader
    title={medicineObj().name}
    subtitle={medicineObj().genericName}
    showBack={true}
    backHref="/pharmacy/{pharmacyId}"
  />

  <!-- Main layout: two columns on desktop -->
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
    <!-- Left: Image -->
    <div class="lg:col-span-2">
      <div
        class="rounded-xl overflow-hidden aspect-square flex items-center justify-center"
        style:background={getGradient(medicineObj().name)}
      >
        <Pill class="h-20 w-20 text-white/70 drop-shadow-lg" />
      </div>
    </div>

    <!-- Right: Details -->
    <div class="lg:col-span-3 space-y-5">
      <!-- Name & Generic -->
      <div>
        <h1 class="text-2xl font-bold text-foreground mb-1">{medicineObj().name}</h1>
        <p class="text-sm text-muted-foreground">{medicineObj().genericName}</p>
      </div>

      <!-- Price & Stock -->
      <div class="flex items-center gap-4">
        <span class="text-3xl font-bold text-primary">
          ৳{medicineObj().unitPrice.toFixed(2)}
        </span>
        <span class="text-xs text-muted-foreground">/unit</span>
        <div class="ml-auto">
          {#if inStock}
            <Badge
              variant="secondary"
              class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              {medicineObj().stock} in stock
            </Badge>
          {:else}
            <Badge variant="destructive" class="font-semibold">Out of Stock</Badge>
          {/if}
        </div>
      </div>

      <!-- Rx Warning -->
      {#if medicineObj().requiresPrescription}
        <div
          class="flex items-start gap-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
        >
          <FileText class="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Prescription Required
            </p>
            <p class="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              A valid prescription must be attached from your vault at checkout.
            </p>
            <Button
              href="/prescriptions"
              variant="outline"
              size="sm"
              class="mt-3 gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
            >
              <Upload class="h-3.5 w-3.5" />
              Add Prescription
            </Button>
          </div>
        </div>
      {/if}

      <!-- Description -->
      <div>
        <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
          Description
        </h3>
        <p class="text-sm text-muted-foreground leading-relaxed {showFullDescription ? '' : 'line-clamp-3'}">
          {medicineObj().description}
        </p>
        {#if medicineObj().description && medicineObj().description.length > 150}
          <button
            class="text-xs text-primary font-semibold mt-1 hover:underline"
            onclick={() => (showFullDescription = !showFullDescription)}
          >
            {showFullDescription ? "Show less" : "Read more"}
          </button>
        {/if}
      </div>

      <!-- Symptoms Tags -->
      {#if medicineObj().symptoms.length > 0}
        <div>
          <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Tag class="h-3.5 w-3.5" />
            Used for
          </h3>
          <div class="flex flex-wrap gap-1.5">
            {#each medicineObj().symptoms as symptom}
              <Badge variant="secondary" class="text-xs px-2 py-0.5 font-medium">{symptom}</Badge>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Expiry -->
      <div class="flex gap-6 text-xs text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <Calendar class="h-3.5 w-3.5" />
          Mfg: {formatDate(medicineObj().mfgDate)}
        </span>
        <span class="flex items-center gap-1.5">
          <Calendar class="h-3.5 w-3.5" />
          Exp: {formatDate(medicineObj().expiryDate)}
        </span>
      </div>

      <!-- Add to Cart -->
      {#if inStock}
        <Card.Root class="p-4 bg-muted/30">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="text-xs font-semibold text-foreground">Qty:</span>
              {#if isInCart}
                <QuantitySelector
                  value={cartQty}
                  max={medicineObj().stock}
                  onchange={(qty) => cart.updateQuantity(medicineId, qty)}
                />
              {:else}
                <QuantitySelector
                  value={selectedQty}
                  max={medicineObj().stock}
                  onchange={(qty) => (selectedQty = qty)}
                />
              {/if}
            </div>

            <div class="text-right">
              <p class="text-lg font-bold text-foreground">
                ৳{(medicineObj().unitPrice * (isInCart ? cartQty : selectedQty)).toFixed(2)}
              </p>
              <p class="text-[10px] text-muted-foreground">
                ৳{medicineObj().unitPrice.toFixed(2)} × {isInCart ? cartQty : selectedQty}
              </p>
            </div>
          </div>

          <div class="mt-3">
            {#if isInCart}
              <Button
                class="w-full font-semibold gap-1.5"
                variant="outline"
                onclick={() => cart.open()}
              >
                <ShoppingCart class="h-4 w-4" />
                View in Cart ({cartQty} added)
              </Button>
            {:else}
              <Button class="w-full font-semibold gap-1.5" onclick={handleAddToCart}>
                <ShoppingCart class="h-4 w-4" />
                Add to Cart
              </Button>
            {/if}
          </div>
        </Card.Root>
      {/if}
    </div>
  </div>

  <!-- AI Explainer -->
  <Card.Root class="p-5 border-dashed">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
        <Brain class="h-4 w-4 text-primary" />
        AI Medicine Explainer
      </h3>
      <Button
        variant="outline"
        size="sm"
        class="text-xs font-semibold gap-1.5"
        onclick={handleExplain}
        disabled={isExplaining}
      >
        <Sparkles class="h-3.5 w-3.5" />
        {isExplaining ? "Analyzing..." : "Explain in simple terms"}
      </Button>
    </div>

    {#if isExplaining}
      <div class="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <div class="flex gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"></span>
          <span
            class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce bounce-delay-1"
          ></span>
          <span
            class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce bounce-delay-2"
          ></span>
        </div>
        AI is analyzing this medicine...
      </div>
    {:else if aiExplanation}
      <div class="p-3.5 rounded-lg bg-muted border">
        <div class="flex items-start gap-2.5">
          <Info class="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p class="text-sm text-foreground leading-relaxed">{aiExplanation}</p>
        </div>
      </div>
    {:else}
      <p class="text-xs text-muted-foreground py-2">
        Click the button above to get a simple, easy-to-understand explanation of this medicine.
      </p>
    {/if}
  </Card.Root>
</div>