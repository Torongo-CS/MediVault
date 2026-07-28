import { redirect } from '@sveltejs/kit';
import { roleHome } from '$lib/roles';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Already signed in? There is nothing to do on /login or /register.
	if (locals.user) {
		redirect(303, roleHome(locals.user.role));
	}
	return {};
};
