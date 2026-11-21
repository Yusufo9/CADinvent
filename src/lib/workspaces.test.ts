import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { openDB } from "idb";
import {
  loadFile,
  loadWorkspaceState,
  saveFile,
  saveRestoredWorkspace,
  saveWorkspaceState,
  saveWorkspaceRemoval,
} from "./storage";
import {
  createWorkspace,
  uniqueWorkspaceName,
  updateWorkspaceLibrary,
  removeWorkspace,
} from "./workspaces";
import type { Part } from "../types";
const part: Part = {
  id: "legacy-file",
  name: "a.obj",
  categoryId: "brackets",
  format: "OBJ",
  bytes: 4,
  triangles: 1,
  dimensions: [1, 1, 1],
  thumbnail: "data:image/webp;base64,AA",
  createdAt: "2026-11-20",
};
beforeEach(async () => {
  const db = await openDB("cadinvent", 1);
  await db.clear("library");
  await db.clear("files");
  db.close();
});
describe("multiple workspace persistence", () => {
  it("migrates the old library and keeps file references without duplicating it on reload", async () => {
    const db = await openDB("cadinvent", 1);
    await db.put(
      "library",
      { categories: createWorkspace("a").categories, parts: [part] },
      "current",
    );
    await saveFile(part.id, new File(["mesh"], "a.obj"));
    const state = await loadWorkspaceState();
    expect(state.workspaces[0].name).toBe("Personal workspace 1");
    expect(state.workspaces[0].parts[0].id).toBe(part.id);
    expect(await loadFile(part.id)).toBeDefined();
    expect((await loadWorkspaceState()).workspaces).toHaveLength(1);
    db.close();
  });
  it("keeps project libraries separate and remembers the active workspace", async () => {
    const a = createWorkspace("A"),
      b = createWorkspace("B");
    let state = { activeWorkspaceId: b.id, workspaces: [a, b] };
    state = updateWorkspaceLibrary(state, a.id, (l) => ({
      ...l,
      parts: [part],
    }));
    expect(state.workspaces[1].parts).toHaveLength(0);
    await saveWorkspaceState(state);
    const loaded = await loadWorkspaceState();
    expect(loaded.activeWorkspaceId).toBe(b.id);
    expect(loaded.workspaces[0].parts).toHaveLength(1);
  });
  it("commits restored files and workspace together", async () => {
    const state = await loadWorkspaceState();
    const w = createWorkspace("Imported");
    w.parts = [{ ...part, id: "fresh" }];
    const next = {
      activeWorkspaceId: w.id,
      workspaces: [...state.workspaces, w],
    };
    await saveRestoredWorkspace(
      next,
      new Map([["fresh", new File(["test"], "a.obj")]]),
    );
    expect((await loadWorkspaceState()).workspaces).toHaveLength(2);
    expect(await loadFile("fresh")).toBeDefined();
  });
  it("rolls back all restore writes when a file ID conflicts", async () => {
    const state = await loadWorkspaceState();
    await saveFile("conflict", new File(["original"], "a.obj"));
    const w = createWorkspace("bad");
    await expect(
      saveRestoredWorkspace(
        { activeWorkspaceId: w.id, workspaces: [...state.workspaces, w] },
        new Map([
          ["fresh", new File(["new"], "b.obj")],
          ["conflict", new File(["bad"], "a.obj")],
        ]),
      ),
    ).rejects.toBeDefined();
    expect(await loadFile("fresh")).toBeUndefined();
    expect((await loadWorkspaceState()).workspaces).toHaveLength(1);
  });
  it("gives restored projects a unique name without changing existing names", () => {
    const a = createWorkspace("Project"),
      b = createWorkspace("Project (2)");
    expect(uniqueWorkspaceName("Project", [a, b])).toBe("Project (3)");
    expect(a.name).toBe("Project");
    const long = "A".repeat(80);
    expect(uniqueWorkspaceName(long, [createWorkspace(long)]).length).toBe(80);
  });
  it("deletes workspace metadata and its source copies while keeping other projects", async () => {
    const a = createWorkspace("A"),
      b = createWorkspace("B");
    a.parts = [part];
    b.parts = [{ ...part, id: "kept" }];
    const state = { activeWorkspaceId: a.id, workspaces: [a, b] };
    await saveRestoredWorkspace(
      state,
      new Map([
        [part.id, new File(["a"], "a.obj")],
        ["kept", new File(["b"], "b.obj")],
      ]),
    );
    const next = removeWorkspace(state, a.id);
    await saveWorkspaceRemoval(next, [part.id]);
    expect(await loadFile(part.id)).toBeUndefined();
    expect(await loadFile("kept")).toBeDefined();
    const loaded = await loadWorkspaceState();
    expect(loaded.activeWorkspaceId).toBe(b.id);
    expect(loaded.workspaces.map((w) => w.id)).toEqual([b.id]);
  });
  it("keeps the active project when deleting another and replaces the last with an empty workspace", () => {
    const a = createWorkspace("A"),
      b = createWorkspace("B");
    const next = removeWorkspace(
      { activeWorkspaceId: a.id, workspaces: [a, b] },
      b.id,
    );
    expect(next.activeWorkspaceId).toBe(a.id);
    const empty = removeWorkspace(next, a.id);
    expect(empty.workspaces).toHaveLength(1);
    expect(empty.workspaces[0].name).toBe("Personal workspace 1");
    expect(empty.workspaces[0].parts).toEqual([]);
    expect(empty.activeWorkspaceId).not.toBe(a.id);
  });
});
