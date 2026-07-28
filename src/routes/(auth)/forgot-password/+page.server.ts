import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

// No email provider is wired up yet, so this endpoint is honest about it rather
// than pretending a reset link was sent. See the plan's "password reset" note.
export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();

		if (!email) {
			return fail(400, { email, error: 'Please enter your email address.' });
		}

		return {
			email,
			message:
				'Password reset is not available yet. Please contact an administrator to have your password reset.'
		};
	}
};
