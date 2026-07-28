<!-- routes/(app)/+layout.svelte -->
<script lang="ts">
  import CustomerTopBar from "$lib/components/layout/CustomerTopBar.svelte";
  import CartDrawer from "$lib/components/shared/CartDrawer.svelte";

  let { children } = $props();
</script>

<div class="flex flex-col h-full">
  <CustomerTopBar />
  <div class="flex-1 overflow-y-auto">
    {@render children()}
  </div>
</div>

<!-- Cart drawer overlay — always mounted, visibility controlled by cart store -->
<CartDrawer />