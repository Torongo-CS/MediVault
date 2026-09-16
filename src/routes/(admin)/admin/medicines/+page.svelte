<!-- routes/(admin)/admin/medicines/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../../convex/dummyData.json";
  import { Edit, Trash2, Plus, Search, RefreshCw, Pill, AlertTriangle, ShieldCheck, DollarSign } from "lucide-svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../../convex/_generated/api";

  // State
  let medicines = $state<any[]>([...dummyData.medicines]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let searchQuery = $state("");
  let rxFilter = $state<"all" | "otc" | "rx">("all");
  let isDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let editingMedicine = $state<any>(null);
  let medicineToDelete = $state<any>(null);

  // Form states
  let formName = $state("");
  let formGenericName = $state("");
  let formDescription = $state("");
  let formStock = $state(100);
  let formCostingPrice = $state(2.0);
  let formSellingPrice = $state(3.5);
  let formSymptomsStr = $state("Fever, Headache");
  let formRequiresRx = $state(false);

  // Filtered Medicines
  let filteredMedicines = $derived(
    medicines.filter((m) => {
      if (rxFilter === "otc" && m.requiresPrescription) return false;
      if (rxFilter === "rx" && !m.requiresPrescription) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        (m.symptoms && m.symptoms.some((s: string) => s.toLowerCase().includes(q)))
      );
    })
  );

  async function fetchMedicines() {
    isLoading = true;
    try {
      const res = await convex.query(api.admin.listMedicines, {});
      if (res && res.length > 0) {
        medicines = res;
      }
    } catch (err) {
      console.warn("Using local fallback data:", err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchMedicines();
    const unsubscribe = convex.onUpdate(api.admin.listMedicines, {}, (updated) => {
      if (updated) medicines = updated;
    });
    return () => unsubscribe();
  });

  function openCreateDialog() {
    editingMedicine = null;
    formName = "";
    formGenericName = "";
    formDescription = "";
    formStock = 100;
    formCostingPrice = 2.0;
    formSellingPrice = 3.5;
    formSymptomsStr = "Fever, Headache";
    formRequiresRx = false;
    isDialogOpen = true;
  }

  function openEditDialog(m: any) {
    editingMedicine = m;
    formName = m.name;
    formGenericName = m.genericName;
    formDescription = m.description || "";
    formStock = m.stock;
    formCostingPrice = m.unitCostingPrice || 0;
    formSellingPrice = m.unitSellingPrice || 0;
    formSymptomsStr = Array.isArray(m.symptoms) ? m.symptoms.join(", ") : "";
    formRequiresRx = m.requiresPrescription ?? false;
    isDialogOpen = true;
  }

  function openDeleteDialog(m: any) {
    medicineToDelete = m;
    isDeleteDialogOpen = true;
  }

  async function saveMedicine() {
    if (!formName.trim() || !formGenericName.trim()) {
      toast.error("Medicine name and generic name are required");
      return;
    }

    const symptomsList = formSymptomsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    isSubmitting = true;
    try {
      if (editingMedicine) {
        await convex.mutation(api.admin.updateMedicine, {
          medicineId: editingMedicine._id,
          name: formName.trim(),
          genericName: formGenericName.trim(),
          description: formDescription.trim(),
          stock: Number(formStock),
          unitCostingPrice: Number(formCostingPrice),
          unitSellingPrice: Number(formSellingPrice),
          symptoms: symptomsList,
          requiresPrescription: formRequiresRx,
        });

        medicines = medicines.map((m) =>
          m._id === editingMedicine._id
            ? {
                ...m,
                name: formName,
                genericName: formGenericName,
                description: formDescription,
                stock: formStock,
                unitCostingPrice: formCostingPrice,
                unitSellingPrice: formSellingPrice,
                symptoms: symptomsList,
                requiresPrescription: formRequiresRx,
              }
            : m
        );
        toast.success("Medicine updated in Convex DB");
      } else {
        const newId = await convex.mutation(api.admin.createMedicine, {
          name: formName.trim(),
          genericName: formGenericName.trim(),
          description: formDescription.trim(),
          stock: Number(formStock),
          unitCostingPrice: Number(formCostingPrice),
          unitSellingPrice: Number(formSellingPrice),
          symptoms: symptomsList,
          requiresPrescription: formRequiresRx,
          expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year default
          conflicts: [],
        });

        const newMed = {
          _id: newId,
          name: formName.trim(),
          genericName: formGenericName.trim(),
          description: formDescription.trim(),
          stock: Number(formStock),
          unitCostingPrice: Number(formCostingPrice),
          unitSellingPrice: Number(formSellingPrice),
          symptoms: symptomsList,
          requiresPrescription: formRequiresRx,
          expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
          conflicts: [],
        };
        medicines = [newMed, ...medicines];
        toast.success("Medicine added to Convex DB");
      }
      isDialogOpen = false;
    } catch (err: any) {
      toast.error(err.message || "Failed to save medicine");
    } finally {
      isSubmitting = false;
    }
  }

  async function deleteMedicine() {
    if (!medicineToDelete) return;
    isSubmitting = true;
    try {
      await convex.mutation(api.admin.deleteMedicine, {
        medicineId: medicineToDelete._id,
      });
      medicines = medicines.filter((m) => m._id !== medicineToDelete._id);
      toast.success("Medicine deleted from Convex DB");
      isDeleteDialogOpen = false;
      medicineToDelete = null;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete medicine");
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto space-y-6">
  <div class="dashboard-header flex justify-between items-end mb-6 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Pill class="w-9 h-9 text-primary" /> Medicine Catalog Management
      </h1>
      <p class="text-muted-foreground mt-2 text-base">Manage master inventory, unit pricing, stock limits, and Rx rules.</p>
    </div>
    <div class="flex gap-3">
      <Button variant="outline" onclick={fetchMedicines} class="gap-2 h-11 px-4">
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" /> Refresh
      </Button>
      <Button onclick={openCreateDialog} class="gap-2 shadow-sm h-11 px-6">
        <Plus class="w-5 h-5" /> Add Medicine
      </Button>
    </div>
  </div>

  <div class="bg-card border border-border rounded-xl shadow-md overflow-hidden">
    <!-- Toolbar -->
    <div class="p-5 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
      <div class="relative w-full sm:w-96">
        <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input bind:value={searchQuery} type="text" placeholder="Search by brand name, generic or symptom..." class="pl-10 bg-background h-10 shadow-sm" />
      </div>

      <div class="flex gap-2 w-full sm:w-auto">
        <Button variant={rxFilter === "all" ? "default" : "outline"} size="sm" onclick={() => rxFilter = "all"} class="text-xs">All</Button>
        <Button variant={rxFilter === "otc" ? "default" : "outline"} size="sm" onclick={() => rxFilter = "otc"} class="text-xs">OTC Only</Button>
        <Button variant={rxFilter === "rx" ? "default" : "outline"} size="sm" onclick={() => rxFilter = "rx"} class="text-xs">Rx Required</Button>
      </div>
    </div>

    <!-- Table -->
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row class="hover:bg-transparent">
            <Table.Head class="font-semibold text-muted-foreground pl-6">Medicine & Generic</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Inventory Stock</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Cost Price</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Selling Price</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Rx Required</Table.Head>
            <Table.Head class="text-right font-semibold text-muted-foreground pr-6">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredMedicines.length === 0}
            <Table.Row>
              <Table.Cell colspan={6} class="text-center h-40 text-muted-foreground text-lg">
                No medicines found matching criteria
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredMedicines as med}
              <Table.Row class="group transition-colors hover:bg-muted/40 cursor-default">
                <Table.Cell class="align-middle pl-6">
                  <div>
                    <p class="font-bold text-foreground text-base">{med.name}</p>
                    <p class="text-xs text-muted-foreground italic">{med.genericName}</p>
                  </div>
                </Table.Cell>
                <Table.Cell class="align-middle">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm">{med.stock} units</span>
                    {#if med.stock < 50}
                      <Badge variant="outline" class="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0">
                        <AlertTriangle class="w-3 h-3" /> Low Stock
                      </Badge>
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell class="align-middle font-medium text-xs text-muted-foreground">
                  ৳{med.unitCostingPrice?.toFixed(2) ?? "0.00"}
                </Table.Cell>
                <Table.Cell class="align-middle font-bold text-sm text-primary">
                  ৳{med.unitSellingPrice?.toFixed(2) ?? "0.00"}
                </Table.Cell>
                <Table.Cell class="align-middle">
                  {#if med.requiresPrescription}
                    <Badge variant="outline" class="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
                      Rx Required
                    </Badge>
                  {:else}
                    <Badge variant="outline" class="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
                      OTC
                    </Badge>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right align-middle pr-6">
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onclick={() => openEditDialog(med)}>
                      <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button variant="ghost" size="icon" onclick={() => openDeleteDialog(med)}>
                      <Trash2 class="h-4 w-4 text-destructive hover:text-destructive/80 transition-colors" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px]">
      <Dialog.Header>
        <Dialog.Title>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</Dialog.Title>
        <Dialog.Description>
          {editingMedicine ? 'Update medicine item parameters in Convex.' : 'Add a new pharmaceutical product.'}
        </Dialog.Description>
      </Dialog.Header>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-2">
            <Label for="medName">Brand Name</Label>
            <Input id="medName" bind:value={formName} placeholder="Paracetamol 500mg" />
          </div>
          <div class="grid gap-2">
            <Label for="genName">Generic Name</Label>
            <Input id="genName" bind:value={formGenericName} placeholder="Acetaminophen" />
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="medDesc">Description</Label>
          <Input id="medDesc" bind:value={formDescription} placeholder="Fast effective pain reliever..." />
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="grid gap-2">
            <Label for="stock">Stock Quantity</Label>
            <Input id="stock" type="number" bind:value={formStock} min="0" />
          </div>
          <div class="grid gap-2">
            <Label for="costPrice">Cost Price (৳)</Label>
            <Input id="costPrice" type="number" step="0.5" bind:value={formCostingPrice} min="0" />
          </div>
          <div class="grid gap-2">
            <Label for="sellPrice">Selling Price (৳)</Label>
            <Input id="sellPrice" type="number" step="0.5" bind:value={formSellingPrice} min="0" />
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="symptoms">Symptoms (Comma Separated)</Label>
          <Input id="symptoms" bind:value={formSymptomsStr} placeholder="Fever, Headache, Body Pain" />
        </div>

        <div class="flex items-center gap-3 pt-2">
          <input id="requiresRx" type="checkbox" bind:checked={formRequiresRx} class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          <Label for="requiresRx" class="cursor-pointer font-medium">Requires Doctor's Prescription (Rx)</Label>
        </div>
      </div>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => isDialogOpen = false}>Cancel</Button>
        <Button onclick={saveMedicine} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Product'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Delete Modal -->
  <Dialog.Root bind:open={isDeleteDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title class="text-destructive flex items-center gap-2">
          <Trash2 class="w-5 h-5" /> Delete Medicine
        </Dialog.Title>
        <Dialog.Description class="pt-2">
          Are you sure you want to remove <strong class="text-foreground">{medicineToDelete?.name}</strong> from the database?
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="mt-4">
        <Button variant="outline" onclick={() => isDeleteDialogOpen = false}>Cancel</Button>
        <Button variant="destructive" onclick={deleteMedicine} disabled={isSubmitting}>
          {isSubmitting ? 'Deleting...' : 'Delete Medicine'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
