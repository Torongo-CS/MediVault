import { json, type RequestHandler } from '@sveltejs/kit';
import { api } from '../../../../../convex/_generated/api';
import { convexServer } from '$lib/server/convex';
import { setSessionCookie } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email } = await request.json();
    if (!email) {
      return json({ error: 'Email required' }, { status: 400 });
    }

    const result = await convexServer.action(api.auth.signIn, {
      email,
      password: 'password123',
    });

    setSessionCookie(cookies, result.token, result.expiresAt);
    return json({ success: true, user: result.user });
  } catch (err: any) {
    return json({ error: err.message || 'Failed to switch pharmacy account' }, { status: 500 });
  }
};
