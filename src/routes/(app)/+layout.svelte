<script lang="ts">
  import { SidebarProvider, SidebarTrigger } from "$lib/components/ui/sidebar";
  import AppSidebar from "$lib/components/app-sidebar.svelte";

  let { children } = $props();
</script>

<SidebarProvider>
  <AppSidebar />
  <main class="w-full flex-1 overflow-y-auto bg-background text-foreground">
    <div class="p-4 md:p-8">
      <div class="mb-4">
        <SidebarTrigger />
      </div>
      {@render children()}
    </div>
  </main>
</SidebarProvider>
