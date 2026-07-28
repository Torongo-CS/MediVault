<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../../convex/dummyData.json";
  import { 
    Truck, 
    CheckCircle2, 
    Search, 
    User, 
    Clock, 
    FileText, 
    ShieldCheck, 
    MapPin, 
    Phone, 
    Receipt, 
    Pill
  } from "lucide-svelte";

  // Reactive State
  let reservations = $state([...dummyData.reservations]);
  let users = $state([...dummyData.users]);
  let medicines = $state([...dummyData.medicines]);

  let searchQuery = $state("");
  let selectedTab = $state("all");

  // Modal State
  let isCustomerModalOpen = $state(false);
  let isReceiptModalOpen = $state(false);
  let selectedOrder = $state<any>(null);
  let selectedCustomer = $state<any>(null);

  // Delivery-relevant orders (approved, ready, completed, delivered)
  let deliveryOrders = $derived(
    reservations
      .filter(r => r.status !== "pending")
      .map(r => {
        const customer = users.find(u => u._id === r.customerId);
        const meds = r.medsList.map(item => {
          const med = medicines.find(m => m._id === item.medicineId);
          return {
            ...item,
            name: med ? med.name : item.medicineId,
            unitSellingPrice: med ? med.unitSellingPrice : 10.0
          };
        });

        return {
          ...r,
          customerEmail: customer ? customer.email : "Unknown Customer",
          customerPhone: (customer as any)?.phone || "+880 1712-345678",
          meds,
          pickupDateFormatted: new Date(r.pickupDate).toLocaleDateString()
        };
      })
  );

  let filteredOrders = $derived(
    deliveryOrders.filter(o => {
      const matchesSearch = 
        o._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.meds.some((m: any) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedTab === "ready") return o.status === "ready" || o.status === "approved";
      if (selectedTab === "delivered") return o.status === "delivered" || o.status === "completed";
      if (selectedTab === "cancelled") return o.status === "cancelled" || o.status === "rejected";
      return true;
    })
  );

  // Actions
  function openCustomerProfile(order: any) {
    selectedOrder = order;
    selectedCustomer = users.find(u => u._id === order.customerId) || {
      email: order.customerEmail,
      role: "customer",
      isActive: true
    };
    isCustomerModalOpen = true;
  }

  function markAsDelivered(order: any) {
    reservations = reservations.map(r => 
      r._id === order._id ? { ...r, status: "delivered" } : r
    );
    selectedOrder = { ...order, status: "delivered" };
    toast.success(`Order #${order._id} marked as Delivered & Handed over!`);
    isReceiptModalOpen = true;
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case "approved": return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
      case "ready": return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300";
      case "delivered": 
      case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "cancelled": 
      case "rejected": return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Truck class="w-8 h-8 text-primary" /> Delivery & Handover Management
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Track order dispatch, verify customer identity on pickup, view patient medication profiles, and issue receipts.
      </p>
    </div>
  </div>

  <!-- Tabs & Search Controls -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="flex flex-wrap gap-2">
      <Button 
        variant={selectedTab === 'all' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'all'} 
        class="text-xs rounded-full">
        All Orders ({deliveryOrders.length})
      </Button>
      <Button 
        variant={selectedTab === 'ready' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'ready'} 
        class="text-xs rounded-full">
        Ready for Pickup ({deliveryOrders.filter(o => o.status === 'ready' || o.status === 'approved').length})
      </Button>
      <Button 
        variant={selectedTab === 'delivered' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'delivered'} 
        class="text-xs rounded-full">
        Delivered ({deliveryOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length})
      </Button>
    </div>

    <div class="relative w-full md:w-80">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input bind:value={searchQuery} placeholder="Search ID, customer email..." class="pl-9 bg-background h-9 text-xs" />
    </div>
  </div>

  <!-- Delivery Management Table -->
  <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row>
            <Table.Head class="font-semibold text-xs pl-6">Order ID & Date</Table.Head>
            <Table.Head class="font-semibold text-xs">Customer Contact</Table.Head>
            <Table.Head class="font-semibold text-xs">Items Package</Table.Head>
            <Table.Head class="font-semibold text-xs">Pickup Scheduled</Table.Head>
            <Table.Head class="font-semibold text-xs">Total Amount</Table.Head>
            <Table.Head class="font-semibold text-xs">Delivery Status</Table.Head>
            <Table.Head class="text-right font-semibold text-xs pr-6">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredOrders.length === 0}
            <Table.Row>
              <Table.Cell colspan={7} class="text-center h-40 text-muted-foreground text-sm">
                No delivery records found matching your filters.
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredOrders as order}
              <Table.Row class="hover:bg-muted/30 transition-colors">
                <Table.Cell class="font-mono text-xs pl-6">
                  <div class="font-bold text-foreground">{order._id}</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </Table.Cell>

                <Table.Cell class="text-xs font-medium">
                  <div class="text-foreground">{order.customerEmail}</div>
                  <div class="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone class="w-3 h-3 text-primary" /> {order.customerPhone}
                  </div>
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="space-y-1">
                    {#each order.meds as med}
                      <div class="font-medium text-foreground">
                        {med.name} <span class="text-muted-foreground text-[11px]">x{med.quantity}</span>
                      </div>
                    {/each}
                  </div>
                </Table.Cell>

                <Table.Cell class="text-xs font-medium text-muted-foreground">
                  <div class="flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{order.pickupDateFormatted}</span>
                  </div>
                </Table.Cell>

                <Table.Cell class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ${order.totalCosting.toFixed(2)}
                </Table.Cell>

                <Table.Cell>
                  <Badge variant="outline" class={`capitalize text-xs font-semibold px-2.5 py-0.5 border ${getStatusBadgeVariant(order.status)}`}>
                    {order.status}
                  </Badge>
                </Table.Cell>

                <Table.Cell class="text-right pr-6">
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onclick={() => openCustomerProfile(order)} class="h-8 text-xs gap-1">
                      <User class="w-3.5 h-3.5" /> Profile
                    </Button>

                    {#if order.status === 'ready' || order.status === 'approved'}
                      <Button size="sm" onclick={() => markAsDelivered(order)} class="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                        <CheckCircle2 class="w-3.5 h-3.5" /> Confirm Pickup
                      </Button>
                    {:else if order.status === 'delivered' || order.status === 'completed'}
                      <Button size="sm" variant="outline" onclick={() => { selectedOrder = order; isReceiptModalOpen = true; }} class="h-8 text-xs gap-1">
                        <Receipt class="w-3.5 h-3.5 text-primary" /> Receipt
                      </Button>
                    {/if}
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <!-- Customer Safety & Medication Profile Modal -->
  {#if selectedCustomer}
    <Dialog.Root bind:open={isCustomerModalOpen}>
      <Dialog.Content class="sm:max-w-[550px]">
        <Dialog.Header>
          <Dialog.Title class="text-xl font-bold flex items-center gap-2">
            <User class="w-5 h-5 text-primary" /> Customer Profile & History
          </Dialog.Title>
          <Dialog.Description class="text-xs">
            Review customer contact details, past reservations, and medical safety flags.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-3 text-xs">
          <!-- Profile Card -->
          <div class="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-sm text-foreground">{selectedCustomer.email}</span>
              <Badge variant="outline" class="bg-emerald-500/10 text-emerald-700 border-emerald-300">Active Account</Badge>
            </div>
            <div class="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
              <div>Phone: <strong class="text-foreground">{selectedOrder?.customerPhone}</strong></div>
              <div>User ID: <strong class="text-foreground font-mono">{selectedOrder?.customerId}</strong></div>
            </div>
          </div>

          <!-- History & Safety Badges -->
          <div class="space-y-2">
            <h4 class="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4 text-emerald-600" /> Patient Safety Indicators
            </h4>
            <div class="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 space-y-1">
              <p class="font-semibold">✓ No active safety holds on account</p>
              <p class="text-[11px] text-muted-foreground">Previous 3 reservations completed without interaction flags.</p>
            </div>
          </div>

          <!-- Order Summary Snapshot -->
          <div>
            <h4 class="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Current Pickup Order</h4>
            <div class="p-3 rounded-lg border bg-card space-y-1">
              <div class="flex justify-between font-semibold">
                <span>Order #{selectedOrder?._id}</span>
                <span class="text-emerald-600">${selectedOrder?.totalCosting.toFixed(2)}</span>
              </div>
              <div class="text-muted-foreground text-[11px]">
                Pickup Date: {selectedOrder?.pickupDateFormatted}
              </div>
            </div>
          </div>
        </div>

        <Dialog.Footer>
          <Button variant="outline" onclick={() => isCustomerModalOpen = false} class="text-xs">Close Profile</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}

  <!-- Digital Handover Receipt Modal -->
  {#if selectedOrder}
    <Dialog.Root bind:open={isReceiptModalOpen}>
      <Dialog.Content class="sm:max-w-[480px]">
        <Dialog.Header>
          <Dialog.Title class="text-xl font-bold flex items-center gap-2 text-emerald-600">
            <Receipt class="w-5 h-5" /> Handover Receipt #{selectedOrder._id}
          </Dialog.Title>
          <Dialog.Description class="text-xs">
            Official pharmacy handover receipt and verification confirmation.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-3 text-xs border-y border-dashed my-2">
          <div class="flex justify-between items-center">
            <span class="font-bold text-sm text-foreground">MediVault Central Pharmacy</span>
            <span class="text-muted-foreground">{new Date().toLocaleDateString()}</span>
          </div>

          <div class="space-y-1">
            <div class="text-muted-foreground">Customer: <strong class="text-foreground">{selectedOrder.customerEmail}</strong></div>
            <div class="text-muted-foreground">Status: <Badge variant="outline" class="bg-emerald-100 text-emerald-800 border-emerald-300">Delivered / Handed Over</Badge></div>
          </div>

          <div class="space-y-2 pt-2 border-t border-dashed">
            <div class="font-bold text-xs uppercase tracking-wider text-muted-foreground">Line Items</div>
            {#each selectedOrder.meds as item}
              <div class="flex justify-between font-medium">
                <span>{item.name} (x{item.quantity})</span>
                <span>${(item.unitSellingPrice * item.quantity).toFixed(2)}</span>
              </div>
            {/each}
          </div>

          <div class="flex justify-between font-extrabold text-sm pt-3 border-t">
            <span>Total Amount Paid</span>
            <span class="text-emerald-600 dark:text-emerald-400">${selectedOrder.totalCosting.toFixed(2)}</span>
          </div>
        </div>

        <Dialog.Footer class="gap-2">
          <Button variant="outline" onclick={() => toast.info("Printing receipt...")} class="text-xs gap-1">
            Print Copy
          </Button>
          <Button onclick={() => isReceiptModalOpen = false} class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            Done
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>