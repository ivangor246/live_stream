/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getAuthStatus,
  login as loginRequest,
  logout as logoutRequest,
  setupAuth as setupAuthRequest,
} from "../api/authApi.js";
import type { AuthCredentials, AuthUser } from "../shared/auth.js";

type AuthState = "checking" | "setup" | "unauthenticated" | "authenticated" | "error";

interface AuthContextValue {
  state: AuthState;
  user: AuthUser | null;
  error: unknown;
  refresh: () => Promise<void>;
  login: (credentials: AuthCredentials) => Promise<void>;
  setup: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setState("checking");
    setError(null);

    try {
      const authStatus = await getAuthStatus();

      setUser(authStatus.user);
      setState(
        authStatus.setupRequired
          ? "setup"
          : authStatus.authenticated
            ? "authenticated"
            : "unauthenticated",
      );
    } catch (requestError: unknown) {
      setError(requestError);
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Load auth state after the initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const login = useCallback(async (credentials: AuthCredentials): Promise<void> => {
    const response = await loginRequest(credentials);
    setUser(response.user);
    setState("authenticated");
    setError(null);
  }, []);

  const setup = useCallback(async (credentials: AuthCredentials): Promise<void> => {
    const response = await setupAuthRequest(credentials);
    setUser(response.user);
    setState("authenticated");
    setError(null);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setState("unauthenticated");
    }
  }, []);

  const contextValue = useMemo<AuthContextValue>(() => ({
    state,
    user,
    error,
    refresh,
    login,
    setup,
    logout,
  }), [error, login, logout, refresh, setup, state, user]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
