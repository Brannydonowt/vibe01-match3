export interface ScoreEntry {
  score: number;
  achievedAt: string;
}

export interface ScoreSnapshot {
  bestScore: number;
  leaderboard: ScoreEntry[];
  totalRuns: number;
  latestRank: number | null;
  isNewBest: boolean;
}

interface PersistedScores {
  runs: ScoreEntry[];
}

const STORAGE_KEY = "match3game.localScores.v1";
const LEADERBOARD_LIMIT = 5;
const MAX_SAVED_RUNS = 20;

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

function sortScores(left: ScoreEntry, right: ScoreEntry): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return right.achievedAt.localeCompare(left.achievedAt);
}

function sanitizeRuns(input: unknown): ScoreEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((entry): entry is ScoreEntry => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ScoreEntry).score === "number" &&
        Number.isFinite((entry as ScoreEntry).score) &&
        typeof (entry as ScoreEntry).achievedAt === "string"
      );
    })
    .map((entry) => ({
      score: Math.max(0, Math.round(entry.score)),
      achievedAt: entry.achievedAt,
    }));
}

function readPersistedScores(): ScoreEntry[] {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<PersistedScores>;
    return sanitizeRuns(parsed.runs).sort(sortScores).slice(0, MAX_SAVED_RUNS);
  } catch {
    return [];
  }
}

function writePersistedScores(runs: ScoreEntry[]): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const payload: PersistedScores = {
    runs: [...runs].sort(sortScores).slice(0, MAX_SAVED_RUNS),
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota or privacy mode failures and keep the session playable.
  }
}

function createSnapshot(runs: ScoreEntry[], latestEntry?: ScoreEntry): ScoreSnapshot {
  const sortedRuns = [...runs].sort(sortScores);
  const leaderboard = sortedRuns.slice(0, LEADERBOARD_LIMIT);
  const latestRank = latestEntry ? sortedRuns.findIndex((entry) => entry === latestEntry) + 1 : 0;

  return {
    bestScore: leaderboard[0]?.score ?? 0,
    leaderboard,
    totalRuns: sortedRuns.length,
    latestRank: latestRank > 0 ? latestRank : null,
    isNewBest: latestRank === 1,
  };
}

export function loadScoreSnapshot(): ScoreSnapshot {
  return createSnapshot(readPersistedScores());
}

export function recordScore(score: number): ScoreSnapshot {
  const runs = readPersistedScores();
  const latestEntry: ScoreEntry = {
    score: Math.max(0, Math.round(score)),
    achievedAt: new Date().toISOString(),
  };

  const nextRuns = [latestEntry, ...runs];
  writePersistedScores(nextRuns);
  return createSnapshot(nextRuns, latestEntry);
}
