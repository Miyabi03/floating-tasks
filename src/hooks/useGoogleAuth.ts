import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { GoogleTokens } from "../types/calendar";
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  isTokenExpired,
  REDIRECT_PORT,
} from "../lib/googleAuth";
import {
  loadGoogleTokens,
  saveGoogleTokens,
  clearGoogleTokens,
} from "../lib/store";

interface UseGoogleAuthReturn {
  readonly isLoggedIn: boolean;
  readonly isLoading: boolean;
  readonly tokens: GoogleTokens | null;
  readonly signIn: () => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly getValidAccessToken: () => Promise<string | null>;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [tokens, setTokens] = useState<GoogleTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const savedTokens = await loadGoogleTokens();
        if (savedTokens) {
          if (isTokenExpired(savedTokens)) {
            try {
              const refreshed = await refreshAccessToken(
                savedTokens.refreshToken,
              );
              await saveGoogleTokens(refreshed);
              setTokens(refreshed);
            } catch {
              await clearGoogleTokens();
              setTokens(null);
            }
          } else {
            setTokens(savedTokens);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const signIn = useCallback(async () => {
    const authUrl = buildAuthUrl();

    const codePromise = new Promise<string>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Auth timed out"));
        }
      }, 120_000);

      listen<string>("google-auth-code", (event) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(event.payload);
        }
      });
    });

    await invoke("google_auth_start", {
      authUrl,
      redirectPort: REDIRECT_PORT,
    });

    const code = await codePromise;
    const newTokens = await exchangeCodeForTokens(code);
    await saveGoogleTokens(newTokens);
    setTokens(newTokens);
  }, []);

  const signOut = useCallback(async () => {
    await clearGoogleTokens();
    setTokens(null);
  }, []);

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;
    if (!isTokenExpired(tokens)) return tokens.accessToken;

    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      await saveGoogleTokens(refreshed);
      setTokens(refreshed);
      return refreshed.accessToken;
    } catch {
      await clearGoogleTokens();
      setTokens(null);
      return null;
    }
  }, [tokens]);

  return {
    isLoggedIn: tokens !== null,
    isLoading,
    tokens,
    signIn,
    signOut,
    getValidAccessToken,
  };
}
