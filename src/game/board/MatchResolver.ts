import type {
  BoardPosition,
  MatchGroup,
  SpawnedTile,
  Tile,
  TileMovement,
  CellGrid,
} from "./boardTypes";
import "./matchRules";
import { cloneCellGrid, gridDimensions, swapPiecesInGrid } from "./cellGrid";

export function cloneGrid(grid: CellGrid): CellGrid {
  return cloneCellGrid(grid);
}

export function isAdjacent(a: BoardPosition, b: BoardPosition): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy === 1;
}

export function swapInGrid(grid: CellGrid, first: BoardPosition, second: BoardPosition): void {
  swapPiecesInGrid(grid, first, second);
}

function matchablePieceAt(grid: CellGrid, x: number, y: number): Tile | null {
  const tile = grid[y]?.[x]?.piece ?? null;
  if (!tile || tile.special === "color_bomb") {
    return null;
  }
  return tile;
}

export function findMatchGroups(grid: CellGrid): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  for (let y = 0; y < height; y += 1) {
    let runStart = 0;
    while (runStart < width) {
      const tile = matchablePieceAt(grid, runStart, y);
      let runEnd = runStart + 1;

      while (
        tile &&
        runEnd < width &&
        matchablePieceAt(grid, runEnd, y) &&
        matchablePieceAt(grid, runEnd, y)?.kind === tile.kind
      ) {
        runEnd += 1;
      }

      if (tile && runEnd - runStart >= 3) {
        groups.push({
          kind: tile.kind,
          cells: Array.from({ length: runEnd - runStart }, (_, index) => ({
            x: runStart + index,
            y,
          })),
        });
      }

      runStart = tile ? runEnd : runStart + 1;
    }
  }

  for (let x = 0; x < width; x += 1) {
    let runStart = 0;
    while (runStart < height) {
      const tile = matchablePieceAt(grid, x, runStart);
      let runEnd = runStart + 1;

      while (
        tile &&
        runEnd < height &&
        matchablePieceAt(grid, x, runEnd) &&
        matchablePieceAt(grid, x, runEnd)?.kind === tile.kind
      ) {
        runEnd += 1;
      }

      if (tile && runEnd - runStart >= 3) {
        groups.push({
          kind: tile.kind,
          cells: Array.from({ length: runEnd - runStart }, (_, index) => ({
            x,
            y: runStart + index,
          })),
        });
      }

      runStart = tile ? runEnd : runStart + 1;
    }
  }

  return groups;
}

export function flattenMatches(groups: MatchGroup[]): BoardPosition[] {
  const keySet = new Set<string>();
  const cells: BoardPosition[] = [];

  for (const group of groups) {
    for (const cell of group.cells) {
      const key = `${cell.x},${cell.y}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        cells.push(cell);
      }
    }
  }

  return cells;
}

export function hasAnyMatches(grid: CellGrid): boolean {
  return findMatchGroups(grid).length > 0;
}

function canSwapPieces(grid: CellGrid, a: BoardPosition, b: BoardPosition): boolean {
  const ca = grid[a.y]?.[a.x];
  const cb = grid[b.y]?.[b.x];
  return Boolean(ca?.piece && !ca.blocker && cb?.piece && !cb.blocker);
}

export function createsMatchAfterSwap(
  grid: CellGrid,
  first: BoardPosition,
  second: BoardPosition,
): boolean {
  if (!canSwapPieces(grid, first, second)) {
    return false;
  }
  const cloned = cloneGrid(grid);
  swapInGrid(cloned, first, second);
  return hasAnyMatches(cloned);
}

export function hasLegalMove(grid: CellGrid): boolean {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (
        x + 1 < width &&
        canSwapPieces(grid, { x, y }, { x: x + 1, y }) &&
        createsMatchAfterSwap(grid, { x, y }, { x: x + 1, y })
      ) {
        return true;
      }

      if (
        y + 1 < height &&
        canSwapPieces(grid, { x, y }, { x, y: y + 1 }) &&
        createsMatchAfterSwap(grid, { x, y }, { x, y: y + 1 })
      ) {
        return true;
      }
    }
  }

  return false;
}

const ORTHO: BoardPosition[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function damageBlockersAdjacentTo(grid: CellGrid, cells: BoardPosition[]): void {
  const { width, height } = gridDimensions(grid);
  const seenBlocker = new Set<string>();

  for (const c of cells) {
    for (const d of ORTHO) {
      const nx = c.x + d.x;
      const ny = c.y + d.y;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }
      const cell = grid[ny][nx];
      if (!cell?.blocker) {
        continue;
      }
      const bk = `${nx},${ny}`;
      if (seenBlocker.has(bk)) {
        continue;
      }
      seenBlocker.add(bk);
      cell.blocker.hp -= 1;
      if (cell.blocker.hp <= 0) {
        cell.blocker = null;
      }
    }
  }
}

export function clearPiecesAt(grid: CellGrid, cells: BoardPosition[]): void {
  for (const c of cells) {
    const cell = grid[c.y]?.[c.x];
    if (cell) {
      cell.piece = null;
    }
  }
}

export function collapseColumns(
  grid: CellGrid,
  createTile: () => Tile,
): {
  grid: CellGrid;
  movements: TileMovement[];
  spawned: SpawnedTile[];
} {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const movements: TileMovement[] = [];
  const spawned: SpawnedTile[] = [];

  for (let x = 0; x < width; x += 1) {
    type Slot = { y: number; cell: (typeof grid)[0][0] };
    const slots: Slot[] = [];

    const resolveSlots = (): void => {
      if (slots.length === 0) {
        return;
      }

      const stacked: { fromY: number; tile: Tile }[] = [];
      for (const slot of slots) {
        if (slot.cell.piece) {
          stacked.push({ fromY: slot.y, tile: slot.cell.piece });
        }
        slot.cell.piece = null;
      }

      for (let i = 0; i < slots.length; i += 1) {
        const slot = slots[i]!;
        if (i < stacked.length) {
          const { fromY, tile } = stacked[i]!;
          slot.cell.piece = tile;
          if (fromY !== slot.y) {
            movements.push({
              tile,
              from: { x, y: fromY },
              to: { x, y: slot.y },
            });
          }
        } else {
          const tile = createTile();
          slot.cell.piece = tile;
          const stepsAbove = slots.length - i;
          spawned.push({
            tile,
            from: { x, y: slot.y - stepsAbove },
            to: { x, y: slot.y },
          });
        }
      }
    };

    for (let y = height - 1; y >= 0; y -= 1) {
      const cell = grid[y][x];
      if (cell.blocker) {
        resolveSlots();
        slots.length = 0;
      } else {
        slots.push({ y, cell });
      }
    }
    resolveSlots();
  }

  return { grid, movements, spawned };
}
