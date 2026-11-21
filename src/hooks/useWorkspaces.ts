import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { Library, Workspace, WorkspaceState } from "../types";
import {
  createWorkspace,
  uniqueWorkspaceName,
  updateWorkspaceLibrary,
  removeWorkspace,
} from "../lib/workspaces";
import {
  loadWorkspaceState,
  saveRestoredWorkspace,
  saveWorkspaceState,
  saveWorkspaceRemoval,
} from "../lib/storage";
const initialWorkspace = createWorkspace("Personal workspace 1");
const initialState = {
  activeWorkspaceId: initialWorkspace.id,
  workspaces: [initialWorkspace],
};
export function useWorkspaces(onError: (message: string) => void) {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Opening local storage…");
  const loaded = useRef(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef(state);
  latest.current = state;
  const lastSaved = useRef<WorkspaceState | undefined>(undefined);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadWorkspaceState()
      .then((saved) => {
        lastSaved.current = saved;
        setState(saved);
        setSaveStatus("Saved on this device");
        setReady(true);
      })
      .catch(() => {
        setSaveStatus("Storage unavailable");
        onError(
          "Browser storage could not be opened. Reload before editing your library.",
        );
      });
  }, [onError]);
  useEffect(() => {
    if (!ready || state === lastSaved.current) return;
    setSaveStatus("Saving…");
    writes.current = writes.current
      .catch(() => {})
      .then(() => saveWorkspaceState(state))
      .then(() => {
        lastSaved.current = state;
        if (latest.current === state) setSaveStatus("Saved on this device");
      })
      .catch(() => {
        setSaveStatus("Changes not saved");
        onError(
          "Could not save workspace changes. Export a workspace backup before leaving this page.",
        );
      });
  }, [state, ready, onError]);
  const workspace = state.workspaces.find(
    (w) => w.id === state.activeWorkspaceId,
  )!;
  const setLibrary = useCallback(
    (update: SetStateAction<Library>) =>
      setState((current) =>
        updateWorkspaceLibrary(current, workspace.id, update),
      ),
    [workspace.id],
  );
  function selectWorkspace(id: string) {
    setState((current) =>
      current.workspaces.some((w) => w.id === id)
        ? { ...current, activeWorkspaceId: id }
        : current,
    );
  }
  function addWorkspace(name: string) {
    setState((current) => {
      const w = createWorkspace(
        uniqueWorkspaceName(name.trim(), current.workspaces),
      );
      return {
        activeWorkspaceId: w.id,
        workspaces: [...current.workspaces, w],
      };
    });
  }
  function renameWorkspace(name: string) {
    setState((current) => ({
      ...current,
      workspaces: current.workspaces.map((w) =>
        w.id === workspace.id ? { ...w, name: name.trim() } : w,
      ),
    }));
  }
  async function restoreWorkspace(
    restored: Workspace,
    files: Map<string, File>,
  ) {
    await writes.current;
    const current = latest.current;
    const workspace = {
      ...restored,
      name: uniqueWorkspaceName(restored.name, current.workspaces),
    };
    const next = {
      activeWorkspaceId: workspace.id,
      workspaces: [...current.workspaces, workspace],
    };
    await saveRestoredWorkspace(next, files);
    lastSaved.current = next;
    setState(next);
    setSaveStatus("Saved on this device");
    return workspace.name;
  }
  async function deleteWorkspace(id: string) {
    await writes.current;
    const current = latest.current;
    const removed = current.workspaces.find((w) => w.id === id);
    if (!removed || current.workspaces.length <= 1) return;
    const next = removeWorkspace(current, id);
    await saveWorkspaceRemoval(
      next,
      removed.parts.map((p) => p.id),
    );
    lastSaved.current = next;
    setState(next);
    setSaveStatus("Saved on this device");
  }
  return {
    workspace,
    workspaces: state.workspaces,
    setLibrary,
    selectWorkspace,
    addWorkspace,
    renameWorkspace,
    restoreWorkspace,
    deleteWorkspace,
    ready,
    saveStatus,
  };
}
