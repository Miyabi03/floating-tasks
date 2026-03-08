import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AddnessGoal } from "../types/addness";
import {
  loadAddnessConnected,
  saveAddnessConnected,
} from "../lib/store";
import extractJs from "../../scripts/addness/extract.js?raw";
import toggleJs from "../../scripts/addness/toggle.js?raw";

const POLL_INTERVAL = 60 * 1000;
const INITIAL_FETCH_DELAY = 5_000;

interface UseAddnessSyncReturn {
  readonly goals: readonly AddnessGoal[];
  readonly isConnected: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly toggleGoal: (title: string) => Promise<void>;
}

export function useAddnessSync(): UseAddnessSyncReturn {
  const [goals, setGoals] = useState<readonly AddnessGoal[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const windowReadyRef = useRef(false);

  // Ensure WebView exists, creating it if needed (hidden re-creation on restart)
  const ensureWindow = useCallback(async () => {
    if (windowReadyRef.current) return;
    try {
      await invoke("addness_start_sync");
      windowReadyRef.current = true;
    } catch {
      // Window creation failed
    }
  }, []);

  // Restore connection + re-create WebView on app startup
  useEffect(() => {
    loadAddnessConnected().then(async (connected) => {
      if (connected) {
        setIsConnected(true);
        try {
          await invoke("addness_start_sync");
          windowReadyRef.current = true;
          setTimeout(async () => {
            invoke("addness_fetch_data", { jsCode: extractJs }).catch(() => {});
          }, INITIAL_FETCH_DELAY);
        } catch {
          // Failed to restore sync window
        }
      }
    });
  }, []);

  useEffect(() => {
    const unlisten = listen<string>("addness-sync-data", (event) => {
      try {
        const parsed: AddnessGoal[] = JSON.parse(event.payload);
        setGoals(parsed);
        setError(null);
      } catch {
        setError("Failed to parse Addness data");
      }
      setIsLoading(false);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      await ensureWindow();
      await invoke("addness_fetch_data", { jsCode: extractJs });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }, [ensureWindow]);

  useEffect(() => {
    if (!isConnected) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(fetchData, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isConnected, fetchData]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await invoke("addness_start_sync");
      windowReadyRef.current = true;
      setIsConnected(true);
      await saveAddnessConnected(true);
      setTimeout(() => {
        fetchData();
      }, INITIAL_FETCH_DELAY);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }, [fetchData]);

  const disconnect = useCallback(async () => {
    try {
      await invoke("addness_close_sync");
    } catch {
      // Window may already be closed
    }
    windowReadyRef.current = false;
    setIsConnected(false);
    setGoals([]);
    setError(null);
    await saveAddnessConnected(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!isConnected) return;
    setIsLoading(true);
    setError(null);
    await fetchData();
  }, [isConnected, fetchData]);

  const toggleGoal = useCallback(async (goalTitle: string) => {
    const jsCode = `window.__ADDNESS_TOGGLE_TARGET__=${JSON.stringify(goalTitle)};\n${toggleJs}`;
    try {
      await invoke("addness_eval_js", { jsCode });
    } catch {
      // WebViewが閉じている場合 — 再作成してリトライ
      windowReadyRef.current = false;
      try {
        await invoke("addness_start_sync");
        windowReadyRef.current = true;
        await new Promise((resolve) => setTimeout(resolve, INITIAL_FETCH_DELAY));
        await invoke("addness_eval_js", { jsCode });
      } catch {
        // 再作成にも失敗
      }
    }
  }, []);

  return { goals, isConnected, isLoading, error, connect, disconnect, refresh, toggleGoal };
}
