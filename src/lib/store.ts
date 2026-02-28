import { load } from "@tauri-apps/plugin-store";
import type { Task } from "../types/task";
import type { GoogleTokens } from "../types/calendar";
import type { RecurringSubTask, RecurringTaskTemplate, RecurringResetState } from "../types/recurring";

const STORE_PATH = "floating-tasks.json";

type Theme = "light" | "dark";

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_PATH, {
      defaults: { tasks: [], theme: "dark" },
      autoSave: true,
    });
  }
  return storeInstance;
}

export async function loadTasks(): Promise<Task[]> {
  const store = await getStore();
  const tasks = await store.get<Task[]>("tasks");
  return tasks ?? [];
}

export async function saveTasks(tasks: readonly Task[]): Promise<void> {
  const store = await getStore();
  await store.set("tasks", [...tasks]);
}

export async function loadTheme(): Promise<Theme> {
  const store = await getStore();
  const theme = await store.get<Theme>("theme");
  return theme ?? "dark";
}

export async function saveTheme(theme: Theme): Promise<void> {
  const store = await getStore();
  await store.set("theme", theme);
}

export async function loadGoogleTokens(): Promise<GoogleTokens | null> {
  const store = await getStore();
  return (await store.get<GoogleTokens>("googleTokens")) ?? null;
}

export async function saveGoogleTokens(tokens: GoogleTokens): Promise<void> {
  const store = await getStore();
  await store.set("googleTokens", tokens);
}

export async function clearGoogleTokens(): Promise<void> {
  const store = await getStore();
  await store.delete("googleTokens");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateSubTask(sub: any): RecurringSubTask {
  return {
    id: sub.id,
    text: sub.text,
    children: Array.isArray(sub.children) ? sub.children.map(migrateSubTask) : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateTemplate(item: any): RecurringTaskTemplate {
  const children = Array.isArray(item.children) ? item.children.map(migrateSubTask) : [];
  if ("intervalValue" in item) {
    return { ...item, children };
  }
  return {
    id: item.id,
    text: item.text,
    intervalValue: 1,
    intervalUnit: "days" as const,
    startDate: item.createdAt?.split("T")[0] ?? new Date().toISOString().slice(0, 10),
    enabled: item.enabled ?? true,
    createdAt: item.createdAt ?? new Date().toISOString(),
    children,
  };
}

export async function loadRecurringTemplates(): Promise<RecurringTaskTemplate[]> {
  const store = await getStore();
  const raw = (await store.get<unknown[]>("recurringTemplates")) ?? [];
  return raw.map(migrateTemplate);
}

export async function saveRecurringTemplates(
  templates: readonly RecurringTaskTemplate[],
): Promise<void> {
  const store = await getStore();
  await store.set("recurringTemplates", [...templates]);
}

export async function loadResetState(): Promise<RecurringResetState | null> {
  const store = await getStore();
  return (await store.get<RecurringResetState>("recurringResetState")) ?? null;
}

export async function saveResetState(state: RecurringResetState): Promise<void> {
  const store = await getStore();
  await store.set("recurringResetState", state);
}

export async function loadAddnessConnected(): Promise<boolean> {
  const store = await getStore();
  return (await store.get<boolean>("addnessConnected")) ?? false;
}

export async function saveAddnessConnected(connected: boolean): Promise<void> {
  const store = await getStore();
  await store.set("addnessConnected", connected);
}

export async function loadAddnessExtractJs(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>("addnessExtractJs")) ?? null;
}

export async function saveAddnessExtractJs(code: string): Promise<void> {
  const store = await getStore();
  await store.set("addnessExtractJs", code);
}

export async function loadAddnessJsFetchedAt(): Promise<number> {
  const store = await getStore();
  return (await store.get<number>("addnessJsFetchedAt")) ?? 0;
}

export async function saveAddnessJsFetchedAt(ts: number): Promise<void> {
  const store = await getStore();
  await store.set("addnessJsFetchedAt", ts);
}

export async function loadAddnessToggleJs(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>("addnessToggleJs")) ?? null;
}

export async function saveAddnessToggleJs(code: string): Promise<void> {
  const store = await getStore();
  await store.set("addnessToggleJs", code);
}

export async function loadAddnessToggleJsFetchedAt(): Promise<number> {
  const store = await getStore();
  return (await store.get<number>("addnessToggleJsFetchedAt")) ?? 0;
}

export async function saveAddnessToggleJsFetchedAt(ts: number): Promise<void> {
  const store = await getStore();
  await store.set("addnessToggleJsFetchedAt", ts);
}

