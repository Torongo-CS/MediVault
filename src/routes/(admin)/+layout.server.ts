import { requireRole } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	return { user: requireRole(locals.user, ['admin'], url) };
};
