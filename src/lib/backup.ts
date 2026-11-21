import type { Part, Workspace } from "../types";
import {
  checksum,
  MAX_BACKUP_BYTES,
  MAX_MODEL_BYTES,
  validateManifest,
  verifyArchive,
  type WorkspaceManifest,
} from "./archive";
import { loadFile } from "./storage";
import { parseFile } from "./importer";
export interface BackupDownload {
  zip: Uint8Array;
  name: string;
}
function archiveWorker(
  input:
    | { operation: "pack"; entries: Record<string, Uint8Array> }
    | { operation: "unpack"; bytes: Uint8Array },
): Promise<{ bytes: Uint8Array; entries: Record<string, Uint8Array> }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./archive.worker.ts", import.meta.url), {
      type: "module",
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Workspace archive processing timed out."));
    }, 120000);
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    worker.onmessage = ({ data }) => {
      finish();
      data.error ? reject(new Error(data.error)) : resolve(data);
    };
    worker.onerror = () => {
      finish();
      reject(new Error("Workspace archive could not be processed."));
    };
    const transfer =
      input.operation === "pack"
        ? Object.values(input.entries).map((b) => b.buffer)
        : [input.bytes.buffer];
    worker.postMessage(input, transfer);
  });
}
async function sourceFile(part: Part): Promise<File> {
  if (!part.demo) {
    const file = await loadFile(part.id);
    if (!file)
      throw new Error(
        `Source file missing: ${part.name}. Backup was not created.`,
      );
    return file;
  }
  const { sampleSTL } = await import("./sampleExport");
  return new File([new Uint8Array(sampleSTL(part.demo)).buffer], part.name, {
    type: "model/stl",
  });
}
export async function createBackup(
  workspace: Workspace,
  progress: (s: string) => void,
): Promise<BackupDownload> {
  const entries: Record<string, Uint8Array> = Object.create(null);
  const manifest: WorkspaceManifest = {
    kind: "cadinvent-workspace",
    schemaVersion: 1,
    backupId: crypto.randomUUID(),
    exportedAt: new Date().toISOString(),
    workspace: { name: workspace.name, createdAt: workspace.createdAt },
    categories: workspace.categories.map((c) => ({ ...c })),
    parts: [],
  };
  let total = 0;
  for (let i = 0; i < workspace.parts.length; i++) {
    const part = workspace.parts[i];
    progress(`Packing ${i + 1} of ${workspace.parts.length} · ${part.name}`);
    const file = await sourceFile(part);
    total += file.size;
    if (file.size > MAX_MODEL_BYTES || total > MAX_BACKUP_BYTES)
      throw new Error(
        "Workspace backup supports up to 256 MB of models and 80 MB per file.",
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = `models/${i}.${part.format.toLowerCase()}`;
    entries[path] = bytes;
    manifest.parts.push({
      id: part.id,
      name: part.name,
      categoryId: part.categoryId,
      format: part.format,
      bytes: bytes.length,
      sha256: await checksum(bytes),
      path,
      createdAt: part.createdAt,
      favorite: !!part.favorite,
    });
  }
  const json = JSON.stringify(manifest, null, 2);
  validateManifest(json);
  entries["workspace.json"] = new TextEncoder().encode(json);
  progress("Compressing workspace backup…");
  const { bytes } = await archiveWorker({ operation: "pack", entries });
  return {
    zip: bytes,
    name:
      workspace.name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 70) ||
      "workspace",
  };
}
export async function readBackup(
  files: File[],
  progress: (s: string) => void,
): Promise<{ workspace: Workspace; files: Map<string, File> }> {
  const zip = files.filter((f) => f.name.toLowerCase().endsWith(".zip"));
  if (zip.length !== 1 || files.length !== 1)
    throw new Error("Select exactly one CADinvent workspace ZIP file.");
  if (zip[0].size > MAX_BACKUP_BYTES + 8 * 1024 * 1024)
    throw new Error("Workspace backup exceeds the supported size limit.");
  progress("Checking workspace backup…");
  const { entries } = await archiveWorker({
    operation: "unpack",
    bytes: new Uint8Array(await zip[0].arrayBuffer()),
  });
  const manifest = await verifyArchive(entries);
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name: manifest.workspace.name,
    createdAt: manifest.workspace.createdAt,
    categories: manifest.categories,
    parts: [],
  };
  const sources = new Map<string, File>();
  const { thumbnail, releaseThumbnailRenderer } = await import("./rendering");
  try {
    for (let i = 0; i < manifest.parts.length; i++) {
      const p = manifest.parts[i];
      progress(`Restoring ${i + 1} of ${manifest.parts.length} · ${p.name}`);
      const id = crypto.randomUUID();
      const file = new File([new Uint8Array(entries[p.path]).buffer], p.name, {
        type: "application/octet-stream",
      });
      delete entries[p.path];
      const mesh = await parseFile(file);
      workspace.parts.push({
        id,
        name: p.name,
        categoryId: p.categoryId,
        format: p.format,
        bytes: file.size,
        triangles: mesh.triangles,
        dimensions: mesh.dimensions,
        thumbnail: thumbnail(mesh),
        createdAt: p.createdAt,
        favorite: p.favorite,
      });
      sources.set(id, file);
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    releaseThumbnailRenderer();
  }
  return { workspace, files: sources };
}
