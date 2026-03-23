const MATCH_POP_URL = `${import.meta.env.BASE_URL}assets/sounds/match_pop.ogg`;

export function playMatchPop(): void {
  const audio = new Audio(MATCH_POP_URL);
  audio.volume = 0.6;
  void audio.play().catch(() => {});
}
