import { redirect } from '@sveltejs/kit';
import { api } from '../../../convex/_generated/api';
import { convexServer } from '$lib/server/convex';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);

	if (token) {
		try {
			await convexServer.mutation(api.auth.signOut, { token });
		} catch (err) {
			// Even if the row can't be deleted, clear the cookie — the user asked
			// to be logged out and that must always appear to work.
			console.error('[auth] signOut failed:', err);
		}
	}

	clearSessionCookie(cookies);
	redirect(303, '/login');
};
