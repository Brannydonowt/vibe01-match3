export interface LevelJsonV1 {
  version: 1;
  id: string;
  boardWidth: number;
  boardHeight: number;
  kindCount: number;
  startingMoves: number;
  targetScore: number;
  layout: number[][] | null;
  blockers: { x: number; y: number; hp: number }[];
}

export interface LevelManifestV1 {
  version: 1;
  levels: string[];
}
