import { useState, useCallback } from "react";

export function useExpandedState() {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set());

  const isExpanded = useCallback(
    (id: string) => !collapsedIds.has(id),
    [collapsedIds]
  );

  const toggleExpanded = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandTask = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { collapsedIds, isExpanded, toggleExpanded, expandTask };
}
