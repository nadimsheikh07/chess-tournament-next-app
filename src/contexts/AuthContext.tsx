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
  type AuthTokens,
  authApi,
  getAuthErrorMessage,
  type LoginCredentials,
  type RegistrationDetails,
} from "@/lib/auth-api";
import {
  clearAuthTokens,
  readAuthTokens,
  writeAuthTokens,
} from "@/lib/auth-storage";

type AuthContextValue = {
  user: AuthProfile | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  initializationError: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (details: RegistrationDetails) => Promise<void>;
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
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  const updateTokens = useCallback((nextTokens: AuthTokens | null) => {
    if (nextTokens) {
      writeAuthTokens(nextTokens);
    } else {
      clearAuthTokens();
    }
    setTokens(nextTokens);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.getProfile();
    setUser(profile);
    return profile;
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setInitializationError(null);
      const nextTokens = await authApi.login(credentials);
      updateTokens(nextTokens);
      await refreshProfile();
    },
    [refreshProfile, updateTokens],
  );

  const register = useCallback(
    async (details: RegistrationDetails) => {
      setInitializationError(null);
      const nextTokens = await authApi.register(details);
      updateTokens(nextTokens);
      await refreshProfile();
    },
    [refreshProfile, updateTokens],
  );

  const refreshToken = useCallback(async () => {
    const currentTokens = tokens ?? readAuthTokens();
    if (!currentTokens?.refreshToken) {
      throw new Error("There is no refresh token available.");
    }

    let nextTokens: AuthTokens;
    try {
      nextTokens = await authApi.refresh(currentTokens.refreshToken);
    } catch (error) {
      if (isUnauthorized(error)) {
        updateTokens(null);
        setUser(null);
      }
      throw error;
    }
    updateTokens(nextTokens);
    await refreshProfile();
  }, [refreshProfile, tokens, updateTokens]);

  const logout = useCallback(async () => {
    try {
      if (tokens) {
        await authApi.logout();
      }
    } finally {
      updateTokens(null);
      setUser(null);
      setInitializationError(null);
    }
  }, [tokens, updateTokens]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedTokens = readAuthTokens();
      if (!storedTokens) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      setTokens(storedTokens);
      try {
        const profile = await authApi.getProfile();
        if (isMounted) {
          setUser(profile);
        }
      } catch (profileError) {
        if (!isUnauthorized(profileError)) {
          if (isMounted) {
            setInitializationError(
              getAuthErrorMessage(profileError, "Unable to load your profile."),
            );
          }
          return;
        }

        let renewedTokens: AuthTokens;
        try {
          renewedTokens = await authApi.refresh(storedTokens.refreshToken);
        } catch (refreshError) {
          if (isMounted) {
            if (isUnauthorized(refreshError)) {
              clearAuthTokens();
              setTokens(null);
              setUser(null);
            }
            setInitializationError(
              getAuthErrorMessage(
                refreshError,
                "Unable to refresh your session.",
              ),
            );
          }
          return;
        }

        if (isMounted) {
          writeAuthTokens(renewedTokens);
          setTokens(renewedTokens);
        }

        try {
          const profile = await authApi.getProfile();
          if (isMounted) {
            setUser(profile);
          }
        } catch (profileErrorAfterRefresh) {
          if (isMounted) {
            setInitializationError(
              getAuthErrorMessage(
                profileErrorAfterRefresh,
                "Unable to load your profile.",
              ),
            );
          }
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

  const value = useMemo(
    () => ({
      user,
      tokens,
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
      tokens,
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
