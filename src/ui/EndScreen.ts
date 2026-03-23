import type { ScoreEntry, ScoreSnapshot } from "../scores/scoreStorage";

export interface EndScreenResult {
  score: number;
  milestoneScore: number;
  movesUsed: number;
  summary: ScoreSnapshot;
}

export class EndScreen {
  readonly element: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly copy: HTMLParagraphElement;
  private readonly scoreValue: HTMLParagraphElement;
  private readonly bestValue: HTMLSpanElement;
  private readonly rankValue: HTMLSpanElement;
  private readonly leaderboard: HTMLUListElement;

  constructor(onRestart: () => void, onReturnToMenu: () => void) {
    this.element = document.createElement("div");
    this.element.className = "overlay-screen overlay-screen--end";

    const panel = document.createElement("div");
    panel.className = "panel panel--end";

    const badge = document.createElement("p");
    badge.className = "panel-badge";
    badge.textContent = "Set recap";

    this.title = document.createElement("h2");
    this.title.className = "end-title";

    this.scoreValue = document.createElement("p");
    this.scoreValue.className = "end-score-value";

    const scoreHero = document.createElement("div");
    scoreHero.className = "end-score-hero";

    const scoreLabel = document.createElement("span");
    scoreLabel.className = "end-score-label";
    scoreLabel.textContent = "Final score";

    scoreHero.append(scoreLabel, this.scoreValue);

    this.copy = document.createElement("p");
    this.copy.className = "end-copy";

    const bestStat = this.createStatCard("Best score");
    const rankStat = this.createStatCard("Run rank");
    this.bestValue = bestStat.value;
    this.rankValue = rankStat.value;

    const highlights = document.createElement("div");
    highlights.className = "end-highlights";
    highlights.append(bestStat.card, rankStat.card);

    const leaderboardWrap = document.createElement("div");
    leaderboardWrap.className = "leaderboard";

    const leaderboardTitle = document.createElement("p");
    leaderboardTitle.className = "leaderboard-title";
    leaderboardTitle.textContent = "Local top runs";

    this.leaderboard = document.createElement("ul");
    this.leaderboard.className = "leaderboard-list";

    leaderboardWrap.append(leaderboardTitle, this.leaderboard);

    const actions = document.createElement("div");
    actions.className = "end-actions";

    const restart = document.createElement("button");
    restart.className = "primary-button";
    restart.type = "button";
    restart.textContent = "Play Again";
    restart.addEventListener("click", onRestart);

    const menu = document.createElement("button");
    menu.className = "secondary-button";
    menu.type = "button";
    menu.textContent = "Main Menu";
    menu.addEventListener("click", onReturnToMenu);

    actions.append(restart, menu);
    panel.append(badge, this.title, scoreHero, this.copy, highlights, leaderboardWrap, actions);
    this.element.append(panel);
    this.setVisible(false);
  }

  showResult(result: EndScreenResult): void {
    const { score, milestoneScore, movesUsed, summary } = result;
    const clearedMilestone = score >= milestoneScore;

    this.title.textContent = summary.isNewBest ? "New High Score" : "Set Complete";
    this.scoreValue.textContent = score.toLocaleString();
    this.bestValue.textContent = summary.bestScore.toLocaleString();
    this.rankValue.textContent = summary.latestRank ? `#${summary.latestRank}` : "Unranked";
    this.copy.textContent = clearedMilestone
      ? `You cleared the ${milestoneScore.toLocaleString()} point milestone and finished with ${movesUsed} scoring moves played.`
      : `You closed the set with ${movesUsed} scoring moves played. One more run can push past your local best.`;
    this.renderLeaderboard(summary.leaderboard, summary.latestRank);
    this.setVisible(true);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
    this.element.classList.toggle("is-visible", visible);
    this.element.setAttribute("aria-hidden", String(!visible));
  }

  private createStatCard(label: string): { card: HTMLDivElement; value: HTMLSpanElement } {
    const card = document.createElement("div");
    card.className = "end-stat";

    const title = document.createElement("span");
    title.className = "end-stat-label";
    title.textContent = label;

    const value = document.createElement("span");
    value.className = "end-stat-value";
    value.textContent = "0";

    card.append(title, value);
    return { card, value };
  }

  private renderLeaderboard(entries: ScoreEntry[], latestRank: number | null): void {
    this.leaderboard.replaceChildren();

    for (const [index, entry] of entries.entries()) {
      const item = document.createElement("li");
      item.className = "leaderboard-item";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `#${index + 1}`;

      const score = document.createElement("span");
      score.className = "leaderboard-score";
      score.textContent = entry.score.toLocaleString();

      item.append(rank, score);

      if (latestRank === index + 1) {
        const badge = document.createElement("span");
        badge.className = "leaderboard-badge";
        badge.textContent = "Latest";
        item.append(badge);
      }

      this.leaderboard.append(item);
    }
  }
}
