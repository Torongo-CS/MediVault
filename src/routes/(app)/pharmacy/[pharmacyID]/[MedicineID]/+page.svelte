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

  const pharmacyId = $derived(page.params.pharmacyID ?? "");
  const medicineId = $derived(page.params.MedicineID ?? "");

  // Mock data — will be replaced with Convex query
  const pharmacy = $derived({ id: pharmacyId, name: "HealthPlus Pharmacy" });

  const medicine = $derived({
    medicineId,
    name: "Paracetamol 500mg",
    genericName: "Acetaminophen",
    description:
      "Paracetamol is a common painkiller used to treat aches and pain. It can also be used to reduce a high temperature. It's available combined with other painkillers and anti-sickness medicines. It's also an ingredient in a wide range of cold and flu remedies.",
    unitPrice: 2.5,
    stock: 150,
    requiresPrescription: false,
    symptoms: ["Headache", "Fever", "Body pain", "Toothache", "Cold"],
    mfgDate: Date.now() - 180 * 24 * 60 * 60 * 1000,
    expiryDate: Date.now() + 540 * 24 * 60 * 60 * 1000,
  });

  const inStock = $derived(medicine.stock > 0);
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
    const result = cart.addItem(pharmacyId, pharmacy.name, {
      medicineId: medicine.medicineId,
      medicineName: medicine.name,
      genericName: medicine.genericName,
      unitPrice: medicine.unitPrice,
      requiresPrescription: medicine.requiresPrescription,
      stock: medicine.stock,
    }, selectedQty);

    if (result === "pharmacy_conflict") {
      const confirmed = confirm(
        `Your cart has items from "${cart.pharmacyName}". Switch to "${pharmacy.name}" and clear the current cart?`
      );
      if (confirmed) {
        cart.switchPharmacyAndAdd(pharmacyId, pharmacy.name, {
          medicineId: medicine.medicineId,
          medicineName: medicine.name,
          genericName: medicine.genericName,
          unitPrice: medicine.unitPrice,
          requiresPrescription: medicine.requiresPrescription,
          stock: medicine.stock,
        }, selectedQty);
      }
    }
  }

  function handleExplain() {
    isExplaining = true;
    aiExplanation = "";
    // Simulated AI response
    setTimeout(() => {
      aiExplanation =
        "Paracetamol is a very common medicine that helps with two main things: reducing pain and lowering fever. Think of it as your go-to for headaches, toothaches, or when you're feeling feverish from a cold. It works by blocking certain chemicals in your brain that cause pain signals. It's generally very safe when taken as directed — usually 1-2 tablets every 4-6 hours, but never more than 8 tablets in 24 hours. Unlike ibuprofen, it's gentle on your stomach.";
      isExplaining = false;
    }, 1500);
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
    title={medicine.name}
    subtitle={medicine.genericName}
    showBack={true}
    backHref="/pharmacy/{pharmacyId}"
  />

  <!-- Main layout: two columns on desktop -->
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
    <!-- Left: Image -->
    <div class="lg:col-span-2">
      <div
        class="rounded-xl overflow-hidden aspect-square flex items-center justify-center"
        style:background={getGradient(medicine.name)}
      >
        <Pill class="h-20 w-20 text-white/70 drop-shadow-lg" />
      </div>
    </div>

    <!-- Right: Details -->
    <div class="lg:col-span-3 space-y-5">
      <!-- Name & Generic -->
      <div>
        <h1 class="text-2xl font-bold text-foreground mb-1">{medicine.name}</h1>
        <p class="text-sm text-muted-foreground">{medicine.genericName}</p>
      </div>

      <!-- Price & Stock -->
      <div class="flex items-center gap-4">
        <span class="text-3xl font-bold text-primary">
          ৳{medicine.unitPrice.toFixed(2)}
        </span>
        <span class="text-xs text-muted-foreground">/unit</span>
        <div class="ml-auto">
          {#if inStock}
            <Badge
              variant="secondary"
              class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              {medicine.stock} in stock
            </Badge>
          {:else}
            <Badge variant="destructive" class="font-semibold">Out of Stock</Badge>
          {/if}
        </div>
      </div>

      <!-- Rx Warning -->
      {#if medicine.requiresPrescription}
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
          {medicine.description}
        </p>
        {#if medicine.description && medicine.description.length > 150}
          <button
            class="text-xs text-primary font-semibold mt-1 hover:underline"
            onclick={() => (showFullDescription = !showFullDescription)}
          >
            {showFullDescription ? "Show less" : "Read more"}
          </button>
        {/if}
      </div>

      <!-- Symptoms Tags -->
      <div>
        <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Tag class="h-3.5 w-3.5" />
          Used for
        </h3>
        <div class="flex flex-wrap gap-1.5">
          {#each medicine.symptoms as symptom}
            <Badge variant="secondary" class="text-xs px-2 py-0.5 font-medium">{symptom}</Badge>
          {/each}
        </div>
      </div>

      <!-- Expiry -->
      <div class="flex gap-6 text-xs text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <Calendar class="h-3.5 w-3.5" />
          Mfg: {formatDate(medicine.mfgDate)}
        </span>
        <span class="flex items-center gap-1.5">
          <Calendar class="h-3.5 w-3.5" />
          Exp: {formatDate(medicine.expiryDate)}
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
                  max={medicine.stock}
                  onchange={(qty) => cart.updateQuantity(medicineId, qty)}
                />
              {:else}
                <QuantitySelector
                  value={selectedQty}
                  max={medicine.stock}
                  onchange={(qty) => (selectedQty = qty)}
                />
              {/if}
            </div>

            <div class="text-right">
              <p class="text-lg font-bold text-foreground">
                ৳{(medicine.unitPrice * (isInCart ? cartQty : selectedQty)).toFixed(2)}
              </p>
              <p class="text-[10px] text-muted-foreground">
                ৳{medicine.unitPrice.toFixed(2)} × {isInCart ? cartQty : selectedQty}
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