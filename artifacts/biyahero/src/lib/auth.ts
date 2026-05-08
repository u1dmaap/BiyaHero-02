import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "biyahero_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function initAuth() {
  setAuthTokenGetter(() => getAuthToken());
}
