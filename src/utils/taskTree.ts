import type { Task } from "../types/task";

export const MAX_DEPTH = 10;

export function getDescendantIds(tasks: readonly Task[], parentId: string): string[] {
  const children = tasks.filter((t) => t.parentId === parentId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(tasks, c.id)]);
}

/**
 * Move a task (and its descendants as a block) to a new sibling index
 * among its same-parent siblings.
 */
export function moveTaskInArray(
  tasks: readonly Task[],
  taskId: string,
  targetSiblingIndex: number
): readonly Task[] {
  const target = tasks.find((t) => t.id === taskId);
  if (!target) return tasks;

  const parentId = target.parentId;
  const descendantIds = new Set(getDescendantIds(tasks, taskId));

  // Collect the block: the task itself + all descendants, preserving order
  const block: Task[] = [];
  const rest: Task[] = [];
  for (const t of tasks) {
    if (t.id === taskId || descendantIds.has(t.id)) {
      block.push(t);
    } else {
      rest.push(t);
    }
  }

  // Find siblings in the remaining array (same parentId, excluding the dragged task)
  const siblings = rest.filter((t) => t.parentId === parentId);
  const clampedIndex = Math.max(0, Math.min(targetSiblingIndex, siblings.length));

  // Determine insertion point in the flat `rest` array
  let insertAt: number;
  if (clampedIndex >= siblings.length) {
    // Insert after the last sibling and all its descendants
    const lastSibling = siblings[siblings.length - 1];
    const lastSiblingDescendants = new Set(getDescendantIds(rest, lastSibling.id));
    let lastIdx = rest.findIndex((t) => t.id === lastSibling.id);
    while (lastIdx + 1 < rest.length && lastSiblingDescendants.has(rest[lastIdx + 1].id)) {
      lastIdx++;
    }
    insertAt = lastIdx + 1;
  } else {
    // Insert before the target sibling
    insertAt = rest.findIndex((t) => t.id === siblings[clampedIndex].id);
  }

  return [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
}

export function getTaskDepth(tasks: readonly Task[], taskId: string): number {
  let depth = 0;
  let current = tasks.find((t) => t.id === taskId);
  while (current?.parentId) {
    depth++;
    current = tasks.find((t) => t.id === current!.parentId);
  }
  return depth;
}

function getSiblings(tasks: readonly Task[], parentId: string | null): readonly Task[] {
  return tasks.filter((t) => t.parentId === parentId);
}

/**
 * Build a flat list of visible task IDs respecting expand/collapse state.
 * Order: DFS traversal matching the rendered tree.
 */
export function buildVisibleTaskList(
  tasks: readonly Task[],
  collapsedIds: ReadonlySet<string>
): string[] {
  const result: string[] = [];

  function walk(parentId: string | null) {
    const children = getSiblings(tasks, parentId);
    for (const child of children) {
      result.push(child.id);
      if (!collapsedIds.has(child.id)) {
        walk(child.id);
      }
    }
  }

  walk(null);
  return result;
}

/**
 * Indent a task: make it a child of its previous sibling.
 * Returns new tasks array or original if operation is invalid.
 */
function isSubtreeCompleted(allTasks: readonly Task[], taskId: string): boolean {
  const task = allTasks.find((t) => t.id === taskId);
  if (!task || !task.completed) return false;
  const children = allTasks.filter((t) => t.parentId === taskId);
  return children.every((c) => isSubtreeCompleted(allTasks, c.id));
}

/**
 * Stable-sort siblings so that fully-completed subtrees sink to the bottom.
 * Preserves relative order within each group.
 */
export function sortByCompletion(
  siblings: readonly Task[],
  allTasks: readonly Task[],
): readonly Task[] {
  const incomplete: Task[] = [];
  const complete: Task[] = [];
  for (const task of siblings) {
    if (isSubtreeCompleted(allTasks, task.id)) {
      complete.push(task);
    } else {
      incomplete.push(task);
    }
  }
  return [...incomplete, ...complete];
}

export function indentTask(tasks: readonly Task[], taskId: string): readonly Task[] {
  const target = tasks.find((t) => t.id === taskId);
  if (!target) return tasks;

  const siblings = getSiblings(tasks, target.parentId);
  const idx = siblings.findIndex((t) => t.id === taskId);

  // Can't indent if first sibling (no previous sibling to become parent)
  if (idx <= 0) return tasks;

  const newParentId = siblings[idx - 1].id;

  // Check depth limit
  if (getTaskDepth(tasks, newParentId) + 1 >= MAX_DEPTH) return tasks;

  return tasks.map((t) =>
    t.id === taskId ? { ...t, parentId: newParentId } : t
  );
}

/**
 * Outdent a task: move it to its parent's level (after the parent).
 * Returns new tasks array or original if operation is invalid.
 */
export function outdentTask(tasks: readonly Task[], taskId: string): readonly Task[] {
  const target = tasks.find((t) => t.id === taskId);
  if (!target || target.parentId === null) return tasks;

  const parent = tasks.find((t) => t.id === target.parentId);
  if (!parent) return tasks;

  const updated = { ...target, parentId: parent.parentId };
  const without = tasks.filter((t) => t.id !== taskId);
  const parentIdx = without.findIndex((t) => t.id === parent.id);
  return [
    ...without.slice(0, parentIdx + 1),
    updated,
    ...without.slice(parentIdx + 1),
  ];
}
