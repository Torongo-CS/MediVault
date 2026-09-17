<!-- src/lib/components/shared/CartDrawer.svelte -->
<script lang="ts">
  import * as Sheet from "$lib/components/ui/sheet";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import QuantitySelector from "./QuantitySelector.svelte";
  import {
    ShoppingCart,
    Trash2,
    Store,
    FileText,
    AlertTriangle,
    CalendarDays,
    Bell,
  } from "lucide-svelte";
  import { cart } from "$lib/stores/cartStore.svelte";
  import { toast } from "svelte-sonner";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";

  function handleRemove(medicineId: string) {
    cart.removeItem(medicineId);
  }
  function handleClear() {
    cart.clearCart();
    pickupDate = "";
    prescriptionImageUrl = "";
  }

  // Pickup date — minimum is tomorrow
  let pickupDate = $state("");
  let prescriptionImageUrl = $state("");

  const tomorrowStr = $derived.by(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  let isSubmitting = $state(false);

  async function handleCheckout() {
    if (!pickupDate) {
      toast.error("Please select a valid pickup date.");
      return;
    }

    if (cart.needsPrescription && !prescriptionImageUrl) {
      toast.error("Please attach your doctor's prescription before placing this reservation.");
      return;
    }

    isSubmitting = true;
    try {
      // Create reservation in Convex database
      const medsList = cart.items.map((i) => ({
        medicineId: i.medicineId as any,
        quantity: i.quantity,
      }));

      const pickupTimestamp = new Date(pickupDate).getTime();

      await convex.mutation(api.reservations.create, {
        customerEmail: "customer@medivault.com",
        pharmacistId: cart.pharmacyId as any,
        medsList,
        pickupDate: pickupTimestamp,
        prescriptionImageUrl: prescriptionImageUrl || undefined,
      });

      toast.success(
        "Reservation submitted successfully! Awaiting pharmacist approval.",
      );
      cart.clearCart();
      pickupDate = "";
      prescriptionImageUrl = "";
      cart.close();
    } catch (err: any) {
      toast.error(
        err.message || "Failed to place reservation. Please try again.",
      );
    } finally {
      isSubmitting = false;
    }
  }

  const canSubmit = $derived(
    pickupDate.length > 0 &&
      (!cart.needsPrescription || prescriptionImageUrl.length > 0) &&
      !isSubmitting
  );

  const conflictWarnings = $derived.by(() => {
    const generics = cart.items.map((i) => i.genericName.toLowerCase());
    const warnings: string[] = [];

    if (
      generics.some((g) => g.includes("paracetamol") || g.includes("acetaminophen")) &&
      generics.some((g) => g.includes("ibuprofen") || g.includes("warfarin") || g.includes("aspirin"))
    ) {
      warnings.push(
        "Combining Paracetamol and Ibuprofen (NSAID) increases risk of gastrointestinal irritation and strain."
      );
    }
    return warnings;
  });
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
          <Sheet.Title class="text-base font-bold">Reservation Cart</Sheet.Title
          >
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
          <p class="text-sm font-semibold text-foreground mb-1">
            Your cart is empty
          </p>
          <p class="text-xs text-muted-foreground">
            Browse a pharmacy to add medicines to your reservation.
          </p>
        </div>
      {:else}
        <div class="cart-pharmacy-label">
          <div class="meta-row">
            <Store class="h-3.5 w-3.5" />
            <span
              >Reserving from <strong class="text-foreground"
                >{cart.pharmacyName}</strong
              ></span
            >
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
                    <Trash2
                      class="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"
                    />
                  </button>
                </div>

                <div class="flex items-center justify-between mt-2">
                  <QuantitySelector
                    value={item.quantity}
                    max={item.stock}
                    onchange={(qty) =>
                      cart.updateQuantity(item.medicineId, qty)}
                    compact
                  />
                  <div class="text-right">
                    <p class="cart-item__price">
                      ৳{(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                    <p class="cart-item__unit-price">
                      ৳{item.unitPrice.toFixed(2)} × {item.quantity}
                    </p>
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
        {#if conflictWarnings.length > 0}
          <div class="cart-footer__rx-alert bg-rose-500/10 border-rose-500/30">
            <AlertTriangle
              class="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
            />
            <div class="flex-1 min-w-0">
              <p
                class="text-[11px] text-rose-700 dark:text-rose-300 font-semibold"
              >
                Drug Safety Interaction Warning
              </p>
              {#each conflictWarnings as warn}
                <p
                  class="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed"
                >
                  {warn}
                </p>
              {/each}
            </div>
          </div>
        {/if}

        <div class="cart-footer__rx-alert bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg space-y-2">
          <div class="flex items-start gap-2">
            <AlertTriangle
              class="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            />
            <div class="flex-1 min-w-0">
              <p
                class="text-[11px] text-amber-700 dark:text-amber-300 font-semibold leading-relaxed"
              >
                {cart.needsPrescription ? "Prescription Mandatory for this Order" : "Attach Prescription (Optional)"}
              </p>
              <p class="text-[10px] text-muted-foreground">
                Upload your doctor's prescription file so the pharmacist can verify.
              </p>
            </div>
          </div>

          <div class="space-y-1.5 pt-1">
            <input
              type="file"
              accept="image/*,.pdf"
              class="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              onchange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    prescriptionImageUrl = evt.target?.result as string;
                    toast.success("Prescription file attached!");
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            {#if prescriptionImageUrl}
              <div class="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <FileText class="h-3.5 w-3.5" />
                Prescription document attached!
              </div>
            {/if}
          </div>
        </div>

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
            min={tomorrowStr}
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
          <span class="cart-footer__total-amount"
            >৳{cart.subtotal.toFixed(2)}</span
          >
        </div>

        <div class="cart-footer__actions">
          <Button
            variant="outline"
            class="flex-1 text-xs font-semibold"
            onclick={handleClear}>Clear Cart</Button
          >
          <Button
            class="flex-1 text-xs font-semibold gap-1.5"
            disabled={!canSubmit}
            onclick={handleCheckout}
          >
            <CalendarDays class="h-3.5 w-3.5" />
            {isSubmitting ? "Submitting..." : "Place Reservation"}
          </Button>
        </div>
      </div>
    {/if}
  </Sheet.Content>
</Sheet.Root>
