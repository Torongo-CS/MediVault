import { page } from '$app/state';
import type { Role, SessionUser } from '$lib/roles';

/**
 * Read-only view of the current session for components.
 *
 * The httpOnly cookie validated in `src/hooks.server.ts` is the source of truth
 * for access control — this exists only so components can render the signed-in
 * user. Nothing here grants any permission.
 *
 * It reads straight from `page.data` (populated by `+layout.server.ts`) rather
 * than holding module-level state: a mutable singleton would be shared across
 * concurrent requests during SSR and could leak one user's details into
 * another's response.
 */
class UserSession {
	get user(): SessionUser | null {
		return (page.data.user as SessionUser | null | undefined) ?? null;
	}

	get role(): Role {
		return this.user?.role ?? 'customer';
	}

	get name(): string {
		return this.user?.name ?? '';
	}

	get email(): string {
		return this.user?.email ?? '';
	}

	get isLoggedIn(): boolean {
		return this.user !== null;
	}
}

export const userSession = new UserSession();
