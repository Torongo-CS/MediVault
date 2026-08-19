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

<div class="dashboard-container">
  <!-- Header -->
  <div class="dashboard-header">
    <div>
      <h1 class="dashboard-title flex items-center gap-2">
        {getGreeting()}, {userName}! 👋
      </h1>
      <p class="text-xs text-muted-foreground mt-1">
        {today} &bull; Welcome back to MediVault. Here is your health overview.
      </p>
    </div>
    <div class="flex items-center gap-3">
      <Button href="/pharmacy" variant="default" class="gap-2">
        <Pill class="h-4 w-4" /> Find Pharmacy
      </Button>
    </div>
  </div>

  <!-- Key Metrics Cards Grid -->
  <div class="dashboard-grid">
    <a href="/reservations" class="block">
      <Card.Root class="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="dashboard-card-title">Active Reservations</Card.Title>
          <CalendarCheck class="dashboard-card-icon text-blue-500" />
        </Card.Header>
        <Card.Content>
          <div class="dashboard-card-value">{stats.activeReservations}</div>
          <p class="text-xs text-muted-foreground mt-1">Orders in progress</p>
        </Card.Content>
      </Card.Root>
    </a>

    <a href="/reservations" class="block">
      <Card.Root class="hover:border-amber-500/50 transition-colors cursor-pointer h-full">
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="dashboard-card-title">Pending Approvals</Card.Title>
          <Clock class="dashboard-card-icon text-amber-500" />
        </Card.Header>
        <Card.Content>
          <div class="dashboard-card-value">{stats.pendingApprovals}</div>
          <p class="text-xs text-muted-foreground mt-1">Awaiting pharmacy confirmation</p>
        </Card.Content>
      </Card.Root>
    </a>

    <a href="/prescriptions" class="block">
      <Card.Root class="hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="dashboard-card-title">Prescriptions in Vault</Card.Title>
          <FileText class="dashboard-card-icon text-emerald-500" />
        </Card.Header>
        <Card.Content>
          <div class="dashboard-card-value">{stats.prescriptionsUploaded}</div>
          <p class="text-xs text-muted-foreground mt-1">Stored digital Rx files</p>
        </Card.Content>
      </Card.Root>
    </a>

    <a href="/favorites" class="block">
      <Card.Root class="hover:border-rose-500/50 transition-colors cursor-pointer h-full">
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="dashboard-card-title">Favorite Pharmacies</Card.Title>
          <Heart class="dashboard-card-icon text-rose-500" />
        </Card.Header>
        <Card.Content>
          <div class="dashboard-card-value">{favoritePharmacies.length}</div>
          <p class="text-xs text-muted-foreground mt-1">Saved quick contacts</p>
        </Card.Content>
      </Card.Root>
    </a>
  </div>

  <!-- Quick Action Navigation Shortcuts -->
  <div class="flex items-center mt-8 mb-4">
    <h2 class="text-xl font-semibold tracking-tight">Quick Actions</h2>
  </div>

  <div class="dashboard-grid">
    <a href="/pharmacy" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <Pill class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>Search Pharmacy</Card.Title>
          <Card.Description>Locate nearby pharmacies and check medicine availability.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/ai-assistant" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <Brain class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>AI Assistant</Card.Title>
          <Card.Description>Get instant guidance on medicines, dosage, & side effects.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/prescriptions" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <FileText class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>Prescriptions Vault</Card.Title>
          <Card.Description>Upload, store, and manage your medical prescriptions safely.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/history" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <History class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <Card.Title>Order History</Card.Title>
          <Card.Description>Review past medicine orders and request instant refills.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>
  </div>

  <!-- Main Section: Notifications & Favorite Pharmacies -->
  <div class="dashboard-section mt-8">
    <!-- Left Column: Recent Notifications (4 Columns) -->
    <Card.Root class="dashboard-chart-area">
      <Card.Header class="flex flex-row items-center justify-between">
        <div>
          <Card.Title>Recent Notifications</Card.Title>
          <Card.Description>Stay updated on order status and health reminders.</Card.Description>
        </div>
        <Button href="/notifications" variant="outline" size="sm" class="gap-1 text-xs">
          View All <ChevronRight class="h-3.5 w-3.5" />
        </Button>
      </Card.Header>
      <Card.Content class="space-y-3">
        {#each notifications as notif (notif.id)}
          <div class="flex items-start gap-3 p-3 rounded-lg border border-border/60 {notif.unread ? 'bg-primary/5 border-primary/20' : 'bg-card'} transition-colors">
            <div class="p-2 rounded-full bg-muted flex-shrink-0 mt-0.5">
              <Bell class="h-4 w-4 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="font-semibold text-sm text-foreground">{notif.title}</p>
                <span class="text-xs text-muted-foreground">{notif.time}</span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>

    <!-- Right Column: Favorite Pharmacies (3 Columns) -->
    <div class="dashboard-recent-area space-y-6">
      <Card.Root class="h-full flex flex-col justify-between">
        <Card.Header class="flex flex-row items-center justify-between">
          <div>
            <Card.Title class="flex items-center gap-2">
              <Heart class="h-4 w-4 text-rose-500" /> Favorite Pharmacies
            </Card.Title>
            <Card.Description>Quick access to your preferred pharmacies</Card.Description>
          </div>
          <Button href="/favorites" variant="ghost" size="sm" class="text-xs text-muted-foreground gap-1">
            View All <ArrowRight class="h-3 w-3" />
          </Button>
        </Card.Header>
        <Card.Content class="space-y-3 flex-1">
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
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>