import { openDB } from "idb";
import type { Library } from "../types";
const db = openDB("cadinvent", 1, {
  upgrade(db) {
    db.createObjectStore("library");
    db.createObjectStore("files");
  },
});
export async function loadLibrary(): Promise<Library | undefined> {
  return (await db).get("library", "current");
}
export async function saveLibrary(library: Library) {
  await (await db).put("library", library, "current");
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
