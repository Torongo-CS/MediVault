<!-- src/lib/components/shared/CartDrawer.svelte -->
<script lang="ts">
  import * as Sheet from "$lib/components/ui/sheet";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import QuantitySelector from "./QuantitySelector.svelte";
  import { ShoppingCart, Trash2, Store, FileText, AlertTriangle, CalendarDays, Bell } from "lucide-svelte";
  import { cart } from "$lib/stores/cartStore.svelte";

  function handleRemove(medicineId: string) { cart.removeItem(medicineId); }
  function handleClear() {
    cart.clearCart();
    pickupDate = "";
  }

  // Pickup date — minimum is tomorrow
  let pickupDate = $state("");
  const tomorrow = $derived(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  const canSubmit = $derived(pickupDate.length > 0);
</script>

<Sheet.Root bind:open={cart.isOpen}>
  <Sheet.Content side="right" class="w-full sm:max-w-md flex flex-col p-0">
    <!-- Header -->
    <Sheet.Header class="px-5 pt-5 pb-4 border-b">
      <div class="flex items-center gap-2.5">
        <div class="icon-box bg-primary/10">
          <ShoppingCart class="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <Sheet.Title class="text-base font-bold">Reservation Cart</Sheet.Title>
          <Sheet.Description class="text-xs text-muted-foreground">
            {#if cart.isEmpty}
              Your cart is empty
            {:else}
              {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} from {cart.pharmacyName}
            {/if}
          </Sheet.Description>
        </div>
      </div>
    </Sheet.Header>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto">
      {#if cart.isEmpty}
        <div class="empty-state h-full py-16">
          <div class="empty-state__icon-wrap">
            <ShoppingCart class="h-7 w-7 text-muted-foreground" />
          </div>
          <p class="text-sm font-semibold text-foreground mb-1">Your cart is empty</p>
          <p class="text-xs text-muted-foreground">Browse a pharmacy to add medicines to your reservation.</p>
        </div>
      {:else}
        <div class="cart-pharmacy-label">
          <div class="meta-row">
            <Store class="h-3.5 w-3.5" />
            <span>Reserving from <strong class="text-foreground">{cart.pharmacyName}</strong></span>
          </div>
        </div>

        <div class="cart-items-list">
          {#each cart.items as item, idx (item.medicineId)}
            {#if idx > 0}
              <Separator class="my-3" />
            {/if}
            <div class="flex gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="cart-item__name">{item.medicineName}</p>
                    <p class="cart-item__generic">{item.genericName}</p>
                  </div>
                  <button
                    class="cart-item__remove-btn"
                    onclick={() => handleRemove(item.medicineId)}
                    aria-label="Remove {item.medicineName}"
                  >
                    <Trash2 class="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>

                <div class="flex items-center justify-between mt-2">
                  <QuantitySelector
                    value={item.quantity}
                    max={item.stock}
                    onchange={(qty) => cart.updateQuantity(item.medicineId, qty)}
                    compact
                  />
                  <div class="text-right">
                    <p class="cart-item__price">৳{(item.unitPrice * item.quantity).toFixed(2)}</p>
                    <p class="cart-item__unit-price">৳{item.unitPrice.toFixed(2)} × {item.quantity}</p>
                  </div>
                </div>

                {#if item.requiresPrescription}
                  <div class="cart-item__rx-warn">
                    <FileText class="h-3 w-3" />
                    Prescription required
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    {#if !cart.isEmpty}
      <div class="cart-footer">
        {#if cart.needsPrescription}
          <div class="cart-footer__rx-alert">
            <AlertTriangle class="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <p class="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Some items require a prescription. Attach one from your vault before checkout.
              </p>
              <a
                href="/prescriptions"
                class="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                onclick={() => (cart.isOpen = false)}
              >
                <FileText class="h-3 w-3" />
                Go to Prescription Vault
              </a>
            </div>
          </div>
        {/if}

        <!-- Pickup Date Picker -->
        <div class="cart-pickup-date">
          <label for="cart-pickup-date-input" class="cart-pickup-date__label">
            <CalendarDays class="h-3.5 w-3.5 text-primary" />
            Pickup Date
            <span class="text-destructive ml-0.5">*</span>
          </label>
          <input
            id="cart-pickup-date-input"
            type="date"
            bind:value={pickupDate}
            min={tomorrow()}
            class="cart-pickup-date__input"
          />
          {#if pickupDate}
            <div class="cart-pickup-date__reminder">
              <Bell class="h-3 w-3 shrink-0" />
              You and the pharmacist will be reminded on this day.
            </div>
          {/if}
        </div>

        <div class="cart-footer__total-row">
          <span class="cart-footer__total-label">Estimated Total</span>
          <span class="cart-footer__total-amount">৳{cart.subtotal.toFixed(2)}</span>
        </div>

        <div class="cart-footer__actions">
          <Button variant="outline" class="flex-1 text-xs font-semibold" onclick={handleClear}>Clear Cart</Button>
          <Button class="flex-1 text-xs font-semibold gap-1.5" disabled={!canSubmit}>
            <CalendarDays class="h-3.5 w-3.5" />
            Place Reservation
          </Button>
        </div>
      </div>
    {/if}
  </Sheet.Content>
</Sheet.Root>

