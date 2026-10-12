const ACCESS_TOKEN_KEY = "kingdom-of-chess.access-token";
const REFRESH_TOKEN_KEY = "kingdom-of-chess.refresh-token";
const TOKEN_TYPE_KEY = "kingdom-of-chess.token-type";
const EXPIRES_IN_KEY = "kingdom-of-chess.expires-in";
export const AUTH_SESSION_CLEARED_EVENT = "kingdom-of-chess:auth-session-cleared";

export function clearLegacyAuthTokens(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_TYPE_KEY);
  window.localStorage.removeItem(EXPIRES_IN_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
}
