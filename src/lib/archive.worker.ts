import { packArchive, unpackArchive } from "./archive";
self.onmessage = (
  event: MessageEvent<{
    operation: "pack" | "unpack";
    entries?: Record<string, Uint8Array>;
    bytes?: Uint8Array;
  }>,
) => {
  try {
    if (event.data.operation === "pack") {
      const bytes = packArchive(event.data.entries!);
      self.postMessage({ bytes }, { transfer: [bytes.buffer] });
    } else {
      const entries = unpackArchive(event.data.bytes!);
      self.postMessage(
        { entries },
        { transfer: [...new Set(Object.values(entries).map((b) => b.buffer))] },
      );
    }
  } catch (e) {
    self.postMessage({
      error:
        e instanceof Error ? e.message : "Could not read workspace archive.",
    });
  }
};
