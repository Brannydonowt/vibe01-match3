export interface HudState {
  score: number;
  targetScore: number;
  movesRemaining: number;
  message: string;
}

export class Hud {
  readonly element: HTMLDivElement;
  private readonly scoreValue: HTMLSpanElement;
  private readonly targetValue: HTMLSpanElement;
  private readonly movesValue: HTMLSpanElement;
  private readonly messageValue: HTMLParagraphElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "hud";

    const scoreCard = this.createStatCard("Score");
    const targetCard = this.createStatCard("Target");
    const movesCard = this.createStatCard("Moves");

    this.scoreValue = scoreCard.value;
    this.targetValue = targetCard.value;
    this.movesValue = movesCard.value;

    const statRow = document.createElement("div");
    statRow.className = "hud-stats";
    statRow.append(scoreCard.card, targetCard.card, movesCard.card);

    this.messageValue = document.createElement("p");
    this.messageValue.className = "hud-message";

    this.element.append(statRow, this.messageValue);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  render(state: HudState): void {
    this.scoreValue.textContent = state.score.toString();
    this.targetValue.textContent = state.targetScore.toString();
    this.movesValue.textContent = state.movesRemaining.toString();
    this.messageValue.textContent = state.message;
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
}
