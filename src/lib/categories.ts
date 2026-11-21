import {
  defaultCategories,
  type Category,
  type Library,
  type Part,
} from "../types";

export function includedInAll(category: Category) {
  return category.includedInAll ?? category.id !== "unclassified";
}

export function matchesView(part: Part, category: Category, view: string) {
  if (view === "all") return includedInAll(category);
  if (view === "favorites") return !!(part.favorite || category.favorite);
  if (view === "unclassified") return category.id === "unclassified";
  return true;
}

export function deletionDestination(library: Library, id: string): Category {
  const remaining = library.categories.filter((c) => c.id !== id);
  return (
    remaining.find((c) => c.id === "unclassified") ??
    remaining[0] ?? {
      id: crypto.randomUUID(),
      name: "Recovered parts",
      color: "#89958c",
      includedInAll: false,
    }
  );
}

export function removeCategory(
  library: Library,
  id: string,
  destination: Category,
): Library {
  const categories = library.categories.filter((c) => c.id !== id);
  const affected = library.parts.some((p) => p.categoryId === id);
  if (affected && !categories.some((c) => c.id === destination.id))
    categories.push(destination);
  return {
    categories,
    parts: library.parts.map((p) =>
      p.categoryId === id ? { ...p, categoryId: destination.id } : p,
    ),
  };
}

export function addImportedPart(library: Library, part: Part): Library {
  const categories = library.categories.some((c) => c.id === "unclassified")
    ? library.categories
    : [
        ...library.categories,
        { ...defaultCategories.find((c) => c.id === "unclassified")! },
      ];
  return { categories, parts: [...library.parts, part] };
}
