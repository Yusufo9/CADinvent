# Run CADinvent on your computer

No installation, developer tools, account, or internet connection is needed after downloading the portable package. CADinvent uses your existing browser; it does not bundle Electron, Chromium, Node.js, or Python.

## Download and start

1. Open this repository's **Releases**, select a published release, and expand **Assets**. Choose a `cadinvent-...` package, not GitHub's automatically generated **Source code** archive.
2. Extract the package. Keep the executable anywhere you like.
3. Start it. Your default browser opens `http://127.0.0.1:47831`.
4. Keep the launcher window open while working. Close it or press Ctrl+C to stop.

| Computer | Package |
| --- | --- |
| Windows on Intel/AMD (most PCs) | `cadinvent-windows-amd64.zip` |
| Windows on ARM | `cadinvent-windows-arm64.zip` |
| Linux on Intel/AMD | `cadinvent-linux-amd64.tar.gz` |
| Linux on ARM64 | `cadinvent-linux-arm64.tar.gz` |
| Mac with Apple Silicon | `cadinvent-darwin-arm64.tar.gz` |
| Mac with Intel | `cadinvent-darwin-amd64.tar.gz` |

On Linux or macOS, launch the extracted executable in a terminal, for example `./cadinvent-linux-amd64`. Desktop double-click behavior varies. If executable permissions were lost while extracting, use `chmod +x cadinvent-linux-amd64` (substitute your filename). macOS and Windows packages are currently unsigned, so OS security policies may prevent first launch; signed/notarized packages are a future distribution step. Do not disable system security protections to use this app.

## Firefox and advanced options

Windows PowerShell:

```powershell
.\cadinvent-windows-amd64.exe -browser firefox
```

Linux/macOS:

```sh
./cadinvent-linux-amd64 -browser firefox
```

Use `-browser none` to start without opening a tab. Open the printed address manually. `-port 47832` changes the port only when necessary. `-version` prints the version. Starting a second copy with the same port reopens the existing app instead of starting another server.

## Your files

- CAD files never leave your computer. The server serves application assets only; it has no upload API and listens only on IPv4 loopback, not your network.
- Libraries live in the browser's IndexedDB storage. Use the **same browser, browser profile, and address/port** each time.
- Firefox and Chrome have separate libraries. The developer preview (`:5173`), a website, and the portable app (`:47831`) also have separate libraries.
- Moving the executable does not move or erase the library. Private browsing, clearing browser site data, or browser storage eviction can remove it.
- Export JSON/CSV for labels, and keep original CAD files backed up. Manifests do not contain source geometry and cannot currently be restored automatically.
- To update, stop the app, replace the executable, and restart it with the same port and browser.

Supported formats: STL, OBJ, PLY. Use a current Firefox, Chrome, Edge, or Safari with WebGL 2 enabled. STEP/IGES and native CAD files are not supported yet.

## For repository maintainers

The GitHub workflow builds six platform/architecture executables and attaches compressed packages and SHA-256 checksums to the workflow run. Pushing a `v*` tag creates a **draft** GitHub Release after checks pass. Review it, choose a project license, and publish the draft yourself; uploading the repository alone does not publish a release.

Build from source with Node.js 22+, pnpm, and Go 1.23+:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm portable:prepare
cd portable
go test ./...
cd ..
pnpm portable:build
```

The executable appears in `build/releases/`. All intermediate outputs stay inside `build/`: web assets in `build/web/`, generated launcher sources/assets in `build/launcher/`, and caches in `build/cache/`. The editable sources remain in `src/` and `portable/`. Build tools and dependencies are never included in the portable package. The Go launcher uses only the standard library. `CADINVENT_GO` may point to a Go executable outside PATH; a local `build/tools/go/` is also detected automatically. `GOOS` and `GOARCH` choose a cross-compilation target.

The frontend's `build/web/` output can also be hosted as static files, including under a subdirectory. Hosted and portable editions use the same app, but each origin has independent browser data. No service worker or stale offline cache is involved: portable assets are inside the executable.
