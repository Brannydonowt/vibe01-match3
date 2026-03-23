import { balance } from "../config/balance";
import { tileKinds } from "../config/gameConfig";
import type { SessionDescriptor } from "./sessionTypes";

export function defaultMenuSession(): SessionDescriptor {
  return {
    mode: "campaign",
    levelId: "menu_preview",
    boardWidth: balance.boardWidth,
    boardHeight: balance.boardHeight,
    kindCount: tileKinds.length,
    startingMoves: balance.startingMoves,
    targetScore: balance.targetScore,
    layoutKinds: null,
    blockers: [],
  };
}
