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
    Pill,
    Download,
    ExternalLink,
    Maximize2,
    Sparkles,
    Brain,
    RefreshCw,
  } from "lucide-svelte";

  import { convex } from "$lib/convexClient";
  import { api } from "../../../../../convex/_generated/api";
  import { onMount } from "svelte";

  let { data } = $props();

  // Reactive State — live from Convex
  let reservations = $state<any[]>([]);

  onMount(() => {
    const unsub = convex.onUpdate(api.reservations.listAllWithDetails, {}, (dataRes) => {
      if (dataRes) {
        reservations = dataRes;
      }
    });
    return () => unsub();
  });

  let searchQuery = $state("");
  let selectedTab = $state("all");

  // Dialog & Detail states
  let isDetailOpen = $state(false);
  let isRejectOpen = $state(false);
  let viewDocUrl = $state<string | null>(null);
  let selectedReservation = $state<any>(null);
  let rejectionReason = $state("");
  let pharmacistNote = $state("");

  // AI OCR Scanning State
  let isOcrScanning = $state(false);
  let ocrVerdict = $state<any | null>(null);

  // Filter reservations relevant for this pharmacist (or all if unbounded)
  let enrichedReservations = $derived(
    reservations.filter(
      (r) => !r.pharmacistId || !data?.user?._id || r.pharmacistId === data?.user?._id
    )
  );

  // Filtered reservations based on tab & search query
  let filteredReservations = $derived(
    enrichedReservations.filter((r) => {
      const matchesSearch =
        r._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customerEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.medsList.some((m: any) =>
          (m.medicineName || "").toLowerCase().includes(searchQuery.toLowerCase())
        );

      if (!matchesSearch) return false;

      if (selectedTab === "pending") return r.status === "pending";
      if (selectedTab === "approved") return r.status === "approved";
      if (selectedTab === "ready") return r.status === "ready";
      if (selectedTab === "completed")
        return r.status === "completed" || r.status === "delivered";
      if (selectedTab === "rejected")
        return r.status === "rejected" || r.status === "cancelled";
      return true;
    })
  );

  // Actions
  function openDetails(res: any) {
    selectedReservation = res;
    pharmacistNote = res.pharmacistNote || "";
    isDetailOpen = true;
    if (res.prescriptionImageUrl || res.prescription) {
      runOcrScan(res);
    } else {
      ocrVerdict = null;
    }
  }

  async function runOcrScan(resObj: any) {
    const docUrl = resObj?.prescriptionImageUrl || resObj?.prescription;
    if (!docUrl) return;

    isOcrScanning = true;
    ocrVerdict = null;

    try {
      const resp = await fetch("/api/ai/ocr-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionImageUrl: docUrl,
          medsList: (resObj.medsList || []).map((m: any) => ({
            medicineName: m.medicineName || m.name || "Medicine",
            genericName: m.genericName || m.generic || "",
            requiresPrescription: m.requiresPrescription ?? m.rx ?? true,
          })),
        }),
      });

      const dataRes = await resp.json();
      if (resp.ok) {
        ocrVerdict = dataRes;
        toast.success("AI OCR Prescription Analysis Complete!");
      } else {
        toast.error(dataRes.error || "Failed to scan prescription document.");
      }
    } catch (err: any) {
      console.error("OCR Scan Error:", err);
      toast.error("Error connecting to AI OCR Scanner endpoint.");
    } finally {
      isOcrScanning = false;
    }
  }

  async function approveReservation(id: string) {
    try {
      await convex.mutation(api.reservations.approve, {
        reservationId: id as any,
        pharmacistNote: pharmacistNote || "Approved by Pharmacist",
      });
      toast.success(
        `Reservation #${id.slice(-6)} approved! Customer notified.`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to approve reservation.");
    }
    isDetailOpen = false;
  }

  async function markAsReady(id: string) {
    try {
      await convex.mutation(api.reservations.markReady, {
        reservationId: id as any,
      });
      toast.success(`Reservation #${id.slice(-6)} marked as Ready for Pickup.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
    isDetailOpen = false;
  }

  async function markAsCompleted(id: string) {
    try {
      await convex.mutation(api.reservations.completeOrder, {
        reservationId: id as any,
      });
      toast.success(
        `Reservation #${id.slice(-6)} marked as Completed & Delivered.`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to complete order.");
    }
    isDetailOpen = false;
  }

  function openRejectDialog(res: any) {
    selectedReservation = res;
    rejectionReason = "";
    isRejectOpen = true;
  }

  async function confirmRejection() {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for rejection.");
      return;
    }

    try {
      await convex.mutation(api.reservations.reject, {
        reservationId: selectedReservation._id as any,
        reason: rejectionReason,
      });
      toast.error(
        `Reservation #${selectedReservation._id.slice(-6)} rejected and customer notified.`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to reject reservation.");
    }
    isRejectOpen = false;
    isDetailOpen = false;
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
      case "ready":
        return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300";
      case "completed":
      case "delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "rejected":
      case "cancelled":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  }

  function isPdf(url?: string): boolean {
    if (!url) return false;
    return (
      url.startsWith("data:application/pdf") ||
      url.toLowerCase().endsWith(".pdf") ||
      url.toLowerCase().includes("application/pdf")
    );
  }

  function openDocument(url?: string) {
    if (!url) return;
    if (url.startsWith("data:application/pdf")) {
      try {
        const arr = url.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "application/pdf";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        return;
      } catch (err) {
        console.error("PDF Blob conversion error", err);
      }
    }

    if (url.startsWith("data:")) {
      const w = window.open("");
      if (w) {
        w.document.write(
          `<title>Prescription Document</title><style>body{margin:0;background:#111;display:flex;justify-content:center;align-items:center;height:100vh;}</style><iframe src="${url}" style="width:100%;height:100vh;border:none;"></iframe>`
        );
        return;
      }
    }

    window.open(url, "_blank");
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
  <!-- Header -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6"
  >
    <div>
      <h1
        class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3"
      >
        <CheckCircle2 class="w-8 h-8 text-primary" /> Pending Approvals & Reservations
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Review customer order requests, inspect uploaded doctor prescriptions & PDFs with AI OCR, verify
        drug interactions, and grant approvals.
      </p>
    </div>
  </div>

  <!-- Tabs & Search Bar Header -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <!-- Filter Tabs -->
    <div class="flex flex-wrap gap-2">
      <Button
        variant={selectedTab === "all" ? "default" : "outline"}
        size="sm"
        onclick={() => (selectedTab = "all")}
        class="text-xs rounded-full"
      >
        All ({enrichedReservations.length})
      </Button>
      <Button
        variant={selectedTab === "pending" ? "default" : "outline"}
        size="sm"
        onclick={() => (selectedTab = "pending")}
        class="text-xs rounded-full"
      >
        Pending ({enrichedReservations.filter((r) => r.status === "pending").length})
      </Button>
      <Button
        variant={selectedTab === "approved" ? "default" : "outline"}
        size="sm"
        onclick={() => (selectedTab = "approved")}
        class="text-xs rounded-full"
      >
        Approved ({enrichedReservations.filter((r) => r.status === "approved").length})
      </Button>
      <Button
        variant={selectedTab === "ready" ? "default" : "outline"}
        size="sm"
        onclick={() => (selectedTab = "ready")}
        class="text-xs rounded-full"
      >
        Ready for Pickup ({enrichedReservations.filter((r) => r.status === "ready")
          .length})
      </Button>
      <Button
        variant={selectedTab === "completed" ? "default" : "outline"}
        size="sm"
        onclick={() => (selectedTab = "completed")}
        class="text-xs rounded-full"
      >
        Completed ({enrichedReservations.filter(
          (r) => r.status === "completed" || r.status === "delivered"
        ).length})
      </Button>
    </div>

    <!-- Search Input -->
    <div class="relative w-full md:w-80">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        bind:value={searchQuery}
        placeholder="Search ID, customer, medicine..."
        class="pl-9 bg-background h-9 text-xs"
      />
    </div>
  </div>

  <!-- Reservations Table -->
  <div
    class="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
  >
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row>
            <Table.Head class="font-semibold text-xs pl-6">ID & Date</Table.Head
            >
            <Table.Head class="font-semibold text-xs">Customer</Table.Head>
            <Table.Head class="font-semibold text-xs">Reserved Items</Table.Head
            >
            <Table.Head class="font-semibold text-xs"
              >Prescription & Safety</Table.Head
            >
            <Table.Head class="font-semibold text-xs">Total Amount</Table.Head>
            <Table.Head class="font-semibold text-xs">Status</Table.Head>
            <Table.Head class="text-right font-semibold text-xs pr-6"
              >Actions</Table.Head
            >
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredReservations.length === 0}
            <Table.Row>
              <Table.Cell
                colspan={7}
                class="text-center h-40 text-muted-foreground text-sm"
              >
                No reservation records match the current filter or search
                criteria.
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
                        <span class="text-muted-foreground text-[11px]"
                          >x{item.quantity}</span
                        >
                      </div>
                    {/each}
                  </div>
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="space-y-1">
                    {#if res.prescriptionImageUrl}
                      <Badge
                        variant="outline"
                        class="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-medium"
                      >
                        <FileText class="w-3 h-3 mr-1 text-emerald-600" />
                        {isPdf(res.prescriptionImageUrl) ? "Rx PDF Attached" : "Rx Image Attached"}
                      </Badge>
                    {:else if res.hasRxRequired}
                      <Badge
                        variant="outline"
                        class="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 font-medium"
                      >
                        <AlertTriangle class="w-3 h-3 mr-1 text-rose-600" /> Rx Missing!
                      </Badge>
                    {:else}
                      <Badge
                        variant="outline"
                        class="text-[10px] text-muted-foreground"
                      >
                        OTC (No Rx Needed)
                      </Badge>
                    {/if}

                    {#if (res.allConflicts || []).length > 0}
                      <div>
                        <Badge
                          variant="outline"
                          class="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300"
                        >
                          <AlertTriangle class="w-3 h-3 mr-1" /> Safety Warning ({(res.allConflicts || []).length})
                        </Badge>
                      </div>
                    {/if}
                  </div>
                </Table.Cell>

                <Table.Cell class="font-semibold text-xs">
                  ৳{res.totalCosting.toFixed(2)}
                </Table.Cell>

                <Table.Cell>
                  <Badge
                    variant="outline"
                    class={`capitalize text-xs font-semibold px-2.5 py-0.5 border ${getStatusBadgeVariant(res.status)}`}
                  >
                    {res.status}
                  </Badge>
                </Table.Cell>

                <Table.Cell class="text-right pr-6">
                  <div class="flex justify-end items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => openDetails(res)}
                      class="h-8 text-xs gap-1"
                    >
                      <Eye class="w-3.5 h-3.5" /> Details
                    </Button>

                    {#if res.status === "pending"}
                      <Button
                        size="sm"
                        onclick={() => approveReservation(res._id)}
                        class="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        <CheckCircle2 class="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => openRejectDialog(res)}
                        class="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                      >
                        <XCircle class="w-3.5 h-3.5" /> Reject
                      </Button>
                    {:else if res.status === "approved"}
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => markAsReady(res._id)}
                        class="h-8 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-1"
                      >
                        <Truck class="w-3.5 h-3.5" /> Mark Ready
                      </Button>
                    {:else if res.status === "ready"}
                      <Button
                        size="sm"
                        variant="default"
                        onclick={() => markAsCompleted(res._id)}
                        class="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
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

  <!-- Detailed Reservation & AI OCR Prescription Verification Modal -->
  {#if selectedReservation}
    <Dialog.Root bind:open={isDetailOpen}>
      <Dialog.Content class="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
          <div class="flex items-center justify-between">
            <Dialog.Title class="text-xl font-bold flex items-center gap-2">
              <Pill class="w-5 h-5 text-primary" /> Reservation Details #{selectedReservation._id}
            </Dialog.Title>
            <Badge
              variant="outline"
              class={`capitalize text-xs font-semibold px-2.5 py-0.5 border ${getStatusBadgeVariant(selectedReservation.status)}`}
            >
              {selectedReservation.status}
            </Badge>
          </div>
          <Dialog.Description class="text-xs">
            Review customer order, AI OCR prescription analysis (PDF / Image), and drug interaction safety.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-5 py-3">
          <!-- Customer Info -->
          <div
            class="p-3.5 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row justify-between gap-3 text-xs"
          >
            <div>
              <span class="text-muted-foreground block font-medium"
                >Customer Email:</span
              >
              <strong class="text-foreground text-sm"
                >{selectedReservation.customerEmail}</strong
              >
            </div>
            <div>
              <span class="text-muted-foreground block font-medium"
                >Pickup Date:</span
              >
              <strong class="text-foreground"
                >{new Date(
                  selectedReservation.pickupDate
                ).toLocaleDateString()}</strong
              >
            </div>
            <div>
              <span class="text-muted-foreground block font-medium"
                >Total Amount:</span
              >
              <strong class="text-emerald-600 dark:text-emerald-400 text-sm"
                >৳{selectedReservation.totalCosting.toFixed(2)}</strong
              >
            </div>
          </div>

          <!-- Items Ordered Table -->
          <div>
            <h4
              class="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2"
            >
              Reserved Items
            </h4>
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
                      <Table.Cell class="py-2 font-semibold"
                        >{item.medicineName}</Table.Cell
                      >
                      <Table.Cell class="py-2">{item.quantity} units</Table.Cell
                      >
                      <Table.Cell class="py-2 text-right"
                        >৳{(item.unitSellingPrice * item.quantity).toFixed(
                          2
                        )}</Table.Cell
                      >
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          </div>

          <!-- Prescription Verification & AI OCR Verdict Box -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4
                class="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <FileText class="w-4 h-4 text-purple-600" /> Doctor Prescription & AI OCR Verification
              </h4>

              {#if selectedReservation.prescriptionImageUrl || selectedReservation.prescription}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => runOcrScan(selectedReservation)}
                  disabled={isOcrScanning}
                  class="text-xs h-7 gap-1"
                >
                  <RefreshCw class="w-3 h-3 {isOcrScanning ? 'animate-spin' : ''}" />
                  Re-scan with AI OCR
                </Button>
              {/if}
            </div>

            {#if selectedReservation.prescriptionImageUrl || selectedReservation.prescription}
              {@const docUrl = selectedReservation.prescriptionImageUrl || selectedReservation.prescription}
              <div
                class="p-4 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900 flex flex-col items-center gap-3 text-center"
              >
                {#if isPdf(docUrl)}
                  <div class="w-full space-y-2">
                    <div class="flex items-center justify-center gap-2 text-xs font-semibold text-purple-900 dark:text-purple-300">
                      <FileText class="h-5 w-5 text-purple-600" />
                      Prescription Document (PDF Format)
                    </div>
                    <iframe
                      src={docUrl}
                      class="w-full h-80 rounded-lg border shadow-sm bg-white"
                      title="Prescription PDF Viewer"
                    ></iframe>
                  </div>
                {:else}
                  <img
                    src={docUrl}
                    alt="Prescription Document"
                    class="max-h-72 max-w-full rounded-lg object-contain border shadow-sm"
                  />
                {/if}

                <div>
                  <p
                    class="font-semibold text-xs text-purple-900 dark:text-purple-300"
                  >
                    Prescription Attached & Uploaded by Customer
                  </p>
                  <p class="text-[11px] text-muted-foreground">
                    Verified for {selectedReservation.customerEmail}
                  </p>
                </div>

                <div class="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => (viewDocUrl = docUrl)}
                    class="text-xs font-semibold gap-1.5"
                  >
                    <Maximize2 class="w-3.5 h-3.5 text-primary" /> View in App Modal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => openDocument(docUrl)}
                    class="text-xs bg-background font-semibold gap-1.5"
                  >
                    <ExternalLink class="w-3.5 h-3.5" /> Open PDF / Image in New Window
                  </Button>
                </div>
              </div>

              <!-- AI OCR Scanner Verdict Component -->
              {#if isOcrScanning}
                <div class="p-4 rounded-xl bg-purple-500/10 border border-purple-300 flex items-center justify-center gap-3">
                  <Sparkles class="h-5 w-5 text-purple-600 animate-spin" />
                  <div class="text-xs font-semibold text-purple-900 dark:text-purple-300">
                    AI OCR Scanner analyzing prescription document & verifying required medications...
                  </div>
                </div>
              {:else if ocrVerdict}
                <div class="p-4 rounded-xl border space-y-3.5 text-left {ocrVerdict.status === 'VERIFIED' ? 'bg-emerald-500/10 border-emerald-400' : 'bg-amber-500/10 border-amber-400'}">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Brain class="h-5 w-5 text-purple-600" />
                      <span class="font-bold text-xs uppercase tracking-wider">AI OCR Clinical Verdict</span>
                    </div>
                    <Badge variant="outline" class="text-xs font-bold {ocrVerdict.status === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}">
                      {ocrVerdict.status === 'VERIFIED' ? '✓ VERIFIED MATCH' : '⚠ VERIFICATION NOTICE'} ({ocrVerdict.confidenceScore}% confidence)
                    </Badge>
                  </div>

                  <p class="text-xs font-semibold text-foreground leading-relaxed">
                    {ocrVerdict.verdictSummary}
                  </p>

                  <div class="grid grid-cols-2 gap-2 text-[11px] bg-background/70 p-2.5 rounded-lg border">
                    <div>
                      <span class="text-muted-foreground block font-medium">Prescribing Doctor:</span>
                      <strong class="text-foreground">{ocrVerdict.detectedDoctor}</strong>
                    </div>
                    <div>
                      <span class="text-muted-foreground block font-medium">Prescription Date:</span>
                      <strong class="text-foreground">{ocrVerdict.detectedDate}</strong>
                    </div>
                  </div>

                  <!-- Medicine Match Verification List -->
                  <div class="space-y-1.5 pt-1">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Medicine Verification Checklist:</p>
                    {#each ocrVerdict.rxItemsMatch as match}
                      <div class="p-2.5 rounded-lg bg-background/90 text-xs border space-y-1">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            {#if match.matchStatus === 'MATCHED'}
                              <CheckCircle2 class="h-4 w-4 text-emerald-600 shrink-0" />
                            {:else if match.matchStatus === 'NOT_REQUIRED'}
                              <Pill class="h-4 w-4 text-blue-600 shrink-0" />
                            {:else}
                              <XCircle class="h-4 w-4 text-rose-600 shrink-0" />
                            {/if}
                            <div>
                              <span class="font-semibold text-foreground">{match.medicineName}</span>
                              {#if match.genericName}
                                <span class="text-[10px] text-muted-foreground ml-1">({match.genericName})</span>
                              {/if}
                            </div>
                          </div>

                          {#if match.matchStatus === 'MATCHED'}
                            <Badge variant="outline" class="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400">
                              ✓ FOUND IN PDF
                            </Badge>
                          {:else if match.matchStatus === 'NOT_REQUIRED'}
                            <Badge variant="outline" class="text-[10px] font-semibold text-muted-foreground">
                              OTC (No Rx Needed)
                            </Badge>
                          {:else}
                            <Badge variant="outline" class="text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400">
                              ✕ NOT FOUND IN PDF
                            </Badge>
                          {/if}
                        </div>
                        {#if match.note}
                          <p class="text-[11px] text-muted-foreground pl-6">
                            {match.note}
                          </p>
                        {/if}
                      </div>
                    {/each}
                  </div>

                  <p class="text-[11px] text-muted-foreground italic border-t border-border/60 pt-2">
                    <strong class="text-foreground">Pharmacist Verdict Advice:</strong> {ocrVerdict.pharmacistRecommendation}
                  </p>
                </div>
              {/if}
            {:else if selectedReservation.hasRxRequired}
              <div
                class="p-3.5 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertTriangle class="w-5 h-5 flex-shrink-0 text-rose-600" />
                <span>
                  <strong>Rx Missing!</strong> One or more medicines require a valid doctor prescription, but no document was attached by the customer.
                </span>
              </div>
            {:else}
              <p
                class="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border"
              >
                No prescription required for these over-the-counter medicines.
              </p>
            {/if}
          </div>

          <!-- Drug Interaction Banners -->
          {#if (selectedReservation.allConflicts || []).length > 0}
            <div class="space-y-2">
              <h4
                class="font-bold text-xs uppercase tracking-wider text-amber-600 flex items-center gap-1.5"
              >
                <ShieldAlert class="w-4 h-4" /> Drug Safety & Interaction Warning
              </h4>
              <div
                class="p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 space-y-1.5"
              >
                {#each selectedReservation.allConflicts as conflict}
                  <div
                    class="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>{conflict}</span>
                  </div>
                {/each}
                <p class="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                  Pharmacist action: Verify patient history or contact
                  prescribing physician if safety concerns arise.
                </p>
              </div>
            </div>
          {/if}

          <!-- Pharmacist Note Input -->
          <div class="space-y-1.5">
            <Label for="pharmacistNote" class="text-xs font-semibold"
              >Pharmacist Note / Patient Instructions</Label
            >
            <Textarea
              id="pharmacistNote"
              bind:value={pharmacistNote}
              placeholder="Add advice or notes (e.g. 'Take with food twice daily', 'Approved for 4 PM pickup')"
              class="text-xs h-20"
            />
          </div>
        </div>

        <!-- Dialog Footer Actions -->
        <Dialog.Footer class="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onclick={() => (isDetailOpen = false)}
            class="text-xs">Close</Button
          >
          {#if selectedReservation.status === "pending"}
            <Button
              variant="outline"
              onclick={() => openRejectDialog(selectedReservation)}
              class="text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
            >
              Reject
            </Button>
            <Button
              onclick={() => approveReservation(selectedReservation._id)}
              class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Approve Reservation
            </Button>
          {:else if selectedReservation.status === "approved"}
            <Button
              onclick={() => markAsReady(selectedReservation._id)}
              class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Mark as Ready for Pickup
            </Button>
          {:else if selectedReservation.status === "ready"}
            <Button
              onclick={() => markAsCompleted(selectedReservation._id)}
              class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Mark as Completed
            </Button>
          {/if}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}

  <!-- Full Document / PDF Viewer Modal -->
  <Dialog.Root open={!!viewDocUrl} onOpenChange={(v) => { if (!v) viewDocUrl = null; }}>
    <Dialog.Content class="sm:max-w-[850px] max-h-[95vh]">
      <Dialog.Header>
        <Dialog.Title class="text-base font-bold flex items-center gap-2">
          <FileText class="h-5 w-5 text-purple-600" /> Prescription Document Viewer
        </Dialog.Title>
        <Dialog.Description class="text-xs">
          High-resolution document viewer for pharmacist verification.
        </Dialog.Description>
      </Dialog.Header>
      
      <div class="py-2 space-y-3">
        {#if isPdf(viewDocUrl ?? "")}
          <iframe
            src={viewDocUrl ?? ""}
            class="w-full h-[550px] rounded-lg border shadow-inner bg-white"
            title="Prescription PDF Viewer"
          ></iframe>
        {:else}
          <div class="max-h-[550px] overflow-auto flex items-center justify-center bg-black/5 p-4 rounded-lg border">
            <img
              src={viewDocUrl ?? ""}
              alt="Prescription Full Resolution"
              class="max-h-[500px] w-auto rounded-lg shadow-md object-contain"
            />
          </div>
        {/if}

        <!-- AI OCR Scanner Card inside viewer modal as well -->
        {#if ocrVerdict}
          <div class="p-3.5 rounded-xl border bg-purple-500/5 border-purple-300 text-left text-xs space-y-2">
            <div class="flex items-center justify-between font-bold">
              <span class="flex items-center gap-1.5"><Brain class="h-4 w-4 text-purple-600" /> AI OCR Summary Verdict:</span>
              <Badge variant="outline" class="text-[10px] font-bold bg-purple-600 text-white">{ocrVerdict.status} ({ocrVerdict.confidenceScore}%)</Badge>
            </div>
            <p class="text-muted-foreground">{ocrVerdict.verdictSummary}</p>
            <p class="italic text-[11px] text-purple-900 dark:text-purple-300"><strong>Advice:</strong> {ocrVerdict.pharmacistRecommendation}</p>
          </div>
        {/if}
      </div>

      <Dialog.Footer class="gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={() => openDocument(viewDocUrl ?? "")}
          class="text-xs font-semibold gap-1.5"
        >
          <ExternalLink class="h-3.5 w-3.5" /> Open in Separate Window
        </Button>
        <Button variant="secondary" size="sm" onclick={() => (viewDocUrl = null)} class="text-xs">
          Close Viewer
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Rejection Confirmation Dialog -->
  <Dialog.Root bind:open={isRejectOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title class="text-rose-600 flex items-center gap-2">
          <XCircle class="w-5 h-5" /> Reject Reservation Request
        </Dialog.Title>
        <Dialog.Description class="text-xs pt-1">
          Please state the reason for rejecting reservation <strong
            >#{selectedReservation?._id}</strong
          >. This note will be sent to the customer.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-2 py-3">
        <Label for="rejectReason" class="text-xs font-semibold"
          >Rejection Reason</Label
        >
        <Textarea
          id="rejectReason"
          bind:value={rejectionReason}
          placeholder="e.g. Invalid prescription, out of stock, dosage discrepancy"
          class="text-xs h-24"
        />
      </div>

      <Dialog.Footer class="gap-2">
        <Button
          variant="outline"
          onclick={() => (isRejectOpen = false)}
          class="text-xs">Cancel</Button
        >
        <Button variant="destructive" onclick={confirmRejection} class="text-xs"
          >Confirm Rejection</Button
        >
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
