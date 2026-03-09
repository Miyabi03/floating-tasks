import { invoke } from "@tauri-apps/api/core";
import type { GoogleTokens } from "../types/calendar";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

const REDIRECT_PORT = 19836;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

export { REDIRECT_PORT };

export function buildAuthUrl(forceConsent = false): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: forceConsent ? "consent" : "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  readonly access_token: string;
  readonly refresh_token: string | null;
  readonly expires_in: number;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<GoogleTokens> {
  const data = await invoke<TokenResponse>("google_exchange_token", {
    code,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokens> {
  const data = await invoke<TokenResponse>("google_refresh_token", {
    refreshToken,
    clientId: CLIENT_ID,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken ?? null,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export function isTokenExpired(tokens: GoogleTokens): boolean {
  return Date.now() >= tokens.expiresAt - 60_000;
}
