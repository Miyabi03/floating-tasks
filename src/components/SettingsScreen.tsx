import type { IntervalUnit, RecurringTaskTemplate } from "../types/recurring";
import { RecurringTemplateInput } from "./RecurringTemplateInput";
import { RecurringTemplateItem } from "./RecurringTemplateItem";
import "./SettingsScreen.css";

interface SettingsScreenProps {
  readonly templates: readonly RecurringTaskTemplate[];
  readonly onAdd: (text: string, intervalValue: number, intervalUnit: IntervalUnit) => void;
  readonly onUpdate: (
    id: string,
    updates: Partial<Pick<RecurringTaskTemplate, "text" | "intervalValue" | "intervalUnit" | "enabled">>,
  ) => void;
  readonly onDelete: (id: string) => void;
  readonly onAddSubTask: (templateId: string, parentSubId: string | null, text: string) => void;
  readonly onDeleteSubTask: (templateId: string, subTaskId: string) => void;
  readonly onUpdateSubTask: (templateId: string, subTaskId: string, text: string) => void;
  readonly onMove: (id: string, direction: "up" | "down") => void;
  readonly onClose: () => void;
  readonly addnessConnected: boolean;
  readonly addnessError: string | null;
  readonly onAddnessConnect: () => void;
  readonly onAddnessDisconnect: () => void;
}

export function SettingsScreen({
  templates,
  onAdd,
  onUpdate,
  onDelete,
  onAddSubTask,
  onDeleteSubTask,
  onUpdateSubTask,
  onMove,
  onClose,
  addnessConnected,
  addnessError,
  onAddnessConnect,
  onAddnessDisconnect,
}: SettingsScreenProps) {
  return (
    <div className="settings-screen">
      <div className="settings-header" data-tauri-drag-region>
        <span className="settings-title" data-tauri-drag-region>Recurring Tasks</span>
        <button className="settings-close" onClick={onClose} title="Close">
          {"\u2715"}
        </button>
      </div>

      <RecurringTemplateInput onAdd={onAdd} />

      <div className="settings-list">
        {templates.length === 0 ? (
          <div className="settings-empty">
            No recurring tasks yet
          </div>
        ) : (
          templates.map((tpl, idx) => (
            <RecurringTemplateItem
              key={tpl.id}
              template={tpl}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddSubTask={onAddSubTask}
              onDeleteSubTask={onDeleteSubTask}
              onUpdateSubTask={onUpdateSubTask}
              onMove={onMove}
              isFirst={idx === 0}
              isLast={idx === templates.length - 1}
            />
          ))
        )}
      </div>

      <div className="settings-addness">
        <div className="settings-addness-header">Addness連携</div>
        {addnessError && (
          <div className="settings-addness-error">{addnessError}</div>
        )}
        {addnessConnected ? (
          <div className="settings-addness-row">
            <span className="settings-addness-status">接続中</span>
            <button
              className="settings-addness-btn settings-addness-btn--disconnect"
              onClick={onAddnessDisconnect}
            >
              解除
            </button>
          </div>
        ) : (
          <div className="settings-addness-row">
            <button
              className="settings-addness-btn settings-addness-btn--connect"
              onClick={onAddnessConnect}
            >
              接続する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
