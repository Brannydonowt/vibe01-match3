import { hasLegalMove } from "./MatchResolver";
import type { Tile, TileGrid } from "./boardTypes";

export class BoardModel {
  readonly width: number;
  readonly height: number;
  readonly kindCount: number;
  private grid: TileGrid;
  private nextTileId: number;

  constructor(
    width: number,
    height: number,
    kindCount: number,
    grid: TileGrid,
    nextTileId: number,
  ) {
    this.width = width;
    this.height = height;
    this.kindCount = kindCount;
    this.grid = grid;
    this.nextTileId = nextTileId;
  }

  static createPlayable(
    width: number,
    height: number,
    kindCount: number,
    random: () => number = Math.random,
  ): BoardModel {
    let attempt = 0;

    while (attempt < 200) {
      let nextTileId = 1;
      const grid: TileGrid = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => null),
      );

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const kind = BoardModel.pickKindAvoidingImmediateMatch(grid, x, y, kindCount, random);
          grid[y][x] = { id: nextTileId, kind };
          nextTileId += 1;
        }
      }

      if (hasLegalMove(grid)) {
        return new BoardModel(width, height, kindCount, grid, nextTileId);
      }

      attempt += 1;
    }

    throw new Error("Unable to generate a playable board.");
  }

  getGrid(): TileGrid {
    return this.grid.map((row) => [...row]);
  }

  getNextTileId(): number {
    return this.nextTileId;
  }

  replaceGrid(grid: TileGrid, nextTileId: number): void {
    this.grid = grid.map((row) => [...row]);
    this.nextTileId = nextTileId;
  }

  createTile(random: () => number = Math.random): Tile {
    const tile: Tile = {
      id: this.nextTileId,
      kind: Math.floor(random() * this.kindCount),
    };
    this.nextTileId += 1;
    return tile;
  }

  clone(): BoardModel {
    return new BoardModel(
      this.width,
      this.height,
      this.kindCount,
      this.getGrid(),
      this.nextTileId,
    );
  }

  static pickKindAvoidingImmediateMatch(
    grid: TileGrid,
    x: number,
    y: number,
    kindCount: number,
    random: () => number,
  ): number {
    const kinds = Array.from({ length: kindCount }, (_, index) => index);

    for (let index = kinds.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const temp = kinds[index];
      kinds[index] = kinds[swapIndex];
      kinds[swapIndex] = temp;
    }

    const left1 = x >= 1 ? grid[y][x - 1] : null;
    const left2 = x >= 2 ? grid[y][x - 2] : null;
    const up1 = y >= 1 ? grid[y - 1][x] : null;
    const up2 = y >= 2 ? grid[y - 2][x] : null;

    return (
      kinds.find((kind) => {
        const breaksHorizontal = !(left1 && left2 && left1.kind === kind && left2.kind === kind);
        const breaksVertical = !(up1 && up2 && up1.kind === kind && up2.kind === kind);
        return breaksHorizontal && breaksVertical;
      }) ?? 0
    );
  }
}
