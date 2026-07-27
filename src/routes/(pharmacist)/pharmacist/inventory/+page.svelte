<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../../convex/dummyData.json";
  import { 
    Package, 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    AlertTriangle, 
    CheckCircle2, 
    FileText, 
    TrendingUp, 
    Minus, 
    RotateCcw,
    Pill
  } from "lucide-svelte";

  // Reactive State initialized from dummyData
  let medicines = $state([...dummyData.medicines]);
  let searchQuery = $state("");
  let selectedFilter = $state("all");

  // Modal / Form state
  let isFormOpen = $state(false);
  let isDeleteOpen = $state(false);
  let editingMedicine = $state<any>(null);
  let medicineToDelete = $state<any>(null);

  // Form Fields
  let formName = $state("");
  let formGenericName = $state("");
  let formDescription = $state("");
  let formSymptoms = $state("");
  let formStock = $state(50);
  let formCostPrice = $state(5.0);
  let formSellingPrice = $state(10.0);
  let formRequiresPrescription = $state(false);
  let formConflicts = $state("");
  let formExpiryDate = $state("2026-12-31");

  // Derived filtered medicines
  let filteredMedicines = $derived(
    medicines.filter(m => {
      const matchesQuery = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.symptoms && m.symptoms.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesQuery) return false;

      if (selectedFilter === "low_stock") return m.stock < 20;
      if (selectedFilter === "rx_required") return m.requiresPrescription;
      if (selectedFilter === "expiring") {
        const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000;
        return (m.expiryDate - Date.now()) < sixMonthsInMs;
      }
      return true;
    })
  );

  // Quick Stock Adjustment
  function adjustStock(id: string, delta: number) {
    medicines = medicines.map(m => {
      if (m._id === id) {
        const newStock = Math.max(0, m.stock + delta);
        toast.success(`Updated ${m.name} stock to ${newStock} units`);
        return { ...m, stock: newStock };
      }
      return m;
    });
  }

  // Open Form for Adding New Medicine
  function openAddModal() {
    editingMedicine = null;
    formName = "";
    formGenericName = "";
    formDescription = "";
    formSymptoms = "";
    formStock = 100;
    formCostPrice = 5.0;
    formSellingPrice = 12.0;
    formRequiresPrescription = false;
    formConflicts = "";
    formExpiryDate = "2026-12-31";
    isFormOpen = true;
  }

  // Open Form for Editing Existing Medicine
  function openEditModal(med: any) {
    editingMedicine = med;
    formName = med.name;
    formGenericName = med.genericName;
    formDescription = med.description || "";
    formSymptoms = med.symptoms ? med.symptoms.join(", ") : "";
    formStock = med.stock;
    formCostPrice = med.unitCostingPrice || 5.0;
    formSellingPrice = med.unitSellingPrice || 10.0;
    formRequiresPrescription = med.requiresPrescription;
    formConflicts = med.conflicts ? med.conflicts.join(", ") : "";
    formExpiryDate = new Date(med.expiryDate).toISOString().split("T")[0];
    isFormOpen = true;
  }

  // Save Medicine (Add or Edit)
  function saveMedicine() {
    if (!formName.trim() || !formGenericName.trim()) {
      toast.error("Medicine Name and Generic Name are required.");
      return;
    }

    const symptomsArray = formSymptoms.split(",").map(s => s.trim()).filter(Boolean);
    const conflictsArray = formConflicts.split(",").map(c => c.trim()).filter(Boolean);
    const expiryTimestamp = new Date(formExpiryDate).getTime();

    if (editingMedicine) {
      medicines = medicines.map(m => 
        m._id === editingMedicine._id 
          ? { 
              ...m, 
              name: formName, 
              genericName: formGenericName, 
              description: formDescription, 
              symptoms: symptomsArray, 
              stock: formStock, 
              unitCostingPrice: formCostPrice, 
              unitSellingPrice: formSellingPrice, 
              requiresPrescription: formRequiresPrescription, 
              conflicts: conflictsArray, 
              expiryDate: expiryTimestamp 
            } 
          : m
      );
      toast.success(`${formName} updated successfully in inventory!`);
    } else {
      const newMed = {
        _id: `med_${Date.now()}`,
        name: formName,
        genericName: formGenericName,
        description: formDescription,
        symptoms: symptomsArray,
        requiresPrescription: formRequiresPrescription,
        stock: formStock,
        reservedQuantity: 0,
        unitCostingPrice: formCostPrice,
        unitSellingPrice: formSellingPrice,
        expiryDate: expiryTimestamp,
        conflicts: conflictsArray
      };
      medicines = [newMed, ...medicines];
      toast.success(`${formName} added to inventory!`);
    }
    isFormOpen = false;
  }

  // Delete Medicine Confirmation
  function openDeleteModal(med: any) {
    medicineToDelete = med;
    isDeleteOpen = true;
  }

  function confirmDelete() {
    if (medicineToDelete) {
      medicines = medicines.filter(m => m._id !== medicineToDelete._id);
      toast.success(`${medicineToDelete.name} has been removed from inventory.`);
      isDeleteOpen = false;
      medicineToDelete = null;
    }
  }

  function getStockBadgeVariant(stock: number) {
    if (stock <= 10) return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
    if (stock <= 30) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto p-4 md:p-8 space-y-8">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Package class="w-8 h-8 text-primary" /> Inventory Stock Management
      </h1>
      <p class="text-muted-foreground mt-1 text-sm md:text-base">
        Monitor real-time medicine stock, edit pricing & profit margins, set expiry dates, and manage prescription flags.
      </p>
    </div>
    <Button onclick={openAddModal} class="gap-2 shadow-sm bg-primary text-primary-foreground">
      <Plus class="w-4 h-4" /> Add New Medicine
    </Button>
  </div>

  <!-- Search & Quick Filter Controls -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="flex flex-wrap gap-2">
      <Button 
        variant={selectedFilter === 'all' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedFilter = 'all'} 
        class="text-xs rounded-full">
        All Stock ({medicines.length})
      </Button>
      <Button 
        variant={selectedFilter === 'low_stock' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedFilter = 'low_stock'} 
        class="text-xs rounded-full text-amber-600 dark:text-amber-400">
        Low Stock &lt; 20 ({medicines.filter(m => m.stock < 20).length})
      </Button>
      <Button 
        variant={selectedFilter === 'rx_required' ? 'default' : 'outline'} 
        size="sm" 
        onclick={() => selectedFilter = 'rx_required'} 
        class="text-xs rounded-full">
        Prescription Required ({medicines.filter(m => m.requiresPrescription).length})
      </Button>
    </div>

    <div class="relative w-full md:w-80">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input bind:value={searchQuery} placeholder="Search name, generic, symptom..." class="pl-9 bg-background h-9 text-xs" />
    </div>
  </div>

  <!-- Inventory Table -->
  <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row>
            <Table.Head class="font-semibold text-xs pl-6">Medicine Details</Table.Head>
            <Table.Head class="font-semibold text-xs">Generic Name & Symptoms</Table.Head>
            <Table.Head class="font-semibold text-xs">Stock Level</Table.Head>
            <Table.Head class="font-semibold text-xs">Cost / Selling Price</Table.Head>
            <Table.Head class="font-semibold text-xs">Profit Margin</Table.Head>
            <Table.Head class="font-semibold text-xs">Expiry Date</Table.Head>
            <Table.Head class="font-semibold text-xs">Rx & Conflicts</Table.Head>
            <Table.Head class="text-right font-semibold text-xs pr-6">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredMedicines.length === 0}
            <Table.Row>
              <Table.Cell colspan={8} class="text-center h-40 text-muted-foreground text-sm">
                No medicines match the selected filter or search query.
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredMedicines as med}
              <Table.Row class="hover:bg-muted/30 transition-colors">
                <Table.Cell class="font-medium text-xs pl-6">
                  <div class="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <Pill class="w-4 h-4 text-primary" /> {med.name}
                  </div>
                  <div class="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{med.description || "No description"}</div>
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="font-medium text-foreground">{med.genericName}</div>
                  {#if med.symptoms && med.symptoms.length > 0}
                    <div class="flex flex-wrap gap-1 mt-1">
                      {#each med.symptoms as s}
                        <span class="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{s}</span>
                      {/each}
                    </div>
                  {/if}
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="flex items-center gap-2">
                    <Badge variant="outline" class={`font-bold px-2 py-0.5 text-xs ${getStockBadgeVariant(med.stock)}`}>
                      {med.stock} units
                    </Badge>
                    <div class="flex items-center border rounded-md">
                      <button onclick={() => adjustStock(med._id, -5)} title="Decrease stock by 5" class="p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Minus class="w-3 h-3" />
                      </button>
                      <button onclick={() => adjustStock(med._id, 10)} title="Increase stock by 10" class="p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Plus class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div class="text-[10px] text-muted-foreground mt-1">Reserved: {med.reservedQuantity || 0}</div>
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div>Cost: <span class="font-medium">${(med.unitCostingPrice || 0).toFixed(2)}</span></div>
                  <div>Sell: <span class="font-semibold text-emerald-600 dark:text-emerald-400">${(med.unitSellingPrice || 0).toFixed(2)}</span></div>
                </Table.Cell>

                <Table.Cell class="text-xs">
                  {#if med.unitSellingPrice && med.unitCostingPrice}
                    {@const margin = ((med.unitSellingPrice - med.unitCostingPrice) / med.unitSellingPrice) * 100}
                    <Badge variant="outline" class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-300">
                      +{margin.toFixed(0)}%
                    </Badge>
                  {:else}
                    <span class="text-muted-foreground">N/A</span>
                  {/if}
                </Table.Cell>

                <Table.Cell class="text-xs font-mono">
                  {new Date(med.expiryDate).toLocaleDateString()}
                </Table.Cell>

                <Table.Cell class="text-xs">
                  <div class="space-y-1">
                    {#if med.requiresPrescription}
                      <Badge variant="outline" class="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300">
                        Rx Required
                      </Badge>
                    {:else}
                      <Badge variant="outline" class="text-[10px] text-muted-foreground">
                        OTC
                      </Badge>
                    {/if}

                    {#if med.conflicts && med.conflicts.length > 0}
                      <div>
                        <Badge variant="outline" class="text-[10px] bg-amber-500/10 text-amber-700 border-amber-300">
                          Conflict: {med.conflicts.join(", ")}
                        </Badge>
                      </div>
                    {/if}
                  </div>
                </Table.Cell>

                <Table.Cell class="text-right pr-6">
                  <div class="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onclick={() => openEditModal(med)}>
                      <Edit class="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onclick={() => openDeleteModal(med)}>
                      <Trash2 class="w-4 h-4 text-rose-600 hover:text-rose-700" />
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

  <!-- Add / Edit Medicine Dialog -->
  <Dialog.Root bind:open={isFormOpen}>
    <Dialog.Content class="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
      <Dialog.Header>
        <Dialog.Title class="text-xl font-bold flex items-center gap-2">
          <Pill class="w-5 h-5 text-primary" />
          {editingMedicine ? 'Edit Inventory Item' : 'Add New Medicine to Inventory'}
        </Dialog.Title>
        <Dialog.Description class="text-xs">
          Enter medicine catalog data, pricing, stock levels, and safety conflict tags.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-3 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label for="medName" class="text-xs font-semibold">Medicine Brand Name *</Label>
            <Input id="medName" bind:value={formName} placeholder="e.g. Paracetamol 500mg" class="text-xs" />
          </div>

          <div class="space-y-1">
            <Label for="genericName" class="text-xs font-semibold">Generic Active Ingredient *</Label>
            <Input id="genericName" bind:value={formGenericName} placeholder="e.g. Acetaminophen" class="text-xs" />
          </div>
        </div>

        <div class="space-y-1">
          <Label for="description" class="text-xs font-semibold">Description</Label>
          <Textarea id="description" bind:value={formDescription} placeholder="Brief clinical description or dosage instructions" class="text-xs h-16" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label for="symptoms" class="text-xs font-semibold">Symptoms (comma-separated)</Label>
            <Input id="symptoms" bind:value={formSymptoms} placeholder="fever, headache, pain" class="text-xs" />
          </div>

          <div class="space-y-1">
            <Label for="stock" class="text-xs font-semibold">Initial Stock Quantity</Label>
            <Input id="stock" type="number" bind:value={formStock} class="text-xs" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label for="costPrice" class="text-xs font-semibold">Unit Cost Price ($)</Label>
            <Input id="costPrice" type="number" step="0.1" bind:value={formCostPrice} class="text-xs" />
          </div>

          <div class="space-y-1">
            <Label for="sellingPrice" class="text-xs font-semibold">Unit Selling Price ($)</Label>
            <Input id="sellingPrice" type="number" step="0.1" bind:value={formSellingPrice} class="text-xs" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label for="expiryDate" class="text-xs font-semibold">Expiry Date</Label>
            <Input id="expiryDate" type="date" bind:value={formExpiryDate} class="text-xs" />
          </div>

          <div class="space-y-1">
            <Label for="conflicts" class="text-xs font-semibold">Known Conflicts (comma-separated)</Label>
            <Input id="conflicts" bind:value={formConflicts} placeholder="Warfarin, Aspirin" class="text-xs" />
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t">
          <input type="checkbox" id="requiresRx" bind:checked={formRequiresPrescription} class="rounded border-input text-primary focus:ring-primary h-4 w-4" />
          <Label for="requiresRx" class="text-xs font-semibold cursor-pointer">
            Requires Doctor Prescription (Mandatory Verification)
          </Label>
        </div>
      </div>

      <Dialog.Footer class="gap-2">
        <Button variant="outline" onclick={() => isFormOpen = false} class="text-xs">Cancel</Button>
        <Button onclick={saveMedicine} class="text-xs bg-primary text-primary-foreground">
          {editingMedicine ? 'Update Medicine' : 'Save New Medicine'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Delete Confirmation Modal -->
  <Dialog.Root bind:open={isDeleteOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title class="text-rose-600 flex items-center gap-2">
          <Trash2 class="w-5 h-5" /> Remove from Inventory
        </Dialog.Title>
        <Dialog.Description class="text-xs pt-1">
          Are you sure you want to remove <strong>{medicineToDelete?.name}</strong> from pharmacy inventory?
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Footer class="gap-2">
        <Button variant="outline" onclick={() => isDeleteOpen = false} class="text-xs">Cancel</Button>
        <Button variant="destructive" onclick={confirmDelete} class="text-xs">Confirm Delete</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
