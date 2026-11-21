import { Mesh } from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { sampleMesh } from "./legacySamples";
import { geometryFrom } from "./rendering";
export function sampleSTL(key: string): Uint8Array {
  const geometry = geometryFrom(sampleMesh(key));
  const mesh = new Mesh(geometry);
  try {
    const result = new STLExporter().parse(mesh, { binary: true });
    return new Uint8Array(result.buffer as ArrayBuffer);
  } finally {
    geometry.dispose();
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
      (m) => m.dispose(),
    );
  }
}
