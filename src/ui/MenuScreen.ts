import type { ScoreSnapshot } from "../scores/scoreStorage";

export class MenuScreen {
  readonly element: HTMLDivElement;
  private readonly bestValue: HTMLSpanElement;
  private readonly runsValue: HTMLSpanElement;

  constructor(onStart: () => void) {
    this.element = document.createElement("div");
    this.element.className = "overlay-screen overlay-screen--menu";

    const panel = document.createElement("div");
    panel.className = "panel panel--menu";

    const badge = document.createElement("p");
    badge.className = "panel-badge";
    badge.textContent = "Fan-style idol vs demon match-3";

    const logo = document.createElement("img");
    logo.className = "menu-logo";
    logo.src = `${import.meta.env.BASE_URL}assets/ui/title_mark.png`;
    logo.alt = "K-pop Demon Hunters title mark";
    logo.decoding = "async";

    const title = document.createElement("h1");
    title.className = "menu-title";
    title.textContent = "KPOP Demon Hunters";

    const copy = document.createElement("p");
    copy.className = "menu-copy";
    copy.textContent =
      "Swap fast, chain stylish combos, and see how high you can push the score before the set runs out of moves.";

    const bestCard = this.createProfileCard("Best score");
    const runsCard = this.createProfileCard("Runs played");
    this.bestValue = bestCard.value;
    this.runsValue = runsCard.value;

    const profile = document.createElement("div");
    profile.className = "menu-profile";
    profile.append(bestCard.card, runsCard.card);

    const button = document.createElement("button");
    button.className = "primary-button";
    button.type = "button";
    button.textContent = "Start Showdown";
    button.addEventListener("click", onStart);

    const hint = document.createElement("p");
    hint.className = "panel-hint";
    hint.textContent = "Portrait-first, score-chasing, and tuned for quick replay loops.";

    panel.append(badge, logo, title, copy, profile, button, hint);
    this.element.append(panel);
    this.setVisible(true);
  }

  renderProfile(summary: ScoreSnapshot): void {
    this.bestValue.textContent = summary.bestScore.toLocaleString();
    this.runsValue.textContent = summary.totalRuns.toString();
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
    this.element.classList.toggle("is-visible", visible);
    this.element.setAttribute("aria-hidden", String(!visible));
  }

  private createProfileCard(label: string): { card: HTMLDivElement; value: HTMLSpanElement } {
    const card = document.createElement("div");
    card.className = "menu-profile-card";

    const title = document.createElement("span");
    title.className = "menu-profile-label";
    title.textContent = label;

    const value = document.createElement("span");
    value.className = "menu-profile-value";
    value.textContent = "0";

    card.append(title, value);
    return { card, value };
  }
}
