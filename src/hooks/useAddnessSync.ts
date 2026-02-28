import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AddnessGoal } from "../types/addness";
import { loadAddnessConnected, saveAddnessConnected } from "../lib/store";

const POLL_INTERVAL = 5 * 60 * 1000;
const INITIAL_FETCH_DELAY = 5_000;

interface UseAddnessSyncReturn {
  readonly goals: readonly AddnessGoal[];
  readonly isConnected: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
}

export function useAddnessSync(): UseAddnessSyncReturn {
  const [goals, setGoals] = useState<readonly AddnessGoal[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadAddnessConnected().then((connected) => {
      if (connected) {
        setIsConnected(true);
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
      await invoke("addness_fetch_data");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

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
    setIsConnected(false);
    setGoals([]);
    setError(null);
    await saveAddnessConnected(false);
  }, []);

  return { goals, isConnected, isLoading, error, connect, disconnect };
}
