import axios from "axios";
import { clearLegacyAuthTokens } from "@/lib/auth-storage";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _authRetry?: boolean;
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

const authEndpoints = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
];
let tokenRefreshPromise: Promise<void> | null = null;

export function refreshAuthSession(): Promise<void> {
  if (!tokenRefreshPromise) {
    tokenRefreshPromise = axios
      .post(
        "/api/v1/auth/refresh",
        undefined,
        { baseURL: api.defaults.baseURL, withCredentials: true },
      )
      .then(() => undefined)
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearLegacyAuthTokens();
        }
        throw error;
      })
      .finally(() => {
        tokenRefreshPromise = null;
      });
  }

  return tokenRefreshPromise;
}

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

    config._authRetry = true;
    await refreshAuthSession();
    return api.request(config);
  },
);

export default api;
