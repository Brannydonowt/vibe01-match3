import { BoardModel } from "../board/BoardModel";
import type { SessionDescriptor } from "./sessionTypes";

function buildBlockerHpGrid(desc: SessionDescriptor): (number | null)[][] {
  return Array.from({ length: desc.boardHeight }, (_, y) =>
    Array.from({ length: desc.boardWidth }, (_, x) => {
      const hit = desc.blockers.find((b) => b.x === x && b.y === y);
      return hit ? hit.hp : null;
    }),
  );
}

export function createBoardModelForSession(
  desc: SessionDescriptor,
  random: () => number = Math.random,
): BoardModel {
  const blockerMask = (x: number, y: number) =>
    desc.blockers.some((b) => b.x === x && b.y === y);

  if (desc.layoutKinds) {
    const blockerHp = buildBlockerHpGrid(desc);
    return BoardModel.fromLayout(desc.layoutKinds, blockerHp, desc.kindCount, random);
  }

  const board = BoardModel.createPlayable(
    desc.boardWidth,
    desc.boardHeight,
    desc.kindCount,
    random,
    blockerMask,
  );
  const grid = board.getGrid();
  BoardModel.applyBlockers(grid, desc.blockers);
  board.replaceGrid(grid, board.getNextTileId());
  return board;
}
