import { useEffect, useRef } from "react";

interface TaskStatusPopupProps {
  readonly onComplete: () => void;
  readonly onInterrupt: () => void;
  readonly onClose: () => void;
}

export function TaskStatusPopup({
  onComplete,
  onInterrupt,
  onClose,
}: TaskStatusPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="task-status-popup" ref={popupRef}>
      <button
        className="task-status-popup__btn task-status-popup__btn--complete"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
      >
        完了
      </button>
      <button
        className="task-status-popup__btn task-status-popup__btn--interrupt"
        onClick={(e) => {
          e.stopPropagation();
          onInterrupt();
        }}
      >
        中断
      </button>
    </div>
  );
}
