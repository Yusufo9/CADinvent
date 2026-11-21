import { useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";

export default function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  action = "Delete",
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  action?: string;
}) {
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key !== "Tab") return;
      const buttons =
        modal.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!buttons?.length) return;
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onCancel]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="small-modal confirm-dialog"
        ref={modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        <button
          className="icon-button modal-close"
          aria-label="Close confirmation"
          onClick={onCancel}
        >
          <X size={18} />
        </button>
        <span className="eyebrow">CONFIRM DELETION</span>
        <h2 id="confirmation-title">{title}</h2>
        <div id="confirmation-description">{children}</div>
        <div className="confirm-actions">
          <button className="button" autoFocus onClick={onCancel}>
            Cancel
          </button>
          <button className="button danger" onClick={onConfirm}>
            <Trash2 size={16} />
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}
