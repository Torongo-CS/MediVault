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
	import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
	import { cn } from "$lib/utils.js";
	import { enhance } from "$app/forms";
	import { CircleAlert } from "lucide-svelte";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = HTMLAttributes<HTMLDivElement> & {
		form?: { name?: string; email?: string; role?: string; error?: string } | null;
	};

	let { class: className, form = null, ...restProps }: Props = $props();

	const id = $props.id();
	let submitting = $state(false);
	// Admin accounts are never self-registered — see convex/seed.ts.
	// `use:enhance` re-renders rather than remounting, so a failed submit keeps
	// whatever the user picked; no need to seed this from `form`.
	let role = $state("customer");
	let password = $state("");
	let confirmPassword = $state("");

	// Mirrors the server-side check so the user finds out before a round trip.
	let mismatch = $derived(confirmPassword.length > 0 && password !== confirmPassword);
</script>

<div class={cn("flex flex-col gap-6", className)} {...restProps}>
	<Card.Root class="overflow-hidden p-0">
		<Card.Content class="grid p-0 md:grid-cols-2">
			<form
				method="POST"
				class="p-6 md:p-8"
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
						<h1 class="text-2xl font-bold">Create an account</h1>
						<p class="text-muted-foreground text-balance">
							Join MediVault today
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

					<Field>
						<FieldLabel for="name-{id}">Full Name</FieldLabel>
						<Input
							id="name-{id}"
							name="name"
							type="text"
							placeholder="John Doe"
							autocomplete="name"
							value={form?.name ?? ""}
							required
						/>
					</Field>
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
						<FieldLabel>I am a…</FieldLabel>
						<RadioGroup.Root bind:value={role} name="role" class="grid gap-2 sm:grid-cols-2">
							<label
								for="role-customer-{id}"
								class="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50 has-[:checked]:border-primary"
							>
								<RadioGroup.Item value="customer" id="role-customer-{id}" class="mt-0.5" />
								<span class="grid gap-0.5">
									<span class="text-sm font-medium">Customer</span>
									<span class="text-muted-foreground text-xs">
										Search medicines and reserve orders
									</span>
								</span>
							</label>
							<label
								for="role-pharmacist-{id}"
								class="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50 has-[:checked]:border-primary"
							>
								<RadioGroup.Item value="pharmacist" id="role-pharmacist-{id}" class="mt-0.5" />
								<span class="grid gap-0.5">
									<span class="text-sm font-medium">Pharmacist</span>
									<span class="text-muted-foreground text-xs">
										Manage inventory and approve reservations
									</span>
								</span>
							</label>
						</RadioGroup.Root>
					</Field>

					<Field>
						<FieldLabel for="password-{id}">Password</FieldLabel>
						<Input
							id="password-{id}"
							name="password"
							type="password"
							autocomplete="new-password"
							bind:value={password}
							minlength={8}
							required
						/>
						<FieldDescription>At least 8 characters.</FieldDescription>
					</Field>
					<Field>
						<FieldLabel for="confirm-password-{id}">Confirm Password</FieldLabel>
						<Input
							id="confirm-password-{id}"
							name="confirmPassword"
							type="password"
							autocomplete="new-password"
							bind:value={confirmPassword}
							required
						/>
						{#if mismatch}
							<FieldDescription class="text-destructive">
								Passwords do not match.
							</FieldDescription>
						{/if}
					</Field>
					<Field>
						<Button type="submit" disabled={submitting || mismatch}>
							{submitting ? "Creating account…" : "Create Account"}
						</Button>
					</Field>
					<FieldDescription class="text-center">
						Already have an account? <a href="/login">Sign in</a>
					</FieldDescription>
				</FieldGroup>
			</form>
			<div class="bg-muted relative hidden md:block">
				<img
					src="/Images/signup_image.jpeg"
					alt="placeholder"
					class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
				/>
			</div>
		</Card.Content>
	</Card.Root>
	<FieldDescription class="px-6 text-center">
		By clicking continue, you agree to our <a href="##">Terms of Service</a> and
		<a href="##">Privacy Policy</a>.
	</FieldDescription>
</div>
