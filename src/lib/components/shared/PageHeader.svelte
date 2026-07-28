<!-- src/lib/components/shared/PageHeader.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft } from "lucide-svelte";

  interface Props {
    title: string;
    subtitle?: string;
    actions?: Snippet;
    showBack?: boolean;
    backHref?: string;
  }

  let { title, subtitle, actions, showBack = false, backHref }: Props = $props();

  function handleBack() {
    if (backHref) {
      window.location.href = backHref;
    } else {
      history.back();
    }
  }
</script>

<div class="page-header">
  {#if showBack}
    <div>
      {#if backHref}
        <Button
          href={backHref}
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2 h-8"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          Back
        </Button>
      {:else}
        <Button
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2 h-8"
          onclick={handleBack}
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          Back
        </Button>
      {/if}
    </div>
  {/if}

  <div class="page-header__row">
    <div>
      <h1 class="page-header__title">{title}</h1>
      {#if subtitle}
        <p class="page-header__subtitle">{subtitle}</p>
      {/if}
    </div>
    {#if actions}
      <div class="page-header__actions">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>
