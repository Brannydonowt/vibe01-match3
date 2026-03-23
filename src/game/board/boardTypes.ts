export interface BoardPosition {
  x: number;
  y: number;
}

export type SpecialType = "none" | "line_h" | "line_v" | "bomb" | "color_bomb";

export interface Tile {
  id: number;
  kind: number;
  special: SpecialType;
}

export interface Blocker {
  hp: number;
}

export interface Cell {
  piece: Tile | null;
  blocker: Blocker | null;
}

export type CellGrid = Cell[][];

export interface MatchGroup {
  kind: number;
  cells: BoardPosition[];
}

export interface TileMovement {
  tile: Tile;
  from: BoardPosition;
  to: BoardPosition;
}

export interface SpawnedTile {
  tile: Tile;
  from: BoardPosition;
  to: BoardPosition;
}

export type ResolutionStep =
  | {
      type: "swap";
      from: BoardPosition;
      to: BoardPosition;
      grid: CellGrid;
      valid: boolean;
    }
  | {
      type: "clear";
      cascade: number;
      groups: MatchGroup[];
      cleared: BoardPosition[];
      grid: CellGrid;
    }
  | {
      type: "fall";
      cascade: number;
      grid: CellGrid;
      movements: TileMovement[];
      spawned: SpawnedTile[];
    }
  | {
      type: "reshuffle";
      grid: CellGrid;
    };
