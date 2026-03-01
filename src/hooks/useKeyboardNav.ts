import { useState, useCallback, useMemo } from "react";
import type { Task, TaskStatus } from "../types/task";
import { buildVisibleTaskList } from "../utils/taskTree";

interface UseKeyboardNavOptions {
  readonly tasks: readonly Task[];
  readonly collapsedIds: ReadonlySet<string>;
  readonly onAdvanceStatus: (id: string) => void;
  readonly onSetStatus: (id: string, status: TaskStatus) => void;
  readonly onDelete: (id: string) => void;
  readonly onIndentTask: (id: string) => void;
  readonly onOutdentTask: (id: string) => void;
  readonly onMoveTask: (taskId: string, newIndex: number) => void;
}

export function useKeyboardNav({
  tasks,
  collapsedIds,
  onAdvanceStatus,
  onSetStatus,
  onDelete,
  onIndentTask,
  onOutdentTask,
  onMoveTask,
}: UseKeyboardNavOptions) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [subInputTaskId, setSubInputTaskId] = useState<string | null>(null);

  const visibleIds = useMemo(
    () => buildVisibleTaskList(tasks, collapsedIds),
    [tasks, collapsedIds]
  );

  const selectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
    setEditingTaskId(null);
    setSubInputTaskId(null);
  }, []);

  const startEditing = useCallback((id: string) => {
    setEditingTaskId(id);
    setSubInputTaskId(null);
  }, []);

  const showSubInput = useCallback((id: string) => {
    setSubInputTaskId(id);
    setEditingTaskId(null);
    setSelectedTaskId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskId(null);
    setEditingTaskId(null);
    setSubInputTaskId(null);
  }, []);

  const clearSubInput = useCallback(() => {
    setSubInputTaskId(null);
  }, []);

  const clearEditing = useCallback(() => {
    setEditingTaskId(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingTaskId || subInputTaskId) return;

      if (visibleIds.length === 0) return;

      const currentIdx = selectedTaskId
        ? visibleIds.indexOf(selectedTaskId)
        : -1;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && selectedTaskId) {
            const task = tasks.find((t) => t.id === selectedTaskId);
            if (task) {
              const siblings = tasks.filter((t) => t.parentId === task.parentId);
              const sibIdx = siblings.findIndex((t) => t.id === selectedTaskId);
              if (sibIdx < siblings.length - 1) {
                onMoveTask(selectedTaskId, sibIdx + 1);
              }
            }
            break;
          }
          const nextIdx = currentIdx === -1 || currentIdx >= visibleIds.length - 1
            ? 0
            : currentIdx + 1;
          setSelectedTaskId(visibleIds[nextIdx]);
          setEditingTaskId(null);
          setSubInputTaskId(null);
          break;
        }

        case "ArrowUp": {
          e.preventDefault();
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && selectedTaskId) {
            const task = tasks.find((t) => t.id === selectedTaskId);
            if (task) {
              const siblings = tasks.filter((t) => t.parentId === task.parentId);
              const sibIdx = siblings.findIndex((t) => t.id === selectedTaskId);
              if (sibIdx > 0) {
                onMoveTask(selectedTaskId, sibIdx - 1);
              }
            }
            break;
          }
          const prevIdx = currentIdx <= 0
            ? visibleIds.length - 1
            : currentIdx - 1;
          setSelectedTaskId(visibleIds[prevIdx]);
          setEditingTaskId(null);
          setSubInputTaskId(null);
          break;
        }

        case "Enter": {
          e.preventDefault();
          if (selectedTaskId && visibleIds.includes(selectedTaskId)) {
            setSubInputTaskId(selectedTaskId);
            setEditingTaskId(null);
          }
          break;
        }

        case "Tab": {
          e.preventDefault();
          if (!selectedTaskId || !visibleIds.includes(selectedTaskId)) break;
          if (e.shiftKey) {
            onOutdentTask(selectedTaskId);
          } else {
            onIndentTask(selectedTaskId);
          }
          break;
        }

        case " ": {
          e.preventDefault();
          if (selectedTaskId && visibleIds.includes(selectedTaskId)) {
            const task = tasks.find((t) => t.id === selectedTaskId);
            if (!task) break;
            // pending → in_progress, in_progress → completed (keyboard skips popup),
            // completed/interrupted → pending
            if (task.status === "in_progress") {
              onSetStatus(selectedTaskId, "completed");
            } else {
              onAdvanceStatus(selectedTaskId);
            }
          }
          break;
        }

        case "Delete":
        case "Backspace": {
          e.preventDefault();
          if (selectedTaskId && visibleIds.includes(selectedTaskId)) {
            const nextIdx = visibleIds.indexOf(selectedTaskId);
            onDelete(selectedTaskId);
            const remaining = visibleIds.filter((id) => id !== selectedTaskId);
            if (remaining.length > 0) {
              const newIdx = Math.min(nextIdx, remaining.length - 1);
              setSelectedTaskId(remaining[newIdx]);
            } else {
              setSelectedTaskId(null);
            }
          }
          break;
        }

        case "Escape": {
          e.preventDefault();
          clearSelection();
          break;
        }
      }
    },
    [
      visibleIds,
      selectedTaskId,
      editingTaskId,
      subInputTaskId,
      tasks,
      onAdvanceStatus,
      onSetStatus,
      onDelete,
      onIndentTask,
      onOutdentTask,
      onMoveTask,
      clearSelection,
    ]
  );

  return {
    selectedTaskId,
    editingTaskId,
    subInputTaskId,
    handleKeyDown,
    selectTask,
    startEditing,
    showSubInput,
    clearSelection,
    clearSubInput,
    clearEditing,
  };
}
