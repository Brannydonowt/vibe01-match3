import { describe, expect, it } from "vitest";

import { BoardModel } from "./BoardModel";
import type { CellGrid } from "./boardTypes";
import { damageBlockersAdjacentTo, hasAnyMatches, hasLegalMove } from "./MatchResolver";
import { computeSpecialSpawn } from "./specialResolver";
import { SwapController } from "./SwapController";

function createCellGrid(kinds: number[][]): CellGrid {
  let nextId = 1;
  return kinds.map((row) =>
    row.map((kind) => ({
      piece: { id: nextId++, kind, special: "none" as const },
      blocker: null,
    })),
  );
}

function createSequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

describe("BoardModel", () => {
  it("creates a starting board without immediate matches and with at least one legal move", () => {
    const board = BoardModel.createPlayable(
      8,
      8,
      6,
      createSequenceRandom([0.12, 0.38, 0.66, 0.81, 0.24, 0.55]),
    );
    const grid = board.getGrid();

    expect(hasAnyMatches(grid)).toBe(false);
    expect(hasLegalMove(grid)).toBe(true);
  });

  it("rejects swaps that do not create matches", () => {
    const board = new BoardModel(
      3,
      3,
      5,
      createCellGrid([
        [0, 1, 2],
        [0, 2, 1],
        [3, 1, 4],
      ]),
      10,
    );

    const result = new SwapController().trySwap(board, { x: 0, y: 0 }, { x: 0, y: 1 }, () => 0.1);

    expect(result.valid).toBe(false);
    expect(result.consumedMove).toBe(false);
    expect(board.getGrid()[0][0]?.piece?.kind).toBe(0);
  });

  it("resolves a valid swap, scores points, and mutates the board", () => {
    const board = new BoardModel(
      3,
      3,
      5,
      createCellGrid([
        [0, 1, 2],
        [0, 2, 1],
        [3, 1, 4],
      ]),
      10,
    );

    const result = new SwapController().trySwap(
      board,
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      createSequenceRandom([0.74, 0.18, 0.51, 0.92, 0.35, 0.63]),
    );

    expect(result.valid).toBe(true);
    expect(result.consumedMove).toBe(true);
    expect(result.scoreDelta).toBeGreaterThan(0);
    expect(result.steps.some((step) => step.type === "clear")).toBe(true);
    expect(hasAnyMatches(board.getGrid())).toBe(false);
    expect(board.getGrid()[1][1]?.piece?.kind).not.toBe(2);
  });
});

describe("blockers", () => {
  it("damages orthogonally adjacent crate when a clear happens beside it", () => {
    const grid = BoardModel.createEmptyGrid(3, 3);
    grid[1][1].blocker = { hp: 2 };
    damageBlockersAdjacentTo(grid, [{ x: 1, y: 0 }]);
    expect(grid[1][1].blocker?.hp).toBe(1);
    damageBlockersAdjacentTo(grid, [{ x: 0, y: 1 }]);
    expect(grid[1][1].blocker).toBeNull();
  });
});

describe("specials", () => {
  it("computeSpecialSpawn picks a line clear for four in a row", () => {
    const g = BoardModel.createEmptyGrid(4, 1);
    for (let i = 0; i < 4; i += 1) {
      g[0][i]!.piece = { id: i + 1, kind: 0, special: "none" };
    }
    const matched = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    const spawn = computeSpecialSpawn(g, matched, { x: 3, y: 0 });
    expect(spawn?.type === "line_h" || spawn?.type === "line_v").toBe(true);
  });
});
