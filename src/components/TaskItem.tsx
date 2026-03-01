import type { Task, TaskStatus } from "../types/task";
import { MAX_DEPTH } from "../utils/taskTree";
import { TaskInput } from "./TaskInput";
import { InlineEditor } from "./InlineEditor";
import "./TaskItem.css";

interface TaskItemProps {
  readonly task: Task;
  readonly children: readonly Task[];
  readonly depth: number;
  readonly selectedTaskId: string | null;
  readonly editingTaskId: string | null;
  readonly subInputTaskId: string | null;
  readonly onAdvanceStatus: (id: string) => void;
  readonly onSetStatus: (id: string, status: TaskStatus) => void;
  readonly onDelete: (id: string) => void;
  readonly onAddSub: (text: string, parentId: string) => void;
  readonly onUpdateTask: (id: string, text: string) => void;
  readonly getChildren: (parentId: string) => readonly Task[];
  readonly isExpanded: (id: string) => boolean;
  readonly toggleExpanded: (id: string) => void;
  readonly onSelect: (id: string) => void;
  readonly onStartEditing: (id: string) => void;
  readonly onShowSubInput: (id: string) => void;
  readonly onCancelEditing: () => void;
  readonly onCancelSubInput: () => void;
}

const statusAriaLabels: Record<TaskStatus, string> = {
  pending: "進行中にする",
  in_progress: "完了または中断にする",
  completed: "未着手に戻す",
  interrupted: "完了にする",
};

export function TaskItem({
  task,
  children,
  depth,
  selectedTaskId,
  editingTaskId,
  subInputTaskId,
  onAdvanceStatus,
  onSetStatus,
  onDelete,
  onAddSub,
  onUpdateTask,
  getChildren,
  isExpanded,
  toggleExpanded,
  onSelect,
  onStartEditing,
  onShowSubInput,
  onCancelEditing,
  onCancelSubInput,
}: TaskItemProps) {
  const expanded = isExpanded(task.id);
  const hasChildren = children.length > 0;
  const completedCount = children.filter((c) => c.status === "completed").length;
  const isSelected = selectedTaskId === task.id;
  const isEditing = editingTaskId === task.id;
  const showSubInput = subInputTaskId === task.id;
  const isAddnessGoal = task.addnessGoalId?.startsWith("addness-goal-") ?? false;
  const isReadOnly = task.addnessGoalId !== undefined && !isAddnessGoal;

  const handleAddSub = (text: string) => {
    onAddSub(text, task.id);
    onCancelSubInput();
  };

  const handleTextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly || isAddnessGoal) {
      onSelect(task.id);
      return;
    }
    if (isSelected) {
      onStartEditing(task.id);
    } else {
      onSelect(task.id);
    }
  };

  const handleItemClick = () => {
    onSelect(task.id);
  };

  const handleEditConfirm = (text: string) => {
    onUpdateTask(task.id, text);
    onCancelEditing();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    onAdvanceStatus(task.id);
  };

  const statusClass = `task-item--${task.status}`;

  const className = [
    "task-item",
    statusClass,
    isSelected ? "task-item--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderCheckboxArea = () => {
    // in_progress: show ✓ and ⏸ inline buttons
    if (task.status === "in_progress" && !isReadOnly) {
      return (
        <div className="task-status-actions">
          <button
            className="task-status-btn task-status-btn--complete"
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(task.id, "completed");
            }}
            aria-label="完了にする"
          >
            {"\u2713"}
          </button>
          <button
            className="task-status-btn task-status-btn--interrupt"
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(task.id, "interrupted");
            }}
            aria-label="中断する"
          >
            {"\u275A\u275A"}
          </button>
        </div>
      );
    }

    // Other states: regular checkbox
    const checkboxContent = (() => {
      switch (task.status) {
        case "completed":
          return <span className="task-check-icon">{"\u2713"}</span>;
        case "interrupted":
          return <span className="task-pause-icon">{"\u275A\u275A"}</span>;
        default:
          return null;
      }
    })();

    return (
      <button
        className="task-checkbox"
        onClick={handleCheckboxClick}
        aria-label={statusAriaLabels[task.status]}
        style={isReadOnly ? { cursor: "default", opacity: 0.6 } : undefined}
      >
        {checkboxContent}
      </button>
    );
  };

  return (
    <div className="task-item-group">
      <div
        className={className}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        data-task-id={task.id}
        onClick={handleItemClick}
      >
        {hasChildren ? (
          <button
            className="task-expand"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(task.id);
            }}
          >
            {expanded ? "\u25BE" : "\u25B8"}
          </button>
        ) : (
          <span className="task-expand-spacer" />
        )}

        {renderCheckboxArea()}

        {task.recurringTemplateId && (
          <span className="task-recurring-icon" title="Recurring task">{"\u21BB"}</span>
        )}

        {isEditing ? (
          <InlineEditor
            initialText={task.text}
            onConfirm={handleEditConfirm}
            onCancel={onCancelEditing}
          />
        ) : (
          <span className="task-text" onClick={handleTextClick}>
            {task.text}
          </span>
        )}

        {hasChildren && (
          <span className="task-progress">
            {completedCount}/{children.length}
          </span>
        )}

        {!isReadOnly && !isAddnessGoal && (
          <div className="task-actions">
            {depth < MAX_DEPTH && (
              <button
                className="task-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (showSubInput) {
                    onCancelSubInput();
                  } else {
                    onShowSubInput(task.id);
                  }
                }}
                title="サブタスクを追加"
              >
                +
              </button>
            )}
            <button
              className="task-action-btn task-action-btn--delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              title="削除"
            >
              {"\u2715"}
            </button>
          </div>
        )}
      </div>

      {showSubInput && (
        <div style={{ paddingLeft: `${32 + depth * 20}px`, paddingRight: 12 }}>
          <TaskInput
            onAdd={handleAddSub}
            onCancel={onCancelSubInput}
            placeholder="サブタスクを入力..."
            compact
            autoFocus
          />
        </div>
      )}

      {expanded &&
        children.map((child) => (
          <TaskItem
            key={child.id}
            task={child}
            children={getChildren(child.id)}
            depth={depth + 1}
            selectedTaskId={selectedTaskId}
            editingTaskId={editingTaskId}
            subInputTaskId={subInputTaskId}
            onAdvanceStatus={onAdvanceStatus}
            onSetStatus={onSetStatus}
            onDelete={onDelete}
            onAddSub={onAddSub}
            onUpdateTask={onUpdateTask}
            getChildren={getChildren}
            isExpanded={isExpanded}
            toggleExpanded={toggleExpanded}
            onSelect={onSelect}
            onStartEditing={onStartEditing}
            onShowSubInput={onShowSubInput}
            onCancelEditing={onCancelEditing}
            onCancelSubInput={onCancelSubInput}
          />
        ))}
    </div>
  );
}
