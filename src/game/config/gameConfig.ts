import { balance } from "./balance";

export const tileKinds = [
  { name: "sapphire", color: "#4e7cff", assetPath: "assets/sprites/item_blue_01.png" },
  { name: "emerald", color: "#39c97f", assetPath: "assets/sprites/item_green_01.png" },
  { name: "ruby", color: "#f35c63", assetPath: "assets/sprites/item_red_01.png" },
  { name: "sunstone", color: "#ffb14f", assetPath: "assets/sprites/item_gold_01.png" },
  { name: "amethyst", color: "#b270ff", assetPath: "assets/sprites/item_purple_01.png" },
  { name: "pearl", color: "#f6e7b6", assetPath: "assets/sprites/item_cream_01.png" },
] as const;

export const gameConfig = {
  boardWidth: balance.boardWidth,
  boardHeight: balance.boardHeight,
  startingMoves: balance.startingMoves,
  targetScore: balance.targetScore,
  tileKinds,
  tileSize: 1,
  tileGap: 0.08,
  boardPadding: 0.6,
  swapDurationMs: 140,
  invalidSwapBounceMs: 110,
  clearDurationMs: 160,
  fallDurationMs: 220,
  cameraMargin: 1.4,
  backgroundColor: "#08111f",
};

export type GameConfig = typeof gameConfig;
