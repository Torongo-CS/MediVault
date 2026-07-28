import type { Handle } from '@sveltejs/kit';
import { api } from '../convex/_generated/api';
import { convexServer } from '$lib/server/convex';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/session';
import type { SessionUser } from '$lib/roles';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = null;

	if (token) {
		try {
			const user = (await convexServer.query(api.auth.getSession, {
				token
			})) as SessionUser | null;

			if (user) {
				event.locals.user = user;
			} else {
				// Expired, revoked, or belongs to a deactivated account — stop the
				// browser from sending it on every subsequent request.
				clearSessionCookie(event.cookies);
			}
		} catch (err) {
			// Convex being unreachable must degrade to "logged out", not a 500 on
			// every route including the public landing page.
			console.error('[auth] session lookup failed:', err);
		}
	}

	return resolve(event);
};
