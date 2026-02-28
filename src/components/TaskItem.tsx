import type { Task } from "../types/task";
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
  readonly onToggle: (id: string, fromCheckbox?: boolean) => void;
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

export function TaskItem({
  task,
  children,
  depth,
  selectedTaskId,
  editingTaskId,
  subInputTaskId,
  onToggle,
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
  const completedCount = children.filter((c) => c.completed).length;
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

  const className = [
    "task-item",
    task.completed ? "task-item--completed" : "",
    isSelected ? "task-item--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

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

        <button
          className="task-checkbox"
          onClick={(e) => {
            e.stopPropagation();
            if (!isReadOnly) onToggle(task.id, true);
          }}
          aria-label={task.completed ? "未完了に戻す" : "完了にする"}
          style={isReadOnly ? { cursor: "default", opacity: 0.6 } : undefined}
        >
          {task.completed && <span className="task-check-icon">{"\u2713"}</span>}
        </button>

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
            onToggle={onToggle}
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
