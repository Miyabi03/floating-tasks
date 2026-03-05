import { useRef, useCallback } from "react";
import type { Task } from "../types/task";

const MAX_UNDO = 20;

export function useUndoHistory() {
  const stackRef = useRef<ReadonlyArray<readonly Task[]>>([]);

  const pushSnapshot = useCallback((tasks: readonly Task[]) => {
    const stack = stackRef.current;
    stackRef.current = [...stack.slice(-(MAX_UNDO - 1)), tasks];
  }, []);

  const popSnapshot = useCallback((): readonly Task[] | null => {
    const stack = stackRef.current;
    if (stack.length === 0) return null;
    const snapshot = stack[stack.length - 1];
    stackRef.current = stack.slice(0, -1);
    return snapshot;
  }, []);

  const canUndo = useCallback((): boolean => {
    return stackRef.current.length > 0;
  }, []);

  return { pushSnapshot, popSnapshot, canUndo };
}
