<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../../convex/dummyData.json";
  import { 
    DollarSign, 
    TrendingUp, 
    Search, 
    Eye, 
    Receipt, 
    ArrowUpRight, 
    ArrowDownRight, 
    Calendar,
    Pill
  } from "lucide-svelte";

  // Reactive State
  let transactions = $state([...dummyData.transactionRecords]);
  let medicines = $state([...dummyData.medicines]);
  let searchQuery = $state("");
  let selectedTab = $state("all");

  // Modal state
  let isDetailModalOpen = $state(false);
  let selectedTransaction = $state<any>(null);

  // Enriched transaction records with medicine names, cost analysis, and margins
  let enrichedTransactions = $derived(
    transactions.map(t => {
      let totalCost = 0;
      const items = t.itemsSnapshot.map(item => {
        const med = medicines.find(m => m._id === item.medicineId);
        const name = med ? med.name : item.medicineId;
        const cost = item.unitCostingPriceAtSale * item.quantity;
        const revenue = item.unitSellingPriceAtSale * item.quantity;
        totalCost += cost;

        return {
          ...item,
          medicineName: name,
          costSubtotal: cost,
          revenueSubtotal: revenue
        };
      });

      const totalRevenue = t.totalRevenue;
      const profit = totalRevenue - totalCost;
      const marginPercentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        ...t,
        items,
        totalCost,
        profit,
        marginPercentage,
        type: "sale", // Default transaction type
        formattedDate: new Date(t.completedAt).toLocaleDateString()
      };
    })
  );

  // Derived financial summary metrics
  let totalRevenueSum = $derived(enrichedTransactions.reduce((sum, t) => sum + t.totalRevenue, 0));
  let totalCostSum = $derived(enrichedTransactions.reduce((sum, t) => sum + t.totalCost, 0));
  let totalProfitSum = $derived(totalRevenueSum - totalCostSum);
  let averageMargin = $derived(totalRevenueSum > 0 ? (totalProfitSum / totalRevenueSum) * 100 : 0);

  // Filtered transactions
  let filteredTransactions = $derived(
    enrichedTransactions.filter(t => {
      const matchesSearch = 
        t._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.reservationId && t.reservationId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.items.some((i: any) => i.medicineName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      return true;
    })
  );

  function openDetails(trans: any) {
    selectedTransaction = trans;
    isDetailModalOpen = true;
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <DollarSign class="w-8 h-8 text-primary" /> Pharmacy Transaction Records
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Review completed order financial transactions, cost of goods sold, profit margins, and sales receipts.
      </p>
    </div>
    <Button variant="outline" onclick={() => toast.info("Exporting transaction report as CSV...")} class="gap-2 shadow-sm">
      <Receipt class="w-4 h-4 text-primary" /> Export Financial Report
    </Button>
  </div>

  <!-- Financial Metrics Summary Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    <Card.Root class="border-border/60 hover:shadow-md transition-all">
      <Card.Header class="flex flex-row items-center justify-between pb-2 space-y-0">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Sales Revenue</Card.Title>
        <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <DollarSign class="w-5 h-5" />
        </div>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-foreground">${totalRevenueSum.toFixed(2)}</div>
        <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <ArrowUpRight class="w-3.5 h-3.5 text-emerald-500" /> Gross sales volume
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="border-border/60 hover:shadow-md transition-all">
      <Card.Header class="flex flex-row items-center justify-between pb-2 space-y-0">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost of Goods Sold</Card.Title>
        <div class="p-2 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
          <TrendingUp class="w-5 h-5" />
        </div>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-foreground">${totalCostSum.toFixed(2)}</div>
        <p class="text-xs text-muted-foreground mt-1">Pharmacy inventory acquisition cost</p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="border-border/60 hover:shadow-md transition-all">
      <Card.Header class="flex flex-row items-center justify-between pb-2 space-y-0">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Pharmacy Profit</Card.Title>
        <div class="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <DollarSign class="w-5 h-5" />
        </div>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">${totalProfitSum.toFixed(2)}</div>
        <p class="text-xs text-muted-foreground mt-1">Revenue minus cost of goods</p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="border-border/60 hover:shadow-md transition-all">
      <Card.Header class="flex flex-row items-center justify-between pb-2 space-y-0">
        <Card.Title class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Profit Margin</Card.Title>
        <div class="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <TrendingUp class="w-5 h-5" />
        </div>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-extrabold text-foreground">+{averageMargin.toFixed(1)}%</div>
        <p class="text-xs text-muted-foreground mt-1">Average profitability per order</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Search & Toolbar -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="relative w-full md:w-96">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input bind:value={searchQuery} placeholder="Search transaction ID, reservation, medicine..." class="pl-9 bg-background h-9 text-xs" />
    </div>
  </div>

  <!-- Transactions Table -->
  <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row>
            <Table.Row>
              <Table.Head class="font-semibold text-xs pl-6">Transaction ID & Date</Table.Head>
              <Table.Head class="font-semibold text-xs">Reservation Ref</Table.Head>
              <Table.Head class="font-semibold text-xs">Items Sold</Table.Head>
              <Table.Head class="font-semibold text-xs">Revenue</Table.Head>
              <Table.Head class="font-semibold text-xs">Cost of Goods</Table.Head>
              <Table.Head class="font-semibold text-xs">Gross Profit</Table.Head>
              <Table.Head class="font-semibold text-xs">Margin</Table.Head>
              <Table.Head class="text-right font-semibold text-xs pr-6">Details</Table.Head>
            </Table.Row>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredTransactions.length === 0}
            <Table.Row>
              <Table.Cell colspan={8} class="text-center h-40 text-muted-foreground text-sm">
                No transaction records found matching your search.
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredTransactions as trans}
              <Table.Row class="hover:bg-muted/30 transition-colors">
                <Table.Cell class="font-mono text-xs pl-6">
                  <div class="font-bold text-foreground">{trans._id}</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">{trans.formattedDate}</div>
                </Table.Cell>

                <Table.Cell class="font-mono text-xs text-muted-foreground">
                  {trans.reservationId || "Direct Counter Sale"}
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="space-y-1">
                    {#each trans.items as item}
                      <div class="font-medium text-foreground">
                        {item.medicineName} <span class="text-muted-foreground text-[11px]">x{item.quantity}</span>
                      </div>
                    {/each}
                  </div>
                </Table.Cell>

                <Table.Cell class="text-xs font-bold text-foreground">
                  ${trans.totalRevenue.toFixed(2)}
                </Table.Cell>

                <Table.Cell class="text-xs font-medium text-muted-foreground">
                  ${trans.totalCost.toFixed(2)}
                </Table.Cell>

                <Table.Cell class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  +${trans.profit.toFixed(2)}
                </Table.Cell>

                <Table.Cell>
                  <Badge variant="outline" class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-300">
                    +{trans.marginPercentage.toFixed(1)}%
                  </Badge>
                </Table.Cell>

                <Table.Cell class="text-right pr-6">
                  <Button variant="ghost" size="sm" onclick={() => openDetails(trans)} class="h-8 text-xs gap-1">
                    <Eye class="w-3.5 h-3.5" /> View Receipt
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <!-- Transaction Details & Receipt Modal -->
  {#if selectedTransaction}
    <Dialog.Root bind:open={isDetailModalOpen}>
      <Dialog.Content class="sm:max-w-[550px]">
        <Dialog.Header>
          <Dialog.Title class="text-xl font-bold flex items-center gap-2">
            <Receipt class="w-5 h-5 text-primary" /> Transaction Breakdown #{selectedTransaction._id}
          </Dialog.Title>
          <Dialog.Description class="text-xs">
            Detailed unit cost, selling price snapshot, and net financial breakdown.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-3 text-xs">
          <!-- Summary info -->
          <div class="p-3.5 rounded-lg border bg-muted/20 flex justify-between items-center">
            <div>
              <span class="text-muted-foreground block text-[11px]">Completed Timestamp:</span>
              <strong class="text-foreground">{selectedTransaction.formattedDate}</strong>
            </div>
            <div>
              <span class="text-muted-foreground block text-[11px]">Reservation Ref:</span>
              <strong class="text-foreground font-mono">{selectedTransaction.reservationId}</strong>
            </div>
          </div>

          <!-- Items Table Snapshot -->
          <div>
            <h4 class="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Item Snapshot at Sale</h4>
            <div class="border rounded-lg overflow-hidden">
              <Table.Root>
                <Table.Header class="bg-muted/40">
                  <Table.Row>
                    <Table.Head class="py-2 text-xs">Item</Table.Head>
                    <Table.Head class="py-2 text-xs">Qty</Table.Head>
                    <Table.Head class="py-2 text-xs">Cost/Unit</Table.Head>
                    <Table.Head class="py-2 text-xs">Sell/Unit</Table.Head>
                    <Table.Head class="py-2 text-xs text-right">Revenue</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each selectedTransaction.items as item}
                    <Table.Row>
                      <Table.Cell class="py-2 font-semibold">{item.medicineName}</Table.Cell>
                      <Table.Cell class="py-2">{item.quantity}</Table.Cell>
                      <Table.Cell class="py-2">${item.unitCostingPriceAtSale.toFixed(2)}</Table.Cell>
                      <Table.Cell class="py-2">${item.unitSellingPriceAtSale.toFixed(2)}</Table.Cell>
                      <Table.Cell class="py-2 text-right font-bold">${item.revenueSubtotal.toFixed(2)}</Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          </div>

          <!-- Financial Calculation Breakdown -->
          <div class="p-4 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 border-emerald-200">
            <div class="flex justify-between">
              <span>Gross Sales Revenue:</span>
              <strong class="text-foreground">${selectedTransaction.totalRevenue.toFixed(2)}</strong>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>Cost of Goods Sold (COGS):</span>
              <span>-${selectedTransaction.totalCost.toFixed(2)}</span>
            </div>
            <div class="flex justify-between font-extrabold text-sm pt-2 border-t border-emerald-300 text-emerald-700 dark:text-emerald-300">
              <span>Net Order Profit:</span>
              <span>+${selectedTransaction.profit.toFixed(2)} ({selectedTransaction.marginPercentage.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <Dialog.Footer>
          <Button variant="outline" onclick={() => isDetailModalOpen = false} class="text-xs">Close Breakdown</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>