import type { Library } from "../types";
export function manifest(library: Library) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    categories: library.categories,
    parts: library.parts.map(({ thumbnail: _thumbnail, ...p }) => p),
  };
}
export function csv(library: Library) {
  const quote = (value: unknown) => {
    let s = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    ["filename", "category", "format", "triangles", "size_bytes", "sample"],
    ...library.parts.map((p) => [
      p.name,
      library.categories.find((c) => c.id === p.categoryId)?.name,
      p.format,
      p.triangles,
      p.bytes,
      !!p.demo,
    ]),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
export function download(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
