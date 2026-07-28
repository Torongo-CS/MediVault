<!-- src/lib/components/shared/PharmacyCard.svelte -->
<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Heart, MapPin, Phone, ArrowRight } from "lucide-svelte";

  interface Props {
    id: string;
    name: string;
    address: string;
    phone: string;
    description?: string;
    imageUrl?: string;
    isFavorite?: boolean;
    onToggleFavorite?: (id: string) => void;
    compact?: boolean;
  }

  let {
    id,
    name,
    address,
    phone,
    description,
    imageUrl,
    isFavorite = false,
    onToggleFavorite,
    compact = false,
  }: Props = $props();

  function getGradient(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 65%, 55%), hsl(${h2}, 75%, 45%))`;
  }

  function getInitials(name: string): string {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
</script>

{#if compact}
  <a href="/pharmacy/{id}" class="pharm-card--compact group">
    <div
      class="pharm-card__banner h-24"
      style:background={imageUrl ? `url(${imageUrl}) center/cover` : getGradient(name)}
    >
      <span class="pharm-card__initials text-2xl">{getInitials(name)}</span>
    </div>
    <div class="pharm-card__body">
      <h3 class="pharm-card__name text-sm mb-0.5">{name}</h3>
      <p class="text-[11px] text-muted-foreground truncate">{address}</p>
    </div>
  </a>
{:else}
  <a href="/pharmacy/{id}" class="pharm-card--full group">
    <Card.Root class="overflow-hidden border bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-300">
      <div
        class="pharm-card__banner h-32"
        style:background={imageUrl ? `url(${imageUrl}) center/cover` : getGradient(name)}
      >
        <span class="pharm-card__initials text-3xl">{getInitials(name)}</span>

        {#if onToggleFavorite}
          <button
            class="pharm-card__fav-btn"
            onclick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(id);
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              class="h-4 w-4 transition-all duration-200 {isFavorite
                ? 'fill-red-500 text-red-500 scale-110'
                : 'text-white'}"
            />
          </button>
        {/if}
      </div>

      <Card.Content class="p-4">
        <h3 class="pharm-card__name text-base mb-1.5">{name}</h3>

        {#if description}
          <p class="pharm-card__desc">{description}</p>
        {/if}

        <div class="pharm-card__meta-list">
          <div class="meta-row">
            <MapPin class="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span class="truncate">{address}</span>
          </div>
          <div class="meta-row">
            <Phone class="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>{phone}</span>
          </div>
        </div>

        <div class="pharm-card__cta">
          View Store
          <ArrowRight class="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Card.Content>
    </Card.Root>
  </a>
{/if}
