import * as THREE from "three";
import type { MeshData } from "../types";
export function geometryFrom(data: MeshData) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(data.positions, 3),
  );
  geometry.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
  return geometry;
}
export function makeScene(data: MeshData, color = "#b1b9ac") {
  const scene = new THREE.Scene();
  const geometry = geometryFrom(data);
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.5,
    roughness: 0.38,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  const scale = 2.7 / Math.max(...data.dimensions);
  mesh.scale.setScalar(scale);
  scene.add(mesh);
  scene.add(new THREE.HemisphereLight("#ffffff", "#3b4941", 3));
  const key = new THREE.DirectionalLight("#ffffff", 4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#bacce0", 3);
  rim.position.set(-4, 2, -2);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(5.3, 4, 5.3);
  camera.lookAt(0, 0, 0);
  return {
    scene,
    camera,
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
let thumbnailRenderer: THREE.WebGLRenderer | undefined;
export function thumbnail(data: MeshData, color?: string) {
  if (!thumbnailRenderer) {
    thumbnailRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    thumbnailRenderer.setSize(400, 400);
    thumbnailRenderer.setPixelRatio(1);
  }
  const view = makeScene(data, color);
  try {
    thumbnailRenderer.render(view.scene, view.camera);
    return thumbnailRenderer.domElement.toDataURL("image/webp", 0.85);
  } finally {
    view.dispose();
    thumbnailRenderer.renderLists.dispose();
  }
}
export function releaseThumbnailRenderer() {
  thumbnailRenderer?.dispose();
  thumbnailRenderer?.forceContextLoss();
  thumbnailRenderer = undefined;
}
