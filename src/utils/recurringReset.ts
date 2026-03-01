import type { Task } from "../types/task";
import type { RecurringSubTask, RecurringTaskTemplate } from "../types/recurring";

const RESET_HOUR = 0;

export function getLogicalDate(now: Date = new Date()): string {
  const adjusted = new Date(now);
  if (adjusted.getHours() < RESET_HOUR) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  const y = adjusted.getFullYear();
  const m = String(adjusted.getMonth() + 1).padStart(2, "0");
  const d = String(adjusted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isResetNeeded(lastResetDate: string | null, now: Date = new Date()): boolean {
  const today = getLogicalDate(now);
  return lastResetDate !== today;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function shouldGenerateToday(template: RecurringTaskTemplate, today: string): boolean {
  const diff = daysBetween(template.startDate, today);
  if (diff < 0) return false;

  const period = template.intervalUnit === "weeks"
    ? template.intervalValue * 7
    : template.intervalValue;

  return diff % period === 0;
}

export function performReset(
  tasks: readonly Task[],
  templates: readonly RecurringTaskTemplate[],
  now: Date = new Date(),
): readonly Task[] {
  const today = getLogicalDate(now);

  const carryOver = tasks.filter((t) => !t.recurringTemplateId && t.status !== "completed");
  const carryOverIds = new Set(carryOver.map((t) => t.id));
  const withOrphansPromoted = carryOver.map((t) =>
    t.parentId && !carryOverIds.has(t.parentId) ? { ...t, parentId: null } : t,
  );

  const activeTemplates = templates.filter(
    (tpl) => tpl.enabled && shouldGenerateToday(tpl, today),
  );

  function expandSubTasks(
    subs: readonly RecurringSubTask[],
    parentId: string,
    templateId: string,
  ): Task[] {
    return subs.flatMap((sub) => {
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        text: sub.text,
        status: "pending" as const,
        createdAt: now.toISOString(),
        parentId,
        recurringTemplateId: templateId,
      };
      return [task, ...expandSubTasks(sub.children ?? [], id, templateId)];
    });
  }

  const newTasks: Task[] = activeTemplates.flatMap((tpl) => {
    const rootId = crypto.randomUUID();
    const root: Task = {
      id: rootId,
      text: tpl.text,
      status: "pending" as const,
      createdAt: now.toISOString(),
      parentId: null,
      recurringTemplateId: tpl.id,
    };
    return [root, ...expandSubTasks(tpl.children ?? [], rootId, tpl.id)];
  });

  return [...newTasks, ...withOrphansPromoted];
}
