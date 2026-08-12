<!-- src/lib/components/shared/EmptyState.svelte -->
<script lang="ts">
  import type { Component } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { PackageOpen } from "lucide-svelte";

  interface Props {
    icon?: any;
    headline?: string;
    description?: string;
    ctaLabel?: string;
    ctaHref?: string;
    onCtaClick?: () => void;
  }

  let {
    icon: Icon = PackageOpen,
    headline = "Nothing here yet",
    description = "",
    ctaLabel,
    ctaHref,
    onCtaClick,
  }: Props = $props();
</script>

<div class="empty-state">
  <div class="empty-state__icon-wrap">
    <Icon class="h-8 w-8 text-muted-foreground" />
  </div>

  <h3 class="empty-state__title">{headline}</h3>

  {#if description}
    <p class="empty-state__desc">{description}</p>
  {/if}

  {#if ctaLabel}
    {#if ctaHref}
      <Button href={ctaHref} variant="default" class="font-semibold">{ctaLabel}</Button>
    {:else if onCtaClick}
      <Button onclick={onCtaClick} variant="default" class="font-semibold">{ctaLabel}</Button>
    {/if}
  {/if}
</div>
