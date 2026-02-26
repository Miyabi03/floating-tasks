import { useEffect, useRef } from "react";
import type { Task } from "../types/task";
import type { RecurringTaskTemplate } from "../types/recurring";
import { loadResetState, saveResetState } from "../lib/store";
import { getLogicalDate, isResetNeeded, performReset } from "../utils/recurringReset";

const CHECK_INTERVAL_MS = 60_000;

export function useRecurringReset(
  tasks: readonly Task[],
  templates: readonly RecurringTaskTemplate[],
  tasksLoaded: boolean,
  templatesLoaded: boolean,
  resetTasks: (newTasks: readonly Task[]) => void,
) {
  const hasRunInitial = useRef(false);

  useEffect(() => {
    if (!tasksLoaded || !templatesLoaded) return;

    async function checkAndReset() {
      const state = await loadResetState();
      const now = new Date();

      if (!isResetNeeded(state?.lastResetDate ?? null, now)) return;

      const newTasks = performReset(tasks, templates, now);
      resetTasks(newTasks);
      await saveResetState({ lastResetDate: getLogicalDate(now) });
    }

    if (!hasRunInitial.current) {
      hasRunInitial.current = true;
      checkAndReset();
    }

    const timer = setInterval(checkAndReset, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tasks, templates, tasksLoaded, templatesLoaded, resetTasks]);
}
