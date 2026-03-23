import { balance } from "./balance";

export const tileKinds = [
  { name: "echo sigil", color: "#52d7ff", assetPath: "assets/sprites/item_blue_01.png" },
  { name: "foxfire charm", color: "#45dc98", assetPath: "assets/sprites/item_green_01.png" },
  { name: "heart blade", color: "#ff5f93", assetPath: "assets/sprites/item_red_01.png" },
  { name: "speaker crest", color: "#ffbf52", assetPath: "assets/sprites/item_gold_01.png" },
  { name: "moon mic", color: "#b678ff", assetPath: "assets/sprites/item_purple_01.png" },
  { name: "lightstick idol", color: "#ffe6f4", assetPath: "assets/sprites/item_cream_01.png" },
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
  backgroundColor: "#120018",
};

export type GameConfig = typeof gameConfig;
