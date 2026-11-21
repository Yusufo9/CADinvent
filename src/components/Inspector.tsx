import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  X,
  RotateCcw,
  Box,
  ScanLine,
  Download,
  LoaderCircle,
} from "lucide-react";
import type { Category, Part } from "../types";
import { loadFile } from "../lib/storage";
import { parseFile } from "../lib/importer";
import { sampleMesh } from "../lib/legacySamples";
import { makeScene } from "../lib/rendering";
import { download } from "../lib/export";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { geometryFrom } from "../lib/rendering";
export default function Inspector({
  part,
  categories,
  onClose,
  onMove,
}: {
  part: Part;
  categories: Category[];
  onClose: () => void;
  onMove: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const modal = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const wire = useRef<(v: boolean) => void>(() => {});
  const [wireframe, setWireframe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    modal.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = modal.current?.querySelectorAll<HTMLElement>(
          "button, select, [href]",
        );
        if (!all?.length) return;
        const first = all[0],
          last = all[all.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === modal.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    (async () => {
      try {
        const file = part.demo ? undefined : await loadFile(part.id);
        if (!part.demo && !file)
          throw new Error(
            "The source file is missing. Please import it again.",
          );
        const data = part.demo ? sampleMesh(part.demo) : await parseFile(file!);
        if (cancelled || !host.current) return;
        const view = makeScene(data);
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        host.current.appendChild(renderer.domElement);
        const controls = new OrbitControls(view.camera, renderer.domElement);
        controls.enableDamping = false;
        controls.minDistance = 1;
        controls.maxDistance = 25;
        const grid = new THREE.GridHelper(12, 24, "#526057", "#2a342e");
        grid.position.y = -1.7;
        view.scene.add(grid);
        const render = () => renderer.render(view.scene, view.camera);
        const resize = new ResizeObserver(() => {
          if (!host.current) return;
          const { width, height } = host.current.getBoundingClientRect();
          renderer.setSize(width, height);
          view.camera.aspect = width / height;
          view.camera.updateProjectionMatrix();
          render();
        });
        resize.observe(host.current);
        controls.addEventListener("change", render);
        reset.current = () => {
          view.camera.position.set(5.3, 4, 5.3);
          controls.target.set(0, 0, 0);
          controls.update();
          render();
        };
        wire.current = (value) => {
          view.mesh.material.wireframe = value;
          render();
        };
        cleanup = () => {
          resize.disconnect();
          controls.dispose();
          grid.geometry.dispose();
          (grid.material as THREE.Material).dispose();
          view.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
        render();
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Preview failed.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [part.id, part.demo]);
  async function exportSource() {
    try {
      if (part.demo) {
        const g = geometryFrom(sampleMesh(part.demo));
        const stl = new STLExporter().parse(new THREE.Mesh(g));
        g.dispose();
        download(stl, part.name, "model/stl");
      } else {
        const f = await loadFile(part.id);
        if (f) download(f, part.name, "application/octet-stream");
        else throw new Error("Source file is missing.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="inspector"
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-label={`Inspect ${part.name}`}
        tabIndex={-1}
      >
        <div className="inspector-header">
          <div>
            <span className="eyebrow">PART INSPECTOR</span>
            <h2>{part.name}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close inspector"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="inspector-layout">
          <div className="viewport-wrap">
            <div className="viewport" ref={host} />
            {loading && (
              <div className="viewport-message">
                <LoaderCircle className="spin" /> Loading geometry…
              </div>
            )}
            {error && <div className="viewport-message error">{error}</div>}
            <span className="axis-label">
              <b>Z</b> UP <span>Y</span> <span>X</span>
            </span>
            <div className="view-tools">
              <button
                className={!wireframe ? "active" : ""}
                onClick={() => {
                  setWireframe(false);
                  wire.current(false);
                }}
              >
                <Box size={16} /> Solid
              </button>
              <button
                className={wireframe ? "active" : ""}
                onClick={() => {
                  setWireframe(true);
                  wire.current(true);
                }}
              >
                <ScanLine size={16} /> Wireframe
              </button>
              <button aria-label="Reset camera" onClick={() => reset.current()}>
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
          <aside className="part-details">
            <span className="eyebrow">CLASSIFICATION</span>
            <label htmlFor="inspect-category">Category</label>
            <select
              id="inspect-category"
              value={part.categoryId}
              onChange={(e) => onMove(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="detail-divider" />
            <span className="eyebrow">GEOMETRY</span>
            <dl>
              <dt>Format</dt>
              <dd>{part.format}</dd>
              <dt>Triangles</dt>
              <dd>{part.triangles.toLocaleString()}</dd>
              <dt>File size</dt>
              <dd>
                {part.demo
                  ? "Generated sample"
                  : `${(part.bytes / 1024).toFixed(1)} KB`}
              </dd>
              <dt>Bounding box</dt>
              <dd>{part.dimensions.map((x) => x.toFixed(1)).join(" × ")}</dd>
            </dl>
            <p className="muted small">
              Dimensions use the file’s native coordinates. Mesh formats do not
              reliably specify units.
            </p>
            <button className="button full" onClick={exportSource}>
              <Download size={16} /> Download{" "}
              {part.demo ? "sample STL" : "source file"}
            </button>
            <div className="control-guide">
              <span className="eyebrow">VIEW CONTROLS</span>
              <p>
                Left drag <b>Orbit</b>
              </p>
              <p>
                Right drag <b>Pan</b>
              </p>
              <p>
                Scroll / pinch <b>Zoom</b>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
