# CADinvent

A browser-local CAD mesh library with horizontal category shelves and interactive 3D inspection.

**Editing the code?** Start with [the Turkish code guide](docs/KOD-REHBERI.md). Edit `src/` for the web UI and `portable/` for the native launcher. All generated outputs live under the ignored `build/` directory; never edit those files directly.

## Use without installing developer tools

Download the portable package for your computer from this repository's **Releases**, extract it, and run the executable. It opens the app in your existing browser. **No Electron, bundled Chromium, Node.js, Python, or account is needed.** After download, it works entirely offline.

Most Windows users need `cadinvent-windows-amd64.zip`. Windows ARM, Linux, and macOS packages are also produced by the release workflow. Releases become available after the maintainer pushes a version tag and publishes the generated draft.

See [portable setup and download guide](docs/PORTABLE.md) for platform selection, Firefox, storage, and update instructions. The packages are currently unsigned; platform security policies may affect launch, particularly on macOS.

## Develop from source

Requires Node.js 22+ and pnpm (the repository pins pnpm 11.25.0).

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. `pnpm test` runs the geometry/import/export regression tests. `pnpm build` checks TypeScript and produces the static application in `build/web/`. `pnpm preview` serves that build.

In VSCodium, use **Terminal → Run Task → CADinvent: development server**. To run a built Windows portable app in Firefox, choose **CADinvent: portable app in Firefox (Windows)**. Build that executable first with `pnpm build` then `pnpm portable:build` (Go 1.23+ is needed only when building the launcher).

## MVP

- Batch STL (ASCII/binary), OBJ, and PLY import; folder selection and file drop zone.
- Editable, collapsible categories with square cards in horizontally scrolling shelves.
- Drag parts between categories, use a card selector, or select several cards and move them together.
- Search by filename/category, filter by format, sort, and favorite parts.
- Click a part for orbit, pan, zoom, camera reset, solid/wireframe, dimensions, and source download.
- JSON/CSV classification export, including selected-part export. Exports are manifests, not source-file archives or restore files.
- Files, thumbnails, categories, and favorites persist in IndexedDB on the current browser origin. Clearing site data removes the library; localhost and the hosted site have independent libraries.
- Explicitly labeled, generated sample meshes let you exercise the workflow without uploading files.

## Stack and architecture

React 19 + TypeScript + Vite, custom responsive CSS, Three.js, Lucide icons, and `idb`. There is no backend for CAD files. The app does not upload imported geometry. Typography uses system fonts, so no external fonts, CDN requests, or internet access are needed at runtime.

The optional Go launcher embeds the production assets in one executable and serves them on `127.0.0.1:47831`. It uses the Go standard library only and does not include a browser or a package manager. The source is in `portable/`; packaging scripts are in `scripts/`. See [Go's embedded filesystem documentation](https://go.dev/pkg/embed/) for the mechanism.

- `src/App.tsx`: library workflow and UI state.
- `src/components/CategoryRow.tsx`: category shelves, selection, and drag/drop.
- `src/components/Inspector.tsx`: one interactive WebGL viewport, rendered on interaction rather than a permanent animation loop.
- `src/lib/parser.ts` / `mesh.worker.ts`: STL/OBJ/PLY parsing, triangulation, validation, and centering. Original coordinate extents are retained.
- `src/lib/importer.ts`: bounded sequential queue, transferable buffers, and a 30-second per-file timeout. Each file uses a worker that is terminated when parsing completes.
- `src/lib/rendering.ts`: one shared 400 × 400 thumbnail renderer per batch. Mesh geometry/materials are disposed after each thumbnail; the renderer is released at batch completion. Cards display lazy-loaded WebP images rather than maintaining one WebGL context per card.
- `src/lib/storage.ts`: original files stored separately from library metadata in IndexedDB. Geometry is parsed again only when inspected, and disposed when the inspector closes.
- `src/lib/export.ts`: versioned JSON manifests and safely quoted CSV (formula-like values are escaped).

References: [Three.js documentation](https://threejs.org/docs/) and [resource disposal](https://threejs.org/manual/en/how-to-dispose-of-objects.html).

## Scope and limits

This is a mesh viewer, not a solid-model CAD editor. STEP/IGES, BREP, native CAD documents, assemblies, MTL/textures, and point clouds are not supported. Files are limited to 80 MB and two million triangles; parsing can temporarily allocate additional worker memory before the triangle limit is checked. STL/OBJ/PLY do not reliably encode physical units, so dimensions are shown in native coordinates. Samples are illustrative geometry, not manufacturing-ready designs.

Thumbnails are lazy decoded, but all metadata/thumbnails remain in React memory and cards are not virtualized. Browser storage quotas and device GPU limits still apply. Importing a duplicate file creates another part. Removing a category moves its parts to Unclassified; removing selected parts deletes their browser-local source copies, never the original disk files.

## Next steps

1. STEP/IGES tessellation in a worker through an Open Cascade WASM adapter, with assemblies and unit metadata.
2. Virtualized shelves, thumbnail blobs, an LRU geometry cache, and progressive previews for very large libraries.
3. Manifest restore with file matching/hashes, duplicate detection, and organized ZIP export.
4. Tags, bulk rename, saved views, keyboard selection, undo history, and optional similarity suggestions.
5. Measurement tools, clipping planes, surface normals, and material/assembly support.
6. Optional authenticated shared libraries after deciding where CAD files should be stored.

## Git

The project is tracked in Git on `main`. Use `git log --oneline` and `git diff` to inspect the work. No remote is configured yet.

Before publishing, run `pnpm test` and `pnpm build`, choose the repository visibility and license, then add your repository remote and push `main`. Source files, the dependency lockfile, and test fixtures belong in Git; dependencies, build output, local environment variables, editor state, and local CAD libraries do not.
