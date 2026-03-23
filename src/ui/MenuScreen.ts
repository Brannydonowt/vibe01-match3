export class MenuScreen {
  readonly element: HTMLDivElement;

  constructor(onStart: () => void) {
    this.element = document.createElement("div");
    this.element.className = "overlay-screen overlay-screen--menu";

    const panel = document.createElement("div");
    panel.className = "panel panel--menu";

    const title = document.createElement("h1");
    title.className = "menu-title";
    title.textContent = "Crystal Constellation";

    const copy = document.createElement("p");
    copy.className = "menu-copy";
    copy.textContent =
      "Swap neighboring charms, make clean matches, and hit the target score before your moves run out.";

    const button = document.createElement("button");
    button.className = "primary-button";
    button.type = "button";
    button.textContent = "Start Game";
    button.addEventListener("click", onStart);

    const hint = document.createElement("p");
    hint.className = "panel-hint";
    hint.textContent = "Simple rules first. Polish comes from clarity.";

    panel.append(title, copy, button, hint);
    this.element.append(panel);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }
}
