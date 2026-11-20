import { BufferGeometry, Mesh } from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { MeshData } from "../types";
export function packGeometry(input: BufferGeometry): MeshData {
  const g = input.index ? input.toNonIndexed() : input;
  const p = g.getAttribute("position");
  if (!p || p.count < 3 || p.count % 3 !== 0)
    throw new Error("No valid triangle mesh found.");
  if (p.count > 6_000_000)
    throw new Error("Mesh exceeds the 2 million triangle limit.");
  for (let i = 0; i < p.array.length; i++)
    if (!Number.isFinite(p.array[i]))
      throw new Error("Mesh contains invalid coordinates.");
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const dimensions = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  if (Math.max(...dimensions) === 0)
    throw new Error("Mesh has no measurable size.");
  g.center();
  g.computeVertexNormals();
  const result = {
    positions: new Float32Array(g.getAttribute("position").array),
    normals: new Float32Array(g.getAttribute("normal").array),
    dimensions,
    triangles: p.count / 3,
  };
  g.dispose();
  input.dispose();
  return result;
}
export function parseMesh(buffer: ArrayBuffer, format: string): MeshData {
  let geometry: BufferGeometry;
  if (format === "stl") {
    if (buffer.byteLength < 84)
      throw new Error("No valid STL mesh found: file is empty or truncated.");
    geometry = new STLLoader().parse(buffer);
  } else if (format === "ply") geometry = new PLYLoader().parse(buffer);
  else if (format === "obj") {
    const object = new OBJLoader().parse(new TextDecoder().decode(buffer));
    object.updateMatrixWorld(true);
    const geometries: BufferGeometry[] = [];
    object.traverse((child) => {
      if (child instanceof Mesh) {
        const g = child.geometry.index
          ? child.geometry.toNonIndexed()
          : child.geometry.clone();
        g.applyMatrix4(child.matrixWorld);
        for (const name of Object.keys(g.attributes))
          if (name !== "position") g.deleteAttribute(name);
        geometries.push(g);
        child.geometry.dispose();
        (Array.isArray(child.material)
          ? child.material
          : [child.material]
        ).forEach((m) => m.dispose());
      }
    });
    if (!geometries.length) throw new Error("OBJ contains no mesh surfaces.");
    geometry = mergeGeometries(geometries)!;
    geometries.forEach((g) => g.dispose());
  } else
    throw new Error(
      `.${format.toUpperCase()} is not supported yet. Use STL, OBJ, or PLY.`,
    );
  return packGeometry(geometry);
}
