export type GameMode = "campaign" | "endless";

export interface SessionDescriptor {
  mode: GameMode;
  levelId?: string;
  boardWidth: number;
  boardHeight: number;
  kindCount: number;
  startingMoves: number;
  targetScore: number;
  /** Row-major kinds[y][x]; when null, board is randomly generated */
  layoutKinds: number[][] | null;
  blockers: { x: number; y: number; hp: number }[];
  seed?: number;
  endlessWave?: number;
}
