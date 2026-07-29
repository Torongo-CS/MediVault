export type Role = 'customer' | 'pharmacist' | 'admin';

export type SessionUser = {
	_id: string;
	name: string;
	email: string;
	role: Role;
	imageUrl?: string;
	isActive: boolean;
};

export const ROLES: Role[] = ['customer', 'pharmacist', 'admin'];

export function isRole(value: unknown): value is Role {
	return typeof value === 'string' && (ROLES as string[]).includes(value);
}

/** The landing route for a role — used after login, register, and wrong-role redirects. */
export function roleHome(role: Role): string {
	switch (role) {
		case 'admin':
			return '/admin/dashboard';
		case 'pharmacist':
			return '/pharmacist/dashboard';
		default:
			return '/dashboard';
	}
}

export function roleLabel(role: Role): string {
	switch (role) {
		case 'admin':
			return 'Admin';
		case 'pharmacist':
			return 'Pharmacist';
		default:
			return 'Customer';
	}
}
