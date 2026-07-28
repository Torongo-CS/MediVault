<!-- src/lib/components/shared/MedicineCard.svelte -->
<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import QuantitySelector from "./QuantitySelector.svelte";
  import { ShoppingCart, FileText, Pill } from "lucide-svelte";
  import { cart } from "$lib/stores/cartStore.svelte";

  interface Props {
    medicineId: string;
    name: string;
    genericName: string;
    unitPrice: number;
    stock: number;
    requiresPrescription: boolean;
    symptoms?: string[];
    imageUrl?: string;
    pharmacyId: string;
    pharmacyName: string;
    detailHref?: string;
  }

  let {
    medicineId,
    name,
    genericName,
    unitPrice,
    stock,
    requiresPrescription,
    symptoms = [],
    imageUrl,
    pharmacyId,
    pharmacyName,
    detailHref,
  }: Props = $props();

  const inStock = $derived(stock > 0);
  const cartQty = $derived(cart.getItemQuantity(medicineId));
  const isInCart = $derived(cartQty > 0);
  const visibleSymptoms = $derived(symptoms.slice(0, 3));
  const extraSymptomCount = $derived(Math.max(0, symptoms.length - 3));

  function getGradient(n: string): string {
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs((hash * 7) % 360);
    const h2 = (h1 + 35) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 50%, 60%), hsl(${h2}, 60%, 50%))`;
  }

  function handleAddToCart() {
    const result = cart.addItem(pharmacyId, pharmacyName, {
      medicineId, medicineName: name, genericName, unitPrice, requiresPrescription, stock,
    });
    if (result === "pharmacy_conflict") {
      const confirmed = confirm(
        `Your cart has items from "${cart.pharmacyName}". Switch to "${pharmacyName}" and clear the current cart?`
      );
      if (confirmed) {
        cart.switchPharmacyAndAdd(pharmacyId, pharmacyName, {
          medicineId, medicineName: name, genericName, unitPrice, requiresPrescription, stock,
        });
      }
    }
  }

  function handleQuantityChange(newQty: number) {
    cart.updateQuantity(medicineId, newQty);
  }
</script>

<Card.Root class="group overflow-hidden border bg-card hover:shadow-lg hover:border-primary/20 transition-all duration-300 flex flex-col">
  <a href={detailHref} class="block">
    <div
      class="med-card__banner"
      style:background={imageUrl ? `url(${imageUrl}) center/cover` : getGradient(name)}
    >
      <Pill class="h-10 w-10 text-white/80 drop-shadow-md" />

      <div class="med-card__rx-overlay">
        {#if requiresPrescription}
          <span class="med-card__badge bg-amber-500/90">
            <FileText class="h-3 w-3" />
            Rx
          </span>
        {/if}
      </div>

      <div class="med-card__stk-overlay">
        {#if inStock}
          <span class="med-card__badge bg-emerald-500/90">
            <span class="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
            {stock} in stock
          </span>
        {:else}
          <span class="med-card__badge bg-red-500/90">Out of Stock</span>
        {/if}
      </div>
    </div>
  </a>

  <Card.Content class="p-4 flex flex-col flex-1">
    <a href={detailHref} class="block mb-1">
      <h3 class="med-card__name">{name}</h3>
    </a>
    <p class="med-card__generic">{genericName}</p>

    {#if visibleSymptoms.length > 0}
      <div class="med-card__symptoms">
        {#each visibleSymptoms as symptom}
          <Badge variant="secondary" class="text-[10px] px-1.5 py-0 font-medium">{symptom}</Badge>
        {/each}
        {#if extraSymptomCount > 0}
          <Badge variant="outline" class="text-[10px] px-1.5 py-0 font-medium">+{extraSymptomCount}</Badge>
        {/if}
      </div>
    {/if}

    <div class="flex-1"></div>

    <div class="med-card__footer">
      <div>
        <span class="med-card__price">৳{unitPrice.toFixed(2)}</span>
        <span class="med-card__unit">/unit</span>
      </div>

      {#if !inStock}
        <Button variant="outline" size="sm" disabled class="text-xs opacity-60">Unavailable</Button>
      {:else if isInCart}
        <QuantitySelector value={cartQty} max={stock} onchange={handleQuantityChange} compact />
      {:else}
        <Button variant="default" size="sm" class="text-xs font-semibold gap-1.5" onclick={handleAddToCart}>
          <ShoppingCart class="h-3.5 w-3.5" />
          Add
        </Button>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
