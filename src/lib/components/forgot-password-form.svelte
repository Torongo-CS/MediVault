<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import {
    FieldGroup,
    Field,
    FieldLabel,
    FieldDescription,
  } from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import { enhance } from "$app/forms";
  import { CircleAlert, Info } from "lucide-svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLDivElement> & {
    form?: { email?: string; error?: string; message?: string } | null;
  };

  let { class: className, form = null, ...restProps }: Props = $props();

  const id = $props.id();
  let submitting = $state(false);
</script>

<div class={cn("flex flex-col gap-6", className)} {...restProps}>
  <Card.Root class="overflow-hidden p-0">
    <Card.Content class="grid p-0 min-h-[600px] md:grid-cols-2">
      <form
        method="POST"
        class="flex flex-col justify-center p-6 md:p-8"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            await update();
            submitting = false;
          };
        }}
      >
        <FieldGroup>
          <div class="flex flex-col items-center gap-2 text-center">
            <h1 class="text-2xl font-bold">Reset your password</h1>
            <p class="text-muted-foreground text-balance">
              Enter your email address and we will help you get back into your
              account.
            </p>
          </div>

          {#if form?.error}
            <div
              role="alert"
              class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
              <span>{form.error}</span>
            </div>
          {/if}

          {#if form?.message}
            <div
              role="status"
              class="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm"
            >
              <Info class="mt-0.5 h-4 w-4 shrink-0" />
              <span>{form.message}</span>
            </div>
          {/if}

          <Field>
            <FieldLabel for="email-{id}">Email</FieldLabel>
            <Input
              id="email-{id}"
              name="email"
              type="email"
              placeholder="m@example.com"
              autocomplete="email"
              value={form?.email ?? ""}
              required
            />
          </Field>
          <Field>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Request Password Reset"}
            </Button>
          </Field>
          <FieldDescription class="text-center">
            Remember your password? <a href="/login">Sign in</a>
          </FieldDescription>
        </FieldGroup>
      </form>
      <div class="relative hidden overflow-hidden md:block">
        <img
          src="/Images/login_image.jpg"
          alt="Login illustration"
          class="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
    </Card.Content>
  </Card.Root>
  <FieldDescription class="px-6 text-center">
    By clicking continue, you agree to our <a href="##">Terms of Service</a> and
    <a href="##">Privacy Policy</a>.
  </FieldDescription>
</div>
