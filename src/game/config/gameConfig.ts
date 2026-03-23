import { balance } from "./balance";

export const tileKinds = [
  { name: "echo sigil", color: "#52d7ff", assetPath: "assets/sprites/T_KpopChar_02_Blue.png" },
  { name: "foxfire charm", color: "#45dc98", assetPath: "assets/sprites/T_KpopChar_06.png" },
  { name: "heart blade", color: "#ff5f93", assetPath: "assets/sprites/T_KpopChar_03_Red.png" },
  { name: "speaker crest", color: "#ffbf52", assetPath: "assets/sprites/T_KpopChar_04.png" },
  { name: "moon mic", color: "#b678ff", assetPath: "assets/sprites/T_KpopChar_01_Pink.png" },
  { name: "lightstick idol", color: "#ffe6f4", assetPath: "assets/sprites/T_KpopChar_05.png" },
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
