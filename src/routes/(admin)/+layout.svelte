<script lang="ts">
  import CustomerTopBar from "$lib/components/layout/CustomerTopBar.svelte";
  let { children } = $props();
</script>

<div class="flex flex-col h-full">
  <CustomerTopBar />
  <div class="flex-1 overflow-y-auto">
    {@render children()}
  </div>
</div>
