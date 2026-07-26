<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { toast } from "svelte-sonner";
  import dummyData from "../../../../../convex/dummyData.json";
  import { Edit, Trash2, UserPlus, Search } from "lucide-svelte";

  // State
  let users = $state([...dummyData.users]);
  let searchQuery = $state("");
  let isDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let editingUser = $state<any>(null);
  let userToDelete = $state<any>(null);

  // Form states
  let formEmail = $state("");
  let formRole = $state("customer");
  let formStatus = $state("true");

  // Filtered Users
  let filteredUsers = $derived(
    users.filter(u => 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function openCreateDialog() {
    editingUser = null;
    formEmail = "";
    formRole = "customer";
    formStatus = "true";
    isDialogOpen = true;
  }

  function openEditDialog(user: any) {
    editingUser = user;
    formEmail = user.email;
    formRole = user.role;
    formStatus = user.isActive ? "true" : "false";
    isDialogOpen = true;
  }

  function openDeleteDialog(user: any) {
    userToDelete = user;
    isDeleteDialogOpen = true;
  }

  function saveUser() {
    if (!formEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    if (editingUser) {
      users = users.map(u => 
        u._id === editingUser._id 
          ? { ...u, email: formEmail, role: formRole } 
          : u
      );
      toast.success("User updated successfully");
    } else {
      const newUser = {
        _id: `user_${Date.now()}`,
        email: formEmail,
        role: formRole,
        isActive: true,
        passwordHash: "dummy_hash"
      };
      users = [newUser, ...users];
      toast.success("User created successfully");
    }
    isDialogOpen = false;
  }

  function deleteUser() {
    if (userToDelete) {
      users = users.filter(u => u._id !== userToDelete._id);
      toast.success("User deleted successfully");
      isDeleteDialogOpen = false;
      userToDelete = null;
    }
  }
</script>

<div class="dashboard-container max-w-7xl mx-auto">
  <div class="dashboard-header flex justify-between items-end mb-10 border-b border-border/50 pb-6">
    <div>
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">User Management</h1>
      <p class="text-muted-foreground mt-2 text-base md:text-lg">Manage platform users, roles, and access.</p>
    </div>
    <Button onclick={openCreateDialog} class="gap-2 shadow-sm h-11 px-6">
      <UserPlus class="w-5 h-5" /> Add User
    </Button>
  </div>

  <div class="bg-card border border-border rounded-xl shadow-md overflow-hidden">
    <!-- Toolbar -->
    <div class="p-5 border-b border-border/50 flex items-center justify-between bg-muted/20">
      <div class="relative w-full max-w-md">
        <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input bind:value={searchQuery} type="text" placeholder="Search users by email or role..." class="pl-10 bg-background h-10 shadow-sm" />
      </div>
    </div>

    <!-- Table -->
    <div class="relative w-full overflow-auto">
      <Table.Root>
        <Table.Header class="bg-muted/30">
          <Table.Row class="hover:bg-transparent">
            <Table.Head class="w-[120px] font-semibold text-muted-foreground pl-6">ID</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Email</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Role</Table.Head>
            <Table.Head class="font-semibold text-muted-foreground">Status</Table.Head>
            <Table.Head class="text-right font-semibold text-muted-foreground pr-6">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredUsers.length === 0}
            <Table.Row>
              <Table.Cell colspan={5} class="text-center h-40 text-muted-foreground text-lg">
                No users found matching "{searchQuery}"
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredUsers as user}
              <Table.Row class="group transition-colors hover:bg-muted/40 cursor-default">
                <Table.Cell class="font-medium text-xs text-muted-foreground align-middle pl-6">{user._id}</Table.Cell>
                <Table.Cell class="font-medium text-foreground align-middle">{user.email}</Table.Cell>
                <Table.Cell class="align-middle">
                  <Badge variant="outline" class={`capitalize px-2.5 py-0.5 rounded-full font-semibold tracking-wide shadow-sm border ${
                    user.role === 'admin' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' : 
                    user.role === 'pharmacist' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' : 
                    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    {user.role}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="align-middle">
                  <Badge variant="outline" class={`px-2.5 py-0.5 rounded-full font-semibold tracking-wide shadow-sm border ${
                    user.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 
                    'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-right align-middle pr-6">
                  <div class="flex justify-end gap-3">
                    <Button variant="ghost" size="icon" onclick={() => openEditDialog(user)}>
                      <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button variant="ghost" size="icon" onclick={() => openDeleteDialog(user)}>
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

  <!-- Create/Edit Dialog -->
  <Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title>{editingUser ? 'Edit User' : 'Add New User'}</Dialog.Title>
        <Dialog.Description>
          {editingUser ? 'Make changes to the user profile here.' : 'Add a new user to the platform. Click save when you are done.'}
        </Dialog.Description>
      </Dialog.Header>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="email">Email Address</Label>
          <Input id="email" bind:value={formEmail} type="email" placeholder="user@example.com" />
        </div>
        
        <div class="grid gap-2">
          <Label for="role">User Role</Label>
          <select id="role" bind:value={formRole} class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="customer">Customer</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => isDialogOpen = false}>Cancel</Button>
        <Button onclick={saveUser}>Save Changes</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Delete Confirmation Dialog -->
  <Dialog.Root bind:open={isDeleteDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
        <Dialog.Title class="text-destructive flex items-center gap-2">
          <Trash2 class="w-5 h-5" /> Confirm Deletion
        </Dialog.Title>
        <Dialog.Description class="pt-2">
          Are you sure you want to delete the user <strong class="text-foreground">{userToDelete?.email}</strong>? This action cannot be undone.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="mt-4">
        <Button variant="outline" onclick={() => isDeleteDialogOpen = false}>Cancel</Button>
        <Button variant="destructive" onclick={deleteUser}>Delete User</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
