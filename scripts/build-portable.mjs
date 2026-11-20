import { spawnSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
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
await mkdir(new URL("release/", root), { recursive: true });
const file = new URL(
  `release/cadinvent-${platform}-${arch}${platform === "windows" ? ".exe" : ""}`,
  root,
);
const toolchain = process.env.CADINVENT_GO || "go";
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
  cwd: fileURLToPath(new URL("portable/", root)),
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
