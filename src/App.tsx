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
  ChevronDown,
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
  Command,
  CircleHelp,
  HardDrive,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import type { Part, Category, Workspace } from "./types";
import { deleteFile, saveFile } from "./lib/storage";
import { parseFile } from "./lib/importer";
import { download } from "./lib/export";
import CategoryRow from "./components/CategoryRow";
import WorkspacePicker from "./components/WorkspacePicker";
import ConfirmDialog from "./components/ConfirmDialog";
import {
  includedInAll,
  matchesView,
  deletionDestination,
  removeCategory,
  addImportedPart,
} from "./lib/categories";
import { useWorkspaces } from "./hooks/useWorkspaces";

const Inspector = lazy(() => import("./components/Inspector"));
export default function App() {
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState("added");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string>();
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const reportStorageError = useCallback(
    (message: string) => setErrors((previous) => [...previous, message]),
    [],
  );
  const {
    workspace: library,
    workspaces,
    setLibrary,
    selectWorkspace,
    addWorkspace,
    renameWorkspace,
    restoreWorkspace,
    deleteWorkspace,
    ready,
    saveStatus,
  } = useWorkspaces(reportStorageError);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace>();
  const [deletingCategory, setDeletingCategory] = useState<{
    category: Category;
    destination: Category;
  }>();
  const cancelWorkspaceDelete = useCallback(
    () => setDeletingWorkspace(undefined),
    [],
  );
  const cancelCategoryDelete = useCallback(
    () => setDeletingCategory(undefined),
    [],
  );
  const [help, setHelp] = useState(false);
  const [newCategory, setNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const exportMenuRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!exportMenuRoot.current?.contains(event.target as Node))
        setExportMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExportMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const files = useRef<HTMLInputElement>(null),
    workspaceFiles = useRef<HTMLInputElement>(null),
    search = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    setQuery("");
    setFormat("all");
    setSelected(new Set());
    setActive(undefined);
    setNewCategory(false);
  }, [library.id]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === "Escape") {
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
  async function exportWorkspace() {
    if (busyRef.current || !ready) return;
    busyRef.current = true;
    setExportMenu(false);
    setErrors([]);
    setBusy("Preparing workspace backup…");
    try {
      const { createBackup } = await import("./lib/backup");
      const backup = await createBackup(library, setBusy);
      download(
        new Uint8Array(backup.zip).buffer,
        backup.name + ".zip",
        "application/zip",
      );
      setNotice("Workspace ZIP exported.");
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Workspace export failed."]);
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }
  async function importWorkspace(list: File[]) {
    if (busyRef.current || !ready || !list.length) return;
    busyRef.current = true;
    setErrors([]);
    setBusy("Opening workspace backup…");
    try {
      const { readBackup } = await import("./lib/backup");
      const restored = await readBackup(list, setBusy);
      setBusy("Saving restored workspace…");
      const name = await restoreWorkspace(restored.workspace, restored.files);
      setTab("workspace");
      setNotice(
        `Workspace “${name}” restored with ${restored.workspace.parts.length} parts.`,
      );
    } catch (e) {
      setErrors([
        e instanceof Error
          ? e.message
          : "Workspace restore failed. Your existing workspaces were not changed.",
      ]);
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }
  async function confirmWorkspaceDelete() {
    if (!deletingWorkspace || busyRef.current || workspaces.length <= 1) return;
    const target = deletingWorkspace;
    setDeletingWorkspace(undefined);
    busyRef.current = true;
    setBusy("Deleting workspace…");
    try {
      await deleteWorkspace(target.id);
      setSelected(new Set());
      setActive(undefined);
      setNotice("Workspace “" + target.name + "” deleted.");
    } catch {
      setErrors([
        "Workspace could not be deleted. Your workspace and model files were kept.",
      ]);
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }
  function confirmCategoryDelete() {
    if (!deletingCategory || deletingCategory.category.id === "unclassified")
      return;
    const { category, destination } = deletingCategory;
    setLibrary((l) => removeCategory(l, category.id, destination));
    setDeletingCategory(undefined);
    setSelected(new Set());
    setTab("workspace");
    setNotice(
      "Category “" + category.name + "” deleted. Model files were kept.",
    );
  }
  function updateCategory(id: string, update: (c: Category) => Category) {
    setLibrary((l) => ({
      ...l,
      categories: l.categories.map((c) => (c.id === id ? update(c) : c)),
    }));
    setSelected(new Set());
  }
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
    if (busyRef.current || !ready || !list.length) return;
    busyRef.current = true;
    setErrors([]);
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
          setLibrary((l) => addImportedPart(l, part));
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
      setTab("unclassified");
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
    setTab("workspace");
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
        !!library.categories.find(
          (c) => c.id === p.categoryId && matchesView(p, c, tab),
        ) &&
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
  const categories = library.categories.filter((c) => {
    if (tab === "all" && !includedInAll(c)) return false;
    if (tab === "workspace" && c.id === "unclassified") return false;
    if (tab === "unclassified" && c.id !== "unclassified") return false;
    if (
      tab === "favorites" &&
      !c.favorite &&
      !shown.some((p) => p.categoryId === c.id)
    )
      return false;
    if (query || format !== "all")
      return (
        shown.some((p) => p.categoryId === c.id) ||
        (format === "all" && c.name.toLowerCase().includes(query.toLowerCase()))
      );
    return true;
  });
  const allPartsCount = library.parts.filter((p) =>
    library.categories.some((c) => c.id === p.categoryId && includedInAll(c)),
  ).length;
  useEffect(() => {
    setSelected(new Set());
  }, [tab, query, format]);
  const activePart = library.parts.find((p) => p.id === active);
  const imported = library.parts.filter((p) => !p.demo).length;
  const totalBytes = library.parts.reduce((a, p) => a + p.bytes, 0);
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
        <WorkspacePicker
          workspace={library}
          workspaces={workspaces}
          disabled={!ready || !!busy}
          onSelect={(id) => {
            selectWorkspace(id);
            setTab("workspace");
          }}
          onCreate={(name) => {
            addWorkspace(name);
            setTab("workspace");
          }}
          onRename={renameWorkspace}
          onDelete={setDeletingWorkspace}
        />
        <div className="top-actions">
          <span className="local-badge">
            <span /> Local library
          </span>
          <div className="menu-wrap" ref={exportMenuRoot}>
            <button
              className="button nav-action"
              disabled={!!busy || !ready}
              aria-expanded={exportMenu}
              aria-haspopup="menu"
              onClick={() => setExportMenu((open) => !open)}
            >
              <Download size={16} /> Export <ChevronDown size={13} />
            </button>
            {exportMenu && (
              <div className="dropdown" role="menu" aria-label="Export options">
                <button role="menuitem" onClick={exportWorkspace}>
                  <Download size={16} /> Export Workspace
                </button>
              </div>
            )}
          </div>
          <button
            className="button nav-action"
            disabled={!!busy || !ready}
            onClick={() => workspaceFiles.current?.click()}
          >
            <Upload size={16} /> Import Workspace
          </button>
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
        ref={workspaceFiles}
        hidden
        accept=".zip"
        onChange={(e) => {
          void importWorkspace(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <span className="sr-only" role="status">
        {busy}
      </span>
      <main aria-busy={!!busy} inert={!!busy || !ready}>
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
              <Layers3 size={16} /> All parts <span>{allPartsCount}</span>
            </button>
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className={
                  tab === "workspace" && workspace.id === library.id
                    ? "active"
                    : ""
                }
                onClick={() => {
                  selectWorkspace(workspace.id);
                  setTab("workspace");
                }}
                aria-label={`Open ${workspace.name}`}
              >
                <FolderOpen size={16} /> {workspace.name}
              </button>
            ))}
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
            <button
              className={tab === "favorites" ? "active" : ""}
              onClick={() => setTab("favorites")}
            >
              <Star size={16} /> Favorites
            </button>
          </div>
          {tab === "workspace" && (
            <button
              className="text-button"
              onClick={() => setNewCategory(true)}
            >
              <Plus size={16} /> Add categories
            </button>
          )}
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
            {categories.length === 0
              ? tab !== "unclassified" && (
                  <div className="no-results">
                    <h2>
                      {tab === "all"
                        ? "No parts in All Parts"
                        : tab === "favorites"
                          ? "No favorites yet"
                          : "No categories yet"}
                    </h2>
                    <p>
                      {tab === "all"
                        ? "Include a category with its ± button in a workspace tab."
                        : tab === "favorites"
                          ? "Star a part or category to see it here."
                          : "Use Add categories to organize your models."}
                    </p>
                  </div>
                )
              : categories.map((c) => (
                  <CategoryRow
                    key={c.id}
                    hideHeading={
                      tab === "unclassified" ||
                      (tab === "favorites" && c.id === "unclassified")
                    }
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
                    onDelete={() =>
                      setDeletingCategory({
                        category: c,
                        destination: deletionDestination(library, c.id),
                      })
                    }
                    onInclude={() =>
                      updateCategory(c.id, (category) => ({
                        ...category,
                        includedInAll: !includedInAll(category),
                      }))
                    }
                    onCategoryFavorite={() =>
                      updateCategory(c.id, (category) => ({
                        ...category,
                        favorite: !category.favorite,
                      }))
                    }
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
                ))}
          </>
        )}
        {tab === "workspace" && (
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
                <button
                  disabled={!!busy}
                  onClick={() => files.current?.click()}
                >
                  Add models
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
        )}
      </main>
      <footer>
        <span>
          <HardDrive size={13} /> {saveStatus}
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
      {deletingWorkspace && (
        <ConfirmDialog
          title={"Delete “" + deletingWorkspace.name + "”?"}
          onCancel={cancelWorkspaceDelete}
          onConfirm={confirmWorkspaceDelete}
          action="Delete workspace"
        >
          <p>
            This removes its {deletingWorkspace.parts.length} parts, categories,
            and browser-stored model copies. Original files on your computer are
            kept. Export a workspace ZIP first if you need a backup.
          </p>
          {workspaces.length === 1 && (
            <p>A new empty Personal workspace 1 will replace it.</p>
          )}
        </ConfirmDialog>
      )}
      {deletingCategory && (
        <ConfirmDialog
          title={"Delete “" + deletingCategory.category.name + "”?"}
          onCancel={cancelCategoryDelete}
          onConfirm={confirmCategoryDelete}
          action="Delete category"
        >
          <p>
            {library.parts.some(
              (p) => p.categoryId === deletingCategory.category.id,
            )
              ? "Its parts will move to “" +
                deletingCategory.destination.name +
                "”. Model files and part favorites will be kept."
              : "This empty category will be removed."}
          </p>
        </ConfirmDialog>
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
              Use Add models or drop multiple <b>STL, OBJ, or PLY</b> mesh files
              below. STEP, IGES, assemblies, textures, and material sidecars are
              not supported yet.
            </p>
            <p>
              Click a part to inspect it. Drag cards onto a category, use the
              card’s selector, or select several parts to move them together.
              Scroll each shelf horizontally to explore.
            </p>
            <p>
              Files and labels are saved in this browser using IndexedDB. Each
              workspace has its own parts and categories. Clearing site data
              removes them. Export Workspace downloads one ZIP containing
              workspace.json and models/. Import Workspace restores this ZIP as
              a new workspace. Category favorites and All Parts inclusion are
              saved too.
            </p>
            <p className="muted">
              Up to 80 MB and 2 million triangles per file. Local storage
              capacity depends on your browser. Workspace ZIPs support up to 256
              MB of source models.
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
