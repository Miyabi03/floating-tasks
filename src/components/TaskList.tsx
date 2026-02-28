import { useRef, useEffect, useCallback } from "react";
import type { Task } from "../types/task";
import { TaskItem } from "./TaskItem";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import "./TaskList.css";

interface TaskListProps {
  readonly rootTasks: readonly Task[];
  readonly tasks: readonly Task[];
  readonly collapsedIds: ReadonlySet<string>;
  readonly onToggle: (id: string, fromCheckbox?: boolean) => void;
  readonly onDelete: (id: string) => void;
  readonly onAddSub: (text: string, parentId: string) => void;
  readonly onUpdateTask: (id: string, text: string) => void;
  readonly onIndentTask: (id: string) => void;
  readonly onOutdentTask: (id: string) => void;
  readonly onMoveTask: (taskId: string, newIndex: number) => void;
  readonly getChildren: (parentId: string) => readonly Task[];
  readonly isExpanded: (id: string) => boolean;
  readonly toggleExpanded: (id: string) => void;
}

export function TaskList({
  rootTasks,
  tasks,
  collapsedIds,
  onToggle,
  onDelete,
  onAddSub,
  onUpdateTask,
  onIndentTask,
  onOutdentTask,
  onMoveTask,
  getChildren,
  isExpanded,
  toggleExpanded,
}: TaskListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    selectedTaskId,
    editingTaskId,
    subInputTaskId,
    handleKeyDown,
    selectTask,
    startEditing,
    showSubInput,
    clearSubInput,
    clearEditing,
  } = useKeyboardNav({
    tasks,
    collapsedIds,
    onToggle,
    onDelete,
    onIndentTask,
    onOutdentTask,
    onMoveTask,
  });

  const refocus = useCallback(() => {
    containerRef.current?.focus();
  }, []);

  const handleCancelSubInput = useCallback(() => {
    clearSubInput();
    refocus();
  }, [clearSubInput, refocus]);

  const handleCancelEditing = useCallback(() => {
    clearEditing();
    refocus();
  }, [clearEditing, refocus]);

  useEffect(() => {
    if (!selectedTaskId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-task-id="${CSS.escape(selectedTaskId)}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedTaskId]);

  if (rootTasks.length === 0) {
    return (
      <div className="task-list-empty">
        <span className="task-list-empty-icon">{"\u2714"}</span>
        <span className="task-list-empty-text">タスクを追加しましょう</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="task-list"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {rootTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          children={getChildren(task.id)}
          depth={0}
          selectedTaskId={selectedTaskId}
          editingTaskId={editingTaskId}
          subInputTaskId={subInputTaskId}
          onToggle={onToggle}
          onDelete={onDelete}
          onAddSub={onAddSub}
          onUpdateTask={onUpdateTask}
          getChildren={getChildren}
          isExpanded={isExpanded}
          toggleExpanded={toggleExpanded}
          onSelect={selectTask}
          onStartEditing={startEditing}
          onShowSubInput={showSubInput}
          onCancelEditing={handleCancelEditing}
          onCancelSubInput={handleCancelSubInput}
        />
      ))}
    </div>
  );
}
