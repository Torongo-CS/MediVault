import { fail, redirect } from '@sveltejs/kit';
import { api } from '../../../../convex/_generated/api';
import { convexServer } from '$lib/server/convex';
import { setSessionCookie } from '$lib/server/session';
import { authErrorMessage } from '$lib/server/authErrors';
import { roleHome } from '$lib/roles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return { redirectTo: url.searchParams.get('redirectTo') ?? '' };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const redirectTo = String(data.get('redirectTo') ?? '');

		if (!email || !password) {
			return fail(400, { email, error: 'Please enter both your email and password.' });
		}

		let result;
		try {
			result = await convexServer.action(api.auth.signIn, { email, password });
		} catch (err) {
			return fail(400, { email, error: authErrorMessage(err) });
		}

		setSessionCookie(cookies, result.token, result.expiresAt);

		// Only honour same-origin relative paths — never an attacker-supplied URL.
		const target =
			redirectTo.startsWith('/') && !redirectTo.startsWith('//')
				? redirectTo
				: roleHome(result.user.role);

		redirect(303, target);
	}
};
