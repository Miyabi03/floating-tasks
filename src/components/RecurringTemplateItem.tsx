import { useState } from "react";
import type { IntervalUnit, RecurringTaskTemplate } from "../types/recurring";
import { IntervalPicker } from "./IntervalPicker";
import { InlineEditor } from "./InlineEditor";
import { RecurringSubTaskItem } from "./RecurringSubTaskItem";
import "./RecurringTemplateItem.css";

interface RecurringTemplateItemProps {
  readonly template: RecurringTaskTemplate;
  readonly onUpdate: (
    id: string,
    updates: Partial<Pick<RecurringTaskTemplate, "text" | "intervalValue" | "intervalUnit" | "enabled">>,
  ) => void;
  readonly onDelete: (id: string) => void;
  readonly onAddSubTask: (templateId: string, parentSubId: string | null, text: string) => void;
  readonly onDeleteSubTask: (templateId: string, subTaskId: string) => void;
  readonly onUpdateSubTask: (templateId: string, subTaskId: string, text: string) => void;
  readonly onMove: (id: string, direction: "up" | "down") => void;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}

export function RecurringTemplateItem({
  template,
  onUpdate,
  onDelete,
  onAddSubTask,
  onDeleteSubTask,
  onUpdateSubTask,
  onMove,
  isFirst,
  isLast,
}: RecurringTemplateItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newSubText, setNewSubText] = useState("");

  const handleToggleEnabled = () => {
    onUpdate(template.id, { enabled: !template.enabled });
  };

  const handleIntervalValueChange = (intervalValue: number) => {
    onUpdate(template.id, { intervalValue });
  };

  const handleIntervalUnitChange = (intervalUnit: IntervalUnit) => {
    onUpdate(template.id, { intervalUnit });
  };

  const handleTextConfirm = (text: string) => {
    onUpdate(template.id, { text });
    setIsEditing(false);
  };

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubText.trim();
    if (!trimmed) return;
    onAddSubTask(template.id, null, trimmed);
    setNewSubText("");
  };

  const className = [
    "recurring-item",
    !template.enabled ? "recurring-item--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="recurring-item-row">
        <div className="recurring-item-move">
          <button
            className="recurring-item-move-btn"
            onClick={() => onMove(template.id, "up")}
            disabled={isFirst}
            title="Move up"
          >
            {"\u25B2"}
          </button>
          <button
            className="recurring-item-move-btn"
            onClick={() => onMove(template.id, "down")}
            disabled={isLast}
            title="Move down"
          >
            {"\u25BC"}
          </button>
        </div>

        <button
          className={`recurring-item-toggle${template.enabled ? " recurring-item-toggle--on" : ""}`}
          onClick={handleToggleEnabled}
          title={template.enabled ? "Disable" : "Enable"}
        >
          {template.enabled ? "\u2713" : ""}
        </button>

        {isEditing ? (
          <InlineEditor
            initialText={template.text}
            onConfirm={handleTextConfirm}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <span
            className="recurring-item-text"
            onClick={() => setIsEditing(true)}
          >
            {template.text}
          </span>
        )}

        <div className="recurring-item-interval">
          <IntervalPicker
            value={template.intervalValue}
            unit={template.intervalUnit}
            onValueChange={handleIntervalValueChange}
            onUnitChange={handleIntervalUnitChange}
          />
        </div>

        <button
          className="recurring-item-delete"
          onClick={() => onDelete(template.id)}
          title="Delete"
        >
          {"\u2715"}
        </button>
      </div>

      <div className="recurring-item-children">
        {template.children.map((child) => (
          <RecurringSubTaskItem
            key={child.id}
            subTask={child}
            templateId={template.id}
            depth={1}
            onAddSubTask={onAddSubTask}
            onDeleteSubTask={onDeleteSubTask}
            onUpdateSubTask={onUpdateSubTask}
          />
        ))}
        <form className="recurring-sub-input" onSubmit={handleAddSub}>
          <span className="recurring-sub-item-bullet">{"\u2514"}</span>
          <input
            className="recurring-sub-input-field"
            type="text"
            value={newSubText}
            onChange={(e) => setNewSubText(e.target.value)}
            placeholder="Add sub-task..."
          />
        </form>
      </div>
    </div>
  );
}
