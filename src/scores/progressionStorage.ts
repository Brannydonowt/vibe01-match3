const STORAGE_KEY = "match3game.progression.v1";

export interface ProgressionSnapshot {
  maxUnlockedLevelIndex: number;
  nextEndlessWave: number;
}

interface Persisted {
  v: 1;
  maxUnlockedLevelIndex: number;
  nextEndlessWave: number;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadProgression(): ProgressionSnapshot {
  const storage = getStorage();
  if (!storage) {
    return { maxUnlockedLevelIndex: 0, nextEndlessWave: 0 };
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { maxUnlockedLevelIndex: 0, nextEndlessWave: 0 };
    }
    const p = JSON.parse(raw) as Partial<Persisted>;
    if (p.v !== 1) {
      return { maxUnlockedLevelIndex: 0, nextEndlessWave: 0 };
    }
    const maxUnlocked = Math.max(0, Math.floor(Number(p.maxUnlockedLevelIndex) || 0));
    const nextWave = Math.max(0, Math.floor(Number(p.nextEndlessWave) || 0));
    return { maxUnlockedLevelIndex: maxUnlocked, nextEndlessWave: nextWave };
  } catch {
    return { maxUnlockedLevelIndex: 0, nextEndlessWave: 0 };
  }
}

function writeProgression(snapshot: ProgressionSnapshot): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const payload: Persisted = {
    v: 1,
    maxUnlockedLevelIndex: snapshot.maxUnlockedLevelIndex,
    nextEndlessWave: snapshot.nextEndlessWave,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function recordCampaignProgress(levelIndex: number, score: number, targetScore: number): ProgressionSnapshot {
  const cur = loadProgression();
  if (score >= targetScore) {
    cur.maxUnlockedLevelIndex = Math.max(cur.maxUnlockedLevelIndex, levelIndex + 1);
  }
  writeProgression(cur);
  return cur;
}

export function recordEndlessProgress(): ProgressionSnapshot {
  const cur = loadProgression();
  cur.nextEndlessWave += 1;
  writeProgression(cur);
  return cur;
}
