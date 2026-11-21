import { openDB } from "idb";
import type { Library, WorkspaceState } from "../types";
import { createWorkspace } from "./workspaces";
const db = openDB("cadinvent", 1, {
  upgrade(db) {
    db.createObjectStore("library");
    db.createObjectStore("files");
  },
});
export async function loadWorkspaceState(): Promise<WorkspaceState> {
  const tx = (await db).transaction("library", "readwrite");
  const saved = (await tx.store.get("workspaces-v1")) as
    WorkspaceState | undefined;
  if (saved) {
    await tx.done;
    return saved;
  }
  const legacy = (await tx.store.get("current")) as Library | undefined;
  const first = { ...createWorkspace("Personal workspace 1"), ...legacy };
  const state = { activeWorkspaceId: first.id, workspaces: [first] };
  await tx.store.put(state, "workspaces-v1");
  await tx.store.delete("current");
  await tx.done;
  return state;
}
export async function saveWorkspaceState(state: WorkspaceState) {
  await (await db).put("library", state, "workspaces-v1");
}
export async function saveRestoredWorkspace(
  state: WorkspaceState,
  files: Map<string, File>,
) {
  const tx = (await db).transaction(["library", "files"], "readwrite");
  try {
    for (const [id, file] of files) await tx.objectStore("files").add(file, id);
    await tx.objectStore("library").put(state, "workspaces-v1");
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted by IndexedDB. */
    }
    await tx.done.catch(() => {});
    throw error;
  }
}
export async function saveFile(id: string, file: File) {
  await (await db).put("files", file, id);
}
export async function loadFile(id: string): Promise<File | undefined> {
  return (await db).get("files", id);
}
export async function deleteFile(id: string) {
  await (await db).delete("files", id);
}

export async function saveWorkspaceRemoval(
  state: WorkspaceState,
  removedIds: string[],
) {
  const retained = new Set(
    state.workspaces.flatMap((w) => w.parts.map((p) => p.id)),
  );
  const tx = (await db).transaction(["library", "files"], "readwrite");
  try {
    for (const id of removedIds) {
      if (!retained.has(id)) await tx.objectStore("files").delete(id);
    }
    await tx.objectStore("library").put(state, "workspaces-v1");
    await tx.objectStore("library").delete("current");
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted. */
    }
    await tx.done.catch(() => {});
    throw error;
  }
}
