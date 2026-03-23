import { BoardModel } from "./BoardModel";
import { getPiece } from "./cellGrid";
import {
  clearPiecesAt,
  cloneGrid,
  collapseColumns,
  damageBlockersAdjacentTo,
  findMatchGroups,
  flattenMatches,
  hasAnyMatches,
  hasLegalMove,
  isAdjacent,
  swapInGrid,
} from "./MatchResolver";
import {
  allPieceCells,
  collectBlastCellsForSpecialAt,
  computeSpecialSpawn,
  expandMatchedWithSpecialBlasts,
  uniquePositions,
} from "./specialResolver";
import type { BoardPosition, CellGrid, ResolutionStep, SpecialType, Tile } from "./boardTypes";

export interface SwapResult {
  valid: boolean;
  scoreDelta: number;
  consumedMove: boolean;
  steps: ResolutionStep[];
}

function blockedMaskFromGrid(grid: CellGrid): (x: number, y: number) => boolean {
  return (x, y) => Boolean(grid[y]?.[x]?.blocker);
}

function mergeBlockersOntoGrid(target: CellGrid, blockersSource: CellGrid): void {
  for (let y = 0; y < target.length; y += 1) {
    for (let x = 0; x < (target[0]?.length ?? 0); x += 1) {
      if (blockersSource[y]?.[x]?.blocker) {
        target[y][x].blocker = { ...blockersSource[y][x].blocker! };
        target[y][x].piece = null;
      }
    }
  }
}

export class SwapController {
  trySwap(
    board: BoardModel,
    first: BoardPosition,
    second: BoardPosition,
    random: () => number = Math.random,
  ): SwapResult {
    if (!isAdjacent(first, second)) {
      return { valid: false, scoreDelta: 0, consumedMove: false, steps: [] };
    }

    const originalGrid = board.getGrid();
    const ca = originalGrid[first.y]?.[first.x];
    const cb = originalGrid[second.y]?.[second.x];
    if (!ca?.piece || !cb?.piece || ca.blocker || cb.blocker) {
      return { valid: false, scoreDelta: 0, consumedMove: false, steps: [] };
    }

    let workingGrid = cloneGrid(originalGrid);
    swapInGrid(workingGrid, first, second);

    const steps: ResolutionStep[] = [
      {
        type: "swap",
        from: first,
        to: second,
        grid: cloneGrid(workingGrid),
        valid: true,
      },
    ];

    let nextTileId = board.getNextTileId();
    let scoreDelta = 0;
    let cascade = 0;

    const pFirst = getPiece(workingGrid, first);
    const pSecond = getPiece(workingGrid, second);

    const colorBombPos =
      pFirst?.special === "color_bomb"
        ? first
        : pSecond?.special === "color_bomb"
          ? second
          : null;
    const otherPos =
      colorBombPos && colorBombPos.x === first.x && colorBombPos.y === first.y ? second : first;

    if (colorBombPos) {
      const bombPiece = getPiece(workingGrid, colorBombPos);
      const otherPiece = getPiece(workingGrid, otherPos);
      if (bombPiece?.special === "color_bomb" && otherPiece) {
        if (otherPiece.special === "color_bomb") {
          const toClear = allPieceCells(workingGrid);
          clearPiecesAt(workingGrid, toClear);
          damageBlockersAdjacentTo(workingGrid, toClear);
          scoreDelta += this.calculateScore(toClear.length, cascade);
          steps.push({
            type: "clear",
            cascade,
            groups: [],
            cleared: toClear,
            grid: cloneGrid(workingGrid),
          });
          const fall = this.runFall(board, workingGrid, nextTileId, random);
          nextTileId = fall.nextTileId;
          workingGrid = fall.grid;
          steps.push({
            type: "fall",
            cascade,
            grid: cloneGrid(workingGrid),
            movements: fall.movements,
            spawned: fall.spawned,
          });
          cascade += 1;
          const loop = this.runCascadeLoop(board, workingGrid, steps, cascade, nextTileId, random, second);
          scoreDelta += loop.scoreDelta;
          nextTileId = loop.nextTileId;
          const shuffled = this.finishShuffleIfNeeded(board, workingGrid, steps, random);
          if (shuffled != null) {
            nextTileId = shuffled;
          }
          board.replaceGrid(workingGrid, nextTileId);
          return { valid: true, scoreDelta, consumedMove: true, steps };
        }

        const kind = otherPiece.kind;
        const toClear: BoardPosition[] = [];
        const w = workingGrid[0]?.length ?? 0;
        const h = workingGrid.length;
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const t = getPiece(workingGrid, { x, y });
            if (t && t.kind === kind) {
              toClear.push({ x, y });
            }
          }
        }
        clearPiecesAt(workingGrid, toClear);
        damageBlockersAdjacentTo(workingGrid, toClear);
        scoreDelta += this.calculateScore(toClear.length, cascade);
        steps.push({
          type: "clear",
          cascade,
          groups: [],
          cleared: toClear,
          grid: cloneGrid(workingGrid),
        });
        const fallSingle = this.runFall(board, workingGrid, nextTileId, random);
        nextTileId = fallSingle.nextTileId;
        workingGrid = fallSingle.grid;
        steps.push({
          type: "fall",
          cascade,
          grid: cloneGrid(workingGrid),
          movements: fallSingle.movements,
          spawned: fallSingle.spawned,
        });
        cascade += 1;
        const loop2 = this.runCascadeLoop(board, workingGrid, steps, cascade, nextTileId, random, second);
        scoreDelta += loop2.scoreDelta;
        nextTileId = loop2.nextTileId;
        const shuffled2 = this.finishShuffleIfNeeded(board, workingGrid, steps, random);
        if (shuffled2 != null) {
          nextTileId = shuffled2;
        }
        board.replaceGrid(workingGrid, nextTileId);
        return { valid: true, scoreDelta, consumedMove: true, steps };
      }
    }

    if (hasAnyMatches(workingGrid)) {
      const loop = this.runCascadeLoop(board, workingGrid, steps, cascade, nextTileId, random, second);
      scoreDelta += loop.scoreDelta;
      nextTileId = loop.nextTileId;
      const shuffledM = this.finishShuffleIfNeeded(board, workingGrid, steps, random);
      if (shuffledM != null) {
        nextTileId = shuffledM;
      }
      board.replaceGrid(workingGrid, nextTileId);
      return { valid: true, scoreDelta, consumedMove: true, steps };
    }

    const activationCells: BoardPosition[] = [];
    for (const p of [first, second]) {
      const t = getPiece(workingGrid, p);
      if (t && (t.special === "line_h" || t.special === "line_v" || t.special === "bomb")) {
        activationCells.push(p);
      }
    }

    if (activationCells.length > 0) {
      const blast = new Set<string>();
      for (const p of activationCells) {
        const t = getPiece(workingGrid, p);
        if (!t) {
          continue;
        }
        for (const c of collectBlastCellsForSpecialAt(workingGrid, p, t)) {
          blast.add(`${c.x},${c.y}`);
        }
      }
      const toClear = [...blast].map((k) => {
        const [xs, ys] = k.split(",");
        return { x: Number(xs), y: Number(ys) };
      });
      clearPiecesAt(workingGrid, toClear);
      damageBlockersAdjacentTo(workingGrid, toClear);
      scoreDelta += this.calculateScore(toClear.length, cascade);
      steps.push({
        type: "clear",
        cascade,
        groups: [],
        cleared: toClear,
        grid: cloneGrid(workingGrid),
      });
      const fallAct = this.runFall(board, workingGrid, nextTileId, random);
      nextTileId = fallAct.nextTileId;
      workingGrid = fallAct.grid;
      steps.push({
        type: "fall",
        cascade,
        grid: cloneGrid(workingGrid),
        movements: fallAct.movements,
        spawned: fallAct.spawned,
      });
      cascade += 1;
      const loop3 = this.runCascadeLoop(board, workingGrid, steps, cascade, nextTileId, random, second);
      scoreDelta += loop3.scoreDelta;
      nextTileId = loop3.nextTileId;
      const shuffledA = this.finishShuffleIfNeeded(board, workingGrid, steps, random);
      if (shuffledA != null) {
        nextTileId = shuffledA;
      }
      board.replaceGrid(workingGrid, nextTileId);
      return { valid: true, scoreDelta, consumedMove: true, steps };
    }

    steps[0] = {
      type: "swap",
      from: first,
      to: second,
      grid: cloneGrid(workingGrid),
      valid: false,
    };
    return { valid: false, scoreDelta: 0, consumedMove: false, steps };
  }

  private runFall(
    board: BoardModel,
    grid: CellGrid,
    startId: number,
    random: () => number,
  ): {
    grid: CellGrid;
    movements: import("./boardTypes").TileMovement[];
    spawned: import("./boardTypes").SpawnedTile[];
    nextTileId: number;
  } {
    let nextTileId = startId;
    const collapse = collapseColumns(grid, () => {
      const tile: Tile = {
        id: nextTileId,
        kind: Math.floor(random() * board.kindCount),
        special: "none",
      };
      nextTileId += 1;
      return tile;
    });
    return {
      grid: collapse.grid,
      movements: collapse.movements,
      spawned: collapse.spawned,
      nextTileId,
    };
  }

  private runCascadeLoop(
    board: BoardModel,
    workingGrid: CellGrid,
    steps: ResolutionStep[],
    startCascade: number,
    startNextId: number,
    random: () => number,
    preferSpawn: BoardPosition,
  ): { scoreDelta: number; nextTileId: number; grid: CellGrid; cascade: number } {
    let cascade = startCascade;
    let nextTileId = startNextId;
    let scoreDelta = 0;

    const createTile = (): Tile => {
      const tile: Tile = {
        id: nextTileId,
        kind: Math.floor(random() * board.kindCount),
        special: "none",
      };
      nextTileId += 1;
      return tile;
    };

    let safety = 0;
    while (true) {
      safety += 1;
      if (safety > 400) {
        break;
      }
      const groups = findMatchGroups(workingGrid);
      if (groups.length === 0) {
        break;
      }

      const baseMatched = flattenMatches(groups);
      const expanded = uniquePositions(expandMatchedWithSpecialBlasts(workingGrid, baseMatched));
      const spawn = computeSpecialSpawn(workingGrid, baseMatched, preferSpawn);

      const clearSet = new Set(expanded.map((p) => `${p.x},${p.y}`));
      let spawnPos: BoardPosition | null = null;
      let spawnType: Exclude<SpecialType, "none"> | null = null;

      if (spawn) {
        spawnPos = spawn.pos;
        spawnType = spawn.type;
        clearSet.delete(`${spawn.pos.x},${spawn.pos.y}`);
      }

      const toClear = [...clearSet].map((k) => {
        const [xs, ys] = k.split(",");
        return { x: Number(xs), y: Number(ys) };
      });

      let preservedKind = 0;
      if (spawnPos) {
        preservedKind = workingGrid[spawnPos.y]?.[spawnPos.x]?.piece?.kind ?? 0;
      }

      clearPiecesAt(workingGrid, toClear);
      damageBlockersAdjacentTo(workingGrid, toClear);

      if (spawnPos && spawnType) {
        const cell = workingGrid[spawnPos.y]?.[spawnPos.x];
        if (cell) {
          cell.piece = {
            id: nextTileId,
            kind: preservedKind,
            special: spawnType,
          };
          nextTileId += 1;
        }
      }

      const clearedForHud = uniquePositions([...toClear, ...(spawnPos ? [spawnPos] : [])]);
      scoreDelta += this.calculateScore(clearedForHud.length, cascade);
      steps.push({
        type: "clear",
        cascade,
        groups,
        cleared: clearedForHud,
        grid: cloneGrid(workingGrid),
      });

      const collapse = collapseColumns(workingGrid, createTile);
      steps.push({
        type: "fall",
        cascade,
        grid: cloneGrid(collapse.grid),
        movements: collapse.movements,
        spawned: collapse.spawned,
      });

      cascade += 1;
    }

    return { scoreDelta, nextTileId, grid: workingGrid, cascade };
  }

  private copyCellGridInto(target: CellGrid, source: CellGrid): void {
    for (let y = 0; y < target.length; y += 1) {
      for (let x = 0; x < (target[0]?.length ?? 0); x += 1) {
        const s = source[y]![x]!;
        target[y]![x] = {
          piece: s.piece ? { ...s.piece } : null,
          blocker: s.blocker ? { ...s.blocker } : null,
        };
      }
    }
  }

  /** Returns updated nextTileId when a reshuffle ran, else null. */
  private finishShuffleIfNeeded(
    board: BoardModel,
    workingGrid: CellGrid,
    steps: ResolutionStep[],
    random: () => number,
  ): number | null {
    if (hasLegalMove(workingGrid)) {
      return null;
    }

    const mask = blockedMaskFromGrid(workingGrid);
    const refreshed = BoardModel.createPlayable(board.width, board.height, board.kindCount, random, mask);
    const grid = refreshed.getGrid();
    mergeBlockersOntoGrid(grid, workingGrid);
    this.copyCellGridInto(workingGrid, grid);
    steps.push({
      type: "reshuffle",
      grid: cloneGrid(workingGrid),
    });
    return refreshed.getNextTileId();
  }

  private calculateScore(clearedCount: number, cascade: number): number {
    const comboMultiplier = 1 + cascade * 0.35;
    return Math.round(clearedCount * 100 * comboMultiplier);
  }

  forceReshuffle(board: BoardModel, random: () => number = Math.random): CellGrid {
    const old = board.getGrid();
    const mask = blockedMaskFromGrid(old);
    const refreshed = BoardModel.createPlayable(board.width, board.height, board.kindCount, random, mask);
    const grid = refreshed.getGrid();
    mergeBlockersOntoGrid(grid, old);
    board.replaceGrid(grid, refreshed.getNextTileId());
    return board.getGrid();
  }
}
