import { ConvexHttpClient } from 'convex/browser';
import { env } from '$env/dynamic/public';

const url = env.PUBLIC_CONVEX_URL;

if (!url) {
	// Thrown at import time on purpose: a missing deployment URL is a setup
	// error, and failing loudly here beats every auth call failing mysteriously.
	throw new Error(
		'PUBLIC_CONVEX_URL is not set. Run `bunx convex dev` and copy the deployment URL into .env.local (see .env.example).'
	);
}

/** Server-side Convex client. Never import this from a `.svelte` component. */
export const convexServer = new ConvexHttpClient(url);
