import type { SessionDescriptor } from "../session/sessionTypes";
import type { LevelJsonV1 } from "./levelTypes";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseLevelJson(raw: unknown): LevelJsonV1 {
  if (!isObject(raw)) {
    throw new Error("Level JSON must be an object.");
  }
  if (raw.version !== 1) {
    throw new Error("Unsupported level version.");
  }
  if (typeof raw.id !== "string" || !raw.id) {
    throw new Error("Level id is required.");
  }
  const boardWidth = Number(raw.boardWidth);
  const boardHeight = Number(raw.boardHeight);
  const kindCount = Number(raw.kindCount);
  const startingMoves = Number(raw.startingMoves);
  const targetScore = Number(raw.targetScore);
  if (
    ![boardWidth, boardHeight, kindCount, startingMoves, targetScore].every(
      (n) => Number.isInteger(n) && n > 0,
    )
  ) {
    throw new Error("Invalid numeric level fields.");
  }

  let layout: number[][] | null = null;
  if (raw.layout != null) {
    if (!Array.isArray(raw.layout)) {
      throw new Error("layout must be an array or null.");
    }
    layout = raw.layout.map((row) => {
      if (!Array.isArray(row)) {
        throw new Error("layout rows must be arrays.");
      }
      return row.map((k) => {
        const n = Number(k);
        if (!Number.isInteger(n) || n < 0) {
          throw new Error("layout kinds must be non-negative integers.");
        }
        return n;
      });
    });
    if (layout.length !== boardHeight || layout.some((row) => row.length !== boardWidth)) {
      throw new Error("layout dimensions must match boardWidth/boardHeight.");
    }
  }

  if (!Array.isArray(raw.blockers)) {
    throw new Error("blockers must be an array.");
  }
  const blockers = raw.blockers.map((b) => {
    if (!isObject(b)) {
      throw new Error("Invalid blocker entry.");
    }
    const x = Number(b.x);
    const y = Number(b.y);
    const hp = Number(b.hp);
    if (![x, y, hp].every((n) => Number.isInteger(n) && n >= 0) || hp <= 0) {
      throw new Error("Invalid blocker coordinates or hp.");
    }
    if (x >= boardWidth || y >= boardHeight) {
      throw new Error("Blocker out of bounds.");
    }
    return { x, y, hp };
  });

  return {
    version: 1,
    id: raw.id,
    boardWidth,
    boardHeight,
    kindCount,
    startingMoves,
    targetScore,
    layout,
    blockers,
  };
}

export function levelToSession(level: LevelJsonV1): SessionDescriptor {
  return {
    mode: "campaign",
    levelId: level.id,
    boardWidth: level.boardWidth,
    boardHeight: level.boardHeight,
    kindCount: level.kindCount,
    startingMoves: level.startingMoves,
    targetScore: level.targetScore,
    layoutKinds: level.layout,
    blockers: level.blockers,
  };
}
