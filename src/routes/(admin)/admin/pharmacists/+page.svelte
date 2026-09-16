<!-- routes/(admin)/admin/pharmacists/+page.svelte -->
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
  import { Edit, Trash2, UserPlus, Search, RefreshCw, Stethoscope, Phone, Mail } from "lucide-svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../../convex/_generated/api";

  // State
  const initialPharmacists = dummyData.users.filter(u => u.role === "pharmacist");
  let pharmacists = $state<any[]>([...initialPharmacists]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let searchQuery = $state("");
  let isDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let editingPharmacist = $state<any>(null);
  let pharmacistToDelete = $state<any>(null);

  // Form state
  let formName = $state("");
  let formEmail = $state("");
  let formPhone = $state("");
  let formStatus = $state(true);

  // Filtered Pharmacists
  let filteredPharmacists = $derived(
    pharmacists.filter(p =>
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.phone && p.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  async function fetchPharmacists() {
    isLoading = true;
    try {
      const res = await convex.query(api.admin.listPharmacists, {});
      if (res && res.length > 0) {
        pharmacists = res;
      }
    } catch (err) {
      console.warn("Using local fallback data:", err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchPharmacists();
    const unsubscribe = convex.onUpdate(api.admin.listPharmacists, {}, (updated) => {
      if (updated) pharmacists = updated;
    });
    return () => unsubscribe();
  });

  function openCreateDialog() {
    editingPharmacist = null;
    formName = "";
    formEmail = "";
    formPhone = "";
    formStatus = true;
    isDialogOpen = true;
  }

  function openEditDialog(p: any) {
    editingPharmacist = p;
    formName = p.name || "";
    formEmail = p.email;
    formPhone = p.phone || "";
    formStatus = p.isActive ?? true;
    isDialogOpen = true;
  }

  function openDeleteDialog(p: any) {
    pharmacistToDelete = p;
    isDeleteDialogOpen = true;
  }

  async function savePharmacist() {
    if (!formEmail.trim()) {
      toast.error("Email address is required");
      return;
    }

    isSubmitting = true;
    try {
      if (editingPharmacist) {
        await convex.mutation(api.admin.updateUser, {
          userId: editingPharmacist._id,
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          isActive: formStatus,
        });
        pharmacists = pharmacists.map(p =>
          p._id === editingPharmacist._id
            ? { ...p, name: formName, email: formEmail, phone: formPhone, isActive: formStatus }
            : p
        );
        toast.success("Pharmacist updated successfully in Convex DB");
      } else {
        const newId = await convex.mutation(api.admin.createUser, {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: "pharmacist",
          isActive: formStatus,
        });

        const newPharmacist = {
          _id: newId,
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: "pharmacist",
          isActive: formStatus,
          createdAt: Date.now(),
        };
        pharmacists = [newPharmacist, ...pharmacists];
        toast.success("Pharmacist created successfully in Convex DB");
      }
      isDialogOpen = false;
    } catch (err: any) {
      toast.error(err.message || "Failed to save pharmacist");
    } finally {
      isSubmitting = false;
    }
  }

  async function toggleStatus(p: any) {
    const nextStatus = !p.isActive;
    try {
      await convex.mutation(api.admin.toggleUserActive, {
        userId: p._id,
        isActive: nextStatus,
      });
      pharmacists = pharmacists.map(item => item._id === p._id ? { ...item, isActive: nextStatus } : item);
      toast.success(`Pharmacist ${nextStatus ? "activated" : "deactivated"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  }

  async function deletePharmacist() {
    if (!pharmacistToDelete) return;
    isSubmitting = true;
    try {
      await convex.mutation(api.admin.deleteUser, {
        userId: pharmacistToDelete._id,
      });
      pharmacists = pharmacists.filter(p => p._id !== pharmacistToDelete._id);
      toast.success("Pharmacist removed from Convex DB");
      isDeleteDialogOpen = false;
      pharmacistToDelete = null;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pharmacist");
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto space-y-6">
  <div class="dashboard-header flex justify-between items-end mb-6 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <Stethoscope class="w-9 h-9 text-primary" /> Pharmacist Management
      </h1>
      <p class="text-muted-foreground mt-2 text-base">Manage verified pharmacists, store assignments, and operational status.</p>
    </div>
    <div class="flex gap-3">
      <Button variant="outline" onclick={fetchPharmacists} class="gap-2 h-11 px-4">
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" /> Refresh
      </Button>
      <Button onclick={openCreateDialog} class="gap-2 shadow-sm h-11 px-6">
        <UserPlus class="w-5 h-5" /> Add Pharmacist
      </Button>
    </div>
  </div>

  <div class="bg-card border border-border rounded-xl shadow-md overflow-hidden">
    <!-- Search Bar -->
    <div class="p-5 border-b border-border/50 flex items-center justify-between bg-muted/20">
      <div class="relative w-full max-w-md">
        <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input bind:value={searchQuery} type="text" placeholder="Search by name, email, or phone..." class="pl-10 bg-background h-10 shadow-sm" />
      </div>
      <p class="text-xs text-muted-foreground font-semibold">
        Showing <strong class="text-foreground">{filteredPharmacists.length}</strong> pharmacists
      </p>
    </div>

    <!-- Table -->
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row class="hover:bg-transparent">
            <Table.Head class="w-[120px] font-semibold text-muted-foreground pl-6">ID</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Pharmacist Profile</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Phone</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Status</Table.Head>
            <Table.Head class="text-right font-semibold text-muted-foreground pr-6">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredPharmacists.length === 0}
            <Table.Row>
              <Table.Cell colspan={5} class="text-center h-40 text-muted-foreground text-lg">
                No pharmacists found matching "{searchQuery}"
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredPharmacists as p}
              <Table.Row class="group transition-colors hover:bg-muted/40 cursor-default">
                <Table.Cell class="font-mono text-xs text-muted-foreground align-middle pl-6">{p._id}</Table.Cell>
                <Table.Cell class="align-middle">
                  <div>
                    <p class="font-bold text-foreground">{p.name || p.email.split('@')[0]}</p>
                    <p class="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Mail class="w-3 h-3 text-primary" /> {p.email}
                    </p>
                  </div>
                </Table.Cell>
                <Table.Cell class="align-middle text-xs font-medium text-foreground">
                  {#if p.phone}
                    <span class="inline-flex items-center gap-1.5">
                      <Phone class="w-3 h-3 text-primary" /> {p.phone}
                    </span>
                  {:else}
                    <span class="text-muted-foreground italic">Not provided</span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="align-middle">
                  <button onclick={() => toggleStatus(p)} title="Click to toggle status" class="cursor-pointer">
                    <Badge variant="outline" class={`px-2.5 py-0.5 rounded-full font-semibold tracking-wide shadow-sm border transition-transform hover:scale-105 ${
                      p.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 
                      'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50'
                    }`}>
                      {p.isActive ? 'Active Store' : 'Inactive'}
                    </Badge>
                  </button>
                </Table.Cell>
                <Table.Cell class="text-right align-middle pr-6">
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onclick={() => openEditDialog(p)}>
                      <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button variant="ghost" size="icon" onclick={() => openDeleteDialog(p)}>
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
    <Dialog.Content class="sm:max-w-[450px]">
      <Dialog.Header>
        <Dialog.Title>{editingPharmacist ? 'Edit Pharmacist' : 'Register New Pharmacist'}</Dialog.Title>
        <Dialog.Description>
          {editingPharmacist ? 'Update pharmacist profile details in Convex.' : 'Add a new verified pharmacist account.'}
        </Dialog.Description>
      </Dialog.Header>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="pharmName">Pharmacist Name</Label>
          <Input id="pharmName" bind:value={formName} type="text" placeholder="Dr. Sarah Ahmed" />
        </div>
        <div class="grid gap-2">
          <Label for="pharmEmail">Email Address</Label>
          <Input id="pharmEmail" bind:value={formEmail} type="email" placeholder="pharmacist@medivault.com" />
        </div>
        <div class="grid gap-2">
          <Label for="pharmPhone">Phone Number</Label>
          <Input id="pharmPhone" bind:value={formPhone} type="text" placeholder="+880 1712-345678" />
        </div>
        <div class="flex items-center gap-3 pt-2">
          <input id="pharmActive" type="checkbox" bind:checked={formStatus} class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          <Label for="pharmActive" class="cursor-pointer">Active Dispensary Status</Label>
        </div>
      </div>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => isDialogOpen = false}>Cancel</Button>
        <Button onclick={savePharmacist} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Pharmacist'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Delete Modal -->
  <Dialog.Root bind:open={isDeleteDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title class="text-destructive flex items-center gap-2">
          <Trash2 class="w-5 h-5" /> Confirm Pharmacist Deletion
        </Dialog.Title>
        <Dialog.Description class="pt-2">
          Are you sure you want to remove pharmacist <strong class="text-foreground">{pharmacistToDelete?.name || pharmacistToDelete?.email}</strong>?
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="mt-4">
        <Button variant="outline" onclick={() => isDeleteDialogOpen = false}>Cancel</Button>
        <Button variant="destructive" onclick={deletePharmacist} disabled={isSubmitting}>
          {isSubmitting ? 'Removing...' : 'Delete Pharmacist'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>