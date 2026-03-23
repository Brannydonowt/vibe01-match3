import type {
  BoardPosition,
  MatchGroup,
  SpawnedTile,
  Tile,
  TileGrid,
  TileMovement,
} from "./boardTypes";

export function cloneGrid(grid: TileGrid): TileGrid {
  return grid.map((row) => [...row]);
}

export function isAdjacent(a: BoardPosition, b: BoardPosition): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy === 1;
}

export function swapInGrid(
  grid: TileGrid,
  first: BoardPosition,
  second: BoardPosition,
): void {
  const temp = grid[first.y][first.x];
  grid[first.y][first.x] = grid[second.y][second.x];
  grid[second.y][second.x] = temp;
}

export function findMatchGroups(grid: TileGrid): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  for (let y = 0; y < height; y += 1) {
    let runStart = 0;
    while (runStart < width) {
      const tile = grid[y][runStart];
      let runEnd = runStart + 1;

      while (
        tile &&
        runEnd < width &&
        grid[y][runEnd] &&
        grid[y][runEnd]?.kind === tile.kind
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
      const tile = grid[runStart][x];
      let runEnd = runStart + 1;

      while (
        tile &&
        runEnd < height &&
        grid[runEnd][x] &&
        grid[runEnd][x]?.kind === tile.kind
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

export function hasAnyMatches(grid: TileGrid): boolean {
  return findMatchGroups(grid).length > 0;
}

export function createsMatchAfterSwap(
  grid: TileGrid,
  first: BoardPosition,
  second: BoardPosition,
): boolean {
  const cloned = cloneGrid(grid);
  swapInGrid(cloned, first, second);
  return hasAnyMatches(cloned);
}

export function hasLegalMove(grid: TileGrid): boolean {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x + 1 < width && createsMatchAfterSwap(grid, { x, y }, { x: x + 1, y })) {
        return true;
      }

      if (y + 1 < height && createsMatchAfterSwap(grid, { x, y }, { x, y: y + 1 })) {
        return true;
      }
    }
  }

  return false;
}

export function clearMatchedTiles(grid: TileGrid, cells: BoardPosition[]): TileGrid {
  const cleared = cloneGrid(grid);

  for (const cell of cells) {
    cleared[cell.y][cell.x] = null;
  }

  return cleared;
}

export function collapseColumns(
  grid: TileGrid,
  createTile: () => Tile,
): {
  grid: TileGrid;
  movements: TileMovement[];
  spawned: SpawnedTile[];
} {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const nextGrid = grid.map((row) => [...row]);
  const movements: TileMovement[] = [];
  const spawned: SpawnedTile[] = [];

  for (let x = 0; x < width; x += 1) {
    let writeRow = height - 1;

    for (let y = height - 1; y >= 0; y -= 1) {
      const tile = nextGrid[y][x];
      if (!tile) {
        continue;
      }

      if (writeRow !== y) {
        nextGrid[writeRow][x] = tile;
        nextGrid[y][x] = null;
        movements.push({
          tile,
          from: { x, y },
          to: { x, y: writeRow },
        });
      }

      writeRow -= 1;
    }

    for (let y = writeRow; y >= 0; y -= 1) {
      const tile = createTile();
      nextGrid[y][x] = tile;
      spawned.push({
        tile,
        from: { x, y: y - (writeRow + 1) - 1 },
        to: { x, y },
      });
    }
  }

  return { grid: nextGrid, movements, spawned };
}
