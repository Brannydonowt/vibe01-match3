import type { BoardPosition, Cell, CellGrid, Tile } from "./boardTypes";

export function emptyCell(): Cell {
  return { piece: null, blocker: null };
}

export function cloneCellGrid(grid: CellGrid): CellGrid {
  return grid.map((row) => row.map((c) => ({ ...c, piece: c.piece ? { ...c.piece } : null, blocker: c.blocker ? { ...c.blocker } : null })));
}

export function getPiece(grid: CellGrid, pos: BoardPosition): Tile | null {
  return grid[pos.y]?.[pos.x]?.piece ?? null;
}

export function cellAt(grid: CellGrid, pos: BoardPosition): Cell | null {
  return grid[pos.y]?.[pos.x] ?? null;
}

export function isSwappable(grid: CellGrid, pos: BoardPosition): boolean {
  const cell = cellAt(grid, pos);
  return Boolean(cell?.piece && !cell.blocker);
}

export function swapPiecesInGrid(grid: CellGrid, first: BoardPosition, second: BoardPosition): void {
  const a = grid[first.y][first.x];
  const b = grid[second.y][second.x];
  const tmp = a.piece;
  a.piece = b.piece;
  b.piece = tmp;
}

export function gridDimensions(grid: CellGrid): { width: number; height: number } {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  return { width, height };
}
