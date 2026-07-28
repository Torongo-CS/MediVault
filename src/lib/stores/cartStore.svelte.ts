// src/lib/stores/cartStore.svelte.ts
// Svelte 5 reactive cart store with localStorage persistence.
// Rule: cart can only hold items from ONE pharmacy at a time.

import { browser } from "$app/environment";

export interface CartItem {
  medicineId: string;
  medicineName: string;
  genericName: string;
  unitPrice: number;
  quantity: number;
  requiresPrescription: boolean;
  stock: number; // snapshot for validation
}

export interface CartState {
  pharmacyId: string;
  pharmacyName: string;
  items: CartItem[];
}

const STORAGE_KEY = "medivault_cart";

function loadFromStorage(): CartState | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CartState;
  } catch {
    return null;
  }
}

function saveToStorage(state: CartState | null) {
  if (!browser) return;
  if (!state || state.items.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

class CartStore {
  // --- Reactive state ---
  pharmacyId = $state<string>("");
  pharmacyName = $state<string>("");
  items = $state<CartItem[]>([]);
  isOpen = $state(false);

  // --- Derived ---
  itemCount = $derived(this.items.reduce((sum, i) => sum + i.quantity, 0));
  subtotal = $derived(this.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  needsPrescription = $derived(this.items.some((i) => i.requiresPrescription));
  isEmpty = $derived(this.items.length === 0);

  constructor() {
    const saved = loadFromStorage();
    if (saved) {
      this.pharmacyId = saved.pharmacyId;
      this.pharmacyName = saved.pharmacyName;
      this.items = saved.items;
    }
  }

  private persist() {
    if (this.items.length === 0) {
      saveToStorage(null);
    } else {
      saveToStorage({
        pharmacyId: this.pharmacyId,
        pharmacyName: this.pharmacyName,
        items: this.items,
      });
    }
  }

  /**
   * Returns true if the item was added.
   * Returns 'pharmacy_conflict' if the cart already has items from a different pharmacy.
   */
  addItem(
    pharmacyId: string,
    pharmacyName: string,
    item: Omit<CartItem, "quantity">,
    quantity = 1
  ): true | "pharmacy_conflict" {
    // Check pharmacy conflict
    if (this.items.length > 0 && this.pharmacyId !== pharmacyId) {
      return "pharmacy_conflict";
    }

    // Set pharmacy context
    this.pharmacyId = pharmacyId;
    this.pharmacyName = pharmacyName;

    // Check if item already in cart
    const existing = this.items.find((i) => i.medicineId === item.medicineId);
    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, item.stock);
      existing.quantity = newQty;
    } else {
      this.items.push({ ...item, quantity: Math.min(quantity, item.stock) });
    }

    // Trigger reactivity by reassigning
    this.items = [...this.items];
    this.persist();
    return true;
  }

  updateQuantity(medicineId: string, quantity: number) {
    const item = this.items.find((i) => i.medicineId === medicineId);
    if (!item) return;

    if (quantity <= 0) {
      this.removeItem(medicineId);
      return;
    }

    item.quantity = Math.min(quantity, item.stock);
    this.items = [...this.items];
    this.persist();
  }

  removeItem(medicineId: string) {
    this.items = this.items.filter((i) => i.medicineId !== medicineId);
    if (this.items.length === 0) {
      this.pharmacyId = "";
      this.pharmacyName = "";
    }
    this.persist();
  }

  clearCart() {
    this.items = [];
    this.pharmacyId = "";
    this.pharmacyName = "";
    this.persist();
  }

  /**
   * Force-switch pharmacy: clears existing cart and adds new item.
   */
  switchPharmacyAndAdd(
    pharmacyId: string,
    pharmacyName: string,
    item: Omit<CartItem, "quantity">,
    quantity = 1
  ) {
    this.clearCart();
    this.addItem(pharmacyId, pharmacyName, item, quantity);
  }

  getItemQuantity(medicineId: string): number {
    return this.items.find((i) => i.medicineId === medicineId)?.quantity ?? 0;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }
}

export const cart = new CartStore();
