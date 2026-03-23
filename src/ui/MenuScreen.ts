import type { ScoreSnapshot } from "../scores/scoreStorage";
import type { ProgressionSnapshot } from "../scores/progressionStorage";

export interface MenuScreenOptions {
  onCampaignLevel: (levelIndex: number, levelId: string) => void;
  onEndless: () => void;
}

export class MenuScreen {
  readonly element: HTMLDivElement;
  private readonly bestValue: HTMLSpanElement;
  private readonly runsValue: HTMLSpanElement;
  private readonly campaignRow: HTMLDivElement;
  private readonly options: MenuScreenOptions;

  constructor(options: MenuScreenOptions) {
    this.options = options;
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
      "Campaign levels, endless ramp, specials, and crates—swap fast and chase the score.";

    const bestCard = this.createProfileCard("Best score");
    const runsCard = this.createProfileCard("Runs played");
    this.bestValue = bestCard.value;
    this.runsValue = runsCard.value;

    const profile = document.createElement("div");
    profile.className = "menu-profile";
    profile.append(bestCard.card, runsCard.card);

    const campaignLabel = document.createElement("p");
    campaignLabel.className = "menu-section-label";
    campaignLabel.textContent = "Campaign";

    this.campaignRow = document.createElement("div");
    this.campaignRow.className = "menu-campaign-row";

    const endlessButton = document.createElement("button");
    endlessButton.className = "secondary-button";
    endlessButton.type = "button";
    endlessButton.textContent = "Endless ramp";
    endlessButton.addEventListener("click", () => {
      this.options.onEndless();
    });

    const hint = document.createElement("p");
    hint.className = "panel-hint";
    hint.textContent = "Beat the target score to unlock the next stage. Endless tightens the set each wave.";

    panel.append(
      badge,
      logo,
      title,
      copy,
      profile,
      campaignLabel,
      this.campaignRow,
      endlessButton,
      hint,
    );
    this.element.append(panel);
    this.setVisible(true);
  }

  setCampaignLevels(levelIds: string[], progression: ProgressionSnapshot): void {
    this.campaignRow.replaceChildren();
    levelIds.forEach((id, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "primary-button menu-level-button";
      btn.textContent = `Stage ${index + 1}`;
      const locked = index > progression.maxUnlockedLevelIndex;
      btn.disabled = locked;
      btn.title = locked ? "Clear the previous stage to unlock." : id;
      btn.addEventListener("click", () => {
        if (!locked) {
          this.options.onCampaignLevel(index, id);
        }
      });
      this.campaignRow.append(btn);
    });
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
