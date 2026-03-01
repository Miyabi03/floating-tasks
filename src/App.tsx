import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import type { AddnessGoal } from "./types/addness";
import type { TaskStatus } from "./types/task";
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
import { useAddnessSync } from "./hooks/useAddnessSync";
import "./App.css";

const OVERRIDE_TTL = 30_000; // 30 seconds

export function App() {
  const appRef = useRef<HTMLDivElement>(null);
  useClickRipple(appRef);
  const [showSettings, setShowSettings] = useState(false);
  const {
    addTask,
    advanceTaskStatus,
    setTaskStatus,
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
    syncAddnessGoals,
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

  const {
    goals: addnessGoals,
    isConnected: addnessConnected,
    error: addnessError,
    connect: addnessConnect,
    disconnect: addnessDisconnect,
    refresh: addnessRefresh,
    toggleGoal: addnessToggleGoal,
  } = useAddnessSync();

  // TTL-based overrides for Addness goals toggled from app side
  const addnessOverridesRef = useRef<Map<string, { completed: boolean; at: number }>>(new Map());

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

  const resolvedGoals = useMemo((): readonly AddnessGoal[] => {
    if (addnessGoals.length === 0) return addnessGoals;
    const now = Date.now();
    const overrides = addnessOverridesRef.current;

    // Clean expired overrides
    for (const [key, val] of overrides) {
      if (now - val.at >= OVERRIDE_TTL) overrides.delete(key);
    }

    return addnessGoals.map((goal) => {
      const override = overrides.get(goal.title);
      if (!override) return goal;
      // Addness caught up — clear override
      if (goal.completed === override.completed) {
        overrides.delete(goal.title);
        return goal;
      }
      // Override still active — keep app-side state
      return { ...goal, completed: override.completed };
    });
  }, [addnessGoals]);

  useEffect(() => {
    if (resolvedGoals.length > 0) {
      syncAddnessGoals(resolvedGoals);
    }
  }, [resolvedGoals, syncAddnessGoals]);

  const handleAdvanceStatus = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.addnessGoalId?.startsWith("addness-goal-")) {
      if (task.status === "completed") {
        // completed → pending: Addness側のチェックを外す
        addnessOverridesRef.current.set(task.text, { completed: false, at: Date.now() });
        advanceTaskStatus(id);
        addnessToggleGoal(task.text);
      } else if (task.status === "interrupted") {
        // interrupted → completed: Addness側にチェックを入れる
        addnessOverridesRef.current.set(task.text, { completed: true, at: Date.now() });
        advanceTaskStatus(id);
        addnessToggleGoal(task.text);
      } else {
        // pending → in_progress: Addness側は変更しない
        advanceTaskStatus(id);
      }
    } else {
      advanceTaskStatus(id);
    }
  }, [tasks, advanceTaskStatus, addnessToggleGoal]);

  const handleSetStatus = useCallback((id: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    if (task?.addnessGoalId?.startsWith("addness-goal-")) {
      const newCompleted = status === "completed";
      addnessOverridesRef.current.set(task.text, { completed: newCompleted, at: Date.now() });
      setTaskStatus(id, status);
      if (newCompleted !== (task.status === "completed")) {
        addnessToggleGoal(task.text);
      }
    } else {
      setTaskStatus(id, status);
    }
  }, [tasks, setTaskStatus, addnessToggleGoal]);

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
          addnessConnected={addnessConnected}
          addnessError={addnessError}
          onAddnessConnect={addnessConnect}
          onAddnessDisconnect={addnessDisconnect}
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
        onRefresh={addnessRefresh}
      />
      <TaskInput onAdd={handleAddRoot} />
      <TaskList
        rootTasks={getRootTasks()}
        tasks={tasks}
        collapsedIds={collapsedIds}
        onAdvanceStatus={handleAdvanceStatus}
        onSetStatus={handleSetStatus}
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
