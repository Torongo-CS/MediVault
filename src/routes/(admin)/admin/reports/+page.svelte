<!-- routes/(admin)/admin/reports/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Table from "$lib/components/ui/table";
  import { RefreshCw, DollarSign, Package, ShoppingBag, Users, TrendingUp, AlertCircle, FileText } from "lucide-svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../../convex/_generated/api";
  import dummyData from "../../../../../convex/dummyData.json";

  let reportsData = $state<any>(null);
  let isLoading = $state(true);

  async function fetchReports() {
    isLoading = true;
    try {
      const res = await convex.query(api.admin.getReportsData, {});
      if (res) {
        reportsData = res;
      }
    } catch (err) {
      console.warn("Using local fallback reports data:", err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchReports();
    const unsubscribe = convex.onUpdate(api.admin.getReportsData, {}, (updated) => {
      if (updated) reportsData = updated;
    });
    return () => unsubscribe();
  });

  // Derived or fallback data
  const totalRevenue = $derived(
    reportsData?.totalRevenue ?? dummyData.transactionRecords.reduce((s, r) => s + r.totalRevenue, 0)
  );

  const inventoryValue = $derived(
    reportsData?.totalInventoryValue ??
      dummyData.medicines.reduce((s, m) => s + m.stock * m.unitSellingPrice, 0)
  );

  const totalStockUnits = $derived(
    reportsData?.totalStockUnits ?? dummyData.medicines.reduce((s, m) => s + m.stock, 0)
  );

  const statusCounts = $derived(
    reportsData?.statusCounts ?? {
      pending: dummyData.reservations.filter(r => r.status === 'pending').length,
      approved: dummyData.reservations.filter(r => r.status === 'approved').length,
      completed: dummyData.reservations.filter(r => r.status === 'completed').length,
      cancelled: dummyData.reservations.filter(r => r.status === 'cancelled').length,
    }
  );

  const userRoleCounts = $derived(
    reportsData?.userRoleCounts ?? {
      customer: dummyData.users.filter(u => u.role === 'customer').length,
      pharmacist: dummyData.users.filter(u => u.role === 'pharmacist').length,
      admin: dummyData.users.filter(u => u.role === 'admin').length,
    }
  );

  const topMedicines = $derived(
    reportsData?.topMedicinesByValue ??
      dummyData.medicines
        .map(m => ({
          id: m._id,
          name: m.name,
          genericName: m.genericName,
          stock: m.stock,
          sellingPrice: m.unitSellingPrice,
          totalValue: m.stock * m.unitSellingPrice,
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5)
  );
</script>

<div class="dashboard-container max-w-7xl mx-auto space-y-8">
  <div class="dashboard-header flex justify-between items-end mb-6 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <FileText class="w-9 h-9 text-primary" /> Reports & Financial Analytics
      </h1>
      <p class="text-muted-foreground mt-2 text-base">Comprehensive system analytics, revenue statistics, and inventory metrics from Convex DB.</p>
    </div>
    <div class="flex gap-3">
      <Button variant="outline" onclick={fetchReports} class="gap-2 h-11 px-4">
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" /> Refresh
      </Button>
    </div>
  </div>

  <!-- KPI Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    <Card.Root class="bg-card border shadow-sm">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</Card.Title>
        <DollarSign class="w-5 h-5 text-emerald-500" />
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-foreground">৳{totalRevenue.toFixed(2)}</div>
        <p class="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 text-emerald-600 font-medium">
          <TrendingUp class="w-3.5 h-3.5" /> Live transaction revenue
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="bg-card border shadow-sm">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inventory Valuation</Card.Title>
        <Package class="w-5 h-5 text-primary" />
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-foreground">৳{inventoryValue.toFixed(2)}</div>
        <p class="text-xs text-muted-foreground mt-1.5">{totalStockUnits} physical units on hand</p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="bg-card border shadow-sm">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Orders</Card.Title>
        <ShoppingBag class="w-5 h-5 text-cyan-500" />
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-foreground">
          {statusCounts.pending + statusCounts.approved + statusCounts.completed + statusCounts.cancelled}
        </div>
        <p class="text-xs text-muted-foreground mt-1.5">{statusCounts.completed} completed • {statusCounts.pending} pending</p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="bg-card border shadow-sm">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered Users</Card.Title>
        <Users class="w-5 h-5 text-purple-500" />
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-foreground">
          {userRoleCounts.customer + userRoleCounts.pharmacist + userRoleCounts.admin}
        </div>
        <p class="text-xs text-muted-foreground mt-1.5">{userRoleCounts.customer} customers • {userRoleCounts.pharmacist} pharmacists</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Breakdown Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Order Status Summary -->
    <Card.Root class="border shadow-md">
      <Card.Header>
        <Card.Title class="text-lg font-bold">Order Fulfillments Breakdown</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span class="font-medium text-sm text-foreground">Pending Pickups</span>
          <Badge class="bg-amber-500 text-white font-bold">{statusCounts.pending}</Badge>
        </div>
        <div class="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <span class="font-medium text-sm text-foreground">Approved Orders</span>
          <Badge class="bg-blue-500 text-white font-bold">{statusCounts.approved}</Badge>
        </div>
        <div class="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span class="font-medium text-sm text-foreground">Completed Transactions</span>
          <Badge class="bg-emerald-500 text-white font-bold">{statusCounts.completed}</Badge>
        </div>
        <div class="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <span class="font-medium text-sm text-foreground">Cancelled Orders</span>
          <Badge class="bg-rose-500 text-white font-bold">{statusCounts.cancelled}</Badge>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- User Role Summary -->
    <Card.Root class="border shadow-md">
      <Card.Header>
        <Card.Title class="text-lg font-bold">Platform User Distribution</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span class="font-medium text-sm text-foreground">Customers</span>
          <Badge class="bg-emerald-600 text-white font-bold">{userRoleCounts.customer}</Badge>
        </div>
        <div class="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <span class="font-medium text-sm text-foreground">Pharmacists</span>
          <Badge class="bg-blue-600 text-white font-bold">{userRoleCounts.pharmacist}</Badge>
        </div>
        <div class="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <span class="font-medium text-sm text-foreground">Admins</span>
          <Badge class="bg-red-600 text-white font-bold">{userRoleCounts.admin}</Badge>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Top Medicines by Value Table -->
  <Card.Root class="border shadow-md overflow-hidden">
    <Card.Header class="bg-muted/20 border-b">
      <Card.Title class="text-lg font-bold">Top High-Value Stock Medicines</Card.Title>
    </Card.Header>
    <Card.Content class="p-0">
      <Table.Root>
        <Table.Header class="bg-muted/10">
          <Table.Row>
            <Table.Head class="pl-6 font-semibold">Medicine</Table.Head>
            <Table.Head class="font-semibold">Generic Name</Table.Head>
            <Table.Head class="font-semibold">Stock</Table.Head>
            <Table.Head class="font-semibold">Selling Price</Table.Head>
            <Table.Head class="text-right pr-6 font-semibold">Total Stock Value</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each topMedicines as item}
            <Table.Row class="hover:bg-muted/30">
              <Table.Cell class="pl-6 font-bold text-foreground">{item.name}</Table.Cell>
              <Table.Cell class="text-muted-foreground italic text-xs">{item.genericName}</Table.Cell>
              <Table.Cell class="font-semibold text-sm">{item.stock} units</Table.Cell>
              <Table.Cell class="text-sm">৳{item.sellingPrice.toFixed(2)}</Table.Cell>
              <Table.Cell class="text-right pr-6 font-bold text-primary text-base">
                ৳{item.totalValue.toFixed(2)}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>
</div>