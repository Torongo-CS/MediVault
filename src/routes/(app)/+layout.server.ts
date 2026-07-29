import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/session';
import { roleHome } from '$lib/roles';
import type { LayoutServerLoad } from './$types';

// This group holds the customer portal but also `/ai-assistant` and `/complaint`,
// which the pharmacist and admin sidebars both link to. So the guard here is
// "any signed-in user", and the customer-only pages are listed explicitly.
const CUSTOMER_ONLY = ['/dashboard', '/reservations', '/prescriptions', '/favorites', '/history'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);

	if (user.role !== 'customer' && CUSTOMER_ONLY.some((path) => url.pathname.startsWith(path))) {
		redirect(303, roleHome(user.role));
	}

	return { user };
};
