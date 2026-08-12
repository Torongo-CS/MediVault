import { ConvexClient } from "convex/browser";
import { PUBLIC_CONVEX_URL } from "$env/static/public";

const convexUrl = PUBLIC_CONVEX_URL || "https://polite-kudu-186.convex.cloud";

export const convex = new ConvexClient(convexUrl);
