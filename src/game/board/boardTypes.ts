export interface BoardPosition {
  x: number;
  y: number;
}

export interface Tile {
  id: number;
  kind: number;
}

export type TileGrid = Array<Array<Tile | null>>;

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
      grid: TileGrid;
      valid: boolean;
    }
  | {
      type: "clear";
      cascade: number;
      groups: MatchGroup[];
      cleared: BoardPosition[];
      grid: TileGrid;
    }
  | {
      type: "fall";
      cascade: number;
      grid: TileGrid;
      movements: TileMovement[];
      spawned: SpawnedTile[];
    }
  | {
      type: "reshuffle";
      grid: TileGrid;
    };
