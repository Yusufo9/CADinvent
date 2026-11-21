import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  checksum,
  packArchive,
  unpackArchive,
  validateManifest,
  verifyArchive,
  type WorkspaceManifest,
} from "./archive";
import { defaultCategories } from "../types";
import { sampleSTL } from "./sampleExport";
import { parseMesh } from "./parser";
import { readBackup } from "./backup";
async function fixture() {
  const first = strToU8("o a\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3");
  const second = sampleSTL("bracket:0");
  const manifest: WorkspaceManifest = {
    kind: "cadinvent-workspace",
    schemaVersion: 1,
    backupId: "backup-a",
    exportedAt: "2026-11-20T00:00:00Z",
    workspace: { name: "Çizim projesi", createdAt: "2026-11-20T00:00:00Z" },
    categories: [
      ...defaultCategories,
      { id: "brackets", name: "Brackets", color: "#b4dc90" },
    ].map((c) => ({
      ...c,
      collapsed: c.id === "brackets",
      favorite: c.id === "brackets",
      includedInAll: false,
    })),
    parts: [],
  };
  for (const [i, bytes] of [first, second].entries()) {
    const format = i === 0 ? "OBJ" : "STL";
    manifest.parts.push({
      id: `part-${i}`,
      name: `parça.${format.toLowerCase()}`,
      categoryId: "brackets",
      format,
      bytes: bytes.length,
      sha256: await checksum(bytes),
      path: `models/${i}.${format.toLowerCase()}`,
      createdAt: "2026-11-20T00:00:00Z",
      favorite: i === 0,
    });
  }
  const entries = {
    "workspace.json": strToU8(JSON.stringify(manifest)),
    "models/0.obj": first,
    "models/1.stl": second,
  };
  return { manifest, entries };
}
describe("workspace backup", () => {
  it("accepts only a single ZIP at the workspace import boundary", async () => {
    await expect(
      readBackup([new File(["{}"], "workspace.json")], () => {}),
    ).rejects.toThrow("exactly one");
    await expect(
      readBackup([new File([""], "a.zip"), new File([""], "b.zip")], () => {}),
    ).rejects.toThrow("exactly one");
  });
  it("round trips metadata, favorites, collapsed categories, and real source bytes", async () => {
    const { entries } = await fixture();
    const restored = unpackArchive(packArchive(entries));
    const data = await verifyArchive(restored);
    expect(data.workspace.name).toBe("Çizim projesi");
    expect(data.parts[0].favorite).toBe(true);
    expect(data.categories.find((c) => c.id === "brackets")?.collapsed).toBe(
      true,
    );
    expect(data.categories.find((c) => c.id === "brackets")?.favorite).toBe(
      true,
    );
    expect(
      data.categories.find((c) => c.id === "brackets")?.includedInAll,
    ).toBe(false);
    expect(Object.keys(restored).sort()).toEqual([
      "models/",
      "models/0.obj",
      "models/1.stl",
      "workspace.json",
    ]);
    expect(restored["models/0.obj"]).toEqual(entries["models/0.obj"]);
    expect(
      parseMesh(new Uint8Array(restored["models/1.stl"]).buffer, "stl")
        .triangles,
    ).toBeGreaterThan(100);
  });
  it("supports empty workspaces and ZIP-only restores", async () => {
    const { manifest } = await fixture();
    manifest.parts = [];
    manifest.categories = [];
    const data = await verifyArchive(
      unpackArchive(
        packArchive({ "workspace.json": strToU8(JSON.stringify(manifest)) }),
      ),
    );
    expect(data.parts).toHaveLength(0);
  });
  it("restores categories without Unclassified and migrates older inclusion defaults", async () => {
    const { manifest, entries } = await fixture();
    manifest.categories = manifest.categories.filter(
      (c) => c.id !== "unclassified",
    );
    delete manifest.categories[0].includedInAll;
    entries["workspace.json"] = strToU8(JSON.stringify(manifest));
    const restored = await verifyArchive(unpackArchive(packArchive(entries)));
    expect(restored.categories.some((c) => c.id === "unclassified")).toBe(
      false,
    );
    expect(restored.categories[0].includedInAll).toBe(true);
  });
  it("rejects missing models and damaged model content", async () => {
    const { entries } = await fixture();
    entries["models/0.obj"][0] ^= 1;
    await expect(verifyArchive(entries)).rejects.toThrow("damaged model");
    const { entries: missing } = await fixture();
    delete (missing as Record<string, Uint8Array>)["models/1.stl"];
    await expect(verifyArchive(missing)).rejects.toThrow("file list");
  });
  it("keeps duplicate filenames distinct using per-part archive paths", async () => {
    const { manifest, entries } = await fixture();
    manifest.parts[1] = {
      ...manifest.parts[0],
      id: "part-b",
      path: "models/1.obj",
    };
    const data = await verifyArchive({
      "workspace.json": strToU8(JSON.stringify(manifest)),
      "models/0.obj": entries["models/0.obj"],
      "models/1.obj": entries["models/0.obj"],
    });
    expect(data.parts.map((p) => p.name)).toEqual(["parça.obj", "parça.obj"]);
  });
  it("rejects path traversal, unsupported schemas, and orphaned categories", async () => {
    const { manifest } = await fixture();
    expect(() =>
      unpackArchive(zipSync({ "../outside.stl": strToU8("x") })),
    ).toThrow("unexpected");
    expect(() =>
      validateManifest(JSON.stringify({ ...manifest, schemaVersion: 77 })),
    ).toThrow("not a supported");
    manifest.parts[0].categoryId = "absent";
    expect(() => validateManifest(JSON.stringify(manifest))).toThrow(
      "unknown category",
    );
  });
  it("rejects archives advertising enormous uncompressed entries before inflating", () => {
    const zipped = zipSync({ "workspace.json": strToU8("{}") });
    const view = new DataView(zipped.buffer);
    for (let i = 0; i < zipped.length - 24; i++) {
      if (view.getUint32(i, true) === 0x02014b50) {
        view.setUint32(i + 24, 400 * 1024 * 1024, true);
        break;
      }
    }
    expect(() => unpackArchive(zipped)).toThrow("size limits");
  });
});
