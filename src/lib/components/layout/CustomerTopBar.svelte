<!-- src/lib/components/layout/CustomerTopBar.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Popover from "$lib/components/ui/popover";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { ShoppingCart, Bell, Package, CheckCircle2, Clock, ChevronRight, MessageSquare, Shield } from "lucide-svelte";
  import { cart } from "$lib/stores/cartStore.svelte";
  import { page } from "$app/state";
  import { userSession } from "$lib/session.svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";

  const routeTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/pharmacy": "Search Pharmacies",
    "/reservations": "My Reservations",
    "/prescriptions": "Prescription Vault",
    "/ai-assistant": "AI Assistant",
    "/history": "Order History",
    "/favorites": "Favorites",
    "/complaint": "Complaint & Support Center",
    "/notifications": "Notifications",
    "/admin/dashboard": "Admin Dashboard",
    "/admin/Recieved_com": "Received Complaints",
    "/pharmacist/dashboard": "Pharmacist Dashboard",
  };

  const pageTitle = $derived(() => {
    const path = page.url.pathname;
    if (routeTitles[path]) return routeTitles[path];
    if (path.startsWith("/pharmacy/")) return "Pharmacy";
    if (path.startsWith("/reservations/")) return "Reservation Details";
    return "MediVault";
  });

  const currentUser = $derived(userSession.user);
  const userId = $derived(currentUser?._id);

  let rawNotifications = $state<any[]>([]);
  let notifOpen = $state(false);

  // Live Convex subscription for user notifications
  $effect(() => {
    if (userId) {
      const unsub = convex.onUpdate(
        api.notifications.getByUser,
        { userId: userId as any },
        (items) => {
          if (items) rawNotifications = items;
        }
      );
      return () => unsub();
    }
  });

  const unreadCount = $derived(rawNotifications.filter((n) => !n.isRead).length);

  async function handleNotifOpenChange(open: boolean) {
    notifOpen = open;
    if (open && userId && unreadCount > 0) {
      try {
        await convex.mutation(api.notifications.markAllAsRead, { userId: userId as any });
      } catch (err) {
        console.error("Failed to mark notifications read:", err);
      }
    }
  }

  function formatTimeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
</script>

<header class="topbar border-b border-border/50 bg-card/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
  <div class="flex items-center gap-3">
    <Sidebar.Trigger class="h-8 w-8" />
    <h2 class="topbar__title text-lg font-bold tracking-tight text-foreground">{pageTitle()}</h2>
  </div>

  <div class="topbar__actions flex items-center gap-2">
    <!-- Notification bell with Live Convex Updates -->
    <Popover.Root bind:open={notifOpen} onOpenChange={handleNotifOpenChange}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon"
            class="topbar__icon-btn relative h-9 w-9"
            aria-label="Notifications"
          >
            <Bell class="h-5 w-5 text-muted-foreground" />
            {#if unreadCount > 0}
              <span class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>

      <Popover.Content class="w-80 md:w-96 p-0 shadow-xl border border-border" align="end">
        <div class="p-3 border-b border-border/50 bg-muted/30 flex justify-between items-center">
          <h3 class="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Bell class="w-3.5 h-3.5 text-primary" /> Real-Time Notifications
          </h3>
          {#if unreadCount === 0}
            <span class="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">All caught up</span>
          {:else}
            <span class="text-[10px] text-destructive font-semibold">{unreadCount} new</span>
          {/if}
        </div>

        <div class="divide-y max-h-80 overflow-y-auto">
          {#if rawNotifications.length === 0}
            <div class="p-6 text-center text-xs text-muted-foreground">
              No notifications recorded yet.
            </div>
          {:else}
            {#each rawNotifications.slice(0, 10) as notif (notif._id)}
              {@const isChat = notif.message.toLowerCase().includes("chat") || notif.message.toLowerCase().includes("message")}
              <div class={`p-3 text-xs space-y-1 transition-colors ${!notif.isRead ? 'bg-primary/5 font-medium' : 'hover:bg-muted/20'}`}>
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                    {#if isChat}
                      <MessageSquare class="w-3.5 h-3.5 text-primary shrink-0" /> Chat Message
                    {:else}
                      <Package class="w-3.5 h-3.5 text-blue-500 shrink-0" /> Order Notification
                    {/if}
                  </span>
                  <span class="text-[10px] text-muted-foreground whitespace-nowrap">{formatTimeAgo(notif.timestamp)}</span>
                </div>
                <p class="text-muted-foreground leading-snug line-clamp-2 text-[11px]">{notif.message}</p>
              </div>
            {/each}
          {/if}
        </div>

        <div class="p-2 border-t border-border/50 bg-muted/10 text-center">
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

    <!-- Cart button (for customers) -->
    {#if userSession.role === 'customer'}
      <Button
        variant="ghost"
        size="icon"
        class="topbar__icon-btn relative h-9 w-9"
        onclick={() => cart.toggle()}
      >
        <ShoppingCart class="h-5 w-5 text-muted-foreground" />
        {#if cart.itemCount > 0}
          <span class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {cart.itemCount > 9 ? "9+" : cart.itemCount}
          </span>
        {/if}
      </Button>
    {/if}
  </div>
</header>
