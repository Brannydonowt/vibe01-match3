import { GameScene } from "../game/GameScene";
import { GameStateMachine, type GameState } from "../state/GameStateMachine";
import { EndScreen } from "../ui/EndScreen";
import { Hud } from "../ui/Hud";
import { MenuScreen } from "../ui/MenuScreen";

export class App {
  private readonly stateMachine = new GameStateMachine();
  private readonly gameScene: GameScene;
  private readonly menuScreen: MenuScreen;
  private readonly hud: Hud;
  private readonly endScreen: EndScreen;
  private readonly shell: HTMLDivElement;
  private animationFrame = 0;
  private lastFrameTime = performance.now();

  constructor(private readonly root: HTMLElement) {
    this.shell = document.createElement("div");
    this.shell.className = "app-shell";
    this.root.append(this.shell);

    const sceneLayer = document.createElement("div");
    sceneLayer.className = "scene-layer";

    const overlayLayer = document.createElement("div");
    overlayLayer.className = "overlay-layer";

    this.gameScene = new GameScene({
      onHudUpdate: (state) => {
        this.hud.render(state);
      },
      onPhaseChange: (phase) => {
        this.stateMachine.setState(phase);
      },
      onGameFinished: (payload) => {
        this.endScreen.showResult(payload.won, payload.score, payload.targetScore);
      },
    });

    this.menuScreen = new MenuScreen(() => {
      this.endScreen.setVisible(false);
      this.gameScene.startNewGame();
    });

    this.hud = new Hud();

    this.endScreen = new EndScreen(
      () => {
        this.endScreen.setVisible(false);
        this.gameScene.startNewGame();
      },
      () => {
        this.endScreen.setVisible(false);
        this.stateMachine.setState("menu");
      },
    );

    sceneLayer.append(this.gameScene.element);
    overlayLayer.append(this.hud.element, this.menuScreen.element, this.endScreen.element);
    this.shell.append(sceneLayer, overlayLayer);

    this.stateMachine.subscribe((state) => {
      this.applyState(state);
    });

    window.addEventListener("resize", this.handleResize);
    this.handleResize();
    this.loop();
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    cancelAnimationFrame(this.animationFrame);
    this.gameScene.dispose();
  }

  private readonly handleResize = (): void => {
    const { clientWidth, clientHeight } = this.root;
    this.gameScene.resize(clientWidth, clientHeight);
  };

  private applyState(state: GameState): void {
    const onMenu = state === "menu";
    this.menuScreen.setVisible(onMenu);
    this.hud.setVisible(!onMenu);

    if (onMenu) {
      this.gameScene.showMenuBoard();
    }

    if (state === "playing" || state === "resolving") {
      this.endScreen.setVisible(false);
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.gameScene.update(delta);
    this.animationFrame = requestAnimationFrame(this.loop);
  };
}
