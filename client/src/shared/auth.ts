export type UserRole = "admin" | "operator" | "viewer";

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

export function canManageStreams(role: UserRole | undefined): boolean {
  return role === "admin" || role === "operator";
}
