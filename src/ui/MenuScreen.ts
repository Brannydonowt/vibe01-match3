export class MenuScreen {
  readonly element: HTMLDivElement;

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
      "Match stage relics, build score through stylish combos, and clear the demon crowd before your set runs out of moves.";

    const button = document.createElement("button");
    button.className = "primary-button";
    button.type = "button";
    button.textContent = "Start Showdown";
    button.addEventListener("click", onStart);

    const hint = document.createElement("p");
    hint.className = "panel-hint";
    hint.textContent = "Portrait-first, combo-forward, and built for a punchier first run.";

    panel.append(badge, logo, title, copy, button, hint);
    this.element.append(panel);
    this.setVisible(true);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
    this.element.classList.toggle("is-visible", visible);
    this.element.setAttribute("aria-hidden", String(!visible));
  }
}
