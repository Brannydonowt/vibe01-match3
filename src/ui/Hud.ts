export interface GameHudState {
  score: number;
  targetScore: number;
  movesRemaining: number;
  message: string;
}

export interface HudState extends GameHudState {
  bestScore: number;
}

export class Hud {
  readonly element: HTMLDivElement;
  private readonly movesCard: HTMLDivElement;
  private readonly bestValue: HTMLSpanElement;
  private readonly scoreValue: HTMLSpanElement;
  private readonly movesValue: HTMLSpanElement;
  private readonly progressFill: HTMLSpanElement;
  private readonly progressLabel: HTMLParagraphElement;
  private readonly messageValue: HTMLParagraphElement;
  private previousScore = 0;
  private previousBest = 0;
  private previousMoves = 0;
  private previousMessage = "";

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "hud";

    const brand = document.createElement("div");
    brand.className = "hud-brand";

    const brandKicker = document.createElement("span");
    brandKicker.className = "hud-brand-kicker";
    brandKicker.textContent = "Score attack";

    const brandTitle = document.createElement("span");
    brandTitle.className = "hud-brand-title";
    brandTitle.textContent = "Build the biggest encore score";

    brand.append(brandKicker, brandTitle);

    const scoreCard = this.createStatCard("Score");
    const bestCard = this.createStatCard("Best");
    const movesCard = this.createStatCard("Moves");

    this.movesCard = movesCard.card;
    this.bestValue = bestCard.value;
    this.scoreValue = scoreCard.value;
    this.movesValue = movesCard.value;

    const statRow = document.createElement("div");
    statRow.className = "hud-stats";
    statRow.append(scoreCard.card, bestCard.card, movesCard.card);

    const topRow = document.createElement("div");
    topRow.className = "hud-top";
    topRow.append(brand, statRow);

    const progress = document.createElement("div");
    progress.className = "hud-progress";

    const progressBar = document.createElement("div");
    progressBar.className = "hud-progress-bar";

    this.progressFill = document.createElement("span");
    this.progressFill.className = "hud-progress-fill";

    this.progressLabel = document.createElement("p");
    this.progressLabel.className = "hud-goal";

    progressBar.append(this.progressFill);
    progress.append(progressBar, this.progressLabel);

    this.messageValue = document.createElement("p");
    this.messageValue.className = "hud-message";

    const versionLabel = document.createElement("p");
    versionLabel.className = "hud-version";
    versionLabel.textContent = `v${__APP_VERSION__}`;

    this.element.append(topRow, progress, this.messageValue, versionLabel);
    this.setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
    this.element.classList.toggle("is-visible", visible);
    this.element.setAttribute("aria-hidden", String(!visible));
  }

  render(state: HudState): void {
    if (state.score !== this.previousScore) {
      this.bump(this.scoreValue, "is-bump");
    }

    if (state.bestScore !== this.previousBest) {
      this.bump(this.bestValue, "is-bump");
    }

    if (state.movesRemaining !== this.previousMoves) {
      this.bump(this.movesValue, "is-bump");
    }

    if (state.message !== this.previousMessage) {
      this.bump(this.messageValue, "is-flash");
    }

    this.scoreValue.textContent = state.score.toLocaleString();
    this.bestValue.textContent = state.bestScore.toLocaleString();
    this.movesValue.textContent = state.movesRemaining.toString();
    this.progressFill.style.width = `${Math.min((state.score / Math.max(state.targetScore, 1)) * 100, 100)}%`;
    this.progressLabel.textContent =
      state.score >= state.targetScore
        ? `Milestone ${state.targetScore} cleared`
        : `${Math.max(state.targetScore - state.score, 0)} to the stage milestone`;
    this.messageValue.textContent = state.message;
    this.movesCard.classList.toggle("is-critical", state.movesRemaining <= 5);

    this.previousScore = state.score;
    this.previousBest = state.bestScore;
    this.previousMoves = state.movesRemaining;
    this.previousMessage = state.message;
  }

  private createStatCard(label: string): { card: HTMLDivElement; value: HTMLSpanElement } {
    const card = document.createElement("div");
    card.className = "hud-card";

    const title = document.createElement("span");
    title.className = "hud-label";
    title.textContent = label;

    const value = document.createElement("span");
    value.className = "hud-value";
    value.textContent = "0";

    card.append(title, value);
    return { card, value };
  }

  private bump(element: HTMLElement, className: string): void {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }
}
