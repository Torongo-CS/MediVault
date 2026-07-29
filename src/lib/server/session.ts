import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { roleHome, type Role, type SessionUser } from '$lib/roles';

export const SESSION_COOKIE = 'medivault_session';

/** Single place that defines the cookie flags, so they can never drift apart. */
export function setSessionCookie(cookies: Cookies, token: string, expiresAt: number) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Requires any signed-in user. Returns the user so callers get a non-null type. */
export function requireUser(user: SessionUser | null, url: URL): SessionUser {
	if (!user) {
		const redirectTo = url.pathname + url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}
	return user;
}

/**
 * Requires a signed-in user with one of `roles`. A wrong-role user is sent to
 * their own dashboard rather than to /login, which would look like a logout.
 */
export function requireRole(user: SessionUser | null, roles: Role[], url: URL): SessionUser {
	const current = requireUser(user, url);
	if (!roles.includes(current.role)) {
		redirect(303, roleHome(current.role));
	}
	return current;
}
