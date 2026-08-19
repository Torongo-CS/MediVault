<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Table from "$lib/components/ui/table";
  import dummyData from "../../../../../convex/dummyData.json";
  import { 
    CheckSquare, 
    Package, 
    Truck, 
    DollarSign, 
    AlertTriangle, 
    ArrowRight,
    Brain,
    Shield,
    Clock,
    Pill
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  // Reactive state initialized from dummy data
  let reservations = $state([...dummyData.reservations]);
  let medicines = $state([...dummyData.medicines]);
  let users = $state([...dummyData.users]);
  let transactions = $state([...dummyData.transactionRecords]);

  // Derived metrics
  let pendingCount = $derived(reservations.filter(r => r.status === "pending").length);
  let lowStockMeds = $derived(medicines.filter(m => m.stock < 20));
  let readyForPickupCount = $derived(reservations.filter(r => r.status === "approved" || r.status === "ready").length);
  let totalRevenue = $derived(transactions.reduce((sum, t) => sum + t.totalRevenue, 0));
  
  // Interactive quick action to approve a reservation directly from dashboard
  function quickApprove(id: string) {
    reservations = reservations.map(r => r._id === id ? { ...r, status: "approved" } : r);
    toast.success(`Reservation ${id} approved successfully!`);
  }

  function quickReject(id: string) {
    reservations = reservations.map(r => r._id === id ? { ...r, status: "cancelled" } : r);
    toast.info(`Reservation ${id} marked as rejected.`);
  }

  // Pending reservations detailed list for dashboard
  let pendingReservations = $derived(
    reservations
      .filter(r => r.status === "pending")
      .map(r => {
        const customer = users.find(u => u._id === r.customerId);
        const medItems = r.medsList.map(item => {
          const med = medicines.find(m => m._id === item.medicineId);
          return {
            name: med ? med.name : item.medicineId,
            quantity: item.quantity,
            requiresPrescription: med ? med.requiresPrescription : false
          };
        });
        const needsRx = medItems.some(i => i.requiresPrescription);
        return {
          ...r,
          customerEmail: customer ? customer.email : "Unknown Customer",
          medItems,
          needsRx
        };
      })
  );
</script>

<div class="dashboard-container">
  <!-- Header -->
  <div class="dashboard-header">
    <div>
      <h1 class="dashboard-title flex items-center gap-3">
        <Pill class="h-8 w-8 text-primary" /> Pharmacist Workspace
      </h1>
      <p class="text-xs text-muted-foreground mt-1">
        Manage prescription verification, inventory stock levels, order delivery, and customer safety.
      </p>
    </div>
    <div class="flex items-center gap-3">
      <Button href="/pharmacist/approvals" variant="default" class="gap-2">
        <CheckSquare class="h-4 w-4" /> Review Pending ({pendingCount})
      </Button>
    </div>
  </div>

  <!-- Key Metrics Cards Grid -->
  <div class="dashboard-grid">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Pending Approvals</Card.Title>
        <Clock class="dashboard-card-icon text-amber-500" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">{pendingCount}</div>
        <p class="text-xs text-muted-foreground mt-1">Requires pharmacist action</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Low Stock Items</Card.Title>
        <AlertTriangle class="dashboard-card-icon text-rose-500" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">{lowStockMeds.length}</div>
        <p class="text-xs text-muted-foreground mt-1">Medicines &lt; 20 units remaining</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Ready for Pickup</Card.Title>
        <Truck class="dashboard-card-icon text-blue-500" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">{readyForPickupCount}</div>
        <p class="text-xs text-muted-foreground mt-1">Staged & awaiting customer</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Total Revenue</Card.Title>
        <DollarSign class="dashboard-card-icon text-emerald-500" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">${totalRevenue.toFixed(2)}</div>
        <p class="text-xs text-muted-foreground mt-1">From completed orders</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Quick Action Navigation Shortcuts -->
  <div class="flex items-center mt-8 mb-4">
    <h2 class="text-xl font-semibold tracking-tight">Quick Actions</h2>
  </div>

  <div class="dashboard-grid">
    <a href="/pharmacist/approvals" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <CheckSquare class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>Pending Approvals</Card.Title>
          <Card.Description>Review incoming customer reservations & prescriptions.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/pharmacist/inventory" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <Package class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>Inventory Management</Card.Title>
          <Card.Description>Update medicine stock, cost prices, & expiry dates.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/pharmacist/delivery" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <Truck class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>Delivery Management</Card.Title>
          <Card.Description>Track order dispatch & verify customer pickup.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/pharmacist/transaction_records" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <DollarSign class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>Transaction Records</Card.Title>
          <Card.Description>View complete pharmacy sales and purchase logs.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>
  </div>

  <!-- Main Content Layout: Pending Table & Inventory Alerts -->
  <div class="dashboard-section mt-8">
    <!-- Left Column: Pending Approvals Quick Table (4 Columns) -->
    <Card.Root class="dashboard-chart-area">
      <Card.Header class="flex flex-row items-center justify-between">
        <div>
          <Card.Title>Incoming Reservation Requests</Card.Title>
          <Card.Description>Pending reservations awaiting verification</Card.Description>
        </div>
        <Button href="/pharmacist/approvals" variant="outline" size="sm" class="gap-1 text-xs">
          View All <ArrowRight class="h-3.5 w-3.5" />
        </Button>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Reservation ID</Table.Head>
              <Table.Head>Customer</Table.Head>
              <Table.Head>Items & Rx</Table.Head>
              <Table.Head>Total Price</Table.Head>
              <Table.Head class="text-right">Action</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if pendingReservations.length === 0}
              <Table.Row>
                <Table.Cell colspan={5} class="text-center h-32 text-muted-foreground text-sm">
                  🎉 No pending approvals! All reservation requests have been processed.
                </Table.Cell>
              </Table.Row>
            {:else}
              {#each pendingReservations as res}
                <Table.Row>
                  <Table.Cell class="font-medium text-xs text-muted-foreground">{res._id}</Table.Cell>
                  <Table.Cell class="font-medium text-sm">{res.customerEmail}</Table.Cell>
                  <Table.Cell>
                    <div class="space-y-1">
                      {#each res.medItems as item}
                        <div class="text-xs flex items-center gap-1.5">
                          <span class="font-medium">{item.name}</span>
                          <span class="text-muted-foreground">x{item.quantity}</span>
                        </div>
                      {/each}
                      {#if res.needsRx}
                        <Badge variant="outline" class="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300">
                          Prescription Attached
                        </Badge>
                      {/if}
                    </div>
                  </Table.Cell>
                  <Table.Cell class="font-semibold text-sm">${res.totalCosting.toFixed(2)}</Table.Cell>
                  <Table.Cell class="text-right">
                    <div class="flex justify-end gap-2">
                      <Button size="sm" variant="default" onclick={() => quickApprove(res._id)} class="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onclick={() => quickReject(res._id)} class="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950">
                        Reject
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    <!-- Right Column: Stock Alert & Safety Verification (3 Columns) -->
    <div class="dashboard-recent-area space-y-6">
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle class="h-5 w-5" />
            <Card.Title>Low Stock Alerts</Card.Title>
          </div>
          <Card.Description>Items that require urgent restock</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
          {#if lowStockMeds.length === 0}
            <p class="text-xs text-muted-foreground py-4 text-center">All medicine stock levels are healthy.</p>
          {:else}
            {#each lowStockMeds as med}
              <div class="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                <div>
                  <div class="font-semibold text-sm">{med.name}</div>
                  <div class="text-xs text-muted-foreground">Generic: {med.genericName}</div>
                </div>
                <div class="text-right">
                  <Badge variant="destructive" class="font-bold">{med.stock} left</Badge>
                </div>
              </div>
            {/each}
            <Button href="/pharmacist/inventory" variant="outline" class="w-full text-xs mt-2">
              Manage Inventory Stock
            </Button>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Drug Safety Tip Card -->
      <Card.Root class="bg-gradient-to-br from-primary/5 via-background to-muted/30">
        <Card.Header>
          <div class="flex items-center gap-2 text-primary">
            <Brain class="h-5 w-5" />
            <Card.Title>Safety Verification</Card.Title>
          </div>
        </Card.Header>
        <Card.Content class="text-xs text-muted-foreground space-y-2">
          <p>
            Always verify prescription match and check potential drug-drug interaction warnings (e.g. Paracetamol + Warfarin) before approving orders.
          </p>
          <div class="pt-1">
            <a href="/ai-assistant" class="text-primary font-semibold hover:underline flex items-center gap-1">
              Launch AI Interaction Checker <ArrowRight class="h-3 w-3" />
            </a>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>
