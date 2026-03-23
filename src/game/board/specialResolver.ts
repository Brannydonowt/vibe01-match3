import type { BoardPosition, CellGrid, SpecialType, Tile } from "./boardTypes";
import { getPiece, gridDimensions } from "./cellGrid";

const posKey = (p: BoardPosition): string => `${p.x},${p.y}`;

function isSpawnCandidate(tile: Tile | null): boolean {
  if (!tile) {
    return false;
  }
  return tile.special !== "color_bomb";
}

export function collectBlastCellsForSpecialAt(
  grid: CellGrid,
  origin: BoardPosition,
  piece: Tile,
): BoardPosition[] {
  const { width, height } = gridDimensions(grid);
  const out: BoardPosition[] = [];
  const seen = new Set<string>();

  const add = (p: BoardPosition): void => {
    if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) {
      return;
    }
    const k = posKey(p);
    if (seen.has(k)) {
      return;
    }
    seen.add(k);
    out.push(p);
  };

  if (piece.special === "line_h") {
    for (let x = 0; x < width; x += 1) {
      add({ x, y: origin.y });
    }
    return out;
  }

  if (piece.special === "line_v") {
    for (let y = 0; y < height; y += 1) {
      add({ x: origin.x, y });
    }
    return out;
  }

  if (piece.special === "bomb") {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        add({ x: origin.x + dx, y: origin.y + dy });
      }
    }
    return out;
  }

  return out;
}

export function expandMatchedWithSpecialBlasts(grid: CellGrid, matched: BoardPosition[]): BoardPosition[] {
  const { width, height } = gridDimensions(grid);
  const seen = new Set<string>();
  const queue: BoardPosition[] = [];

  const enqueue = (p: BoardPosition): void => {
    if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) {
      return;
    }
    const k = posKey(p);
    if (seen.has(k)) {
      return;
    }
    seen.add(k);
    queue.push(p);
  };

  for (const p of matched) {
    enqueue(p);
  }

  const result: BoardPosition[] = [];
  while (queue.length > 0) {
    const p = queue.pop()!;
    result.push(p);
    const piece = getPiece(grid, p);
    if (!piece || piece.special === "none" || piece.special === "color_bomb") {
      continue;
    }
    const blast = collectBlastCellsForSpecialAt(grid, p, piece);
    for (const b of blast) {
      enqueue(b);
    }
  }

  return result;
}

function maxStraightRunInSet(
  grid: CellGrid,
  matchedSet: Set<string>,
  kind: number,
): { length: number; cells: BoardPosition[]; horizontal: boolean } {
  let best = { length: 0, cells: [] as BoardPosition[], horizontal: true };
  const { width, height } = gridDimensions(grid);

  for (let y = 0; y < height; y += 1) {
    let run: BoardPosition[] = [];
    for (let x = 0; x < width; x += 1) {
      const p = { x, y };
      const tile = getPiece(grid, p);
      if (!matchedSet.has(posKey(p)) || !tile || !isSpawnCandidate(tile) || tile.kind !== kind) {
        if (run.length > best.length) {
          best = { length: run.length, cells: [...run], horizontal: true };
        }
        run = [];
        continue;
      }
      run.push(p);
    }
    if (run.length > best.length) {
      best = { length: run.length, cells: [...run], horizontal: true };
    }
  }

  for (let x = 0; x < width; x += 1) {
    let run: BoardPosition[] = [];
    for (let y = 0; y < height; y += 1) {
      const p = { x, y };
      const tile = getPiece(grid, p);
      if (!matchedSet.has(posKey(p)) || !tile || !isSpawnCandidate(tile) || tile.kind !== kind) {
        if (run.length > best.length) {
          best = { length: run.length, cells: [...run], horizontal: false };
        }
        run = [];
        continue;
      }
      run.push(p);
    }
    if (run.length > best.length) {
      best = { length: run.length, cells: [...run], horizontal: false };
    }
  }

  return best;
}

function hasLTIntersection(grid: CellGrid, matchedSet: Set<string>, kind: number): BoardPosition | null {
  const { width, height } = gridDimensions(grid);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = { x, y };
      if (!matchedSet.has(posKey(p))) {
        continue;
      }
      const tile = getPiece(grid, p);
      if (!tile || !isSpawnCandidate(tile) || tile.kind !== kind) {
        continue;
      }

      let horiz = 1;
      for (let dx = 1; x + dx < width; dx += 1) {
        const q = { x: x + dx, y };
        const t = getPiece(grid, q);
        if (!matchedSet.has(posKey(q)) || !t || !isSpawnCandidate(t) || t.kind !== kind) {
          break;
        }
        horiz += 1;
      }
      for (let dx = 1; x - dx >= 0; dx += 1) {
        const q = { x: x - dx, y };
        const t = getPiece(grid, q);
        if (!matchedSet.has(posKey(q)) || !t || !isSpawnCandidate(t) || t.kind !== kind) {
          break;
        }
        horiz += 1;
      }

      let vert = 1;
      for (let dy = 1; y + dy < height; dy += 1) {
        const q = { x, y: y + dy };
        const t = getPiece(grid, q);
        if (!matchedSet.has(posKey(q)) || !t || !isSpawnCandidate(t) || t.kind !== kind) {
          break;
        }
        vert += 1;
      }
      for (let dy = 1; y - dy >= 0; dy += 1) {
        const q = { x, y: y - dy };
        const t = getPiece(grid, q);
        if (!matchedSet.has(posKey(q)) || !t || !isSpawnCandidate(t) || t.kind !== kind) {
          break;
        }
        vert += 1;
      }

      if (horiz >= 3 && vert >= 3) {
        return p;
      }
    }
  }

  return null;
}

function pickSpawnCell(matched: BoardPosition[], prefer: BoardPosition): BoardPosition {
  const prefKey = posKey(prefer);
  const inMatch = matched.some((p) => posKey(p) === prefKey);
  if (inMatch) {
    return prefer;
  }
  const sorted = [...matched].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
  return sorted[0]!;
}

export function computeSpecialSpawn(
  grid: CellGrid,
  matchedCells: BoardPosition[],
  prefer: BoardPosition,
): { pos: BoardPosition; type: Exclude<SpecialType, "none"> } | null {
  if (matchedCells.length === 0) {
    return null;
  }

  const matchedSet = new Set(matchedCells.map(posKey));
  const kinds = new Set<number>();
  for (const p of matchedCells) {
    const t = getPiece(grid, p);
    if (t && isSpawnCandidate(t)) {
      kinds.add(t.kind);
    }
  }

  let bestStraight = { length: 0, cells: [] as BoardPosition[], horizontal: true, kind: 0 };
  for (const kind of kinds) {
    const run = maxStraightRunInSet(grid, matchedSet, kind);
    if (run.length > bestStraight.length) {
      bestStraight = { ...run, kind };
    }
  }

  if (bestStraight.length >= 5) {
    const mid = Math.floor(bestStraight.cells.length / 2);
    const pos = bestStraight.cells[mid]!;
    return { pos, type: "color_bomb" };
  }

  for (const kind of kinds) {
    const lt = hasLTIntersection(grid, matchedSet, kind);
    if (lt) {
      return { pos: pickSpawnCell([lt], prefer), type: "bomb" };
    }
  }

  if (bestStraight.length === 4) {
    const pos = pickSpawnCell(bestStraight.cells, prefer);
    return { pos, type: bestStraight.horizontal ? "line_h" : "line_v" };
  }

  return null;
}

export function allPieceCells(grid: CellGrid): BoardPosition[] {
  const { width, height } = gridDimensions(grid);
  const out: BoardPosition[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (getPiece(grid, { x, y })) {
        out.push({ x, y });
      }
    }
  }
  return out;
}

export function uniquePositions(cells: BoardPosition[]): BoardPosition[] {
  const seen = new Set<string>();
  const out: BoardPosition[] = [];
  for (const c of cells) {
    const k = posKey(c);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(c);
  }
  return out;
}

