import { emptyCell } from "./cellGrid";
import { hasLegalMove } from "./MatchResolver";
import type { CellGrid, Tile } from "./boardTypes";

export class BoardModel {
  readonly width: number;
  readonly height: number;
  readonly kindCount: number;
  private grid: CellGrid;
  private nextTileId: number;

  constructor(width: number, height: number, kindCount: number, grid: CellGrid, nextTileId: number) {
    this.width = width;
    this.height = height;
    this.kindCount = kindCount;
    this.grid = grid;
    this.nextTileId = nextTileId;
  }

  static createEmptyGrid(width: number, height: number): CellGrid {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => emptyCell()));
  }

  static createPlayable(
    width: number,
    height: number,
    kindCount: number,
    random: () => number = Math.random,
    blocked: (x: number, y: number) => boolean = () => false,
  ): BoardModel {
    let attempt = 0;

    while (attempt < 200) {
      let nextTileId = 1;
      const grid = BoardModel.createEmptyGrid(width, height);

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (blocked(x, y)) {
            continue;
          }
          const kind = BoardModel.pickKindAvoidingImmediateMatch(grid, x, y, kindCount, random);
          grid[y][x].piece = { id: nextTileId, kind, special: "none" };
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

  /**
   * Fixed layout: kinds[y][x] is kind index; blockers mark cells with crate (no piece until cleared).
   */
  static fromLayout(
    kinds: number[][],
    blockerHp: (number | null)[][],
    kindCount: number,
    random: () => number = Math.random,
  ): BoardModel {
    const height = kinds.length;
    const width = kinds[0]?.length ?? 0;
    let nextTileId = 1;
    const grid = BoardModel.createEmptyGrid(width, height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const hp = blockerHp[y]?.[x];
        if (hp != null && hp > 0) {
          grid[y][x].blocker = { hp };
          grid[y][x].piece = null;
          continue;
        }
        const kind = kinds[y]![x]!;
        grid[y][x].piece = { id: nextTileId, kind: Math.min(kind, kindCount - 1), special: "none" };
        nextTileId += 1;
      }
    }

    if (!hasLegalMove(grid)) {
      const blocked = (x: number, y: number) => {
        const hp = blockerHp[y]?.[x];
        return hp != null && hp > 0;
      };
      const board = BoardModel.createPlayable(width, height, kindCount, random, blocked);
      const g = board.getGrid();
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const hp = blockerHp[y]?.[x];
          if (hp != null && hp > 0) {
            g[y][x].blocker = { hp };
            g[y][x].piece = null;
          }
        }
      }
      board.replaceGrid(g, board.getNextTileId());
      return board;
    }

    return new BoardModel(width, height, kindCount, grid, nextTileId);
  }

  getGrid(): CellGrid {
    return this.grid.map((row) => row.map((c) => ({ ...c, piece: c.piece ? { ...c.piece } : null, blocker: c.blocker ? { ...c.blocker } : null })));
  }

  getNextTileId(): number {
    return this.nextTileId;
  }

  replaceGrid(grid: CellGrid, nextTileId: number): void {
    this.grid = grid.map((row) =>
      row.map((c) => ({
        piece: c.piece ? { ...c.piece } : null,
        blocker: c.blocker ? { ...c.blocker } : null,
      })),
    );
    this.nextTileId = nextTileId;
  }

  createTile(random: () => number = Math.random): Tile {
    const tile: Tile = {
      id: this.nextTileId,
      kind: Math.floor(random() * this.kindCount),
      special: "none",
    };
    this.nextTileId += 1;
    return tile;
  }

  clone(): BoardModel {
    return new BoardModel(this.width, this.height, this.kindCount, this.getGrid(), this.nextTileId);
  }

  static applyBlockers(grid: CellGrid, blockers: { x: number; y: number; hp: number }[]): void {
    for (const b of blockers) {
      const cell = grid[b.y]?.[b.x];
      if (cell) {
        cell.blocker = { hp: b.hp };
        cell.piece = null;
      }
    }
  }

  static pickKindAvoidingImmediateMatch(
    grid: CellGrid,
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

    const kindAt = (cx: number, cy: number): number | null => grid[cy]?.[cx]?.piece?.kind ?? null;

    const left1 = x >= 1 ? kindAt(x - 1, y) : null;
    const left2 = x >= 2 ? kindAt(x - 2, y) : null;
    const up1 = y >= 1 ? kindAt(x, y - 1) : null;
    const up2 = y >= 2 ? kindAt(x, y - 2) : null;

    return (
      kinds.find((kind) => {
        const breaksHorizontal = !(left1 != null && left2 != null && left1 === kind && left2 === kind);
        const breaksVertical = !(up1 != null && up2 != null && up1 === kind && up2 === kind);
        return breaksHorizontal && breaksVertical;
      }) ?? 0
    );
  }
}
