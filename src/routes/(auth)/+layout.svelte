<script lang="ts">
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { children } = $props();
</script>

<div class="min-h-screen flex items-center justify-center p-6 md:p-10 bg-background text-foreground relative">
  <div class="absolute top-4 right-4 md:top-8 md:right-8">
    <ThemeToggle />
  </div>
  <div class="w-full max-w-4xl">
    {@render children()}
  </div>
</div>
