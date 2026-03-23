import { BoardModel } from "./BoardModel";
import {
  clearMatchedTiles,
  cloneGrid,
  collapseColumns,
  findMatchGroups,
  flattenMatches,
  hasLegalMove,
  isAdjacent,
  swapInGrid,
} from "./MatchResolver";
import type { BoardPosition, ResolutionStep, TileGrid } from "./boardTypes";

export interface SwapResult {
  valid: boolean;
  scoreDelta: number;
  consumedMove: boolean;
  steps: ResolutionStep[];
}

export class SwapController {
  trySwap(
    board: BoardModel,
    first: BoardPosition,
    second: BoardPosition,
    random: () => number = Math.random,
  ): SwapResult {
    if (!isAdjacent(first, second)) {
      return {
        valid: false,
        scoreDelta: 0,
        consumedMove: false,
        steps: [],
      };
    }

    const originalGrid = board.getGrid();
    const swappedGrid = cloneGrid(originalGrid);
    swapInGrid(swappedGrid, first, second);

    const initialGroups = findMatchGroups(swappedGrid);
    if (initialGroups.length === 0) {
      return {
        valid: false,
        scoreDelta: 0,
        consumedMove: false,
        steps: [
          {
            type: "swap",
            from: first,
            to: second,
            grid: swappedGrid,
            valid: false,
          },
        ],
      };
    }

    const steps: ResolutionStep[] = [
      {
        type: "swap",
        from: first,
        to: second,
        grid: swappedGrid,
        valid: true,
      },
    ];

    let workingGrid = swappedGrid;
    let scoreDelta = 0;
    let cascade = 0;
    let nextTileId = board.getNextTileId();

    while (true) {
      const groups = findMatchGroups(workingGrid);
      if (groups.length === 0) {
        break;
      }

      const cleared = flattenMatches(groups);
      steps.push({
        type: "clear",
        cascade,
        groups,
        cleared,
        grid: workingGrid,
      });

      scoreDelta += this.calculateScore(cleared.length, cascade);

      const clearedGrid = clearMatchedTiles(workingGrid, cleared);
      const collapse = collapseColumns(clearedGrid, () => {
        const tile = {
          id: nextTileId,
          kind: Math.floor(random() * board.kindCount),
        };
        nextTileId += 1;
        return tile;
      });

      workingGrid = collapse.grid;
      steps.push({
        type: "fall",
        cascade,
        grid: workingGrid,
        movements: collapse.movements,
        spawned: collapse.spawned,
      });

      cascade += 1;
    }

    if (!hasLegalMove(workingGrid)) {
      const refreshed = BoardModel.createPlayable(
        board.width,
        board.height,
        board.kindCount,
        random,
      );
      workingGrid = refreshed.getGrid();
      nextTileId = refreshed.getNextTileId();
      steps.push({
        type: "reshuffle",
        grid: workingGrid,
      });
    }

    board.replaceGrid(workingGrid, nextTileId);

    return {
      valid: true,
      scoreDelta,
      consumedMove: true,
      steps,
    };
  }

  private calculateScore(clearedCount: number, cascade: number): number {
    const comboMultiplier = 1 + cascade * 0.35;
    return Math.round(clearedCount * 100 * comboMultiplier);
  }

  forceReshuffle(board: BoardModel, random: () => number = Math.random): TileGrid {
    const refreshed = BoardModel.createPlayable(
      board.width,
      board.height,
      board.kindCount,
      random,
    );
    board.replaceGrid(refreshed.getGrid(), refreshed.getNextTileId());
    return board.getGrid();
  }
}
