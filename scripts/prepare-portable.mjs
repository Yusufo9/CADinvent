import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dist = new URL("../dist/", import.meta.url);
const target = new URL("../portable/public/", import.meta.url);
await readFile(new URL("index.html", dist));
// Only this fixed, generated directory is replaced. User libraries are in IndexedDB.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(dist, target, { recursive: true });
console.log(`Prepared embedded application: ${fileURLToPath(target)}`);
