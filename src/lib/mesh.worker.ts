import { parseMesh } from "./parser";
self.onmessage = (
  event: MessageEvent<{ buffer: ArrayBuffer; format: string }>,
) => {
  try {
    const mesh = parseMesh(event.data.buffer, event.data.format);
    self.postMessage(
      { mesh },
      { transfer: [mesh.positions.buffer, mesh.normals.buffer] },
    );
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Unable to parse model.",
    });
  }
};
