import { describe, expect, it } from "vitest";
import {
  addImportedPart,
  deletionDestination,
  includedInAll,
  matchesView,
  removeCategory,
} from "./categories";
import { createWorkspace } from "./workspaces";
import type { Part } from "../types";
const part: Part = {
  id: "p",
  name: "a.stl",
  categoryId: "unclassified",
  format: "STL",
  bytes: 100,
  triangles: 1,
  dimensions: [1, 1, 1],
  thumbnail: "",
  createdAt: "2026-11-20",
  favorite: true,
};
describe("category views and deletion", () => {
  it("excludes Unclassified by default and lets explicit inclusion override the default", () => {
    const category = createWorkspace("A").categories.find(
      (c) => c.id === "unclassified",
    )!;
    expect(includedInAll(category)).toBe(false);
    expect(matchesView(part, category, "all")).toBe(false);
    expect(matchesView(part, { ...category, includedInAll: true }, "all")).toBe(
      true,
    );
    expect(matchesView(part, category, "categories")).toBe(true);
  });
  it("category favorites include their parts without changing individual part favorites", () => {
    const category = {
      id: "brackets",
      name: "Brackets",
      color: "#aaaaaa",
      favorite: true,
      includedInAll: false,
    };
    const normal = { ...part, favorite: false };
    expect(matchesView(normal, category, "favorites")).toBe(true);
    expect(
      matchesView(normal, { ...category, favorite: false }, "favorites"),
    ).toBe(false);
    expect(
      matchesView(part, { ...category, favorite: false }, "favorites"),
    ).toBe(true);
    expect(normal.favorite).toBe(false);
  });
  it("deletes Unclassified without orphaning parts or losing favorites", () => {
    const library = { ...createWorkspace("A"), parts: [part] };
    const destination = deletionDestination(library, "unclassified");
    const next = removeCategory(library, "unclassified", destination);
    expect(next.categories.some((c) => c.id === "unclassified")).toBe(false);
    expect(next.parts[0]).toEqual({ ...part, categoryId: destination.id });
  });
  it("keeps models when deleting the last populated category and permits deleting the last empty category", () => {
    const library = {
      categories: [createWorkspace("A").categories.at(-1)!],
      parts: [part],
    };
    const destination = deletionDestination(library, "unclassified");
    const next = removeCategory(library, "unclassified", destination);
    expect(next.categories[0].name).toBe("Recovered parts");
    expect(next.parts[0].categoryId).toBe(next.categories[0].id);
    expect(
      removeCategory({ ...library, parts: [] }, "unclassified", destination)
        .categories,
    ).toEqual([]);
  });
  it("recreates an excluded intake category only when adding a raw model", () => {
    const next = addImportedPart({ categories: [], parts: [] }, part);
    expect(next.categories[0].id).toBe("unclassified");
    expect(includedInAll(next.categories[0])).toBe(false);
    expect(next.parts[0]).toEqual(part);
  });
});
