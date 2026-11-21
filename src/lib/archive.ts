import { strFromU8, unzipSync, zipSync } from "fflate";
import type { Category } from "../types";
export const MAX_BACKUP_BYTES = 256 * 1024 * 1024;
export const MAX_MODEL_BYTES = 80 * 1024 * 1024;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
export interface BackupPart {
  id: string;
  name: string;
  categoryId: string;
  format: string;
  bytes: number;
  sha256: string;
  path: string;
  createdAt: string;
  favorite: boolean;
}
export interface WorkspaceManifest {
  kind: "cadinvent-workspace";
  schemaVersion: 1;
  backupId: string;
  exportedAt: string;
  workspace: { name: string; createdAt: string };
  categories: Category[];
  parts: BackupPart[];
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid workspace data.");
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 256): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("Invalid or missing workspace text field.");
  return value;
}
function date(value: unknown) {
  const result = string(value);
  if (!Number.isFinite(Date.parse(result)))
    throw new Error("Invalid date in workspace data.");
  return result;
}
export function validateManifest(text: string): WorkspaceManifest {
  if (new TextEncoder().encode(text).length > MAX_JSON_BYTES)
    throw new Error("Workspace JSON exceeds 8 MB.");
  let input;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("Workspace JSON is not valid JSON.");
  }
  const raw = object(input);
  if (raw.kind !== "cadinvent-workspace" || raw.schemaVersion !== 1)
    throw new Error("This is not a supported CADinvent workspace backup.");
  const workspace = object(raw.workspace);
  if (
    !Array.isArray(raw.categories) ||
    raw.categories.length > 1000 ||
    !Array.isArray(raw.parts) ||
    raw.parts.length > 5000
  )
    throw new Error("Invalid category or part list in workspace data.");
  const ids = new Set<string>();
  const categories = raw.categories.map((value) => {
    const c = object(value);
    const id = string(c.id);
    if (ids.has(id)) throw new Error("Duplicate category ID.");
    ids.add(id);
    const color = string(c.color);
    if (!/^#[0-9a-f]{6}$/i.test(color))
      throw new Error("Invalid category color.");
    return {
      id,
      name: string(c.name, 80),
      color,
      collapsed: c.collapsed === true,
      favorite: c.favorite === true,
      includedInAll:
        typeof c.includedInAll === "boolean"
          ? c.includedInAll
          : id !== "unclassified",
    };
  });
  const partIds = new Set<string>(),
    paths = new Set<string>();
  let total = 0;
  const parts = raw.parts.map((value) => {
    const p = object(value);
    const id = string(p.id),
      path = string(p.path),
      format = string(p.format),
      name = string(p.name),
      categoryId = string(p.categoryId),
      sha256 = string(p.sha256);
    if (partIds.has(id) || paths.has(path))
      throw new Error("Duplicate part ID or model path.");
    partIds.add(id);
    paths.add(path);
    if (
      !/^models\/\d+\.(stl|obj|ply)$/.test(path) ||
      !["STL", "OBJ", "PLY"].includes(format) ||
      !path.endsWith("." + format.toLowerCase()) ||
      name.split(".").pop()?.toUpperCase() !== format
    )
      throw new Error("Invalid model path or format.");
    if (!ids.has(categoryId))
      throw new Error("Part references an unknown category.");
    if (!/^[a-f0-9]{64}$/.test(sha256))
      throw new Error("Invalid model checksum.");
    if (
      typeof p.bytes !== "number" ||
      !Number.isSafeInteger(p.bytes) ||
      p.bytes <= 0 ||
      p.bytes > MAX_MODEL_BYTES
    )
      throw new Error("Invalid model size or model exceeds 80 MB.");
    total += p.bytes;
    if (total > MAX_BACKUP_BYTES)
      throw new Error("Workspace models exceed the 256 MB backup limit.");
    return {
      id,
      path,
      format,
      name,
      categoryId,
      sha256,
      bytes: p.bytes,
      createdAt: date(p.createdAt),
      favorite: p.favorite === true,
    };
  });
  return {
    kind: "cadinvent-workspace",
    schemaVersion: 1,
    backupId: string(raw.backupId),
    exportedAt: date(raw.exportedAt),
    workspace: {
      name: string(workspace.name, 80),
      createdAt: date(workspace.createdAt),
    },
    categories,
    parts,
  };
}
export function packArchive(entries: Record<string, Uint8Array>): Uint8Array {
  return zipSync({ ...entries, "models/": new Uint8Array() }, { level: 1 });
}
export function unpackArchive(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.byteLength > MAX_BACKUP_BYTES + MAX_JSON_BYTES)
    throw new Error("ZIP exceeds the 264 MB archive limit.");
  let expanded = 0,
    count = 0,
    error = "";
  const names = new Set<string>();
  const result = unzipSync(bytes, {
    filter(file) {
      count++;
      expanded += file.originalSize;
      if (
        names.has(file.name) ||
        count > 5002 ||
        expanded > MAX_BACKUP_BYTES + MAX_JSON_BYTES ||
        file.originalSize >
          (file.name === "workspace.json" ? MAX_JSON_BYTES : MAX_MODEL_BYTES)
      )
        error = "ZIP has duplicate entries or exceeds the backup size limits.";
      if (
        file.name !== "workspace.json" &&
        !(file.name === "models/" && file.originalSize === 0) &&
        !/^models\/\d+\.(stl|obj|ply)$/.test(file.name)
      )
        error = "ZIP contains an unexpected file path.";
      names.add(file.name);
      return !error;
    },
  });
  if (error) throw new Error(error);
  if (!result["workspace.json"])
    throw new Error(
      "ZIP does not contain workspace.json. Choose a CADinvent workspace backup.",
    );
  return result;
}
export function manifestFromArchive(entries: Record<string, Uint8Array>) {
  return validateManifest(strFromU8(entries["workspace.json"]));
}
export async function checksum(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer,
  );
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function verifyArchive(entries: Record<string, Uint8Array>) {
  const manifest = manifestFromArchive(entries);
  if (
    Object.keys(entries).filter((key) => key !== "models/").length !==
    manifest.parts.length + 1
  )
    throw new Error("ZIP file list does not match the workspace data.");
  for (const p of manifest.parts) {
    const bytes = entries[p.path];
    if (
      !bytes ||
      bytes.length !== p.bytes ||
      (await checksum(bytes)) !== p.sha256
    )
      throw new Error(
        `Missing or damaged model: ${p.name}. Nothing was imported.`,
      );
  }
  return manifest;
}
