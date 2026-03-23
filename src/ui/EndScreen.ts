export class EndScreen {
  readonly element: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly copy: HTMLParagraphElement;

  constructor(onRestart: () => void, onReturnToMenu: () => void) {
    this.element = document.createElement("div");
    this.element.className = "overlay-screen overlay-screen--end";

    const panel = document.createElement("div");
    panel.className = "panel panel--end";

    this.title = document.createElement("h2");
    this.title.className = "end-title";

    this.copy = document.createElement("p");
    this.copy.className = "end-copy";

    const actions = document.createElement("div");
    actions.className = "end-actions";

    const restart = document.createElement("button");
    restart.className = "primary-button";
    restart.type = "button";
    restart.textContent = "Restart";
    restart.addEventListener("click", onRestart);

    const menu = document.createElement("button");
    menu.className = "secondary-button";
    menu.type = "button";
    menu.textContent = "Main Menu";
    menu.addEventListener("click", onReturnToMenu);

    actions.append(restart, menu);
    panel.append(this.title, this.copy, actions);
    this.element.append(panel);
    this.setVisible(false);
  }

  showResult(won: boolean, score: number, targetScore: number): void {
    this.title.textContent = won ? "You Win" : "Out of Moves";
    this.copy.textContent = won
      ? `You reached ${score} points and cleared the target of ${targetScore}.`
      : `You finished on ${score} points and needed ${targetScore} to win.`;
    this.setVisible(true);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }
}
