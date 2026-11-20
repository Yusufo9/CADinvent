import { readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const packages = ["react", "react-dom", "three", "lucide-react", "idb"];
let notices =
  "CADinvent — third-party notices\n\nThese licenses apply to the named dependencies, not to the original application code.\n";
for (const name of packages) {
  const directory = join(root, "node_modules", name);
  const pkg = JSON.parse(
    await readFile(join(directory, "package.json"), "utf8"),
  );
  notices += `\n${"=".repeat(72)}\n${name} ${pkg.version}\n\n${await readFile(join(directory, "LICENSE"), "utf8")}\n`;
}
const scheduler = dirname(
  require.resolve("scheduler/package.json", {
    paths: [await realpath(join(root, "node_modules", "react-dom"))],
  }),
);
const schedulerPkg = JSON.parse(
  await readFile(join(scheduler, "package.json"), "utf8"),
);
notices += `\n${"=".repeat(72)}\nscheduler ${schedulerPkg.version}\n\n${await readFile(join(scheduler, "LICENSE"), "utf8")}\n`;
notices += `\n${"=".repeat(72)}\nGo standard library (portable launcher)\n\n${await readFile(join(root, "portable", "GO-LICENSE"), "utf8")}\n`;
await writeFile(join(root, "dist", "THIRD-PARTY-NOTICES.txt"), notices);
console.log(
  "Included dependency license notices in dist/THIRD-PARTY-NOTICES.txt",
);
