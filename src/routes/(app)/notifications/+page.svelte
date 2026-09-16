<!-- routes/(app)/notifications/+page.svelte -->
<script lang="ts">
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Bell, Package, CheckCircle2, Clock, AlertTriangle, Info, Trash2, Loader2 } from "lucide-svelte";
  import { onMount } from "svelte";
  import { convex } from "$lib/convexClient";
  import { api } from "../../../../convex/_generated/api";
  import type { Id } from "../../../../convex/_generated/dataModel";
  import { toast } from "svelte-sonner";

  let { data } = $props();

  let rawNotifications = $state<any[]>([]);
  let isLoading = $state(true);

  onMount(() => {
    if (!data.user?._id) {
      isLoading = false;
      return;
    }
    const unsub = convex.onUpdate(
      api.notifications.getByUser,
      { userId: data.user._id as Id<"users"> },
      (items) => {
        rawNotifications = items;
        isLoading = false;
      }
    );
    return () => unsub();
  });

  function getTypeFromMessage(msg: string): "ready" | "approved" | "rejected" | "reminder" | "info" {
    const m = msg.toLowerCase();
    if (m.includes("ready")) return "ready";
    if (m.includes("approved")) return "approved";
    if (m.includes("rejected") || m.includes("cancelled")) return "rejected";
    if (m.includes("completed") || m.includes("delivered")) return "approved";
    return "info";
  }

  function getIcon(type: string) {
    switch (type) {
      case "ready": return Package;
      case "approved": return CheckCircle2;
      case "rejected": return AlertTriangle;
      case "reminder": return Clock;
      case "info": return Info;
      default: return Bell;
    }
  }

  function getIconBg(type: string) {
    switch (type) {
      case "ready": return "bg-emerald-500/10";
      case "approved": return "bg-blue-500/10";
      case "rejected": return "bg-red-500/10";
      case "reminder": return "bg-amber-500/10";
      default: return "bg-primary/10";
    }
  }

  function getIconColor(type: string) {
    switch (type) {
      case "ready": return "text-emerald-600 dark:text-emerald-400";
      case "approved": return "text-blue-600 dark:text-blue-400";
      case "rejected": return "text-red-600 dark:text-red-400";
      case "reminder": return "text-amber-600 dark:text-amber-400";
      default: return "text-primary";
    }
  }

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function groupLabel(ts: number): string {
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (24 * 3600 * 1000));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  const unreadCount = $derived(rawNotifications.filter(n => !n.isRead).length);

  const grouped = $derived(() => {
    const groups = new Map<string, any[]>();
    for (const n of rawNotifications) {
      const label = groupLabel(n.timestamp);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(n);
    }
    return groups;
  });

  async function markAllRead() {
    if (!data.user?._id) return;
    try {
      await convex.mutation(api.notifications.markAllAsRead, { userId: data.user._id as Id<"users"> });
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark notifications as read");
    }
  }

  async function markOneRead(id: Id<"notifications">) {
    try {
      await convex.mutation(api.notifications.markAsRead, { notificationId: id });
    } catch {
      // silent
    }
  }
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

  {#if isLoading}
    <div class="flex justify-center items-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>
  {:else if rawNotifications.length === 0}
    <Card.Root class="p-10 text-center">
      <div class="flex flex-col items-center gap-3">
        <div class="icon-box--lg bg-muted">
          <Bell class="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p class="text-sm font-semibold text-foreground">No notifications</p>
        <p class="text-xs text-muted-foreground">You're all caught up! Pharmacist updates will appear here.</p>
      </div>
    </Card.Root>
  {:else}
    <div class="space-y-6">
      {#each grouped() as [date, group]}
        <div>
          <p class="notif-page__group-label">{date}</p>
          <Card.Root class="overflow-hidden divide-y">
            {#each group as notif (notif._id)}
              {@const type = getTypeFromMessage(notif.message)}
              {@const Icon = getIcon(type)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="notif-page__item group {!notif.isRead ? 'notif-page__item--unread' : 'notif-page__item--read'}"
                onclick={() => { if (!notif.isRead) markOneRead(notif._id); }}
              >
                <div class="notif-page__item-icon {getIconBg(type)}">
                  <Icon class="h-4 w-4 {getIconColor(type)}" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="notif-page__item-title">
                        Reservation Update
                        {#if !notif.isRead}
                          <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary ml-1.5 mb-0.5"></span>
                        {/if}
                      </p>
                      <p class="notif-page__item-msg">{notif.message}</p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="notif-page__item-time">{timeAgo(notif.timestamp)}</span>
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
