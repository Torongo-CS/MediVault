import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Snippet } from "svelte";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithElementRef<
  P = any,
  T extends HTMLElement = HTMLElement
> = Omit<P, "children"> & {
  ref?: T | null;
  children?: Snippet;
};

export type WithoutChild<T> = T extends any ? Omit<T, "child"> : never;
export type WithoutChildren<T> = T extends any ? Omit<T, "children"> : never;
export type WithoutChildrenOrChild<T> = T extends any ? Omit<T, "children" | "child"> : never;
