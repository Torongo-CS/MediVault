import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "svelte/elements";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import type { Snippet } from "svelte";

export type WithElementRef<
	P = any,
	T extends HTMLElement = HTMLElement
> = Omit<P, "children"> & {
	ref?: T | null;
	children?: Snippet;
};
