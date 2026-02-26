import { useState, useEffect, useCallback } from "react";
import type { IntervalUnit, RecurringSubTask, RecurringTaskTemplate } from "../types/recurring";
import { loadRecurringTemplates, saveRecurringTemplates } from "../lib/store";
import { getLogicalDate } from "../utils/recurringReset";

function addChildToTree(
  nodes: readonly RecurringSubTask[],
  parentId: string,
  child: RecurringSubTask,
): readonly RecurringSubTask[] {
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...n.children, child] }
      : { ...n, children: addChildToTree(n.children, parentId, child) },
  );
}

function removeFromTree(
  nodes: readonly RecurringSubTask[],
  targetId: string,
): readonly RecurringSubTask[] {
  return nodes
    .filter((n) => n.id !== targetId)
    .map((n) => ({ ...n, children: removeFromTree(n.children, targetId) }));
}

function updateInTree(
  nodes: readonly RecurringSubTask[],
  targetId: string,
  text: string,
): readonly RecurringSubTask[] {
  return nodes.map((n) =>
    n.id === targetId
      ? { ...n, text }
      : { ...n, children: updateInTree(n.children, targetId, text) },
  );
}

export function useRecurringTemplates() {
  const [templates, setTemplates] = useState<readonly RecurringTaskTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadRecurringTemplates().then((loaded) => {
      setTemplates(loaded);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveRecurringTemplates(templates);
    }
  }, [templates, isLoaded]);

  const addTemplate = useCallback((text: string, intervalValue: number, intervalUnit: IntervalUnit) => {
    const trimmed = text.trim();
    if (!trimmed || intervalValue < 1) return;

    const template: RecurringTaskTemplate = {
      id: crypto.randomUUID(),
      text: trimmed,
      intervalValue,
      intervalUnit,
      startDate: getLogicalDate(),
      enabled: true,
      createdAt: new Date().toISOString(),
      children: [],
    };

    setTemplates((prev) => [...prev, template]);
  }, []);

  const updateTemplate = useCallback(
    (id: string, updates: Partial<Pick<RecurringTaskTemplate, "text" | "intervalValue" | "intervalUnit" | "enabled">>) => {
      if (updates.intervalValue !== undefined && updates.intervalValue < 1) return;
      if (updates.text !== undefined && updates.text.trim() === "") return;

      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
    },
    [],
  );

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addSubTask = useCallback((templateId: string, parentSubId: string | null, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newSub: RecurringSubTask = { id: crypto.randomUUID(), text: trimmed, children: [] };

    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t;
        if (parentSubId === null) {
          return { ...t, children: [...t.children, newSub] };
        }
        return { ...t, children: addChildToTree(t.children, parentSubId, newSub) };
      }),
    );
  }, []);

  const deleteSubTask = useCallback((templateId: string, subTaskId: string) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, children: removeFromTree(t.children, subTaskId) }
          : t,
      ),
    );
  }, []);

  const updateSubTask = useCallback((templateId: string, subTaskId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, children: updateInTree(t.children, subTaskId, trimmed) }
          : t,
      ),
    );
  }, []);

  const moveTemplate = useCallback((id: string, direction: "up" | "down") => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = tmp;
      return next;
    });
  }, []);

  return {
    templates,
    isLoaded,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addSubTask,
    deleteSubTask,
    updateSubTask,
    moveTemplate,
  };
}
