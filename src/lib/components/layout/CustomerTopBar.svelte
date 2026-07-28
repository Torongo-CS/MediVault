<!-- src/lib/components/layout/CustomerTopBar.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Popover from "$lib/components/ui/popover";
  import { ShoppingCart, Bell, Package, CheckCircle2, Clock, ChevronRight } from "lucide-svelte";
  import { cart } from "$lib/stores/cartStore.svelte";
  import { page } from "$app/state";

  const routeTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/pharmacy": "Search Pharmacies",
    "/reservations": "My Reservations",
    "/prescriptions": "Prescription Vault",
    "/ai-assistant": "AI Assistant",
    "/history": "Order History",
    "/favorites": "Favorites",
    "/complaint": "Complaints",
    "/notifications": "Notifications",
  };

  const pageTitle = $derived(() => {
    const path = page.url.pathname;
    if (routeTitles[path]) return routeTitles[path];
    if (path.startsWith("/pharmacy/")) return "Pharmacy";
    if (path.startsWith("/reservations/")) return "Reservation Details";
    return "MediVault";
  });

  let notifications = $state([
    { id: "n-1", title: "Order Ready", message: "Your order at HealthPlus is ready for pickup.", time: "2h ago", type: "ready" as const, unread: true },
    { id: "n-2", title: "Reservation Approved", message: "CarePoint approved your reservation.", time: "5h ago", type: "approved" as const, unread: true },
    { id: "n-3", title: "Refill Reminder", message: "Your Losartan 50mg supply may be running low.", time: "1d ago", type: "reminder" as const, unread: false },
  ]);

  let notifOpen = $state(false);
  const unreadCount = $derived(notifications.filter((n) => n.unread).length);

  function handleNotifOpenChange(open: boolean) {
    notifOpen = open;
    if (open) notifications = notifications.map((n) => ({ ...n, unread: false }));
  }

  function getNotifIcon(type: string) {
    if (type === "ready") return Package;
    if (type === "approved") return CheckCircle2;
    return Clock;
  }

  function getNotifColor(type: string) {
    if (type === "ready") return "text-emerald-500";
    if (type === "approved") return "text-blue-500";
    return "text-amber-500";
  }
</script>

<header class="topbar">
  <div>
    <h2 class="topbar__title">{pageTitle()}</h2>
  </div>

  <div class="topbar__actions">
    <!-- Notification bell with Popover -->
    <Popover.Root bind:open={notifOpen} onOpenChange={handleNotifOpenChange}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon"
            class="topbar__icon-btn"
            aria-label="Notifications"
          >
            <Bell class="h-4.5 w-4.5 text-muted-foreground" />
            {#if unreadCount > 0}
              <span class="topbar__count-badge bg-destructive text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>

      <Popover.Content class="w-80 p-0 shadow-lg" align="end">
        <div class="notif-pop__header">
          <h3 class="notif-pop__header-title">Notifications</h3>
          {#if notifications.some((n) => !n.unread)}
            <span class="text-[11px] text-muted-foreground">All caught up</span>
          {/if}
        </div>

        <div class="divide-y">
          {#each notifications as notif (notif.id)}
            {@const Icon = getNotifIcon(notif.type)}
            {@const iconColor = getNotifColor(notif.type)}
            <div class="notif-item {notif.unread ? 'notif-item--unread' : 'notif-item--read'}">
              <div class="notif-item__icon">
                <Icon class="h-3.5 w-3.5 {iconColor}" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="notif-item__title">{notif.title}</p>
                <p class="notif-item__msg">{notif.message}</p>
              </div>
              <span class="notif-item__time">{notif.time}</span>
            </div>
          {/each}
        </div>

        <div class="notif-pop__footer">
          <Button
            href="/notifications"
            variant="ghost"
            class="w-full text-xs font-semibold gap-1 justify-center h-8"
            onclick={() => (notifOpen = false)}
          >
            View all notifications
            <ChevronRight class="h-3.5 w-3.5" />
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- Cart button -->
    <Button
      variant="ghost"
      size="icon"
      class="topbar__icon-btn"
      onclick={() => cart.toggle()}
    >
      <ShoppingCart class="h-4.5 w-4.5 text-muted-foreground" />
      {#if cart.itemCount > 0}
        <span class="topbar__count-badge bg-primary text-primary-foreground">
          {cart.itemCount > 9 ? "9+" : cart.itemCount}
        </span>
      {/if}
    </Button>
  </div>
</header>
