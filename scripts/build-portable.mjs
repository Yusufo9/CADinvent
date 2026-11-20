import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import "./prepare-portable.mjs";
const root = new URL("../", import.meta.url);
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const platform =
  process.env.GOOS ||
  { win32: "windows", darwin: "darwin", linux: "linux" }[process.platform];
const arch =
  process.env.GOARCH || { x64: "amd64", arm64: "arm64" }[process.arch];
if (!platform || !arch)
  throw new Error("Unsupported platform; set GOOS and GOARCH explicitly.");
await mkdir(new URL("build/releases/", root), { recursive: true });
const file = new URL(
  `build/releases/cadinvent-${platform}-${arch}${platform === "windows" ? ".exe" : ""}`,
  root,
);
const localToolchain = fileURLToPath(
  new URL(
    `build/tools/go/bin/go${process.platform === "win32" ? ".exe" : ""}`,
    root,
  ),
);
const hasLocalToolchain = await access(localToolchain).then(
  () => true,
  () => false,
);
const toolchain =
  process.env.CADINVENT_GO || (hasLocalToolchain ? localToolchain : "go");
const args = [
  "build",
  "-trimpath",
  "-ldflags",
  `-s -w -X main.version=${pkg.version}`,
  "-o",
  fileURLToPath(file),
  ".",
];
const result = spawnSync(toolchain, args, {
  cwd: fileURLToPath(new URL("build/launcher/", root)),
  env: { ...process.env, CGO_ENABLED: "0", GOOS: platform, GOARCH: arch },
  stdio: "inherit",
});
if (result.error)
  throw new Error(
    `Go is needed only to build portable releases. Install Go or set CADINVENT_GO. ${result.error.message}`,
  );
if (result.status !== 0) process.exit(result.status || 1);
console.log(
  `Portable app: ${fileURLToPath(file)} (${((await stat(file)).size / 1024 / 1024).toFixed(1)} MB)`,
);
