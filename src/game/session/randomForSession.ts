import { mulberry32 } from "../config/endlessConfig";
import type { SessionDescriptor } from "./sessionTypes";

export function randomForSession(desc: SessionDescriptor): () => number {
  if (desc.seed != null) {
    const wave = desc.endlessWave ?? 0;
    return mulberry32((desc.seed ^ (wave + 1) * 0x9e3779b1) >>> 0);
  }
  return Math.random;
}
