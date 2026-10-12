export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
};

const ACCESS_TOKEN_KEY = "kingdom-of-chess.access-token";
const REFRESH_TOKEN_KEY = "kingdom-of-chess.refresh-token";
const TOKEN_TYPE_KEY = "kingdom-of-chess.token-type";
const EXPIRES_IN_KEY = "kingdom-of-chess.expires-in";
export const AUTH_TOKENS_CHANGED_EVENT = "kingdom-of-chess:auth-tokens-changed";

export function readAuthTokens(): AuthTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    if (accessToken || refreshToken) {
      clearAuthTokens();
    }
    return null;
  }

  return {
    accessToken,
    refreshToken,
    tokenType: window.localStorage.getItem(TOKEN_TYPE_KEY) ?? "Bearer",
    expiresIn: window.localStorage.getItem(EXPIRES_IN_KEY) ?? "",
  };
}

export function writeAuthTokens(tokens: AuthTokens): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  window.localStorage.setItem(TOKEN_TYPE_KEY, tokens.tokenType);
  window.localStorage.setItem(EXPIRES_IN_KEY, tokens.expiresIn);
  window.dispatchEvent(new Event(AUTH_TOKENS_CHANGED_EVENT));
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_TYPE_KEY);
  window.localStorage.removeItem(EXPIRES_IN_KEY);
  window.dispatchEvent(new Event(AUTH_TOKENS_CHANGED_EVENT));
}
