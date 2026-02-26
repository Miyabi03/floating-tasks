import { useRef, useEffect, useState } from "react";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { TitleBar } from "./components/TitleBar";
import { TaskInput } from "./components/TaskInput";
import { TaskList } from "./components/TaskList";
import { LoginScreen } from "./components/LoginScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { useTasks } from "./hooks/useTasks";
import { useTheme } from "./hooks/useTheme";
import { useDailyMessage } from "./hooks/useDailyMessage";
import { useExpandedState } from "./hooks/useExpandedState";
import { useClickRipple } from "./hooks/useClickRipple";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useCalendarEvents } from "./hooks/useCalendarEvents";
import { useRecurringTemplates } from "./hooks/useRecurringTemplates";
import { useRecurringReset } from "./hooks/useRecurringReset";
import "./App.css";

export function App() {
  const appRef = useRef<HTMLDivElement>(null);
  useClickRipple(appRef);
  const [showSettings, setShowSettings] = useState(false);
  const {
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    indentTask,
    outdentTask,
    moveTask,
    getRootTasks,
    getChildren,
    tasks,
    isLoaded,
    syncCalendarEvents,
    resetTasks,
  } = useTasks();
  const { theme, toggleTheme } = useTheme();
  const dailyMessage = useDailyMessage();
  const { collapsedIds, isExpanded, toggleExpanded, expandTask } = useExpandedState();
  const { isLoggedIn, isLoading, signIn, getValidAccessToken } = useGoogleAuth();
  const { events } = useCalendarEvents(getValidAccessToken, isLoggedIn);
  const {
    templates,
    isLoaded: templatesLoaded,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addSubTask,
    deleteSubTask,
    updateSubTask,
    moveTemplate,
  } = useRecurringTemplates();

  useRecurringReset(tasks, templates, isLoaded, templatesLoaded, resetTasks);

  useEffect(() => {
    const positionWindow = async () => {
      if (!("__TAURI__" in window)) return;
      try {
        const monitor = await currentMonitor();
        if (!monitor) return;
        const win = getCurrentWindow();
        const factor = monitor.scaleFactor;
        const screenW = monitor.size.width / factor;
        const winSize = await win.outerSize();
        const winW = winSize.width / factor;
        const padding = 20;
        const x = screenW - winW - padding;
        const y = padding;
        await win.setPosition(new LogicalPosition(x, y));
      } catch {
        // Ignore positioning errors (e.g. Tauri API not ready)
      }
    };
    positionWindow();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      syncCalendarEvents(events);
    }
  }, [events, syncCalendarEvents]);

  const handleAddRoot = (text: string) => addTask(text, null);
  const handleAddSub = (text: string, parentId: string) => {
    addTask(text, parentId);
    expandTask(parentId);
  };

  if (isLoading) {
    return (
      <div className="app" ref={appRef}>
        <div className="app-loading">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="app" ref={appRef}>
        <LoginScreen onSignIn={signIn} />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="app" ref={appRef}>
        <SettingsScreen
          templates={templates}
          onAdd={addTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
          onAddSubTask={addSubTask}
          onDeleteSubTask={deleteSubTask}
          onUpdateSubTask={updateSubTask}
          onMove={moveTemplate}
          onClose={() => setShowSettings(false)}
        />
      </div>
    );
  }

  return (
    <div className="app" ref={appRef}>
      <TitleBar
        theme={theme}
        onToggleTheme={toggleTheme}
        dailyMessage={dailyMessage}
        onOpenSettings={() => setShowSettings(true)}
      />
      <TaskInput onAdd={handleAddRoot} />
      <TaskList
        rootTasks={getRootTasks()}
        tasks={tasks}
        collapsedIds={collapsedIds}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onAddSub={handleAddSub}
        onUpdateTask={updateTask}
        onIndentTask={indentTask}
        onOutdentTask={outdentTask}
        onMoveTask={moveTask}
        getChildren={getChildren}
        isExpanded={isExpanded}
        toggleExpanded={toggleExpanded}
      />
    </div>
  );
}
