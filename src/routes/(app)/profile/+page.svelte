<!-- src/routes/(app)/profile/+page.svelte -->
<script lang="ts">
  import { userSession } from "$lib/session.svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { toast } from "svelte-sonner";
  import {
    User,
    Shield,
    Key,
    Phone,
    Mail,
    Building2,
    MapPin,
    Clock,
    FileText,
    CheckCircle2,
    Lock,
    Eye,
    EyeOff,
    Sparkles,
    CalendarCheck,
    Heart,
    Package,
    Users,
    Stethoscope,
    AlertCircle,
    Copy,
    Save,
    RefreshCw
  } from "lucide-svelte";

  const currentUser = $derived(userSession.user);
  const userId = $derived(currentUser?._id);

  // Live Convex query for user profile data & user activity stats
  let dbUser = $state<any>(null);
  let userStats = $state<any>(null);
  let isLoadingProfile = $state(true);

  // Form states for Profile Update
  let name = $state("");
  let phone = $state("");
  let imageUrl = $state("");
  let shopName = $state("");
  let shopAddress = $state("");
  let operatingHours = $state("");
  let description = $state("");
  let isSavingProfile = $state(false);

  // Form states for Password Change
  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let showCurrentPassword = $state(false);
  let showNewPassword = $state(false);
  let isChangingPassword = $state(false);

  // Tab State
  let activeTab = $state<"profile" | "security" | "account">("profile");

  // Preset Avatars
  const presetAvatars = [
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1594824813566-88855ce7890f?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  ];

  // Subscribe to profile details & stats via Convex
  $effect(() => {
    if (userId) {
      isLoadingProfile = true;
      const unsubProfile = convex.onUpdate(
        api.users.getUserById,
        { userId: userId as any },
        (user) => {
          if (user) {
            dbUser = user;
            name = user.name || "";
            phone = user.phone || "";
            imageUrl = user.imageUrl || "";
            shopName = user.shopName || "";
            shopAddress = user.shopAddress || "";
            operatingHours = user.operatingHours || "";
            description = user.description || "";
          }
          isLoadingProfile = false;
        }
      );

      const unsubStats = convex.onUpdate(
        api.users.getUserStats,
        { userId: userId as any },
        (stats) => {
          if (stats) userStats = stats;
        }
      );

      return () => {
        unsubProfile();
        unsubStats();
      };
    }
  });

  // Password strength logic
  const passwordStrength = $derived(() => {
    if (!newPassword) return { score: 0, label: "Empty", color: "bg-muted" };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    switch (score) {
      case 1:
        return { score: 25, label: "Weak", color: "bg-destructive" };
      case 2:
        return { score: 50, label: "Fair", color: "bg-amber-500" };
      case 3:
        return { score: 75, label: "Good", color: "bg-blue-500" };
      case 4:
        return { score: 100, label: "Strong", color: "bg-emerald-500" };
      default:
        return { score: 10, label: "Very Weak", color: "bg-destructive" };
    }
  });

  const passwordsMatch = $derived(
    confirmPassword.length > 0 && newPassword === confirmPassword
  );

  async function handleUpdateProfile(e: SubmitEvent) {
    e.preventDefault();
    if (!userId) return;

    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    isSavingProfile = true;
    try {
      await convex.mutation(api.users.updateProfile, {
        userId: userId as any,
        name: name.trim(),
        phone: phone.trim(),
        imageUrl: imageUrl.trim(),
        ...(dbUser?.role === "pharmacist" && {
          shopName: shopName.trim(),
          shopAddress: shopAddress.trim(),
          operatingHours: operatingHours.trim(),
          description: description.trim()
        })
      });
      toast.success("Profile information updated successfully!");
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      isSavingProfile = false;
    }
  }

  async function handleChangePassword(e: SubmitEvent) {
    e.preventDefault();
    if (!userId) return;

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    isChangingPassword = true;
    try {
      await convex.action(api.auth.changePassword, {
        userId: userId as any,
        currentPassword,
        newPassword
      });
      toast.success("Password changed successfully!");
      currentPassword = "";
      newPassword = "";
      confirmPassword = "";
    } catch (err: any) {
      console.error("Password change error:", err);
      toast.error(err.message || "Failed to change password. Please check your current password.");
    } finally {
      isChangingPassword = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("User ID copied to clipboard!");
  }
</script>

<div class="max-w-6xl mx-auto space-y-6 pb-12">
  <!-- Profile Hero Header -->
  <div class="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 md:p-8 shadow-md">
    <div class="absolute -right-12 -top-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
      <!-- Profile Avatar Container -->
      <div class="relative group">
        {#if imageUrl}
          <img
            src={imageUrl}
            alt={name || "User Avatar"}
            class="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-2 border-primary/40 shadow-lg group-hover:scale-105 transition-transform duration-300"
          />
        {:else}
          <div class="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-black text-4xl shadow-lg border-2 border-primary/40">
            {(name || currentUser?.name || "U")[0].toUpperCase()}
          </div>
        {/if}
        <span class="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-card border border-border shadow text-primary">
          {#if (dbUser?.role || currentUser?.role) === 'pharmacist'}
            <Stethoscope class="w-4 h-4" />
          {:else if (dbUser?.role || currentUser?.role) === 'admin'}
            <Shield class="w-4 h-4" />
          {:else}
            <User class="w-4 h-4" />
          {/if}
        </span>
      </div>

      <!-- User Information Summary -->
      <div class="flex-1 text-center md:text-left space-y-2">
        <div class="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {name || currentUser?.name || "User Profile"}
          </h1>
          <span class={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            (dbUser?.role || currentUser?.role) === 'admin'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : (dbUser?.role || currentUser?.role) === 'pharmacist'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}>
            {dbUser?.role || currentUser?.role}
          </span>
          {#if dbUser?.isActive !== false}
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 class="w-3 h-3" /> Account Active
            </span>
          {/if}
        </div>

        <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-muted-foreground pt-1">
          <span class="flex items-center gap-1.5">
            <Mail class="w-3.5 h-3.5 text-primary" /> {dbUser?.email || currentUser?.email}
          </span>
          {#if phone}
            <span class="flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5 text-primary" /> {phone}
            </span>
          {/if}
          {#if shopName && (dbUser?.role || currentUser?.role) === 'pharmacist'}
            <span class="flex items-center gap-1.5 font-medium text-foreground">
              <Building2 class="w-3.5 h-3.5 text-emerald-500" /> {shopName}
            </span>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Real-Time Activity Statistics Cards -->
  {#if userStats}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      {#if userStats.role === 'customer'}
        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Orders</span>
            <CalendarCheck class="w-4 h-4 text-blue-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalReservations}</p>
          <p class="text-[11px] text-muted-foreground">{userStats.activeReservations} pending pickup</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Completed Orders</span>
            <CheckCircle2 class="w-4 h-4 text-emerald-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.completedReservations}</p>
          <p class="text-[11px] text-emerald-600 font-medium">Successfully fulfilled</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Prescriptions</span>
            <FileText class="w-4 h-4 text-indigo-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalPrescriptions}</p>
          <p class="text-[11px] text-muted-foreground">Stored safely in vault</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Favorites</span>
            <Heart class="w-4 h-4 text-rose-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalFavorites}</p>
          <p class="text-[11px] text-muted-foreground">Saved pharmacy shops</p>
        </div>
      {:else if userStats.role === 'pharmacist'}
        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Inventory Items</span>
            <Package class="w-4 h-4 text-amber-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalInventoryItems}</p>
          <p class="text-[11px] text-muted-foreground">Active medicines listed</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Pending Approvals</span>
            <Clock class="w-4 h-4 text-blue-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.pendingApprovals}</p>
          <p class="text-[11px] text-blue-600 font-medium">Action required</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Handled</span>
            <CalendarCheck class="w-4 h-4 text-purple-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalReservationsHandled}</p>
          <p class="text-[11px] text-muted-foreground">Lifetime customer orders</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Completed Sales</span>
            <CheckCircle2 class="w-4 h-4 text-emerald-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.completedOrders}</p>
          <p class="text-[11px] text-emerald-600 font-medium">Successfully fulfilled</p>
        </div>
      {:else if userStats.role === 'admin'}
        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total Users</span>
            <Users class="w-4 h-4 text-blue-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalUsers}</p>
          <p class="text-[11px] text-muted-foreground">Registered in platform</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Pharmacists</span>
            <Stethoscope class="w-4 h-4 text-emerald-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalPharmacists}</p>
          <p class="text-[11px] text-muted-foreground">Verified shop managers</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Customers</span>
            <User class="w-4 h-4 text-indigo-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.totalCustomers}</p>
          <p class="text-[11px] text-muted-foreground">Active portal buyers</p>
        </div>

        <div class="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur space-y-1 shadow-sm">
          <div class="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Open Complaints</span>
            <AlertCircle class="w-4 h-4 text-amber-500" />
          </div>
          <p class="text-2xl font-bold text-foreground">{userStats.openComplaints}</p>
          <p class="text-[11px] text-amber-600 font-medium">Support tickets</p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Tabbed Navigation Bar -->
  <div class="flex border-b border-border/60 gap-4">
    <button
      type="button"
      class={`flex items-center gap-2 pb-3 pt-2 text-sm font-semibold border-b-2 transition-colors ${
        activeTab === "profile"
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      onclick={() => (activeTab = "profile")}
    >
      <User class="w-4 h-4" /> Personal Information
    </button>
    <button
      type="button"
      class={`flex items-center gap-2 pb-3 pt-2 text-sm font-semibold border-b-2 transition-colors ${
        activeTab === "security"
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      onclick={() => (activeTab = "security")}
    >
      <Key class="w-4 h-4" /> Password & Security
    </button>
    <button
      type="button"
      class={`flex items-center gap-2 pb-3 pt-2 text-sm font-semibold border-b-2 transition-colors ${
        activeTab === "account"
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      onclick={() => (activeTab = "account")}
    >
      <Shield class="w-4 h-4" /> Account Details
    </button>
  </div>

  <!-- TAB CONTENT 1: PERSONAL INFORMATION -->
  {#if activeTab === "profile"}
    <form onsubmit={handleUpdateProfile} class="space-y-6">
      <!-- Avatar Selection & Preview -->
      <div class="p-6 rounded-2xl border border-border/60 bg-card space-y-4 shadow-sm">
        <div>
          <h3 class="font-bold text-base text-foreground flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-primary" /> Profile Avatar
          </h3>
          <p class="text-xs text-muted-foreground">Select a recommended avatar or paste a custom image URL.</p>
        </div>

        <!-- Preset Avatars Quick Selector -->
        <div class="flex flex-wrap gap-3 items-center">
          {#each presetAvatars as avatar}
            <button
              type="button"
              class={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                imageUrl === avatar
                  ? "border-primary ring-2 ring-primary/30 scale-105"
                  : "border-border/60 hover:border-primary/50 opacity-80 hover:opacity-100"
              }`}
              onclick={() => (imageUrl = avatar)}
            >
              <img src={avatar} alt="Preset Avatar" class="w-12 h-12 rounded-lg object-cover" />
            </button>
          {/each}
        </div>

        <div class="space-y-1.5 pt-2">
          <Label for="imageUrl" class="text-xs font-semibold text-foreground">Custom Avatar Image URL</Label>
          <Input
            id="imageUrl"
            type="url"
            placeholder="https://example.com/avatar.jpg"
            bind:value={imageUrl}
            class="text-xs"
          />
        </div>
      </div>

      <!-- Basic Profile Inputs -->
      <div class="p-6 rounded-2xl border border-border/60 bg-card space-y-4 shadow-sm">
        <h3 class="font-bold text-base text-foreground flex items-center gap-2">
          <User class="w-4 h-4 text-primary" /> Basic Information
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label for="fullName" class="text-xs font-semibold text-foreground">Full Name *</Label>
            <Input
              id="fullName"
              type="text"
              required
              placeholder="e.g. Dr. Sarah Jenkins"
              bind:value={name}
            />
          </div>

          <div class="space-y-1.5">
            <Label for="email" class="text-xs font-semibold text-foreground">Email Address (Read-only)</Label>
            <div class="relative">
              <Input
                id="email"
                type="email"
                disabled
                value={dbUser?.email || currentUser?.email}
                class="bg-muted/50 cursor-not-allowed text-muted-foreground"
              />
              <Lock class="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-3" />
            </div>
          </div>

          <div class="space-y-1.5 md:col-span-2">
            <Label for="phone" class="text-xs font-semibold text-foreground">Contact Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+880 1700-000000"
              bind:value={phone}
            />
          </div>
        </div>
      </div>

      <!-- Conditional Pharmacist Shop Information -->
      {#if (dbUser?.role || currentUser?.role) === 'pharmacist'}
        <div class="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-foreground flex items-center gap-2">
              <Building2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Pharmacy Store Details
            </h3>
            <span class="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
              Pharmacist Profile
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="shopName" class="text-xs font-semibold text-foreground">Store / Pharmacy Name</Label>
              <Input
                id="shopName"
                type="text"
                placeholder="e.g. MedPlus Care Pharmacy"
                bind:value={shopName}
              />
            </div>

            <div class="space-y-1.5">
              <Label for="operatingHours" class="text-xs font-semibold text-foreground">Operating Hours</Label>
              <Input
                id="operatingHours"
                type="text"
                placeholder="e.g. 08:00 AM - 11:00 PM (Daily)"
                bind:value={operatingHours}
              />
            </div>

            <div class="space-y-1.5 md:col-span-2">
              <Label for="shopAddress" class="text-xs font-semibold text-foreground">Full Store Address</Label>
              <Input
                id="shopAddress"
                type="text"
                placeholder="e.g. House 42, Road 11, Banani, Dhaka"
                bind:value={shopAddress}
              />
            </div>

            <div class="space-y-1.5 md:col-span-2">
              <Label for="description" class="text-xs font-semibold text-foreground">Store Bio / Description</Label>
              <textarea
                id="description"
                rows="3"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe your pharmacy, specialties, and customer service guarantees..."
                bind:value={description}
              ></textarea>
            </div>
          </div>
        </div>
      {/if}

      <div class="flex justify-end pt-2">
        <Button type="submit" disabled={isSavingProfile} class="gap-2 font-bold px-6">
          {#if isSavingProfile}
            <RefreshCw class="w-4 h-4 animate-spin" /> Saving Changes...
          {:else}
            <Save class="w-4 h-4" /> Save Profile Changes
          {/if}
        </Button>
      </div>
    </form>
  {/if}

  <!-- TAB CONTENT 2: PASSWORD & SECURITY -->
  {#if activeTab === "security"}
    <form onsubmit={handleChangePassword} class="space-y-6">
      <div class="p-6 rounded-2xl border border-border/60 bg-card space-y-4 shadow-sm">
        <div>
          <h3 class="font-bold text-base text-foreground flex items-center gap-2">
            <Key class="w-4 h-4 text-primary" /> Change Account Password
          </h3>
          <p class="text-xs text-muted-foreground">
            Ensure your account is protected with a secure password using PBKDF2 Web Crypto standard.
          </p>
        </div>

        <div class="space-y-4 max-w-xl">
          <!-- Current Password -->
          <div class="space-y-1.5">
            <Label for="currentPass" class="text-xs font-semibold text-foreground">Current Password *</Label>
            <div class="relative">
              <Input
                id="currentPass"
                type={showCurrentPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                bind:value={currentPassword}
              />
              <button
                type="button"
                class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                onclick={() => (showCurrentPassword = !showCurrentPassword)}
              >
                {#if showCurrentPassword}
                  <EyeOff class="w-4 h-4" />
                {:else}
                  <Eye class="w-4 h-4" />
                {/if}
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div class="space-y-1.5">
            <Label for="newPass" class="text-xs font-semibold text-foreground">New Password * (Min 8 Chars)</Label>
            <div class="relative">
              <Input
                id="newPass"
                type={showNewPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                bind:value={newPassword}
              />
              <button
                type="button"
                class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                onclick={() => (showNewPassword = !showNewPassword)}
              >
                {#if showNewPassword}
                  <EyeOff class="w-4 h-4" />
                {:else}
                  <Eye class="w-4 h-4" />
                {/if}
              </button>
            </div>

            <!-- Password Strength Bar -->
            {#if newPassword}
              <div class="space-y-1 pt-1">
                <div class="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                  <span>Strength: {passwordStrength().label}</span>
                  <span>{passwordStrength().score}%</span>
                </div>
                <div class="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    class={`h-full transition-all duration-300 ${passwordStrength().color}`}
                    style={`width: ${passwordStrength().score}%`}
                  ></div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Confirm New Password -->
          <div class="space-y-1.5">
            <Label for="confirmPass" class="text-xs font-semibold text-foreground">Confirm New Password *</Label>
            <Input
              id="confirmPass"
              type="password"
              required
              placeholder="••••••••"
              bind:value={confirmPassword}
            />

            {#if confirmPassword}
              <p class={`text-[11px] font-medium flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600' : 'text-destructive'}`}>
                {#if passwordsMatch}
                  <CheckCircle2 class="w-3.5 h-3.5" /> Passwords match perfectly!
                {:else}
                  <AlertCircle class="w-3.5 h-3.5" /> Passwords do not match yet.
                {/if}
              </p>
            {/if}
          </div>
        </div>

        <div class="pt-2">
          <Button type="submit" disabled={isChangingPassword || !passwordsMatch} class="gap-2 font-bold">
            {#if isChangingPassword}
              <RefreshCw class="w-4 h-4 animate-spin" /> Updating Password...
            {:else}
              <Key class="w-4 h-4" /> Update Password
            {/if}
          </Button>
        </div>
      </div>
    </form>
  {/if}

  <!-- TAB CONTENT 3: ACCOUNT & PERMISSIONS -->
  {#if activeTab === "account"}
    <div class="space-y-6">
      <div class="p-6 rounded-2xl border border-border/60 bg-card space-y-4 shadow-sm">
        <h3 class="font-bold text-base text-foreground flex items-center gap-2">
          <Shield class="w-4 h-4 text-primary" /> Account Metadata & System Details
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-3.5 rounded-xl border border-border/40 bg-muted/20 space-y-1">
            <span class="text-muted-foreground font-medium">Database User ID</span>
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono text-foreground font-bold truncate">{userId}</span>
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7 text-muted-foreground hover:text-foreground"
                onclick={() => copyToClipboard(userId || "")}
                title="Copy User ID"
              >
                <Copy class="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div class="p-3.5 rounded-xl border border-border/40 bg-muted/20 space-y-1">
            <span class="text-muted-foreground font-medium">Primary Email</span>
            <p class="font-bold text-foreground flex items-center gap-1.5">
              {dbUser?.email || currentUser?.email}
              <span class="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-semibold">Verified</span>
            </p>
          </div>

          <div class="p-3.5 rounded-xl border border-border/40 bg-muted/20 space-y-1">
            <span class="text-muted-foreground font-medium">System Privilege Level</span>
            <p class="font-bold text-foreground capitalize">
              {dbUser?.role || currentUser?.role} Access
            </p>
          </div>

          <div class="p-3.5 rounded-xl border border-border/40 bg-muted/20 space-y-1">
            <span class="text-muted-foreground font-medium">Account Status</span>
            <p class="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 class="w-3.5 h-3.5" /> Active & Operational
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
