<!-- src/lib/components/shared/QuantitySelector.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Minus, Plus } from "lucide-svelte";

  interface Props {
    value: number;
    min?: number;
    max?: number;
    onchange: (newValue: number) => void;
    compact?: boolean;
  }

  let { value, min = 1, max = 99, onchange, compact = false }: Props = $props();

  function decrement() {
    if (value > min) onchange(value - 1);
  }

  function increment() {
    if (value < max) onchange(value + 1);
  }
</script>

<div class="qty-selector">
  <Button
    variant="ghost"
    size="icon"
    class="{compact ? 'h-7 w-7' : 'h-8 w-8'} rounded-none border-r hover:bg-muted"
    onclick={decrement}
    disabled={value <= min}
  >
    <Minus class="{compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}" />
  </Button>

  <span
    class="{compact ? 'w-8 text-xs' : 'w-10 text-sm'} text-center font-semibold text-foreground select-none"
  >
    {value}
  </span>

  <Button
    variant="ghost"
    size="icon"
    class="{compact ? 'h-7 w-7' : 'h-8 w-8'} rounded-none border-l hover:bg-muted"
    onclick={increment}
    disabled={value >= max}
  >
    <Plus class="{compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}" />
  </Button>
</div>
