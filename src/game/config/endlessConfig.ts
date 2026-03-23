import type { SessionDescriptor } from "../session/sessionTypes";

export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blockersForWave(wave: number, random: () => number): { x: number; y: number; hp: number }[] {
  if (wave < 1) {
    return [];
  }
  const count = Math.min(10, 2 + Math.floor(wave / 2));
  const width = 8;
  const height = 8;
  const used = new Set<string>();
  const out: { x: number; y: number; hp: number }[] = [];
  let guard = 0;
  while (out.length < count && guard < 200) {
    guard += 1;
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);
    const k = `${x},${y}`;
    if (used.has(k)) {
      continue;
    }
    used.add(k);
    out.push({ x, y, hp: 1 + Math.floor(random() * 2) });
  }
  return out;
}

export function sessionForEndlessWave(wave: number, seed?: number): SessionDescriptor {
  const rng = seed != null ? mulberry32(seed) : Math.random;
  const kindCount = Math.min(6, 4 + Math.floor(wave / 6));
  const startingMoves = Math.max(10, 26 - Math.floor(wave / 2));
  const targetScore = 1800 + wave * 450;

  return {
    mode: "endless",
    boardWidth: 8,
    boardHeight: 8,
    kindCount,
    startingMoves,
    targetScore,
    layoutKinds: null,
    blockers: blockersForWave(wave, rng),
    seed,
    endlessWave: wave,
  };
}
