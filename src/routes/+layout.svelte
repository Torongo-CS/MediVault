<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import { ModeWatcher } from "mode-watcher";
  import { fly } from "svelte/transition";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { afterNavigate, beforeNavigate } from '$app/navigation';
  import { onMount } from 'svelte';

  let { children } = $props();

  // Transition state
  let isTransitioning = $state(false);
  let currentPath = $state("");

  // Theme states
  let activeTheme = $state("theme-1"); 

  // Svelte 5 effect handles keeping the DOM attributes properly updated in step with your state
  $effect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", activeTheme);
    }
  });

  function handleThemeShortcut(event: KeyboardEvent) {
    // Look out for Alt key presses paired with number indexes 1 to 7
    if (event.altKey && event.key >= "1" && event.key <= "7") {
      event.preventDefault(); // Prevent accidental default operating system window bindings
      
      const themeId = `theme-${event.key}`;
      activeTheme = themeId;
      
      if (typeof document !== "undefined") {
        // 1. Check if dark mode is currently applied by ModeWatcher
        const wasDark = document.documentElement.classList.contains("dark");
        
        // 2. Safely apply the theme code
        document.documentElement.setAttribute("data-theme", themeId);
        
        // 3. Re-apply the dark class immediately if it was already active
        if (wasDark) {
          document.documentElement.classList.add("dark");
        }
        
        // Keep tracking the custom theme choice in storage
        localStorage.setItem("user-canvas-theme", themeId);
      }
    }
  }

  onMount(() => {
    // Load previously selected theme option upon initial canvas paint mounting loops
    const savedTheme = localStorage.getItem("user-canvas-theme");
    if (savedTheme) {
      activeTheme = savedTheme;
      document.documentElement.setAttribute("data-theme", savedTheme);
      
      // Make sure ModeWatcher's setting isn't clobbered on application boot
      const isDarkSaved = localStorage.getItem("mode-watcher-mode") === "dark" || 
                          document.documentElement.classList.contains("dark");
      if (isDarkSaved) {
        document.documentElement.classList.add("dark");
      }
    }
  });

  // Seed the initial path right away when the app boots up
  onMount(() => {
    currentPath = window.location.pathname;
  });

  beforeNavigate(() => {
    isTransitioning = true;
  });

  afterNavigate((nav) => {
    if (nav.to) {
      currentPath = nav.to.url.pathname;
    }

    // Held open long enough to cover the quick 500ms swipe completely
    setTimeout(() => {
      isTransitioning = false;
    }, 450); 
  });

  // Helper derived state to check if the user is on a auth page
  let isAuthPage = $derived(
    currentPath === '/login' || 
    currentPath === '/register' || 
    currentPath === '/' || 
    currentPath === '/forgot-password'
  );
</script>

<svelte:window onkeydown={handleThemeShortcut} />

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<!-- 
  The Solid Dark Orange Curtain Shutter 
  Slides in from left (-100% to 0) and continues straight off to the right (0 to 100%)
-->
{#if isTransitioning}
  <div 
    in:fly={{ x: '-100%', duration: 800 }}
    out:fly={{ x: '100%', duration: 650 }}
    class="page-transition-overlay"
  ></div>
{/if}

{#if isAuthPage}
  <main class="w-screen h-screen relative overflow-hidden">
    {@render children()}
  </main>
{:else}
  <Sidebar.Provider>
    <AppSidebar />
    <main class="flex-1 relative overflow-hidden">
      <div class="p-6 h-full w-full">
        {@render children()}
      </div>
    </main>
  </Sidebar.Provider>
{/if}