import { ConvexError } from 'convex/values';

const MESSAGES: Record<string, string> = {
	EMAIL_TAKEN: 'An account with that email already exists.',
	// Deliberately identical for unknown-email and wrong-password.
	INVALID_CREDENTIALS: 'Invalid email or password.',
	ACCOUNT_INACTIVE: 'This account has been deactivated. Please contact an administrator.',
	NAME_REQUIRED: 'Please enter your full name.',
	PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.'
};

/** Maps a ConvexError code thrown by convex/auth.ts to a message for the UI. */
export function authErrorMessage(err: unknown): string {
	if (err instanceof ConvexError) {
		const data = err.data as { code?: string } | string;
		const code = typeof data === 'object' && data !== null ? data.code : undefined;
		if (code && code in MESSAGES) return MESSAGES[code];
	}
	console.error('[auth] unexpected error:', err);
	return 'Something went wrong. Please try again.';
}
