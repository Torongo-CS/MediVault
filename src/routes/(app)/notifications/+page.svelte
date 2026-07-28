<!-- routes/(app)/notifications/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Bell, Package, CheckCircle2, Clock, AlertTriangle, Info, Trash2 } from "lucide-svelte";

  type NotifType = "ready" | "approved" | "rejected" | "reminder" | "info";

  interface Notification {
    id: string; title: string; message: string; time: string;
    date: string; type: NotifType; unread: boolean;
  }

  let notifications = $state<Notification[]>([
    { id: "n-1", title: "Order Ready for Pickup", message: "Your order at HealthPlus Pharmacy is ready for pickup. Please collect before 8 PM today.", time: "2h ago", date: "Today", type: "ready", unread: true },
    { id: "n-2", title: "Reservation Approved", message: "CarePoint Medical Store has approved your reservation of 1 item (Amoxicillin 250mg).", time: "5h ago", date: "Today", type: "approved", unread: true },
    { id: "n-3", title: "Refill Reminder", message: "Your Losartan 50mg supply may be running low. Consider placing a reservation soon.", time: "1d ago", date: "Yesterday", type: "reminder", unread: false },
    { id: "n-4", title: "Reservation Rejected", message: "Lazz Pharma was unable to fulfill your reservation for Metformin 500mg due to stock issues.", time: "2d ago", date: "Yesterday", type: "rejected", unread: false },
    { id: "n-5", title: "Prescription Expiring Soon", message: "Your prescription 'dr_ahmed_prescription.pdf' is set to expire in 7 days. Please renew it.", time: "3d ago", date: "3 days ago", type: "info", unread: false },
    { id: "n-6", title: "Order Delivered", message: "Your reservation from HealthPlus Pharmacy has been marked as delivered.", time: "7d ago", date: "Last week", type: "approved", unread: false },
  ]);

  function getIcon(type: NotifType) {
    switch (type) {
      case "ready": return Package;
      case "approved": return CheckCircle2;
      case "rejected": return AlertTriangle;
      case "reminder": return Clock;
      case "info": return Info;
      default: return Bell;
    }
  }

  function getIconBg(type: NotifType) {
    switch (type) {
      case "ready": return "bg-emerald-500/10";
      case "approved": return "bg-blue-500/10";
      case "rejected": return "bg-red-500/10";
      case "reminder": return "bg-amber-500/10";
      default: return "bg-primary/10";
    }
  }

  function getIconColor(type: NotifType) {
    switch (type) {
      case "ready": return "text-emerald-600 dark:text-emerald-400";
      case "approved": return "text-blue-600 dark:text-blue-400";
      case "rejected": return "text-red-600 dark:text-red-400";
      case "reminder": return "text-amber-600 dark:text-amber-400";
      default: return "text-primary";
    }
  }

  const unreadCount = $derived(notifications.filter((n) => n.unread).length);

  const grouped = $derived(() => {
    const groups = new Map<string, Notification[]>();
    for (const n of notifications) {
      if (!groups.has(n.date)) groups.set(n.date, []);
      groups.get(n.date)!.push(n);
    }
    return groups;
  });

  function markAllRead() { notifications = notifications.map((n) => ({ ...n, unread: false })); }
  function deleteNotification(id: string) { notifications = notifications.filter((n) => n.id !== id); }
</script>

<div class="page-root max-w-2xl mx-auto">
  <PageHeader
    title="Notifications"
    subtitle="Stay updated on your reservations and orders"
    showBack={true}
    backHref="/dashboard"
  >
    {#snippet actions()}
      {#if unreadCount > 0}
        <Button variant="outline" size="sm" class="text-xs font-semibold" onclick={markAllRead}>
          Mark all as read
        </Button>
      {/if}
    {/snippet}
  </PageHeader>

  {#if notifications.length === 0}
    <Card.Root class="p-10 text-center">
      <div class="flex flex-col items-center gap-3">
        <div class="icon-box--lg bg-muted">
          <Bell class="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p class="text-sm font-semibold text-foreground">No notifications</p>
        <p class="text-xs text-muted-foreground">You're all caught up!</p>
      </div>
    </Card.Root>
  {:else}
    <div class="space-y-6">
      {#each grouped() as [date, group]}
        <div>
          <p class="notif-page__group-label">{date}</p>
          <Card.Root class="overflow-hidden divide-y">
            {#each group as notif (notif.id)}
              {@const Icon = getIcon(notif.type)}
              <div class="notif-page__item group {notif.unread ? 'notif-page__item--unread' : 'notif-page__item--read'}">
                <div class="notif-page__item-icon {getIconBg(notif.type)}">
                  <Icon class="h-4 w-4 {getIconColor(notif.type)}" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="notif-page__item-title">
                        {notif.title}
                        {#if notif.unread}
                          <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary ml-1.5 mb-0.5"></span>
                        {/if}
                      </p>
                      <p class="notif-page__item-msg">{notif.message}</p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="notif-page__item-time">{notif.time}</span>
                      <button
                        class="notif-page__dismiss-btn"
                        onclick={() => deleteNotification(notif.id)}
                        aria-label="Dismiss notification"
                      >
                        <Trash2 class="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </Card.Root>
        </div>
      {/each}
    </div>
  {/if}
</div>
