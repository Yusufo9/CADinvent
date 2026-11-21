import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Layers3,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Workspace } from "../types";
export default function WorkspacePicker({
  workspace,
  workspaces,
  disabled,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  disabled: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (workspace: Workspace) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "rename" | null>(null);
  const [name, setName] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const click = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMode(null);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);
  function edit(next: "new" | "rename") {
    setOpen(false);
    setMode(next);
    setName(
      next === "rename"
        ? workspace.name
        : `Personal workspace ${workspaces.length + 1}`,
    );
  }
  return (
    <div className="workspace-picker" ref={root}>
      <button
        ref={trigger}
        className="workspace-name"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span title={workspace.name}>{workspace.name}</span>
        <ChevronDown size={13} />
      </button>
      <button
        className="icon-button workspace-pencil"
        disabled={disabled}
        aria-label="Rename workspace"
        onClick={() => edit("rename")}
      >
        <Pencil size={14} />
      </button>
      {open && (
        <div
          className="dropdown workspace-dropdown"
          role="menu"
          aria-label="Project workspaces"
        >
          <span className="dropdown-label">PROJECT WORKSPACES</span>
          <div className="workspace-options">
            {workspaces.map((w) => (
              <div key={w.id} className="workspace-option" role="none">
                <button
                  role="menuitemradio"
                  aria-checked={w.id === workspace.id}
                  onClick={() => {
                    onSelect(w.id);
                    setOpen(false);
                    trigger.current?.focus();
                  }}
                >
                  <Layers3 size={16} />
                  <span className="workspace-option-name">
                    {w.name}
                    <small>
                      {w.parts.length} parts · {w.categories.length} categories
                    </small>
                  </span>
                  {w.id === workspace.id && <Check size={15} />}
                </button>
                {workspaces.length > 1 && (
                  <button
                    className="icon-button workspace-delete"
                    role="menuitem"
                    aria-label={`Delete workspace ${w.name}`}
                    title={`Delete ${w.name}`}
                    onClick={() => {
                      setOpen(false);
                      onDelete(w);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="new-workspace-action"
            role="menuitem"
            onClick={() => edit("new")}
          >
            <Plus size={16} /> New workspace
          </button>
        </div>
      )}
      {mode && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMode(null);
          }}
        >
          <form
            className="small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-form-title"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              mode === "new" ? onCreate(name.trim()) : onRename(name.trim());
              setMode(null);
              trigger.current?.focus();
            }}
          >
            <button
              type="button"
              className="icon-button modal-close"
              aria-label="Close workspace dialog"
              onClick={() => setMode(null)}
            >
              <X size={18} />
            </button>
            <span className="eyebrow">PROJECT WORKSPACE</span>
            <h2 id="workspace-form-title">
              {mode === "new"
                ? "Start a new workspace."
                : "Rename your workspace."}
            </h2>
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="submit"
              className="button full"
              disabled={!name.trim()}
            >
              {mode === "new" ? <Plus size={16} /> : <Check size={16} />}{" "}
              {mode === "new" ? "Create workspace" : "Save name"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
