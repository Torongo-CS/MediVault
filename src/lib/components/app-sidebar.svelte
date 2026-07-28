<!-- src/lib/components/app-sidebar.svelte -->
<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { userSession } from "$lib/session.svelte";
  import {
    LayoutDashboard,
    Pill,
    CalendarCheck,
    FileText,
    Brain,
    History as HistoryIcon,
    Heart,
    Users,
    Stethoscope,
    BarChart3,
    CheckSquare,
    Package,
    LogOut,
    Shield,

    Bell

  } from "lucide-svelte";

  const menuConfig = {
    customer: {
      label: "Customer Portal",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Search Pharmacy", url: "/pharmacy", icon: Pill },
        { title: "Reservations", url: "/reservations", icon: CalendarCheck },
        { title: "Prescriptions", url: "/prescriptions", icon: FileText },
        { title: "AI Assistant", url: "/ai-assistant", icon: Brain },
        { title: "Order History", url: "/history", icon: HistoryIcon },
        { title: "Favorites", url: "/favorites", icon: Heart },
        { title: "Complaint", url: "/complaint", icon: Shield },
        { title: "Notification", url: "/notification", icon: Bell }
      ]
    },
    pharmacist: {
      label: "Pharmacist WorkSpace",
      items: [
        { title: "Dashboard", url: "/pharmacist/dashboard", icon: LayoutDashboard },
        { title: "Pending Approvals", url: "/pharmacist/approvals", icon: CheckSquare },
        { title: "Inventory Management", url: "/pharmacist/inventory", icon: Package },
        { title: "Delivery Management", url: "/pharmacist/delivery", icon: Users },
        { title: "Transaction Records", url: "/pharmacist/transaction_records", icon: Users },
        { title: "AI Assistant", url: "/ai-assistant", icon: Brain },
        { title: "Complaint", url: "/complaint", icon: Shield }
      ]
    },
    admin: {
      label: "Admin Console",
      items: [
        { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Received Complaint", url: "/admin/Recieved_com", icon: Shield },
        { title: "Users Management", url: "/admin/users", icon: Users },
        { title: "Pharmacists List", url: "/admin/pharmacists", icon: Stethoscope },
        { title: "Reports & Stats", url: "/admin/reports", icon: BarChart3 },
        { title: "Search Pharmacy", url: "/pharmacy", icon: Pill },
        { title: "AI Assistant", url: "/ai-assistant", icon: Brain }
      ]
    }
  };

  const currentMenu = $derived(menuConfig[userSession.role]);
</script>

<Sidebar.Root collapsible="icon">
  <Sidebar.Header class="p-4 border-b space-y-4">
    <div class="flex items-center gap-3">
      <div class="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-lg">
        M
      </div>
      <div class="flex flex-col">
        <span class="font-bold text-sm leading-none">MediVault</span>
        <span class="text-[10px] text-muted-foreground mt-0.5">Workspace Management</span>
      </div>
    </div>

    <div class="w-full flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
      <Shield class="w-3.5 h-3.5 text-primary shrink-0" />
      <div class="flex flex-col min-w-0">
        <span class="text-xs font-semibold truncate">{userSession.name || "Signed in"}</span>
        <span class="text-[10px] text-muted-foreground truncate">
          {userSession.email}{userSession.email ? " · " : ""}<span class="capitalize">{userSession.role}</span>
        </span>
      </div>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel class="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{currentMenu.label}</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each currentMenu.items as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href={item.url} {...props}>
                    <item.icon class="w-4 h-4 mr-2" />
                    <span>{item.title}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer class="p-4 flex justify-between items-center flex-row border-t bg-muted/20">
    <ThemeToggle />
    <form method="POST" action="/logout" class="contents">
      <Sidebar.MenuItem class="list-none">
        <Sidebar.MenuButton class="w-fit hover:bg-destructive/10">
          {#snippet child({ props })}
            <button type="submit" {...props} class="flex items-center text-destructive font-semibold">
              <LogOut class="w-4 h-4 mr-2" />
              <span>Logout</span>
            </button>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </form>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>