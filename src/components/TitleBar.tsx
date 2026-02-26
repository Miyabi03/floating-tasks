import { getCurrentWindow } from "@tauri-apps/api/window";
import "./TitleBar.css";

interface TitleBarProps {
  readonly theme: "light" | "dark";
  readonly onToggleTheme: () => void;
  readonly dailyMessage: string;
  readonly onOpenSettings: () => void;
}

export function TitleBar({ theme, onToggleTheme, dailyMessage, onOpenSettings }: TitleBarProps) {
  const handleClose = async () => {
    await getCurrentWindow().hide();
  };

  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar-top" data-tauri-drag-region>
        <span className="title-bar-text" data-tauri-drag-region>
          Floating Tasks
        </span>
        <div className="title-bar-controls">
          <button
            className="title-bar-btn settings-btn"
            onClick={onOpenSettings}
            title="Settings"
          >
            {"\u2699"}
          </button>
          <button
            className="title-bar-btn theme-btn"
            onClick={onToggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "\u2600" : "\u263E"}
          </button>
          <button
            className="title-bar-btn close-btn"
            onClick={handleClose}
            title="Hide (Cmd+Shift+T)"
          >
            {"\u2715"}
          </button>
        </div>
      </div>
      <div className="title-bar-message" data-tauri-drag-region>
        {dailyMessage}
      </div>
    </div>
  );
}
