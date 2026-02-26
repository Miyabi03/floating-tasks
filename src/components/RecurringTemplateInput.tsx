import { useState } from "react";
import type { IntervalUnit } from "../types/recurring";
import { IntervalPicker } from "./IntervalPicker";
import "./RecurringTemplateInput.css";

interface RecurringTemplateInputProps {
  readonly onAdd: (text: string, intervalValue: number, intervalUnit: IntervalUnit) => void;
}

export function RecurringTemplateInput({ onAdd }: RecurringTemplateInputProps) {
  const [text, setText] = useState("");
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("days");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed, intervalValue, intervalUnit);
    setText("");
    setIntervalValue(1);
    setIntervalUnit("days");
  };

  return (
    <form className="recurring-input" onSubmit={handleSubmit}>
      <div className="recurring-input-row">
        <input
          className="recurring-input-field"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New recurring task..."
        />
        <button
          className="recurring-input-add"
          type="submit"
          disabled={!text.trim()}
        >
          Add
        </button>
      </div>
      <IntervalPicker
        value={intervalValue}
        unit={intervalUnit}
        onValueChange={setIntervalValue}
        onUnitChange={setIntervalUnit}
      />
    </form>
  );
}
