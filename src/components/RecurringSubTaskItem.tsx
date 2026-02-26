import { useState } from "react";
import type { RecurringSubTask } from "../types/recurring";
import { InlineEditor } from "./InlineEditor";

const MAX_SUB_DEPTH = 3;

interface RecurringSubTaskItemProps {
  readonly subTask: RecurringSubTask;
  readonly templateId: string;
  readonly depth: number;
  readonly onAddSubTask: (templateId: string, parentSubId: string | null, text: string) => void;
  readonly onDeleteSubTask: (templateId: string, subTaskId: string) => void;
  readonly onUpdateSubTask: (templateId: string, subTaskId: string, text: string) => void;
}

export function RecurringSubTaskItem({
  subTask,
  templateId,
  depth,
  onAddSubTask,
  onDeleteSubTask,
  onUpdateSubTask,
}: RecurringSubTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newChildText, setNewChildText] = useState("");

  const canAddChild = depth < MAX_SUB_DEPTH;

  const handleTextConfirm = (text: string) => {
    onUpdateSubTask(templateId, subTask.id, text);
    setIsEditing(false);
  };

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newChildText.trim();
    if (!trimmed) return;
    onAddSubTask(templateId, subTask.id, trimmed);
    setNewChildText("");
    setIsAdding(false);
  };

  return (
    <div className="recurring-sub-item-wrapper">
      <div className="recurring-sub-item">
        <span className="recurring-sub-item-bullet">{"\u2514"}</span>
        {isEditing ? (
          <InlineEditor
            initialText={subTask.text}
            onConfirm={handleTextConfirm}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <span
            className="recurring-sub-item-text"
            onClick={() => setIsEditing(true)}
          >
            {subTask.text}
          </span>
        )}
        {canAddChild && (
          <button
            className="recurring-sub-item-add"
            onClick={() => setIsAdding(true)}
            title="Add child sub-task"
          >
            {"+"}
          </button>
        )}
        <button
          className="recurring-sub-item-delete"
          onClick={() => onDeleteSubTask(templateId, subTask.id)}
          title="Delete sub-task"
        >
          {"\u2715"}
        </button>
      </div>

      {subTask.children.length > 0 && (
        <div className="recurring-sub-item-children">
          {subTask.children.map((child) => (
            <RecurringSubTaskItem
              key={child.id}
              subTask={child}
              templateId={templateId}
              depth={depth + 1}
              onAddSubTask={onAddSubTask}
              onDeleteSubTask={onDeleteSubTask}
              onUpdateSubTask={onUpdateSubTask}
            />
          ))}
        </div>
      )}

      {isAdding && (
        <div className="recurring-sub-item-children">
          <form className="recurring-sub-input" onSubmit={handleAddChild}>
            <span className="recurring-sub-item-bullet">{"\u2514"}</span>
            <input
              className="recurring-sub-input-field"
              type="text"
              value={newChildText}
              onChange={(e) => setNewChildText(e.target.value)}
              onBlur={() => {
                if (!newChildText.trim()) setIsAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewChildText("");
                }
              }}
              placeholder="Add child sub-task..."
              autoFocus
            />
          </form>
        </div>
      )}
    </div>
  );
}
