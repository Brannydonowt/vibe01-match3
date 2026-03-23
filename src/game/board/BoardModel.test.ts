import { describe, expect, it } from "vitest";

import { BoardModel } from "./BoardModel";
import { hasAnyMatches, hasLegalMove } from "./MatchResolver";
import { SwapController } from "./SwapController";
import type { TileGrid } from "./boardTypes";

function createTileGrid(kinds: number[][]): TileGrid {
  let nextId = 1;
  return kinds.map((row) =>
    row.map((kind) => ({
      id: nextId++,
      kind,
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
      createTileGrid([
        [0, 1, 2],
        [0, 2, 1],
        [3, 1, 4],
      ]),
      10,
    );

    const result = new SwapController().trySwap(board, { x: 0, y: 0 }, { x: 0, y: 1 }, () => 0.1);

    expect(result.valid).toBe(false);
    expect(result.consumedMove).toBe(false);
    expect(board.getGrid()[0][0]?.kind).toBe(0);
  });

  it("resolves a valid swap, scores points, and mutates the board", () => {
    const board = new BoardModel(
      3,
      3,
      5,
      createTileGrid([
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
    expect(board.getGrid()[1][1]?.kind).not.toBe(2);
  });
});
