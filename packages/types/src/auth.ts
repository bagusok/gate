export type UserRole = "user" | "admin";

export interface AuthUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	image?: string | null;
	emailVerified: boolean;
}

export interface AuthSession {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
}
