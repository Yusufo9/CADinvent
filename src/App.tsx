import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Box,
  Boxes,
  Upload,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  FolderOpen,
  Layers3,
  Star,
  X,
  Check,
  ChevronDown,
  Command,
  FileJson,
  FileSpreadsheet,
  CircleHelp,
  HardDrive,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import type { Library, Part } from "./types";
import { defaultCategories } from "./types";
import { deleteFile, loadLibrary, saveFile, saveLibrary } from "./lib/storage";
import { parseFile } from "./lib/importer";
import { csv, download, manifest } from "./lib/export";
import CategoryRow from "./components/CategoryRow";
const Inspector = lazy(() => import("./components/Inspector"));
const empty: Library = { categories: defaultCategories, parts: [] };
export default function App() {
  const [library, setLibrary] = useState<Library>(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState("added");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string>();
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [menu, setMenu] = useState("");
  const [help, setHelp] = useState(false);
  const [newCategory, setNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [dragging, setDragging] = useState(false);
  const files = useRef<HTMLInputElement>(null),
    folder = useRef<HTMLInputElement>(null),
    search = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadLibrary()
      .then((saved) => {
        if (saved) setLibrary(saved);
        setReady(true);
      })
      .catch(() => {
        setErrors([
          "Browser storage is unavailable. Changes may not persist in this browser.",
        ]);
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      saveLibrary(library).catch(() =>
        setErrors((e) => [
          ...e,
          "Could not save the library. Browser storage may be full. Export a manifest to preserve labels.",
        ]),
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [library, ready]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === "Escape") {
        setMenu("");
        setHelp(false);
        setNewCategory(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const closeInspector = useCallback(() => setActive(undefined), []);
  function move(ids: string[], categoryId: string) {
    setLibrary((l) => ({
      ...l,
      parts: l.parts.map((p) =>
        ids.includes(p.id) ? { ...p, categoryId } : p,
      ),
    }));
    setNotice(
      `Parts moved to ${library.categories.find((c) => c.id === categoryId)?.name}.`,
    );
    setSelected(new Set());
  }
  async function importFiles(list: File[]) {
    if (busyRef.current || !list.length) return;
    busyRef.current = true;
    setErrors([]);
    setMenu("");
    let count = 0;
    let release = () => {};
    setBusy("Preparing importer…");
    try {
      const { thumbnail, releaseThumbnailRenderer } =
        await import("./lib/rendering");
      release = releaseThumbnailRenderer;
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setBusy(`Importing ${i + 1} of ${list.length} · ${file.name}`);
        try {
          const mesh = await parseFile(file);
          const image = thumbnail(mesh);
          const id = crypto.randomUUID();
          await saveFile(id, file);
          const part: Part = {
            id,
            name: file.name,
            categoryId: "unclassified",
            format: file.name.split(".").pop()!.toUpperCase(),
            bytes: file.size,
            triangles: mesh.triangles,
            dimensions: mesh.dimensions,
            thumbnail: image,
            createdAt: new Date().toISOString(),
          };
          setLibrary((l) => ({ ...l, parts: [...l.parts, part] }));
          count++;
        } catch (e) {
          setErrors((prev) => [
            ...prev,
            `${file.name}: ${e instanceof Error ? e.message : "Import failed."}`,
          ]);
        }
        await new Promise((r) => setTimeout(r, 0));
      }
    } catch (e) {
      setErrors((previous) => [
        ...previous,
        e instanceof Error ? e.message : "Could not load the 3D renderer.",
      ]);
    } finally {
      release();
      setBusy("");
      busyRef.current = false;
      setNotice(`${count} of ${list.length} files imported into Unclassified.`);
      setTab("all");
    }
  }
  async function addSamples() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("Building sample library…");
    let release = () => {};
    try {
      const [{ samples, sampleMesh }, { thumbnail, releaseThumbnailRenderer }] =
        await Promise.all([import("./lib/samples"), import("./lib/rendering")]);
      release = releaseThumbnailRenderer;
      const parts: Part[] = [];
      for (const [name, categoryId, key] of samples) {
        if (library.parts.some((p) => p.demo === key)) continue;
        const mesh = sampleMesh(key);
        parts.push({
          id: crypto.randomUUID(),
          name: `${name.toLowerCase().replaceAll(" ", "_")}.stl`,
          categoryId: library.categories.some((c) => c.id === categoryId)
            ? categoryId
            : "unclassified",
          format: "STL",
          bytes: 0,
          triangles: mesh.triangles,
          dimensions: mesh.dimensions,
          thumbnail: thumbnail(mesh),
          createdAt: new Date().toISOString(),
          demo: key,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
      setLibrary((l) => ({ ...l, parts: [...l.parts, ...parts] }));
      setNotice(
        `${parts.length} sample parts added. Try opening one in the inspector.`,
      );
    } catch (e) {
      setErrors([
        e instanceof Error ? e.message : "Unable to generate previews.",
      ]);
    } finally {
      release();
      busyRef.current = false;
      setBusy("");
    }
  }
  function addCategory() {
    const name = categoryName.trim();
    if (!name) return;
    setLibrary((l) => ({
      ...l,
      categories: [
        ...l.categories,
        {
          id: crypto.randomUUID(),
          name,
          color: ["#b4dc90", "#a5b7e6", "#e0b78d", "#c4a3d8"][
            l.categories.length % 4
          ],
        },
      ],
    }));
    setCategoryName("");
    setNewCategory(false);
    setNotice(`Created ${name}.`);
  }
  async function removeSelected() {
    const ids = [...selected];
    setLibrary((l) => ({
      ...l,
      parts: l.parts.filter((p) => !selected.has(p.id)),
    }));
    setSelected(new Set());
    await Promise.all(ids.map((id) => deleteFile(id))).catch(() =>
      setErrors(["Some stored source files could not be removed."]),
    );
    setNotice(`${ids.length} parts removed from this library.`);
  }
  const shown = library.parts
    .filter(
      (p) =>
        (tab !== "favorites" || p.favorite) &&
        (tab !== "unclassified" || p.categoryId === "unclassified") &&
        (format === "all" || p.format === format) &&
        `${p.name} ${library.categories.find((c) => c.id === p.categoryId)?.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "size"
          ? b.triangles - a.triangles
          : Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
  const categories =
    tab === "unclassified"
      ? library.categories.filter((c) => c.id === "unclassified")
      : library.categories;
  const activePart = library.parts.find((p) => p.id === active);
  const imported = library.parts.filter((p) => !p.demo).length;
  const totalBytes = library.parts.reduce((a, p) => a + p.bytes, 0);
  const exportLibrary = selected.size
    ? { ...library, parts: library.parts.filter((p) => selected.has(p.id)) }
    : library;
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="CADinvent home">
          <span className="brand-mark">
            <Boxes size={23} />
          </span>
          CAD<span>invent</span>
        </a>
        <div className="top-divider" />
        <span className="workspace-name">
          Personal workspace <ChevronDown size={13} />
        </span>
        <div className="top-actions">
          <span className="local-badge">
            <span /> Local library
          </span>
          <div className="menu-wrap">
            <button
              className="button"
              onClick={() => setMenu(menu === "export" ? "" : "export")}
            >
              <Download size={16} /> Export <ChevronDown size={13} />
            </button>
            {menu === "export" && (
              <div className="dropdown">
                <span className="dropdown-label">
                  {selected.size
                    ? `${selected.size} selected parts`
                    : "Entire library"}{" "}
                  · labels & metadata
                </span>
                <button
                  onClick={() => {
                    download(
                      JSON.stringify(manifest(exportLibrary), null, 2),
                      "cadinvent-manifest.json",
                      "application/json",
                    );
                    setMenu("");
                    setNotice(
                      "JSON manifest exported. Source files are downloaded from the inspector.",
                    );
                  }}
                >
                  <FileJson size={16} /> Export JSON manifest
                </button>
                <button
                  onClick={() => {
                    download(
                      csv(exportLibrary),
                      "cadinvent-library.csv",
                      "text/csv;charset=utf-8",
                    );
                    setMenu("");
                  }}
                >
                  <FileSpreadsheet size={16} /> Export CSV
                </button>
              </div>
            )}
          </div>
          <div className="split-button">
            <button
              className="button primary"
              disabled={!!busy || !ready}
              onClick={() => files.current?.click()}
            >
              <Plus size={17} /> Import files
            </button>
            <button
              className="button primary split"
              disabled={!!busy || !ready}
              aria-label="More import options"
              onClick={() => setMenu(menu === "import" ? "" : "import")}
            >
              <ChevronDown size={14} />
            </button>
            {menu === "import" && (
              <div className="dropdown">
                <button
                  onClick={() => {
                    folder.current?.click();
                    setMenu("");
                  }}
                >
                  <FolderOpen size={16} /> Import a folder
                </button>
                <button onClick={addSamples}>
                  <Boxes size={16} /> Load sample library
                </button>
              </div>
            )}
          </div>
          <button
            className="icon-button help-button"
            aria-label="Help and supported formats"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={19} />
          </button>
        </div>
      </header>
      <input
        type="file"
        ref={files}
        hidden
        multiple
        accept=".stl,.obj,.ply"
        onChange={(e) => {
          void importFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={folder}
        hidden
        multiple
        {...{ webkitdirectory: "" }}
        onChange={(e) => {
          void importFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <main>
        <div className="page-intro">
          <div>
            <div className="eyebrow intro-eyebrow">
              <span /> YOUR ENGINEERING WORKSPACE
            </div>
            <h1>
              A place for every part<span>.</span>
            </h1>
            <p>Browse, inspect, and bring order to your CAD library.</p>
          </div>
          <div className="library-stats">
            <div>
              <strong>
                {library.parts.length.toString().padStart(2, "0")}
              </strong>
              <span>PARTS</span>
            </div>
            <i />
            <div>
              <strong>
                {library.categories.length.toString().padStart(2, "0")}
              </strong>
              <span>CATEGORIES</span>
            </div>
            <i />
            <div>
              <strong>
                {imported
                  ? new Set(
                      library.parts.filter((p) => !p.demo).map((p) => p.format),
                    ).size
                  : "03"}
              </strong>
              <span>{imported ? "FORMATS" : "SUPPORTED"}</span>
            </div>
          </div>
        </div>
        <div className="library-toolbar">
          <div className="tabs">
            <button
              className={tab === "all" ? "active" : ""}
              onClick={() => setTab("all")}
            >
              <Layers3 size={16} /> All parts{" "}
              <span>{library.parts.length}</span>
            </button>
            <button
              className={tab === "favorites" ? "active" : ""}
              onClick={() => setTab("favorites")}
            >
              <Star size={16} /> Favorites
            </button>
            <button
              className={tab === "unclassified" ? "active" : ""}
              onClick={() => setTab("unclassified")}
            >
              <Box size={16} /> Unclassified{" "}
              <span>
                {
                  library.parts.filter((p) => p.categoryId === "unclassified")
                    .length
                }
              </span>
            </button>
          </div>
          <button className="text-button" onClick={() => setNewCategory(true)}>
            <Plus size={16} /> New category
          </button>
        </div>
        <div className="filter-bar">
          <div className="search-field">
            <Search size={17} />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parts or categories…"
              aria-label="Search parts or categories"
            />
            {query ? (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            ) : (
              <kbd>
                <Command size={11} /> K
              </kbd>
            )}
          </div>
          <div className="filter-controls">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Filter by format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="all">All formats</option>
              <option>STL</option>
              <option>OBJ</option>
              <option>PLY</option>
            </select>
            <span className="filter-divider" />
            <label htmlFor="sort">Sort by:</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="added">Date added</option>
              <option value="name">Name</option>
              <option value="size">Triangle count</option>
            </select>
          </div>
        </div>
        {!!selected.size && (
          <div className="bulk-bar">
            <Check size={16} />
            <b>{selected.size} selected</b>
            <select
              aria-label="Move selected parts"
              value=""
              onChange={(e) => move([...selected], e.target.value)}
            >
              <option value="" disabled>
                Move to category…
              </option>
              {library.categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button className="text-button" onClick={removeSelected}>
              <Trash2 size={15} /> Remove from library
            </button>
            <button
              className="icon-button"
              aria-label="Clear selection"
              onClick={() => setSelected(new Set())}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {busy && (
          <div className="progress-strip" role="status">
            <LoaderCircle className="spin" size={17} />
            {busy}
          </div>
        )}
        {!!errors.length && (
          <div className="error-panel" role="alert">
            <button
              className="icon-button"
              aria-label="Dismiss import errors"
              onClick={() => setErrors([])}
            >
              <X size={15} />
            </button>
            <b>Some actions need attention</b>
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}
        {!ready ? (
          <div className="loading-library">
            <LoaderCircle className="spin" /> Opening your library…
          </div>
        ) : (
          <>
            {!library.parts.length && (
              <div className="welcome-panel">
                <span className="welcome-icon">
                  <Boxes size={33} />
                </span>
                <div>
                  <h2>Your next project starts with a part.</h2>
                  <p>
                    Import your models, or explore a sample library to get a
                    feel for the workspace.
                  </p>
                </div>
                <button
                  className="button"
                  disabled={!!busy}
                  onClick={addSamples}
                >
                  Explore sample parts
                </button>
              </div>
            )}
            {shown.length === 0 &&
            library.parts.length > 0 &&
            (query || tab === "favorites" || format !== "all") ? (
              <div className="no-results">
                <Search size={28} />
                <h2>No matching parts</h2>
                <p>Try another search, format, or library tab.</p>
                <button
                  className="button"
                  onClick={() => {
                    setQuery("");
                    setFormat("all");
                    setTab("all");
                  }}
                >
                  Show all parts
                </button>
              </div>
            ) : (
              categories
                .filter(
                  (c) =>
                    !(query || tab === "favorites" || format !== "all") ||
                    shown.some((p) => p.categoryId === c.id),
                )
                .map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    categories={library.categories}
                    parts={shown.filter((p) => p.categoryId === c.id)}
                    selected={selected}
                    onToggle={() =>
                      setLibrary((l) => ({
                        ...l,
                        categories: l.categories.map((x) =>
                          x.id === c.id ? { ...x, collapsed: !x.collapsed } : x,
                        ),
                      }))
                    }
                    onRename={(name) =>
                      setLibrary((l) => ({
                        ...l,
                        categories: l.categories.map((x) =>
                          x.id === c.id ? { ...x, name } : x,
                        ),
                      }))
                    }
                    onDelete={() => {
                      setLibrary((l) => ({
                        categories: l.categories.filter((x) => x.id !== c.id),
                        parts: l.parts.map((p) =>
                          p.categoryId === c.id
                            ? { ...p, categoryId: "unclassified" }
                            : p,
                        ),
                      }));
                      setNotice(
                        "Category removed. Its parts are now in Unclassified.",
                      );
                    }}
                    onInspect={(p) => setActive(p.id)}
                    onSelect={(id) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                    }
                    onFavorite={(id) =>
                      setLibrary((l) => ({
                        ...l,
                        parts: l.parts.map((p) =>
                          p.id === id ? { ...p, favorite: !p.favorite } : p,
                        ),
                      }))
                    }
                    onMove={move}
                  />
                ))
            )}
          </>
        )}
        <div
          className={`import-zone ${dragging ? "drag-over" : ""}`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void importFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="import-zone-icon">
            <Upload size={21} />
          </div>
          <div>
            <b>Make room for your next idea.</b>
            <p>
              Drop CAD files here, or{" "}
              <button disabled={!!busy} onClick={() => files.current?.click()}>
                browse files
              </button>
            </p>
          </div>
          <div className="format-tags">
            <span>STL</span>
            <span>OBJ</span>
            <span>PLY</span>
            <small>80 MB per file</small>
          </div>
        </div>
      </main>
      <footer>
        <span>
          <HardDrive size={13} />{" "}
          {ready ? "Saved on this device" : "Connecting to local storage"}
          <span className="footer-dot">·</span>
          {(totalBytes / 1024 / 1024).toFixed(1)} MB of source files
        </span>
        <span>
          Built for the details. <span className="footer-brand">CADinvent</span>{" "}
          <span className="version">v0.1</span>
        </span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {activePart && (
        <Suspense
          fallback={
            <div className="modal-backdrop" role="status">
              <LoaderCircle className="spin" /> Loading inspector…
            </div>
          }
        >
          <Inspector
            part={activePart}
            categories={library.categories}
            onClose={closeInspector}
            onMove={(category) => move([activePart.id], category)}
          />
        </Suspense>
      )}
      {newCategory && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNewCategory(false);
          }}
        >
          <form
            className="small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-category-title"
            onSubmit={(e) => {
              e.preventDefault();
              addCategory();
            }}
          >
            <button
              type="button"
              className="icon-button modal-close"
              aria-label="Close new category"
              onClick={() => setNewCategory(false)}
            >
              <X size={18} />
            </button>
            <span className="eyebrow">KEEP THINGS ORGANIZED</span>
            <h2 id="new-category-title">A home for similar parts.</h2>
            <label htmlFor="category-name">Category name</label>
            <input
              id="category-name"
              autoFocus
              maxLength={60}
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Motor adapters"
            />
            <button className="button primary full" type="submit">
              <Plus size={16} /> Create category
            </button>
          </form>
        </div>
      )}
      {help && (
        <div className="modal-backdrop">
          <div
            className="small-modal help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="About CADinvent"
          >
            <button
              className="icon-button modal-close"
              aria-label="Close help"
              onClick={() => setHelp(false)}
            >
              <X size={18} />
            </button>
            <span className="eyebrow">A LITTLE ORIENTATION</span>
            <h2>Your parts, in perspective.</h2>
            <p>
              Import multiple <b>STL, OBJ, or PLY</b> mesh files, or choose a
              folder from the import menu. STEP, IGES, assemblies, textures, and
              material sidecars are not supported yet.
            </p>
            <p>
              Click a part to inspect it. Drag cards onto a category, use the
              card’s selector, or select several parts to move them together.
              Scroll each shelf horizontally to explore.
            </p>
            <p>
              Files and labels are saved in this browser using IndexedDB.
              Clearing site data removes them. JSON and CSV exports contain
              labels and metadata; download source files from the inspector.
            </p>
            <p className="muted">
              Up to 80 MB and 2 million triangles per file. Local storage
              capacity depends on your browser. Samples are generated meshes
              labeled SAMPLE.
            </p>
            <button
              className="button primary full"
              onClick={() => setHelp(false)}
            >
              Back to the library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
