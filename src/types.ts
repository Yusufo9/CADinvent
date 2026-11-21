export interface Category {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean;
  includedInAll?: boolean;
  favorite?: boolean;
}
export interface Part {
  id: string;
  name: string;
  categoryId: string;
  format: string;
  bytes: number;
  triangles: number;
  dimensions: number[];
  thumbnail: string;
  createdAt: string;
  demo?: string;
  favorite?: boolean;
}
export interface Library {
  categories: Category[];
  parts: Part[];
}
export interface Workspace extends Library {
  id: string;
  name: string;
  createdAt: string;
}
export interface WorkspaceState {
  activeWorkspaceId: string;
  workspaces: Workspace[];
}
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  dimensions: number[];
  triangles: number;
}
export const defaultCategories: Category[] = [
  { id: "brackets", name: "Brackets", color: "#b4dc90" },
  { id: "hubs", name: "Hubs & couplings", color: "#a5b7e6" },
  { id: "mounts", name: "Mounts", color: "#e0b78d" },
  { id: "enclosures", name: "Enclosures", color: "#c4a3d8" },
  {
    id: "unclassified",
    name: "Unclassified",
    color: "#89958c",
    includedInAll: false,
  },
];
