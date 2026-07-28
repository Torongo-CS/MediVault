import { fail, redirect } from '@sveltejs/kit';
import { api } from '../../../../convex/_generated/api';
import { convexServer } from '$lib/server/convex';
import { setSessionCookie } from '$lib/server/session';
import { authErrorMessage } from '$lib/server/authErrors';
import { roleHome } from '$lib/roles';
import type { Actions } from './$types';

const SIGNUP_ROLES = ['customer', 'pharmacist'] as const;
type SignUpRole = (typeof SIGNUP_ROLES)[number];

function isSignUpRole(value: string): value is SignUpRole {
	return (SIGNUP_ROLES as readonly string[]).includes(value);
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');
		const roleValue = String(data.get('role') ?? 'customer');

		// Echoed back on failure so the user doesn't retype everything.
		const values = { name, email, role: roleValue };

		if (!name) {
			return fail(400, { ...values, error: 'Please enter your full name.' });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { ...values, error: 'Please enter a valid email address.' });
		}
		if (password.length < 8) {
			return fail(400, { ...values, error: 'Password must be at least 8 characters.' });
		}
		if (password !== confirmPassword) {
			return fail(400, { ...values, error: 'Passwords do not match.' });
		}
		if (!isSignUpRole(roleValue)) {
			// Admins are created only by convex/seed.ts, never through this form.
			return fail(400, { ...values, error: 'Please choose a valid account type.' });
		}

		let result;
		try {
			result = await convexServer.action(api.auth.signUp, {
				name,
				email,
				password,
				role: roleValue
			});
		} catch (err) {
			return fail(400, { ...values, error: authErrorMessage(err) });
		}

		setSessionCookie(cookies, result.token, result.expiresAt);
		redirect(303, roleHome(result.user.role));
	}
};
