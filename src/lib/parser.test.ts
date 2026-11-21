import { describe, expect, it } from "vitest";
import { parseMesh } from "./parser";
import { sampleMesh } from "./legacySamples";
const buffer = (s: string) => new TextEncoder().encode(s).buffer;
describe("mesh import", () => {
  it("reads ASCII STL and preserves dimensions before centering", () => {
    const mesh = parseMesh(
      buffer(
        "solid triangle\nfacet normal 0 0 1\nouter loop\nvertex 2 3 0\nvertex 6 3 0\nvertex 2 8 0\nendloop\nendfacet\nendsolid triangle",
      ),
      "stl",
    );
    expect(mesh.triangles).toBe(1);
    expect(mesh.dimensions).toEqual([4, 5, 0]);
    expect(Array.from(mesh.positions)).toEqual([
      -2, -2.5, 0, 2, -2.5, 0, -2, 2.5, 0,
    ]);
  });
  it("reads binary STL", () => {
    const b = new ArrayBuffer(134);
    const d = new DataView(b);
    d.setUint32(80, 1, true);
    [0, 0, 0, 4, 0, 0, 0, 5, 0].forEach((v, i) =>
      d.setFloat32(96 + i * 4, v, true),
    );
    expect(parseMesh(b, "stl").dimensions).toEqual([4, 5, 0]);
  });
  it("merges OBJ groups and triangulates faces", () => {
    const mesh = parseMesh(
      buffer("o a\nv 0 0 0\nv 2 0 0\nv 2 2 0\nv 0 2 0\nf 1 2 3 4"),
      "obj",
    );
    expect(mesh.triangles).toBe(2);
    expect(mesh.dimensions).toEqual([2, 2, 0]);
  });
  it("reads indexed PLY surfaces", () => {
    const mesh = parseMesh(
      buffer(
        "ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n",
      ),
      "ply",
    );
    expect(mesh.triangles).toBe(1);
  });
  it("rejects empty, unsupported, and non-finite geometry", () => {
    expect(() =>
      parseMesh(buffer("solid empty\nendsolid empty"), "stl"),
    ).toThrow("No valid");
    expect(() => parseMesh(buffer(""), "step")).toThrow("not supported");
    expect(() =>
      parseMesh(buffer("v NaN 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3"), "obj"),
    ).toThrow("invalid coordinates");
  });
  it.each(["bracket:1", "hub:2", "mount:0", "enclosure:0"])(
    "generates inspectable sample %s",
    (key) => {
      const m = sampleMesh(key);
      expect(m.triangles).toBeGreaterThan(10);
      expect(m.dimensions.every((n) => Number.isFinite(n) && n > 0)).toBe(true);
    },
  );
});
