import { useState, useEffect, useCallback } from "react";
import type { Task } from "../types/task";
import type { CalendarEvent } from "../types/calendar";
import type { AddnessGoal } from "../types/addness";
import { loadTasks, saveTasks } from "../lib/store";
import {
  indentTask as indentTaskTree,
  outdentTask as outdentTaskTree,
  getDescendantIds,
  moveTaskInArray,
  sortByCompletion,
} from "../utils/taskTree";

function formatEventTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildEventText(event: CalendarEvent): string {
  const time = event.isAllDay
    ? "All day"
    : `${formatEventTime(event.start)} – ${formatEventTime(event.end)}`;
  return `${time}  ${event.summary}`;
}

export function useTasks() {
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTasks().then((loaded) => {
      setTasks(loaded);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveTasks(tasks);
    }
  }, [tasks, isLoaded]);

  const addTask = useCallback((text: string, parentId: string | null = null) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
      parentId,
    };

    setTasks((prev) => [...prev, newTask]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;

      const newCompleted = !target.completed;
      const descendantIds = new Set(getDescendantIds(prev, id));
      const idsToUpdate = new Set<string>([id, ...descendantIds]);

      if (newCompleted) {
        // Auto-complete ancestors whose children are all now completed
        const completedMap = new Map(prev.map((t) => [t.id, t.completed]));
        for (const did of idsToUpdate) {
          completedMap.set(did, true);
        }
        let currentId = target.parentId;
        while (currentId) {
          const parent = prev.find((t) => t.id === currentId);
          if (!parent) break;
          const children = prev.filter((t) => t.parentId === currentId);
          if (children.every((c) => completedMap.get(c.id) === true)) {
            idsToUpdate.add(currentId);
            completedMap.set(currentId, true);
            currentId = parent.parentId;
          } else {
            break;
          }
        }
      } else {
        // Uncomplete all completed ancestors
        let currentId = target.parentId;
        while (currentId) {
          const parent = prev.find((t) => t.id === currentId);
          if (!parent) break;
          if (parent.completed) {
            idsToUpdate.add(currentId);
          }
          currentId = parent.parentId;
        }
      }

      return prev.map((task) => {
        if (idsToUpdate.has(task.id)) return { ...task, completed: newCompleted };
        return task;
      });
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const descendantIds = new Set(getDescendantIds(prev, id));
      return prev.filter((t) => t.id !== id && !descendantIds.has(t.id));
    });
  }, []);

  const getRootTasks = useCallback(() => {
    const roots = tasks.filter((t) => t.parentId === null);
    return sortByCompletion(roots, tasks);
  }, [tasks]);

  const getChildren = useCallback(
    (parentId: string) => {
      const children = tasks.filter((t) => t.parentId === parentId);
      return sortByCompletion(children, tasks);
    },
    [tasks],
  );

  const updateTask = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t))
    );
  }, []);

  const indentTask = useCallback((id: string) => {
    setTasks((prev) => indentTaskTree(prev, id));
  }, []);

  const outdentTask = useCallback((id: string) => {
    setTasks((prev) => outdentTaskTree(prev, id));
  }, []);

  const moveTask = useCallback((taskId: string, newIndex: number) => {
    setTasks((prev) => moveTaskInArray(prev, taskId, newIndex));
  }, []);

  const syncCalendarEvents = useCallback(
    (events: readonly CalendarEvent[]) => {
      // Sort events by start time (all-day first, then chronological)
      const sortedEvents = [...events].sort((a, b) => {
        if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
        return a.start.localeCompare(b.start);
      });

      // Build a map of event ID → sort index for reordering tasks
      const eventSortOrder = new Map(
        sortedEvents.map((e, i) => [`gcal-evt-${e.id}`, i]),
      );

      setTasks((prev) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todaySectionId = `gcal-today-${todayStr}`;

        // Remove old day sections and their children
        const staleSectionIds = new Set(
          prev
            .filter(
              (t) =>
                t.calendarEventId?.startsWith("gcal-today-") &&
                t.calendarEventId !== todaySectionId,
            )
            .map((t) => t.id),
        );
        let next = prev.filter(
          (t) =>
            !staleSectionIds.has(t.id) &&
            !(t.parentId && staleSectionIds.has(t.parentId)),
        );

        // Find or create today section
        const hasSection = next.some(
          (t) => t.calendarEventId === todaySectionId,
        );
        if (!hasSection) {
          const section: Task = {
            id: todaySectionId,
            text: "Today",
            completed: false,
            createdAt: new Date().toISOString(),
            parentId: null,
            calendarEventId: todaySectionId,
          };
          next = [section, ...next];
        }

        // Build map of existing event tasks
        const existingByEventId = new Map(
          next
            .filter(
              (t) =>
                t.parentId === todaySectionId &&
                t.calendarEventId?.startsWith("gcal-evt-"),
            )
            .map((t) => [t.calendarEventId!, t]),
        );

        const incomingIds = new Set(
          sortedEvents.map((e) => `gcal-evt-${e.id}`),
        );

        // Remove tasks for events that no longer exist
        next = next.filter(
          (t) =>
            !(
              t.parentId === todaySectionId &&
              t.calendarEventId?.startsWith("gcal-evt-") &&
              !incomingIds.has(t.calendarEventId)
            ),
        );

        // Upsert event tasks
        for (const event of sortedEvents) {
          const eventTaskId = `gcal-evt-${event.id}`;
          const text = buildEventText(event);
          const existing = existingByEventId.get(eventTaskId);

          if (existing) {
            if (existing.text !== text) {
              next = next.map((t) =>
                t.id === existing.id ? { ...t, text } : t,
              );
            }
          } else {
            next = [
              ...next,
              {
                id: eventTaskId,
                text,
                completed: false,
                createdAt: new Date().toISOString(),
                parentId: todaySectionId,
                calendarEventId: eventTaskId,
              },
            ];
          }
        }

        // Reorder calendar event tasks by start time
        const calendarTasks: Task[] = [];
        const otherTasks: Task[] = [];
        for (const t of next) {
          if (t.parentId === todaySectionId && t.calendarEventId?.startsWith("gcal-evt-")) {
            calendarTasks.push(t);
          } else {
            otherTasks.push(t);
          }
        }
        calendarTasks.sort((a, b) => {
          const orderA = eventSortOrder.get(a.calendarEventId!) ?? Infinity;
          const orderB = eventSortOrder.get(b.calendarEventId!) ?? Infinity;
          return orderA - orderB;
        });

        // Re-insert sorted calendar tasks right after the today section
        const sectionIdx = otherTasks.findIndex((t) => t.id === todaySectionId);
        return [
          ...otherTasks.slice(0, sectionIdx + 1),
          ...calendarTasks,
          ...otherTasks.slice(sectionIdx + 1),
        ];
      });
    },
    [],
  );

  const syncAddnessGoals = useCallback(
    (goals: readonly AddnessGoal[]) => {
      setTasks((prev) => {
        const sectionMarker = "addness-section";
        const sectionId = "addness-section";

        // Find or create Addness section
        const hasSection = prev.some((t) => t.addnessGoalId === sectionMarker);
        let next = hasSection
          ? [...prev]
          : [
              ...prev,
              {
                id: sectionId,
                text: "Addness",
                completed: false,
                createdAt: new Date().toISOString(),
                parentId: null,
                addnessGoalId: sectionMarker,
              } as Task,
            ];

        // Find the section task's actual id
        const section = next.find((t) => t.addnessGoalId === sectionMarker);
        if (!section) return prev;
        const sectionTaskId = section.id;

        // Build map of ALL existing addness goal tasks (any depth)
        const existingByGoalId = new Map(
          next
            .filter((t) => t.addnessGoalId?.startsWith("addness-goal-"))
            .map((t) => [t.addnessGoalId!, t]),
        );

        const incomingIds = new Set(
          goals.map((g) => `addness-goal-${g.id}`),
        );

        // Mark tasks for goals no longer present as completed (any depth)
        next = next.map((t) => {
          if (
            t.addnessGoalId?.startsWith("addness-goal-") &&
            !incomingIds.has(t.addnessGoalId) &&
            !t.completed
          ) {
            return { ...t, completed: true };
          }
          return t;
        });

        // Upsert goal tasks (supports hierarchy via goal.parentId)
        for (const goal of goals) {
          const goalTaskId = `addness-goal-${goal.id}`;
          const taskParentId = goal.parentId
            ? `addness-goal-${goal.parentId}`
            : sectionTaskId;
          const existing = existingByGoalId.get(goalTaskId);

          if (existing) {
            if (
              existing.text !== goal.title ||
              existing.completed !== goal.completed ||
              existing.parentId !== taskParentId
            ) {
              next = next.map((t) =>
                t.id === existing.id
                  ? { ...t, text: goal.title, completed: goal.completed, parentId: taskParentId }
                  : t,
              );
            }
          } else {
            next = [
              ...next,
              {
                id: goalTaskId,
                text: goal.title,
                completed: goal.completed,
                createdAt: new Date().toISOString(),
                parentId: taskParentId,
                addnessGoalId: goalTaskId,
              } as Task,
            ];
          }
        }

        // Update section completion based on direct children
        const directChildren = next.filter(
          (t) => t.parentId === sectionTaskId && t.addnessGoalId?.startsWith("addness-goal-"),
        );
        const allCompleted = directChildren.length > 0 && directChildren.every((c) => c.completed);
        next = next.map((t) =>
          t.id === sectionTaskId ? { ...t, completed: allCompleted } : t,
        );

        return next;
      });
    },
    [],
  );

  const resetTasks = useCallback((newTasks: readonly Task[]) => {
    setTasks(newTasks);
  }, []);

  return {
    tasks,
    isLoaded,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    indentTask,
    outdentTask,
    moveTask,
    getRootTasks,
    getChildren,
    syncCalendarEvents,
    syncAddnessGoals,
    resetTasks,
  };
}
