<!-- routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import PharmacyCard from "$lib/components/shared/PharmacyCard.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import {
    CalendarCheck, Clock, Bell, Pill, Brain, FileText, History,
    Heart, ArrowRight, ChevronRight, Sparkles,
  } from "lucide-svelte";

  const userName = "Rafiq";

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const stats = {
    activeReservations: 3,
    pendingApprovals: 1,
    prescriptionsUploaded: 5,
  };

  const notifications = [
    { id: "n-1", title: "Order Ready", message: "Your order at HealthPlus is ready for pickup.", time: "2h ago", unread: true },
    { id: "n-2", title: "Reservation Approved", message: "CarePoint approved your reservation.", time: "5h ago", unread: true },
    { id: "n-3", title: "Refill Reminder", message: "Your Losartan 50mg supply may be running low.", time: "1d ago", unread: false },
  ];

  const quickActions = [
    { label: "Search Pharmacy", href: "/pharmacy", icon: Pill, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "AI Assistant", href: "/ai-assistant", icon: Brain, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "Prescriptions", href: "/prescriptions", icon: FileText, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Order History", href: "/history", icon: History, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  ];

  const favoritePharmacies = [
    { id: "ph-2", name: "CarePoint Medical", address: "15 Gulshan Ave, Dhaka", phone: "+880 1898-765432" },
    { id: "ph-5", name: "University Health Center", address: "BUET Campus, Dhaka", phone: "+880 1911-445566" },
  ];
</script>

<div class="page-root">
  <!-- Welcome Banner -->
  <Card.Root class="welcome-banner">
    <div class="welcome-banner__content">
      <p class="welcome-banner__date">{today}</p>
      <h1 class="welcome-banner__greeting">{getGreeting()}, {userName}! 👋</h1>
      <p class="welcome-banner__subtitle">Welcome back to MediVault. Here's your overview.</p>
    </div>
    <div class="absolute right-0 bottom-0 opacity-5 pointer-events-none">
      <Sparkles class="h-40 w-40 text-primary" />
    </div>
  </Card.Root>

  <!-- Stat Cards -->
  <div class="stat-cards-grid">
    <a href="/reservations">
      <Card.Root class="p-5 card-interactive hover:border-primary/20">
        <div class="stat-card__inner">
          <div>
            <p class="stat-card__value">{stats.activeReservations}</p>
            <p class="stat-card__label">Active Reservations</p>
          </div>
          <div class="icon-box bg-blue-500/10">
            <CalendarCheck class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card.Root>
    </a>

    <a href="/reservations">
      <Card.Root class="p-5 card-interactive hover:border-amber-500/20">
        <div class="stat-card__inner">
          <div>
            <p class="stat-card__value">{stats.pendingApprovals}</p>
            <p class="stat-card__label">Pending Approval</p>
          </div>
          <div class="icon-box bg-amber-500/10 relative">
            <Clock class="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <span class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
        </div>
      </Card.Root>
    </a>

    <a href="/prescriptions">
      <Card.Root class="p-5 card-interactive hover:border-primary/20">
        <div class="stat-card__inner">
          <div>
            <p class="stat-card__value">{stats.prescriptionsUploaded}</p>
            <p class="stat-card__label">Prescriptions in Vault</p>
          </div>
          <div class="icon-box bg-emerald-500/10">
            <FileText class="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </Card.Root>
    </a>
  </div>

  <!-- Two-column: Quick Actions + Notifications -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Quick Actions -->
    <Card.Root class="p-6">
      <h3 class="section-title text-base mb-5">Quick Actions</h3>
      <div class="quick-actions-grid">
        {#each quickActions as action}
          <a href={action.href} class="quick-action-item group">
            <div class="icon-box rounded-xl {action.color}">
              <action.icon class="h-5 w-5" />
            </div>
            <span class="quick-action-item__label">{action.label}</span>
          </a>
        {/each}
      </div>
    </Card.Root>

    <!-- Recent Notifications -->
    <Card.Root class="p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title">Recent Notifications</h3>
        <Button variant="ghost" size="sm" href="/notifications" class="text-xs text-muted-foreground gap-1">
          View All <ChevronRight class="h-3 w-3" />
        </Button>
      </div>
      <div class="space-y-2.5">
        {#each notifications as notif (notif.id)}
          <div class="dash-notif-item {notif.unread ? 'dash-notif-item--unread' : 'dash-notif-item--read'}">
            <div class="dash-notif-item__icon">
              <Bell class="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="dash-notif-item__title">{notif.title}</p>
              <p class="dash-notif-item__msg">{notif.message}</p>
            </div>
            <span class="dash-notif-item__time">{notif.time}</span>
          </div>
        {/each}
      </div>
    </Card.Root>
  </div>

  <!-- Favorite Pharmacies -->
  {#if favoritePharmacies.length > 0}
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title flex items-center gap-2">
          <Heart class="h-4 w-4 text-red-500" />
          Favorite Pharmacies
        </h3>
        <a href="/favorites" class="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          View All <ArrowRight class="h-3 w-3" />
        </a>
      </div>
      <div class="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {#each favoritePharmacies as pharm (pharm.id)}
          <PharmacyCard
            id={pharm.id}
            name={pharm.name}
            address={pharm.address}
            phone={pharm.phone}
            isFavorite={true}
            compact
          />
        {/each}
      </div>
    </div>
  {/if}
</div>