import type { IntervalUnit } from "../types/recurring";
import "./IntervalPicker.css";

interface IntervalPickerProps {
  readonly value: number;
  readonly unit: IntervalUnit;
  readonly onValueChange: (value: number) => void;
  readonly onUnitChange: (unit: IntervalUnit) => void;
}

export function IntervalPicker({
  value,
  unit,
  onValueChange,
  onUnitChange,
}: IntervalPickerProps) {
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 1) {
      onValueChange(num);
    }
  };

  const toggleUnit = () => {
    onUnitChange(unit === "days" ? "weeks" : "days");
  };

  const unitLabel = unit === "days" ? "日おき" : "週おき";

  return (
    <div className="interval-picker">
      <input
        className="interval-picker-input"
        type="number"
        min={1}
        value={value}
        onChange={handleValueChange}
      />
      <button
        type="button"
        className="interval-picker-unit"
        onClick={toggleUnit}
      >
        {unitLabel}
      </button>
    </div>
  );
}
