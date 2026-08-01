export type UserRole = "admin" | "operator" | "viewer";
export type InviteRole = "operator" | "viewer";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthStatus {
  setupRequired: boolean;
  authenticated: boolean;
  user: AuthUser | null;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AccountInvitation {
  id: string;
  role: InviteRole;
  createdAt: string;
  expiresAt: string;
}

export interface CreatedAccountInvitation extends AccountInvitation {
  token: string;
}

export function canManageStreams(role: UserRole | undefined): boolean {
  return role === "admin" || role === "operator";
}
