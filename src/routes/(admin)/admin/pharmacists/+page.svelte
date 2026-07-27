<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Avatar from "$lib/components/ui/avatar";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../../convex/dummyData.json";
  import { 
    Search, 
    UserPlus, 
    Edit, 
    Trash2, 
    ShieldCheck, 
    Mail, 
    CheckCircle2, 
    XCircle, 
    LayoutGrid, 
    List, 
    Eye,
    Heart,
    Stethoscope,
    UserCheck,
    PackageCheck,
    MessageSquare,
    Key,
    Activity
  } from "lucide-svelte";

  interface PharmacistUser {
    _id: string;
    role: string;
    email: string;
    passwordHash?: string;
    imageUrl?: string;
    isActive: boolean;
  }

  // Load pharmacist users strictly from dummyData.json without adding extra non-existing attributes
  const initialPharmacists: PharmacistUser[] = dummyData.users.filter(
    (u: any) => u.role === "pharmacist"
  );

  let pharmacists = $state<PharmacistUser[]>([...initialPharmacists]);
  let searchQuery = $state("");
  let statusFilter = $state<"all" | "active" | "inactive">("all");
  let viewMode = $state<"grid" | "table">("grid");

  // Derived metrics from dummyData.json
  let totalPharmacists = $derived(pharmacists.length);
  let activePharmacistsCount = $derived(pharmacists.filter(p => p.isActive).length);

  // Total reservations in dummyData handled by pharmacists
  let totalReservationsInDb = $derived(
    dummyData.reservations.filter((r: any) => 
      pharmacists.some(p => p._id === r.pharmacistId)
    ).length
  );

  // Total favorites in dummyData for pharmacists
  let totalFavoritesInDb = $derived(
    dummyData.favorites.filter((f: any) => 
      pharmacists.some(p => p._id === f.pharmacistId)
    ).length
  );

  // Derived filtered state
  let filteredPharmacists = $derived(
    pharmacists.filter(p => {
      const matchesSearch = 
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p._id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "active" ? p.isActive :
        !p.isActive;

      return matchesSearch && matchesStatus;
    })
  );

  // Dialog States
  let isAddDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let isDetailDialogOpen = $state(false);
  let editingPharmacist = $state<PharmacistUser | null>(null);
  let pharmacistToDelete = $state<PharmacistUser | null>(null);
  let selectedPharmacist = $state<PharmacistUser | null>(null);

  // Form state
  let formEmail = $state("");
  let formPasswordHash = $state("");
  let formIsActive = $state("true");

  function openCreateDialog() {
    editingPharmacist = null;
    formEmail = "";
    formPasswordHash = "hashed_pass_new";
    formIsActive = "true";
    isAddDialogOpen = true;
  }

  function openEditDialog(p: PharmacistUser) {
    editingPharmacist = p;
    formEmail = p.email;
    formPasswordHash = p.passwordHash || "hashed_pass";
    formIsActive = p.isActive ? "true" : "false";
    isAddDialogOpen = true;
  }

  function savePharmacist() {
    if (!formEmail.trim()) {
      toast.error("Email address is required");
      return;
    }

    const isActiveBool = formIsActive === "true";

    if (editingPharmacist) {
      pharmacists = pharmacists.map(p => 
        p._id === editingPharmacist!._id 
          ? {
              ...p,
              email: formEmail,
              passwordHash: formPasswordHash,
              isActive: isActiveBool
            }
          : p
      );
      toast.success(`Updated user account ${formEmail}`);
    } else {
      const newPharmacist: PharmacistUser = {
        _id: `user_${Date.now()}`,
        role: "pharmacist",
        email: formEmail,
        passwordHash: formPasswordHash || "hashed_pass_default",
        isActive: isActiveBool
      };
      pharmacists = [newPharmacist, ...pharmacists];
      toast.success(`Created pharmacist account ${formEmail}`);
    }

    isAddDialogOpen = false;
  }

  function togglePharmacistStatus(p: PharmacistUser) {
    const newStatus = !p.isActive;
    pharmacists = pharmacists.map(item => 
      item._id === p._id ? { ...item, isActive: newStatus } : item
    );
    if (newStatus) {
      toast.success(`${p.email} status changed to Active`);
    } else {
      toast.info(`${p.email} status changed to Inactive`);
    }
  }

  function openDeleteDialog(p: PharmacistUser) {
    pharmacistToDelete = p;
    isDeleteDialogOpen = true;
  }

  function confirmDeletePharmacist() {
    if (pharmacistToDelete) {
      pharmacists = pharmacists.filter(p => p._id !== pharmacistToDelete!._id);
      toast.success(`Pharmacist account deleted`);
      isDeleteDialogOpen = false;
      pharmacistToDelete = null;
    }
  }

  function viewDetails(p: PharmacistUser) {
    selectedPharmacist = p;
    isDetailDialogOpen = true;
  }

  function getInitials(email: string) {
    return email.substring(0, 2).toUpperCase();
  }

  // Get exact related records from dummyData arrays
  function getReservationsForPharmacist(pharmacistId: string) {
    return dummyData.reservations.filter((r: any) => r.pharmacistId === pharmacistId);
  }

  function getFavoritesForPharmacist(pharmacistId: string) {
    return dummyData.favorites.filter((f: any) => f.pharmacistId === pharmacistId);
  }

  function getTicketsForPharmacist(pharmacistId: string) {
    return dummyData.complaintTickets.filter((t: any) => t.creatorId === pharmacistId);
  }

  function getNotificationsForPharmacist(pharmacistId: string) {
    return dummyData.notifications.filter((n: any) => n.senderId === pharmacistId);
  }
</script>

<div class="pharmacists-container">
  <!-- Header Banner -->
  <div class="dashboard-header border-b border-border/50 pb-6">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="dashboard-title">Pharmacist User Accounts</h1>
        <Badge variant="outline" class="bg-primary/10 text-primary border-primary/20 font-semibold px-3 py-1 rounded-full text-xs">
          Admin Management
        </Badge>
      </div>
      <p class="text-muted-foreground mt-2 text-base">
        Manage system accounts with pharmacist role directly mapped from dummyData.json database.
      </p>
    </div>
    <Button onclick={openCreateDialog} class="gap-2 shadow-sm h-11 px-6 font-medium">
      <UserPlus class="w-5 h-5" /> Add Pharmacist Account
    </Button>
  </div>

  <!-- Key Performance Indicators (Metrics Grid) -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Card 1: Total Pharmacists -->
    <Card.Root class="border-border/70 shadow-sm relative overflow-hidden p-2">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="dashboard-card-title">Total Pharmacists</Card.Title>
        <Stethoscope class="h-5 w-5 text-primary" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value text-3xl font-extrabold">{totalPharmacists}</div>
        <div class="flex items-center gap-2 mt-2">
          <Badge variant="outline" class="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-semibold">
            {activePharmacistsCount} Active Accounts
          </Badge>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Card 2: Active Duty Ratio -->
    <Card.Root class="border-border/70 shadow-sm p-2">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="dashboard-card-title">Active Ratio</Card.Title>
        <UserCheck class="h-5 w-5 text-emerald-500" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value text-3xl font-extrabold">
          {totalPharmacists > 0 ? Math.round((activePharmacistsCount / totalPharmacists) * 100) : 0}%
        </div>
        <p class="text-xs text-muted-foreground mt-2">Account active status ratio</p>
      </Card.Content>
    </Card.Root>

    <!-- Card 3: Assigned Reservations in Database -->
    <Card.Root class="border-border/70 shadow-sm p-2">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="dashboard-card-title">Assigned Reservations</Card.Title>
        <PackageCheck class="h-5 w-5 text-blue-500" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value text-3xl font-extrabold">{totalReservationsInDb} Orders</div>
        <p class="text-xs text-muted-foreground mt-2">From reservations array</p>
      </Card.Content>
    </Card.Root>

    <!-- Card 4: Favorites in Database -->
    <Card.Root class="border-border/70 shadow-sm p-2">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="dashboard-card-title">Customer Favorites</Card.Title>
        <Heart class="h-5 w-5 text-rose-500" />
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value text-3xl font-extrabold">{totalFavoritesInDb}</div>
        <p class="text-xs text-muted-foreground mt-2">From favorites array</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Filter & View Controls Toolbar -->
  <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card border border-border/70 p-4 rounded-xl shadow-sm">
    <!-- Search Bar -->
    <div class="relative flex-1 max-w-md">
      <Search class="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
      <Input 
        bind:value={searchQuery} 
        type="text" 
        placeholder="Search by email address or User ID..." 
        class="pl-10 bg-background h-10 shadow-none border-border/80" 
      />
    </div>

    <!-- Status Filters & View Toggle -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Status Pills -->
      <div class="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-medium">
        <button 
          onclick={() => statusFilter = 'all'} 
          class={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'all' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          All ({totalPharmacists})
        </button>
        <button 
          onclick={() => statusFilter = 'active'} 
          class={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'active' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Active ({activePharmacistsCount})
        </button>
        <button 
          onclick={() => statusFilter = 'inactive'} 
          class={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'inactive' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Inactive ({totalPharmacists - activePharmacistsCount})
        </button>
      </div>

      <!-- View Switcher -->
      <div class="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50">
        <Button 
          variant={viewMode === 'grid' ? 'default' : 'ghost'} 
          size="sm" 
          class="h-8 px-2.5"
          onclick={() => viewMode = 'grid'}
        >
          <LayoutGrid class="h-4 w-4" />
        </Button>
        <Button 
          variant={viewMode === 'table' ? 'default' : 'ghost'} 
          size="sm" 
          class="h-8 px-2.5"
          onclick={() => viewMode = 'table'}
        >
          <List class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <!-- Content Section: Grid View OR Table View -->
  {#if filteredPharmacists.length === 0}
    <Card.Root class="border-dashed border-2 border-border p-12 text-center">
      <div class="flex justify-center mb-4 text-muted-foreground">
        <Stethoscope class="w-12 h-12 stroke-[1.5]" />
      </div>
      <h3 class="text-xl font-bold text-foreground">No Pharmacists Found</h3>
      <p class="text-muted-foreground mt-1 max-w-sm mx-auto">
        No pharmacist users match your search criteria "{searchQuery}".
      </p>
      <Button 
        variant="outline" 
        class="mt-4" 
        onclick={() => { searchQuery = ""; statusFilter = "all"; }}
      >
        Reset Search Filters
      </Button>
    </Card.Root>
  {:else if viewMode === 'grid'}
    <!-- Grid Card View (Spacious Padding & Clean Visibility) -->
    <div class="pharmacist-card-grid">
      {#each filteredPharmacists as pharmacist (pharmacist._id)}
        {@const pRes = getReservationsForPharmacist(pharmacist._id)}
        {@const pFav = getFavoritesForPharmacist(pharmacist._id)}
        {@const pTickets = getTicketsForPharmacist(pharmacist._id)}
        <div class="pharmacist-card">
          <!-- Card Header & Badge -->
          <div>
            <div class="flex items-start justify-between gap-3 mb-4">
              <div class="flex items-center gap-3 min-w-0">
                <Avatar.Root class="h-12 w-12 border-2 border-primary/20 shadow-sm shrink-0">
                  <Avatar.Image src={pharmacist.imageUrl} alt={pharmacist.email} />
                  <Avatar.Fallback class="bg-primary/10 text-primary font-bold">
                    {getInitials(pharmacist.email)}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="min-w-0 flex-1">
                  <h3 class="font-bold text-base text-foreground truncate leading-snug">{pharmacist.email}</h3>
                  <p class="font-mono text-xs text-muted-foreground mt-0.5">{pharmacist._id}</p>
                </div>
              </div>
              <Badge variant="outline" class={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 border ${
                pharmacist.isActive 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800' 
                  : 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
              }`}>
                {pharmacist.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <!-- Existing Attributes Info -->
            <div class="space-y-2 py-3 border-y border-border/50 my-3 text-xs">
              <div class="flex items-center justify-between text-muted-foreground">
                <span class="font-medium flex items-center gap-1.5"><ShieldCheck class="w-4 h-4 text-emerald-500" /> Account Role:</span>
                <Badge variant="secondary" class="capitalize font-semibold text-[11px] px-2 py-0.5">{pharmacist.role}</Badge>
              </div>
              <div class="flex items-center justify-between text-muted-foreground">
                <span class="font-medium flex items-center gap-1.5"><Key class="w-4 h-4 text-amber-500" /> Password Hash:</span>
                <span class="font-mono text-[11px] bg-muted/60 px-2 py-0.5 rounded text-foreground font-medium">{pharmacist.passwordHash || 'hashed'}</span>
              </div>
            </div>
          </div>

          <!-- Real Database Metrics Box -->
          <div>
            <div class="grid grid-cols-3 gap-2 py-2.5 mb-4 bg-muted/30 rounded-xl p-2.5 text-center border border-border/40">
              <div>
                <span class="text-[11px] text-muted-foreground font-medium block">Orders</span>
                <span class="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                  <PackageCheck class="w-3.5 h-3.5 text-blue-500" /> {pRes.length}
                </span>
              </div>
              <div>
                <span class="text-[11px] text-muted-foreground font-medium block">Favorites</span>
                <span class="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center justify-center gap-1">
                  <Heart class="w-3.5 h-3.5 fill-rose-500 stroke-rose-500" /> {pFav.length}
                </span>
              </div>
              <div>
                <span class="text-[11px] text-muted-foreground font-medium block">Tickets</span>
                <span class="font-bold text-amber-600 dark:text-amber-400 text-sm flex items-center justify-center gap-1">
                  <MessageSquare class="w-3.5 h-3.5" /> {pTickets.length}
                </span>
              </div>
            </div>

            <!-- Footer Action Button -->
            <div class="pt-2">
              <Button variant="outline" size="sm" class="w-full text-xs font-medium gap-1.5 h-10 shadow-sm" onclick={() => viewDetails(pharmacist)}>
                <Eye class="w-4 h-4 text-primary" /> View Details
              </Button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Table View -->
    <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div class="relative w-full overflow-auto">
        <Table.Root>
          <Table.Header class="bg-muted/30">
            <Table.Row class="hover:bg-transparent">
              <Table.Head class="font-semibold text-muted-foreground pl-6">User ID</Table.Head>
              <Table.Head class="font-semibold text-muted-foreground">Email Address</Table.Head>
              <Table.Head class="font-semibold text-muted-foreground">Role</Table.Head>
              <Table.Head class="font-semibold text-muted-foreground text-center">Assigned Orders</Table.Head>
              <Table.Head class="font-semibold text-muted-foreground text-center">Favorites</Table.Head>
              <Table.Head class="font-semibold text-muted-foreground">Account Status</Table.Head>
              <Table.Head class="text-right font-semibold text-muted-foreground pr-6">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each filteredPharmacists as p (p._id)}
              {@const pRes = getReservationsForPharmacist(p._id)}
              {@const pFav = getFavoritesForPharmacist(p._id)}
              <Table.Row class="group hover:bg-muted/40 transition-colors">
                <!-- User ID -->
                <Table.Cell class="pl-6 py-4 align-middle font-mono text-xs font-semibold text-muted-foreground">
                  {p._id}
                </Table.Cell>

                <!-- Email & Avatar -->
                <Table.Cell class="align-middle">
                  <div class="flex items-center gap-3">
                    <Avatar.Root class="h-9 w-9 border border-border">
                      <Avatar.Image src={p.imageUrl} alt={p.email} />
                      <Avatar.Fallback class="bg-primary/10 text-primary font-bold text-xs">
                        {getInitials(p.email)}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <span class="font-semibold text-foreground text-sm">{p.email}</span>
                  </div>
                </Table.Cell>

                <!-- Role -->
                <Table.Cell class="align-middle">
                  <Badge variant="outline" class="capitalize font-semibold text-xs px-2.5 py-0.5">
                    {p.role}
                  </Badge>
                </Table.Cell>

                <!-- Assigned Orders -->
                <Table.Cell class="align-middle text-center font-bold text-sm text-blue-600 dark:text-blue-400">
                  {pRes.length}
                </Table.Cell>

                <!-- Favorites -->
                <Table.Cell class="align-middle text-center font-semibold text-sm text-rose-600 dark:text-rose-400">
                  {pFav.length}
                </Table.Cell>

                <!-- Status -->
                <Table.Cell class="align-middle">
                  <Badge variant="outline" class={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    p.isActive 
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400' 
                      : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400'
                  }`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Cell>

                <!-- Actions -->
                <Table.Cell class="text-right pr-6 align-middle">
                  <div class="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onclick={() => viewDetails(p)}>
                      <Eye class="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onclick={() => openEditDialog(p)}>
                      <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onclick={() => togglePharmacistStatus(p)}>
                      {#if p.isActive}
                        <XCircle class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      {:else}
                        <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      {/if}
                    </Button>
                    <Button variant="ghost" size="icon" onclick={() => openDeleteDialog(p)}>
                      <Trash2 class="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  {/if}

  <!-- Add / Edit Pharmacist Pop-up Card Dialog -->
  <Dialog.Root bind:open={isAddDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px] dialog-popup-card">
      <Dialog.Header class="dialog-popup-header">
        <Dialog.Title class="text-xl font-bold flex items-center gap-2.5 text-foreground">
          <Stethoscope class="w-6 h-6 text-primary" />
          {editingPharmacist ? 'Edit Pharmacist Account' : 'Add Pharmacist Account'}
        </Dialog.Title>
        <Dialog.Description class="text-sm text-muted-foreground">
          {editingPharmacist ? 'Modify account email and active status for this user.' : 'Enter email address to create a new pharmacist user account.'}
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-2 text-sm">
        <div class="space-y-1.5">
          <Label for="ph-email" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
          <Input id="ph-email" type="email" bind:value={formEmail} placeholder="pharmacist@medivault.com" class="h-11 px-3.5 bg-background border-border/80" />
        </div>

        <div class="space-y-1.5">
          <Label for="ph-pass" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password Hash</Label>
          <Input id="ph-pass" bind:value={formPasswordHash} placeholder="hashed_pass" class="h-11 px-3.5 bg-background border-border/80 font-mono" />
        </div>

        <div class="space-y-1.5">
          <Label for="ph-status" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Status</Label>
          <select 
            id="ph-status" 
            bind:value={formIsActive} 
            class="flex h-11 w-full rounded-lg border border-border/80 bg-background px-3.5 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <Dialog.Footer class="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
        <Button variant="outline" onclick={() => isAddDialogOpen = false} class="h-10 px-5">Cancel</Button>
        <Button onclick={savePharmacist} class="h-10 px-6 font-semibold">Save Account</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- View Details Pop-up Card Dialog -->
  {#if selectedPharmacist}
    {@const selRes = getReservationsForPharmacist(selectedPharmacist._id)}
    {@const selFav = getFavoritesForPharmacist(selectedPharmacist._id)}
    {@const selTickets = getTicketsForPharmacist(selectedPharmacist._id)}
    {@const selNotifs = getNotificationsForPharmacist(selectedPharmacist._id)}
    <Dialog.Root bind:open={isDetailDialogOpen}>
      <Dialog.Content class="sm:max-w-[850px] md:max-w-[950px] lg:max-w-[1000px] w-full dialog-popup-card">
        <!-- Header -->
        <Dialog.Header class="dialog-popup-header">
          <div class="flex items-center gap-4">
            <Avatar.Root class="h-16 w-16 border-2 border-primary/30 shadow-md shrink-0">
              <Avatar.Image src={selectedPharmacist.imageUrl} alt={selectedPharmacist.email} />
              <Avatar.Fallback class="bg-primary/10 text-primary font-extrabold text-xl">
                {getInitials(selectedPharmacist.email)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="space-y-1 min-w-0 flex-1">
              <Dialog.Title class="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight break-all">
                {selectedPharmacist.email}
              </Dialog.Title>
              <Dialog.Description class="text-sm font-mono text-muted-foreground">
                ID: {selectedPharmacist._id}
              </Dialog.Description>
            </div>
          </div>
        </Dialog.Header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          <!-- Column 1: User Object Properties & Favorites -->
          <div class="space-y-5">
            <!-- Raw Properties Table from dummyData.json -->
            <div class="space-y-2.5">
              <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                <Activity class="w-4 h-4 text-primary" /> User Object Properties
              </h4>
              <div class="dialog-popup-row">
                <span class="text-muted-foreground font-medium">_id:</span>
                <span class="font-mono font-semibold text-foreground">{selectedPharmacist._id}</span>
              </div>

              <div class="dialog-popup-row">
                <span class="text-muted-foreground font-medium">email:</span>
                <span class="font-semibold text-foreground">{selectedPharmacist.email}</span>
              </div>

              <div class="dialog-popup-row">
                <span class="text-muted-foreground font-medium">role:</span>
                <Badge variant="secondary" class="capitalize font-semibold text-xs">{selectedPharmacist.role}</Badge>
              </div>

              <div class="dialog-popup-row">
                <span class="text-muted-foreground font-medium">passwordHash:</span>
                <span class="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded text-foreground">{selectedPharmacist.passwordHash || 'N/A'}</span>
              </div>

              <div class="dialog-popup-row">
                <span class="text-muted-foreground font-medium">isActive:</span>
                <Badge variant="outline" class={`text-xs font-semibold px-2.5 py-0.5 border ${
                  selectedPharmacist.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-rose-100 text-rose-700 border-rose-300'
                }`}>
                  {selectedPharmacist.isActive ? 'true' : 'false'}
                </Badge>
              </div>
            </div>

            <!-- Section: Patient Favorites in dummyData.json -->
            <div class="pt-4 border-t border-border/50 space-y-2.5">
              <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Heart class="w-4 h-4 text-rose-500 fill-rose-500" /> Favorites ({selFav.length})
              </h4>
              {#if selFav.length === 0}
                <p class="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">No favorites linked to pharmacistId "{selectedPharmacist._id}" in dummyData.json.</p>
              {:else}
                <div class="space-y-2">
                  {#each selFav as fav}
                    <div class="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
                      <span class="font-mono text-muted-foreground">Favorite ID: {fav._id}</span>
                      <span class="font-medium text-foreground">Customer ID: {fav.customerId}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- Column 2: Assigned Reservations & Complaint Tickets -->
          <div class="space-y-5">
            <!-- Section: Assigned Reservations in dummyData.json -->
            <div class="space-y-2.5">
              <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <PackageCheck class="w-4 h-4 text-blue-500" /> Assigned Reservations ({selRes.length})
              </h4>
              {#if selRes.length === 0}
                <p class="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">No reservations linked to pharmacistId "{selectedPharmacist._id}" in dummyData.json.</p>
              {:else}
                <div class="space-y-2">
                  {#each selRes as res}
                    <div class="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/50 text-xs gap-3">
                      <div>
                        <span class="font-mono font-bold text-foreground block">{res._id}</span>
                        <span class="text-muted-foreground block text-[11px] mt-0.5">Customer: {res.customerId} • Units: {res.totalUnitsRequested}</span>
                      </div>
                      <div class="text-right shrink-0">
                        <span class="font-bold text-foreground block">${res.totalCosting.toFixed(2)}</span>
                        <Badge variant="outline" class="capitalize text-[10px] px-2 py-0.5 mt-0.5">
                          {res.status}
                        </Badge>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Section: Complaint Tickets in dummyData.json -->
            {#if selTickets.length > 0}
              <div class="pt-4 border-t border-border/50 space-y-2.5">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare class="w-4 h-4 text-amber-500" /> Complaint Tickets ({selTickets.length})
                </h4>
                <div class="space-y-2">
                  {#each selTickets as ticket}
                    <div class="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/50 text-xs gap-3">
                      <div class="min-w-0 flex-1">
                        <span class="font-bold text-foreground block truncate">{ticket.title}</span>
                        <span class="text-muted-foreground font-mono text-[11px] block mt-0.5">Ticket ID: {ticket._id}</span>
                      </div>
                      <Badge variant="outline" class={`capitalize text-[10px] px-2 py-0.5 shrink-0 ${ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {ticket.status}
                      </Badge>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Footer -->
        <Dialog.Footer class="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
          <Button variant="outline" onclick={() => isDetailDialogOpen = false} class="h-10 px-5 shrink-0">Close</Button>
          <Button onclick={() => { isDetailDialogOpen = false; openEditDialog(selectedPharmacist!); }} class="h-10 px-6 font-semibold shrink-0 whitespace-nowrap flex items-center gap-2">
            <Edit class="w-4 h-4" /> Edit Pharmacist Account
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}

  <!-- Delete Confirmation Pop-up Card Dialog -->
  <Dialog.Root bind:open={isDeleteDialogOpen}>
    <Dialog.Content class="sm:max-w-[460px] dialog-popup-card">
      <Dialog.Header class="dialog-popup-header">
        <Dialog.Title class="text-destructive flex items-center gap-2 text-xl font-bold">
          <Trash2 class="w-5 h-5" /> Confirm Account Removal
        </Dialog.Title>
        <Dialog.Description class="pt-2 text-sm leading-relaxed">
          Are you sure you want to remove pharmacist account <strong class="text-foreground">{pharmacistToDelete?.email}</strong>? This action cannot be undone.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
        <Button variant="outline" onclick={() => isDeleteDialogOpen = false} class="h-10 px-5">Cancel</Button>
        <Button variant="destructive" onclick={confirmDeletePharmacist} class="h-10 px-6 font-semibold">Remove Account</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
