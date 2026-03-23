export class EndScreen {
  readonly element: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly copy: HTMLParagraphElement;

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

    this.copy = document.createElement("p");
    this.copy.className = "end-copy";

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
    panel.append(badge, this.title, this.copy, actions);
    this.element.append(panel);
    this.setVisible(false);
  }

  showResult(won: boolean, score: number, targetScore: number): void {
    this.title.textContent = won ? "Encore Cleared" : "Set Over";
    this.copy.textContent = won
      ? `You lit up the stage with ${score} points and blasted past the ${targetScore} point target.`
      : `You closed the set on ${score} points and needed ${targetScore} to finish the hunt.`;
    this.setVisible(true);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
    this.element.classList.toggle("is-visible", visible);
    this.element.setAttribute("aria-hidden", String(!visible));
  }
}
