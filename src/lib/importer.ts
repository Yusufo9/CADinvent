import type { MeshData } from "../types";
export async function parseFile(file: File): Promise<MeshData> {
  if (file.size > 80 * 1024 * 1024)
    throw new Error("File exceeds the 80 MB import limit.");
  const format = file.name.split(".").pop()!.toLowerCase();
  if (!["stl", "obj", "ply"].includes(format))
    throw new Error(
      `.${format.toUpperCase()} is not supported. Use STL, OBJ, or PLY.`,
    );
  const buffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./mesh.worker.ts", import.meta.url), {
      type: "module",
    });
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Parsing timed out after 30 seconds."));
    }, 30000);
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = ({ data }) => {
      finish();
      data.error ? reject(new Error(data.error)) : resolve(data.mesh);
    };
    worker.onerror = () => {
      finish();
      reject(new Error("Model parser could not complete."));
    };
    worker.postMessage({ buffer, format }, [buffer]);
  });
}
