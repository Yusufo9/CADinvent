import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Star,
  Box,
  Check,
  GripVertical,
  Trash2,
} from "lucide-react";
import type { Category, Part } from "../types";
import { includedInAll } from "../lib/categories";
interface Props {
  category: Category;
  categories: Category[];
  parts: Part[];
  selected: Set<string>;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onInclude: () => void;
  onCategoryFavorite: () => void;
  onInspect: (p: Part) => void;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onMove: (ids: string[], category: string) => void;
  hideHeading?: boolean;
}
export default function CategoryRow({
  category,
  categories,
  parts,
  selected,
  onToggle,
  onRename,
  onDelete,
  onInclude,
  onCategoryFavorite,
  onInspect,
  onSelect,
  onFavorite,
  onMove,
  hideHeading = false,
}: Props) {
  const row = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1);
      const next = Math.max(
        0,
        Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + delta),
      );
      if (next !== el.scrollLeft) {
        e.preventDefault();
        el.scrollLeft = next;
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [category.collapsed]);
  function rename() {
    if (name.trim()) onRename(name.trim());
    else setName(category.name);
    setRenaming(false);
  }
  return (
    <section
      className={`category ${over ? "drag-over" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/cadinvent")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          const ids = JSON.parse(
            e.dataTransfer.getData("application/cadinvent"),
          );
          if (Array.isArray(ids)) onMove(ids, category.id);
        } catch {
          /* External drops are handled by the import area. */
        }
      }}
    >
      {!hideHeading && (
        <div className="category-heading">
          <button
            className="category-toggle"
            onClick={onToggle}
            aria-expanded={!category.collapsed}
            aria-label={`${category.collapsed ? "Expand" : "Collapse"} ${category.name}`}
          >
            {category.collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
            <span
              className="category-dot"
              style={{ background: category.color }}
            />
          </button>
          {renaming ? (
            <input
              className="rename-input"
              value={name}
              autoFocus
              maxLength={60}
              aria-label="Category name"
              onChange={(e) => setName(e.target.value)}
              onBlur={rename}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename();
                if (e.key === "Escape") {
                  setName(category.name);
                  setRenaming(false);
                }
              }}
            />
          ) : (
            <button className="category-name" onClick={onToggle}>
              {category.name}
            </button>
          )}
          <span className="count">{parts.length}</span>
          {category.id !== "unclassified" && (
            <button
              className="icon-button subtle"
              aria-label={`Rename ${category.name}`}
              onClick={() => setRenaming(true)}
            >
              <Pencil size={14} />
            </button>
          )}
          <div className="category-actions">
            <button
              className={`icon-button category-favorite ${category.favorite ? "is-favorite" : ""}`}
              aria-label={`${category.favorite ? "Unfavorite" : "Favorite"} ${category.name} category`}
              aria-pressed={!!category.favorite}
              title="Favorite category"
              onClick={onCategoryFavorite}
            >
              <Star
                size={15}
                fill={category.favorite ? "currentColor" : "none"}
              />
            </button>
            {category.id !== "unclassified" && (
              <button
                className={`icon-button category-include ${includedInAll(category) ? "is-included" : ""}`}
                aria-label={`${includedInAll(category) ? "Exclude" : "Include"} ${category.name} ${includedInAll(category) ? "from" : "in"} All Parts`}
                aria-pressed={includedInAll(category)}
                title={
                  includedInAll(category)
                    ? "Exclude from All Parts"
                    : "Include in All Parts"
                }
                onClick={onInclude}
              >
                <span
                  aria-hidden="true"
                  style={{ fontSize: 20, lineHeight: 1 }}
                >
                  ±
                </span>
              </button>
            )}
            {category.id !== "unclassified" && (
              <button
                className="icon-button category-delete"
                title="Delete category"
                aria-label={`Delete ${category.name} category`}
                onClick={onDelete}
              >
                <Trash2 size={14} />
              </button>
            )}
            <span className="row-hint">
              {parts.length > 0 ? "SCROLL TO EXPLORE" : "READY FOR PARTS"}
            </span>
            <button
              className="icon-button"
              aria-label={`Scroll ${category.name} left`}
              onClick={() =>
                row.current?.scrollBy({ left: -460, behavior: "smooth" })
              }
            >
              <ChevronRight className="flip" size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={`Scroll ${category.name} right`}
              onClick={() =>
                row.current?.scrollBy({ left: 460, behavior: "smooth" })
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
      {!category.collapsed && (
        <div className="part-row" ref={row}>
          {parts.map((p) => (
            <article
              key={p.id}
              className={`part-card ${selected.has(p.id) ? "selected" : ""}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/cadinvent",
                  JSON.stringify(selected.has(p.id) ? [...selected] : [p.id]),
                );
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <button
                className={`select-part ${selected.has(p.id) ? "checked" : ""}`}
                aria-label={`Select ${p.name}`}
                aria-pressed={selected.has(p.id)}
                onClick={() => onSelect(p.id)}
              >
                {selected.has(p.id) && <Check size={12} />}
              </button>
              <button
                className={`favorite ${p.favorite ? "is-favorite" : ""}`}
                aria-label={`${p.favorite ? "Unfavorite" : "Favorite"} ${p.name}`}
                onClick={() => onFavorite(p.id)}
              >
                <Star size={15} fill={p.favorite ? "currentColor" : "none"} />
              </button>
              <button
                className="preview-button"
                aria-label={`Inspect ${p.name}`}
                onClick={() => onInspect(p)}
              >
                <img
                  src={p.thumbnail}
                  loading="lazy"
                  decoding="async"
                  alt={`3D preview of ${p.name}`}
                />
                <span className="preview-cross">+</span>
              </button>
              <div className="card-caption">
                <span className="part-name" title={p.name}>
                  {p.name}
                </span>
                <div className="card-meta">
                  <span>
                    {p.format} <span className="meta-dot">·</span>{" "}
                    {p.demo
                      ? "SAMPLE"
                      : `${(p.triangles / 1000).toFixed(1)}k faces`}
                  </span>
                  <GripVertical size={13} />
                </div>
              </div>
              <select
                className="card-category"
                aria-label={`Move ${p.name} to category`}
                value={p.categoryId}
                onChange={(e) => onMove([p.id], e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </article>
          ))}
          {!parts.length && !hideHeading && (
            <div className="empty-row">
              <Box size={25} />
              <div>
                <b>No parts here yet</b>
                <span>Drop a part here or assign one from your library.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
