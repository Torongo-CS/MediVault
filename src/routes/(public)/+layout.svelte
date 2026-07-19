<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { children } = $props();
</script>

<!-- Navigation Header -->
<header class="border-b bg-background sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="/" class="flex items-center gap-3">
      <div class="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center text-background font-black text-lg">
        M
      </div>
      <span class="font-bold text-xl tracking-tight text-foreground">MediVault</span>
    </a>
    
    <nav class="hidden md:flex items-center gap-8">
      <a href="/about" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
      <a href="/medicines" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Medicines Catalog</a>
      <a href="/login" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</a>
    </nav>

    <div class="flex items-center gap-3">
      <ThemeToggle />
      <Button href="/login" variant="ghost" class="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
        Login
      </Button>
      <Button href="/register" class="font-semibold text-sm">
        Get Started
      </Button>
    </div>
  </div>
</header>

<main class="w-full flex-1 bg-background text-foreground">
  {@render children()}
</main>
