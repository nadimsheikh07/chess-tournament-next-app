"use client";

import axios from "axios";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AuthProfile,
  authApi,
  getAuthErrorMessage,
  type LoginCredentials,
  type RegistrationDetails,
} from "@/lib/auth-api";
import {
  AUTH_SESSION_CLEARED_EVENT,
  clearLegacyAuthTokens,
} from "@/lib/auth-storage";

type AuthContextValue = {
  user: AuthProfile | null;
  isLoading: boolean;
  initializationError: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthProfile>;
  register: (details: RegistrationDetails) => Promise<AuthProfile>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  refreshProfile: () => Promise<AuthProfile>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.getProfile();
    setUser(profile);
    return profile;
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setInitializationError(null);
      await authApi.login(credentials);
      return refreshProfile();
    },
    [refreshProfile],
  );

  const register = useCallback(
    async (details: RegistrationDetails) => {
      setInitializationError(null);
      await authApi.register(details);
      return refreshProfile();
    },
    [refreshProfile],
  );

  const refreshToken = useCallback(async () => {
    await authApi.refresh();
    await refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    try {
      if (user) {
        await authApi.logout();
      }
    } finally {
      clearLegacyAuthTokens();
      setUser(null);
      setInitializationError(null);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      clearLegacyAuthTokens();
      try {
        const profile = await authApi.getProfile();
        if (isMounted) {
          setUser(profile);
        }
      } catch (profileError) {
        if (isMounted) {
          if (!isUnauthorized(profileError)) {
            setInitializationError(
              getAuthErrorMessage(
                profileError,
                "Unable to restore your session.",
              ),
            );
          }
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const clearExpiredSession = () => setUser(null);
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, clearExpiredSession);
    return () => {
      window.removeEventListener(
        AUTH_SESSION_CLEARED_EVENT,
        clearExpiredSession,
      );
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      initializationError,
      login,
      register,
      logout,
      refreshToken,
      refreshProfile,
    }),
    [
      user,
      isLoading,
      initializationError,
      login,
      register,
      logout,
      refreshToken,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
