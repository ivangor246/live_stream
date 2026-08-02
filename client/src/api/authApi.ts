import { ApiError } from "./streamsApi.js";
import type {
  ApiErrorResponse,
} from "../shared/api.js";
import type {
  AccountInvitation,
  AuthCredentials,
  AuthResponse,
  AuthStatus,
  AuthUser,
  CreatedAccountInvitation,
  InviteRole,
  ManagedUser,
  UserRole,
} from "../shared/auth.js";

type ResponseValidator<T> = (value: unknown) => value is T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "operator" || value === "viewer";
}

function isInviteRole(value: unknown): value is InviteRole {
  return value === "operator" || value === "viewer";
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.username === "string" &&
    isUserRole(value.role) &&
    typeof value.createdAt === "string"
  );
}

function isManagedUser(value: unknown): value is ManagedUser {
  if (!isRecord(value)) {
    return false;
  }

  return isAuthUser(value) && typeof value.isActive === "boolean";
}

function isManagedUsers(value: unknown): value is ManagedUser[] {
  return Array.isArray(value) && value.every(isManagedUser);
}

function isAuthStatus(value: unknown): value is AuthStatus {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.setupRequired === "boolean" &&
    typeof value.authenticated === "boolean" &&
    (value.user === null || isAuthUser(value.user))
  );
}

function isAuthResponse(value: unknown): value is AuthResponse {
  return isRecord(value) && isAuthUser(value.user);
}

function isInvitation(value: unknown): value is AccountInvitation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isInviteRole(value.role) &&
    typeof value.createdAt === "string" &&
    typeof value.expiresAt === "string"
  );
}

function isInvitations(value: unknown): value is AccountInvitation[] {
  return Array.isArray(value) && value.every(isInvitation);
}

function isCreatedInvitation(value: unknown): value is CreatedAccountInvitation {
  if (!isRecord(value) || !isInvitation(value)) {
    return false;
  }

  return typeof (value as Record<string, unknown>).token === "string";
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

async function request<T>(
  path: string,
  validateResponse: ResponseValidator<T>,
  requestInit: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, requestInit);
  const responseBody: unknown = response.status === 204
    ? null
    : await response.json();

  if (!response.ok) {
    if (isApiErrorResponse(responseBody)) {
      throw new ApiError(
        response.status,
        responseBody.error.code,
        responseBody.error.message,
      );
    }

    throw new ApiError(
      response.status,
      "UNKNOWN_API_ERROR",
      `Request failed with status ${response.status}`,
    );
  }

  if (!validateResponse(responseBody)) {
    throw new ApiError(
      response.status,
      "INVALID_API_RESPONSE",
      "Server returned an invalid response",
    );
  }

  return responseBody;
}

function createCredentialsInit(
  credentials: AuthCredentials,
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  };
}

export function getAuthStatus(signal?: AbortSignal): Promise<AuthStatus> {
  return request<AuthStatus>("/api/auth/status", isAuthStatus, signal
    ? { signal }
    : undefined);
}

export function setupAuth(
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/api/auth/setup",
    isAuthResponse,
    createCredentialsInit(credentials),
  );
}

export function login(
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/api/auth/login",
    isAuthResponse,
    createCredentialsInit(credentials),
  );
}

export function logout(): Promise<null> {
  return request<null>(
    "/api/auth/logout",
    (value: unknown): value is null => value === null,
    { method: "POST" },
  );
}

export function getUsers(signal?: AbortSignal): Promise<ManagedUser[]> {
  return request<ManagedUser[]>(
    "/api/auth/users",
    isManagedUsers,
    signal ? { signal } : undefined,
  );
}

export function updateUser(
  userId: string,
  update: { isActive?: boolean; role?: UserRole },
): Promise<ManagedUser> {
  return request<ManagedUser>(
    `/api/auth/users/${encodeURIComponent(userId)}`,
    isManagedUser,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(update),
    },
  );
}

export function deleteUser(userId: string): Promise<null> {
  return request<null>(
    `/api/auth/users/${encodeURIComponent(userId)}`,
    (value: unknown): value is null => value === null,
    { method: "DELETE" },
  );
}

export function getInvitations(
  signal?: AbortSignal,
): Promise<AccountInvitation[]> {
  return request<AccountInvitation[]>(
    "/api/auth/invitations",
    isInvitations,
    signal ? { signal } : undefined,
  );
}

export function createInvitation(
  role: InviteRole,
): Promise<CreatedAccountInvitation> {
  return request<CreatedAccountInvitation>(
    "/api/auth/invitations",
    isCreatedInvitation,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    },
  );
}

export function deleteInvitation(invitationId: string): Promise<null> {
  const encodedInvitationId = encodeURIComponent(invitationId);

  return request<null>(
    `/api/auth/invitations/${encodedInvitationId}`,
    (value: unknown): value is null => value === null,
    { method: "DELETE" },
  );
}

export function getInvitation(
  token: string,
  signal?: AbortSignal,
): Promise<AccountInvitation> {
  return request<AccountInvitation>(
    `/api/auth/invitations/${encodeURIComponent(token)}`,
    isInvitation,
    signal ? { signal } : undefined,
  );
}

export function acceptInvitation(
  token: string,
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    `/api/auth/invitations/${encodeURIComponent(token)}/accept`,
    isAuthResponse,
    createCredentialsInit(credentials),
  );
}
