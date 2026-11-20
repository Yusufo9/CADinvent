import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Path,
  Shape,
  BufferGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { packGeometry } from "./parser";
function plate(
  w: number,
  h: number,
  depth: number,
  holes: [number, number, number][] = [],
) {
  const shape = new Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();
  holes.forEach(([x, y, r]) => {
    const p = new Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    shape.holes.push(p);
  });
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.35,
    bevelThickness: 0.35,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 24,
  });
}
export function sampleMesh(key: string) {
  const [kind, number] = key.split(":");
  const n = Number(number) || 0;
  const pieces: BufferGeometry[] = [];
  if (kind === "bracket") {
    const w = 35 + n * 3;
    const h = 34 + n * 5;
    pieces.push(
      plate(w, 34, 4, [
        [-w / 3, 8, 2.8],
        [w / 3, 8, 2.8],
      ]),
    );
    const back = plate(w, h, 4, [
      [-w / 3, h / 4, 2.8],
      [w / 3, h / 4, 2.8],
    ]);
    back.rotateX(Math.PI / 2);
    back.translate(0, -15, h / 2);
    pieces.push(back);
    if (n % 2 === 1) {
      const rib = new Shape();
      rib.moveTo(0, 0);
      rib.lineTo(25, 0);
      rib.lineTo(0, 25);
      rib.closePath();
      const g = new ExtrudeGeometry(rib, { depth: 3, bevelEnabled: false });
      g.rotateY(-Math.PI / 2);
      g.translate(0, -13, 4);
      pieces.push(g);
    }
  } else if (kind === "hub") {
    const s = new Shape();
    s.absarc(0, 0, 23 + n * 2, 0, Math.PI * 2, false);
    const bore = new Path();
    bore.absarc(0, 0, 8 + n, 0, Math.PI * 2, true);
    s.holes.push(bore);
    for (let i = 0; i < 6; i++) {
      const p = new Path();
      p.absarc(
        Math.cos((i * Math.PI) / 3) * 17,
        Math.sin((i * Math.PI) / 3) * 17,
        2,
        0,
        Math.PI * 2,
        true,
      );
      s.holes.push(p);
    }
    pieces.push(
      new ExtrudeGeometry(s, {
        depth: 8 + n * 4,
        bevelEnabled: true,
        bevelSize: 0.5,
        bevelThickness: 0.5,
        bevelSegments: 2,
        curveSegments: 40,
      }),
    );
  } else if (kind === "mount") {
    pieces.push(
      plate(54, 40, 5, [
        [-20, -13, 3],
        [20, -13, 3],
        [-20, 13, 3],
        [20, 13, 3],
      ]),
    );
    const neck = new CylinderGeometry(9, 14, 18 + n * 4, 32);
    neck.rotateX(Math.PI / 2);
    neck.translate(0, 0, 14 + n * 2);
    pieces.push(neck);
  } else {
    pieces.push(plate(56, 42, 3));
    for (const x of [-27, 27]) {
      const g = new BoxGeometry(3, 42, 22);
      g.translate(x, 0, 13);
      pieces.push(g);
    }
    for (const y of [-20, 20]) {
      const g = new BoxGeometry(51, 3, 22);
      g.translate(0, y, 13);
      pieces.push(g);
    }
  }
  const clean = pieces.map((g) => {
    const flat = g.index ? g.toNonIndexed() : g;
    for (const key of Object.keys(flat.attributes))
      if (key !== "position") flat.deleteAttribute(key);
    return flat;
  });
  const merged = mergeGeometries(clean)!;
  const result = packGeometry(merged);
  [...pieces, ...clean].forEach((g) => g.dispose());
  return result;
}
export const samples = [
  ["Angle bracket", "brackets", "bracket:0"],
  ["Gusset bracket", "brackets", "bracket:1"],
  ["Wide angle bracket", "brackets", "bracket:2"],
  ["Corner support", "brackets", "bracket:3"],
  ["Tall angle bracket", "brackets", "bracket:4"],
  ["Reinforced bracket", "brackets", "bracket:5"],
  ["Flange hub", "hubs", "hub:0"],
  ["Shaft coupling", "hubs", "hub:1"],
  ["Spacer hub", "hubs", "hub:2"],
  ["Extended coupling", "hubs", "hub:3"],
  ["Motor mount", "mounts", "mount:0"],
  ["Sensor pedestal", "mounts", "mount:1"],
  ["Bearing mount", "mounts", "mount:2"],
  ["Electronics tray", "enclosures", "enclosure:0"],
];
