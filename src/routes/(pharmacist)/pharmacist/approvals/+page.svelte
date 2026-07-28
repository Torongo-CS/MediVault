<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Card from "$lib/components/ui/card";
  import * as Tabs from "$lib/components/ui/tabs";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../../convex/dummyData.json";
  import { 
    Search, 
    CheckCircle2, 
    XCircle, 
    Eye, 
    FileText, 
    AlertTriangle, 
    Clock, 
    Truck, 
    MessageSquare,
    ShieldAlert,
    Pill
  } from "lucide-svelte";

  // Reactive State
  let reservations = $state([...dummyData.reservations]);
  let medicines = $state([...dummyData.medicines]);
  let users = $state([...dummyData.users]);
  let prescriptions = $state([...dummyData.prescriptions]);

  let searchQuery = $state("");
  let selectedTab = $state("all");

  // Dialog & Detail states
  let isDetailOpen = $state(false);
  let isRejectOpen = $state(false);
  let selectedReservation = $state<any>(null);
  let rejectionReason = $state("");
  let pharmacistNote = $state("");

  // Processed reservation items with customer, meds, prescription, interaction warnings
  let enrichedReservations = $derived(
    reservations.map(r => {
      const customer = users.find(u => u._id === r.customerId);
      const customerEmail = customer ? customer.email : "Customer ID: " + r.customerId;
      
      const medsList = r.medsList.map(item => {
        const med = medicines.find(m => m._id === item.medicineId);
        return {
          ...item,
          medicineName: med ? med.name : item.medicineId,
          genericName: med ? med.genericName : "",
          requiresPrescription: med ? med.requiresPrescription : false,
          conflicts: med ? (med.conflicts || []) : [],
          unitSellingPrice: med ? med.unitSellingPrice : 0
        };
      });

      // Find prescription if uploaded
      const prescription = prescriptions.find(p => p.userId === r.customerId) || (r.prescriptionImageUrl ? { imageUrl: r.prescriptionImageUrl } : null);

      // Check drug interaction conflicts
      const allConflicts: string[] = [];
      medsList.forEach(m => {
        if (m.conflicts && m.conflicts.length > 0) {
          m.conflicts.forEach(c => {
            if (!allConflicts.includes(c)) allConflicts.push(c);
          });
        }
      });

      // Mock additional interaction warning check if multiple medicines are present
      if (medsList.length > 1 && !allConflicts.includes("Drug Combination Alert")) {
        allConflicts.push("Simultaneous multi-drug therapy verification recommended");
      }

      return {
        ...r,
        customerEmail,
        medsList,
        prescription,
        allConflicts,
        hasRxRequired: medsList.some(m => m.requiresPrescription)
      };
    })
  );

  // Filtered reservations based on tab & search query
  let filteredReservations = $derived(
    enrichedReservations.filter(r => {
      const matchesSearch = 
        r._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.medsList.some(m => m.medicineName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedTab === "pending") return r.status === "pending";
      if (selectedTab === "approved") return r.status === "approved";
      if (selectedTab === "ready") return r.status === "ready";
      if (selectedTab === "completed") return r.status === "completed" || r.status === "delivered";
      if (selectedTab === "rejected") return r.status === "rejected" || r.status === "cancelled";
      return true;
    })
  );

  // Actions
  function openDetails(res: any) {
    selectedReservation = res;
    pharmacistNote = res.pharmacistNote || "";
    isDetailOpen = true;
  }

  function approveReservation(id: string) {
    reservations = reservations.map(r => 
      r._id === id ? { ...r, status: "approved", pharmacistNote: pharmacistNote || "Approved by Pharmacist" } : r
    );
    toast.success(`Reservation ${id} approved successfully!`);
    isDetailOpen = false;
  }

  function markAsReady(id: string) {
    reservations = reservations.map(r => 
      r._id === id ? { ...r, status: "ready" } : r
    );
    toast.success(`Reservation ${id} marked as Ready for Pickup.`);
    isDetailOpen = false;
  }

  function markAsCompleted(id: string) {
    reservations = reservations.map(r => 
      r._id === id ? { ...r, status: "completed" } : r
    );
    toast.success(`Reservation ${id} marked as Completed & Delivered.`);
    isDetailOpen = false;
  }

  function openRejectDialog(res: any) {
    selectedReservation = res;
    rejectionReason = "";
    isRejectOpen = true;
  }

  function confirmRejection() {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for rejection.");
      return;
    }

    reservations = reservations.map(r => 
      r._id === selectedReservation._id ? { ...r, status: "rejected", pharmacistNote: `Rejected: ${rejectionReason}` } : r
    );
    toast.error(`Reservation ${selectedReservation._id} has been rejected.`);
    isRejectOpen = false;
    isDetailOpen = false;
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "approved": return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
      case "ready": return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300";
      case "completed": 
      case "delivered": return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "rejected":
      case "cancelled": return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <CheckCircle2 class="w-8 h-8 text-primary" /> Pending Approvals & Reservations
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Review customer order requests, inspect uploaded prescriptions, verify drug interactions, and grant approvals.
      </p>
    </div>
  </div>

  <!-- Tabs & Search Bar Header -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <!-- Filter Tabs -->
    <div class="flex flex-wrap gap-2">
      <Button 
        variant={selectedTab === 'all' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'all'} 
        class="text-xs rounded-full">
        All ({reservations.length})
      </Button>
      <Button 
        variant={selectedTab === 'pending' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'pending'} 
        class="text-xs rounded-full">
        Pending ({reservations.filter(r => r.status === 'pending').length})
      </Button>
      <Button 
        variant={selectedTab === 'approved' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'approved'} 
        class="text-xs rounded-full">
        Approved ({reservations.filter(r => r.status === 'approved').length})
      </Button>
      <Button 
        variant={selectedTab === 'ready' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'ready'} 
        class="text-xs rounded-full">
        Ready for Pickup ({reservations.filter(r => r.status === 'ready').length})
      </Button>
      <Button 
        variant={selectedTab === 'completed' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedTab = 'completed'} 
        class="text-xs rounded-full">
        Completed ({reservations.filter(r => r.status === 'completed' || r.status === 'delivered').length})
      </Button>
    </div>

    <!-- Search Input -->
    <div class="relative w-full md:w-80">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input bind:value={searchQuery} placeholder="Search ID, customer, medicine..." class="pl-9 bg-background h-9 text-xs" />
    </div>
  </div>

  <!-- Reservations Table -->
  <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row>
            <Table.Head class="font-semibold text-xs pl-6">ID & Date</Table.Head>
            <Table.Head class="font-semibold text-xs">Customer</Table.Head>
            <Table.Head class="font-semibold text-xs">Reserved Items</Table.Head>
            <Table.Head class="font-semibold text-xs">Prescription & Safety</Table.Head>
            <Table.Head class="font-semibold text-xs">Total Amount</Table.Head>
            <Table.Head class="font-semibold text-xs">Status</Table.Head>
            <Table.Head class="text-right font-semibold text-xs pr-6">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredReservations.length === 0}
            <Table.Row>
              <Table.Cell colspan={7} class="text-center h-40 text-muted-foreground text-sm">
                No reservation records match the current filter or search criteria.
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredReservations as res}
              <Table.Row class="hover:bg-muted/30 transition-colors">
                <Table.Cell class="font-mono text-xs pl-6">
                  <div class="font-semibold text-foreground">{res._id}</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(res.createdAt).toLocaleDateString()}
                  </div>
                </Table.Cell>

                <Table.Cell class="font-medium text-xs text-foreground">
                  {res.customerEmail}
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="space-y-1">
                    {#each res.medsList as item}
                      <div class="flex items-center gap-1 font-medium">
                        <span>{item.medicineName}</span>
                        <span class="text-muted-foreground text-[11px]">x{item.quantity}</span>
                      </div>
                    {/each}
                  </div>
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="space-y-1">
                    {#if res.hasRxRequired}
                      <Badge variant="outline" class="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300">
                        <FileText class="w-3 h-3 mr-1" /> Rx Required
                      </Badge>
                    {:else}
                      <Badge variant="outline" class="text-[10px] text-muted-foreground">
                        OTC (No Rx Needed)
                      </Badge>
                    {/if}

                    {#if res.allConflicts.length > 0}
                      <div>
                        <Badge variant="outline" class="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">
                          <AlertTriangle class="w-3 h-3 mr-1" /> Safety Warning ({res.allConflicts.length})
                        </Badge>
                      </div>
                    {/if}
                  </div>
                </Table.Cell>

                <Table.Cell class="font-semibold text-xs">
                  ${res.totalCosting.toFixed(2)}
                </Table.Cell>

                <Table.Cell>
                  <Badge variant="outline" class={`capitalize text-xs font-semibold px-2.5 py-0.5 border ${getStatusBadgeVariant(res.status)}`}>
                    {res.status}
                  </Badge>
                </Table.Cell>

                <Table.Cell class="text-right pr-6">
                  <div class="flex justify-end items-center gap-2">
                    <Button variant="ghost" size="sm" onclick={() => openDetails(res)} class="h-8 text-xs gap-1">
                      <Eye class="w-3.5 h-3.5" /> Details
                    </Button>

                    {#if res.status === 'pending'}
                      <Button size="sm" onclick={() => approveReservation(res._id)} class="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                        <CheckCircle2 class="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onclick={() => openRejectDialog(res)} class="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1">
                        <XCircle class="w-3.5 h-3.5" /> Reject
                      </Button>
                    {:else if res.status === 'approved'}
                      <Button size="sm" variant="outline" onclick={() => markAsReady(res._id)} class="h-8 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-1">
                        <Truck class="w-3.5 h-3.5" /> Mark Ready
                      </Button>
                    {:else if res.status === 'ready'}
                      <Button size="sm" variant="default" onclick={() => markAsCompleted(res._id)} class="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                        <CheckCircle2 class="w-3.5 h-3.5" /> Complete
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

  <!-- Detailed Reservation & Prescription Verification Modal -->
  {#if selectedReservation}
    <Dialog.Root bind:open={isDetailOpen}>
      <Dialog.Content class="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <Dialog.Header>
          <div class="flex items-center justify-between">
            <Dialog.Title class="text-xl font-bold flex items-center gap-2">
              <Pill class="w-5 h-5 text-primary" /> Reservation Details #{selectedReservation._id}
            </Dialog.Title>
            <Badge variant="outline" class={`capitalize text-xs font-semibold px-2.5 py-0.5 border ${getStatusBadgeVariant(selectedReservation.status)}`}>
              {selectedReservation.status}
            </Badge>
          </div>
          <Dialog.Description class="text-xs">
            Review customer order, prescription document, and drug interaction risks.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-5 py-3">
          <!-- Customer Info -->
          <div class="p-3.5 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row justify-between gap-3 text-xs">
            <div>
              <span class="text-muted-foreground block font-medium">Customer Email:</span>
              <strong class="text-foreground text-sm">{selectedReservation.customerEmail}</strong>
            </div>
            <div>
              <span class="text-muted-foreground block font-medium">Pickup Date:</span>
              <strong class="text-foreground">{new Date(selectedReservation.pickupDate).toLocaleDateString()}</strong>
            </div>
            <div>
              <span class="text-muted-foreground block font-medium">Total Amount:</span>
              <strong class="text-emerald-600 dark:text-emerald-400 text-sm">${selectedReservation.totalCosting.toFixed(2)}</strong>
            </div>
          </div>

          <!-- Items Ordered Table -->
          <div>
            <h4 class="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Reserved Items</h4>
            <div class="border rounded-lg overflow-hidden text-xs">
              <Table.Root>
                <Table.Header class="bg-muted/40">
                  <Table.Row>
                    <Table.Head class="py-2">Medicine</Table.Head>
                    <Table.Head class="py-2">Quantity</Table.Head>
                    <Table.Head class="py-2 text-right">Price</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each selectedReservation.medsList as item}
                    <Table.Row>
                      <Table.Cell class="py-2 font-semibold">{item.medicineName}</Table.Cell>
                      <Table.Cell class="py-2">{item.quantity} units</Table.Cell>
                      <Table.Cell class="py-2 text-right">${(item.unitSellingPrice * item.quantity).toFixed(2)}</Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          </div>

          <!-- Prescription Verification Box -->
          <div class="space-y-2">
            <h4 class="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText class="w-4 h-4 text-purple-600" /> Prescription Document
            </h4>
            {#if selectedReservation.prescription}
              <div class="p-4 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900 flex flex-col items-center gap-3 text-center">
                <FileText class="w-12 h-12 text-purple-600 opacity-80" />
                <div>
                  <p class="font-semibold text-xs text-purple-900 dark:text-purple-300">Prescription Attached & Uploaded</p>
                  <p class="text-[11px] text-muted-foreground">Document verified for customer {selectedReservation.customerEmail}</p>
                </div>
                <Button variant="outline" size="sm" onclick={() => toast.info("Opening high-resolution prescription viewer...")} class="text-xs bg-background">
                  View Full Prescription Document
                </Button>
              </div>
            {:else if selectedReservation.hasRxRequired}
              <div class="p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle class="w-5 h-5 flex-shrink-0 text-amber-600" />
                <span>Notice: One or more medicines require a valid doctor prescription. Verification mandatory before approval.</span>
              </div>
            {:else}
              <p class="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border">No prescription required for these over-the-counter medicines.</p>
            {/if}
          </div>

          <!-- Drug Interaction Banners -->
          {#if selectedReservation.allConflicts.length > 0}
            <div class="space-y-2">
              <h4 class="font-bold text-xs uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <ShieldAlert class="w-4 h-4" /> Drug Safety & Interaction Warning
              </h4>
              <div class="p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 space-y-1.5">
                {#each selectedReservation.allConflicts as conflict}
                  <div class="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>{conflict}</span>
                  </div>
                {/each}
                <p class="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                  Pharmacist action: Verify patient history or contact prescribing physician if safety concerns arise.
                </p>
              </div>
            </div>
          {/if}

          <!-- Pharmacist Note Input -->
          <div class="space-y-1.5">
            <Label for="pharmacistNote" class="text-xs font-semibold">Pharmacist Note / Patient Instructions</Label>
            <Textarea 
              id="pharmacistNote" 
              bind:value={pharmacistNote} 
              placeholder="Add advice or notes (e.g. 'Take with food twice daily', 'Approved for 4 PM pickup')" 
              class="text-xs h-20" />
          </div>
        </div>

        <!-- Dialog Footer Actions -->
        <Dialog.Footer class="gap-2 sm:gap-0">
          <Button variant="outline" onclick={() => isDetailOpen = false} class="text-xs">Close</Button>
          {#if selectedReservation.status === 'pending'}
            <Button variant="outline" onclick={() => openRejectDialog(selectedReservation)} class="text-xs text-rose-600 border-rose-300 hover:bg-rose-50">
              Reject
            </Button>
            <Button onclick={() => approveReservation(selectedReservation._id)} class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              Approve Reservation
            </Button>
          {:else if selectedReservation.status === 'approved'}
            <Button onclick={() => markAsReady(selectedReservation._id)} class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Mark as Ready for Pickup
            </Button>
          {:else if selectedReservation.status === 'ready'}
            <Button onclick={() => markAsCompleted(selectedReservation._id)} class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              Mark as Completed
            </Button>
          {/if}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}

  <!-- Rejection Confirmation Dialog -->
  <Dialog.Root bind:open={isRejectOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title class="text-rose-600 flex items-center gap-2">
          <XCircle class="w-5 h-5" /> Reject Reservation Request
        </Dialog.Title>
        <Dialog.Description class="text-xs pt-1">
          Please state the reason for rejecting reservation <strong>#{selectedReservation?._id}</strong>. This note will be sent to the customer.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-2 py-3">
        <Label for="rejectReason" class="text-xs font-semibold">Rejection Reason</Label>
        <Textarea 
          id="rejectReason" 
          bind:value={rejectionReason} 
          placeholder="e.g. Invalid prescription, out of stock, dosage discrepancy" 
          class="text-xs h-24" />
      </div>

      <Dialog.Footer class="gap-2">
        <Button variant="outline" onclick={() => isRejectOpen = false} class="text-xs">Cancel</Button>
        <Button variant="destructive" onclick={confirmRejection} class="text-xs">Confirm Rejection</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>