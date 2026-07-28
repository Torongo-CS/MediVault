<!-- src/lib/components/shared/StatusBadge.svelte -->
<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import {
    Clock,
    CheckCircle2,
    XCircle,
    Package,
    Truck,
    AlertTriangle,
    Ban,
  } from "lucide-svelte";

  type ReservationStatus =
    | "pending"
    | "approved"
    | "rejected"
    | "expired"
    | "ready"
    | "delivered"
    | "cancelled";

  interface Props {
    status: ReservationStatus;
    size?: "sm" | "default";
  }

  let { status, size = "default" }: Props = $props();

  const config: Record<
    ReservationStatus,
    { label: string; color: string; icon: typeof Clock }
  > = {
    pending: {
      label: "Pending",
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
      icon: CheckCircle2,
    },
    ready: {
      label: "Ready",
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      icon: Package,
    },
    delivered: {
      label: "Delivered",
      color: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
      icon: Truck,
    },
    rejected: {
      label: "Rejected",
      color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
      icon: XCircle,
    },
    expired: {
      label: "Expired",
      color: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
      icon: AlertTriangle,
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-muted text-muted-foreground border-border",
      icon: Ban,
    },
  };

  const current = $derived(config[status]);
  const sizeClasses = $derived(
    size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-xs px-2 py-1 gap-1.5"
  );
  const iconSize = $derived(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5");
</script>

<span
  class="inline-flex items-center font-semibold rounded-full border {current.color} {sizeClasses}"
>
  <current.icon class={iconSize} />
  {current.label}
</span>
