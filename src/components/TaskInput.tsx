import { useState, useRef, useEffect } from "react";
import "./TaskInput.css";

interface TaskInputProps {
  readonly onAdd: (text: string) => void;
  readonly onCancel?: () => void;
  readonly placeholder?: string;
  readonly compact?: boolean;
  readonly autoFocus?: boolean;
}

export function TaskInput({
  onAdd,
  onCancel,
  placeholder = 'タイトルを「〜する」の形で入力',
  compact = false,
  autoFocus = false,
}: TaskInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value);
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSubmit(e);
    } else if (e.key === "Escape" && onCancel) {
      onCancel();
    } else if ((e.key === "Delete" || e.key === "Backspace") && !value && onCancel) {
      onCancel();
    }
  };

  return (
    <div className={`task-input-wrapper ${compact ? "task-input-wrapper--compact" : ""}`}>
      <span className="task-input-icon">+</span>
      <input
        ref={inputRef}
        className="task-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
