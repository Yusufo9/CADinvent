import {
  defaultCategories,
  type Workspace,
  type WorkspaceState,
  type Library,
} from "../types";
export function createWorkspace(name: string): Workspace {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    categories: defaultCategories.map((c) => ({ ...c })),
    parts: [],
  };
}
export function uniqueWorkspaceName(name: string, workspaces: Workspace[]) {
  const used = new Set(workspaces.map((w) => w.name.toLocaleLowerCase()));
  const base = name.trim().slice(0, 80);
  let result = base;
  let n = 2;
  while (used.has(result.toLocaleLowerCase())) {
    const suffix = ` (${n++})`;
    result = base.slice(0, 80 - suffix.length) + suffix;
  }
  return result;
}
export function updateWorkspaceLibrary(
  state: WorkspaceState,
  id: string,
  update: Library | ((current: Library) => Library),
): WorkspaceState {
  return {
    ...state,
    workspaces: state.workspaces.map((w) =>
      w.id === id
        ? { ...w, ...(typeof update === "function" ? update(w) : update) }
        : w,
    ),
  };
}

export function removeWorkspace(
  state: WorkspaceState,
  id: string,
): WorkspaceState {
  if (
    state.workspaces.length <= 1 ||
    !state.workspaces.some((w) => w.id === id)
  )
    return state;
  const workspaces = state.workspaces.filter((w) => w.id !== id);
  return {
    workspaces,
    activeWorkspaceId:
      state.activeWorkspaceId === id
        ? workspaces[0].id
        : state.activeWorkspaceId,
  };
}
