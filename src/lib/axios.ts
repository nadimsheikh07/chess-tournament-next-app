import axios from "axios";
import {
  type AuthTokens,
  clearAuthTokens,
  readAuthTokens,
  writeAuthTokens,
} from "@/lib/auth-storage";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _authRetry?: boolean;
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

const authEndpoints = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
];
let tokenRefreshPromise: Promise<AuthTokens> | null = null;

export function refreshAuthTokens(refreshToken: string): Promise<AuthTokens> {
  if (!tokenRefreshPromise) {
    tokenRefreshPromise = axios
      .post<AuthTokens>(
        "/api/auth/refresh",
        { refreshToken },
        { baseURL: api.defaults.baseURL },
      )
      .then(({ data }) => {
        writeAuthTokens(data);
        return data;
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (readAuthTokens()?.refreshToken === refreshToken) {
            clearAuthTokens();
          }
        }
        throw error;
      })
      .finally(() => {
        tokenRefreshPromise = null;
      });
  }

  return tokenRefreshPromise;
}

api.interceptors.request.use((config) => {
  const tokens = readAuthTokens();
  if (tokens) {
    config.headers.set(
      "Authorization",
      `${tokens.tokenType} ${tokens.accessToken}`,
    );
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      !axios.isAxiosError(error) ||
      error.response?.status !== 401 ||
      !error.config
    ) {
      throw error;
    }

    const config = error.config;
    const requestPath = config.url?.split("?")[0];
    if (
      config._authRetry ||
      authEndpoints.some((endpoint) => requestPath?.endsWith(endpoint))
    ) {
      throw error;
    }

    const tokens = readAuthTokens();
    if (!tokens) {
      throw error;
    }

    config._authRetry = true;
    const currentAuthorization = config.headers.get("Authorization");
    const currentTokenAuthorization = `${tokens.tokenType} ${tokens.accessToken}`;
    const nextTokens =
      currentAuthorization && currentAuthorization !== currentTokenAuthorization
        ? tokens
        : await refreshAuthTokens(tokens.refreshToken);

    config.headers.set(
      "Authorization",
      `${nextTokens.tokenType} ${nextTokens.accessToken}`,
    );
    return api.request(config);
  },
);

export default api;
