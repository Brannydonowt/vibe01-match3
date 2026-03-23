import { parseLevelJson, levelToSession } from "./parseLevel";
import type { SessionDescriptor } from "../session/sessionTypes";
import type { LevelManifestV1 } from "./levelTypes";

const base = (): string => import.meta.env.BASE_URL;

export async function loadLevelManifest(): Promise<LevelManifestV1> {
  const res = await fetch(`${base()}levels/manifest.json`);
  if (!res.ok) {
    throw new Error(`Failed to load level manifest (${res.status}).`);
  }
  const data = (await res.json()) as LevelManifestV1;
  if (data.version !== 1 || !Array.isArray(data.levels)) {
    throw new Error("Invalid manifest.");
  }
  return data;
}

export async function loadLevelSession(levelId: string): Promise<SessionDescriptor> {
  const res = await fetch(`${base()}levels/${levelId}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load level ${levelId} (${res.status}).`);
  }
  const raw = await res.json();
  return levelToSession(parseLevelJson(raw));
}
