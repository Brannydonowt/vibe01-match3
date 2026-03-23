import { GameScene } from "../game/GameScene";
import { loadScoreSnapshot, recordScore, type ScoreSnapshot } from "../scores/scoreStorage";
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
  private readonly sceneLayer: HTMLDivElement;
  private readonly hudResizeObserver: ResizeObserver | null;
  private scoreSnapshot: ScoreSnapshot = loadScoreSnapshot();
  private currentState: GameState = "menu";
  private animationFrame = 0;
  private lastFrameTime = performance.now();

  constructor(private readonly root: HTMLElement) {
    this.shell = document.createElement("div");
    this.shell.className = "app-shell";
    this.root.append(this.shell);

    this.sceneLayer = document.createElement("div");
    this.sceneLayer.className = "scene-layer";

    const overlayLayer = document.createElement("div");
    overlayLayer.className = "overlay-layer";

    this.gameScene = new GameScene({
      onHudUpdate: (state) => {
        this.hud.render({
          ...state,
          bestScore: this.scoreSnapshot.bestScore,
        });
      },
      onPhaseChange: (phase) => {
        this.stateMachine.setState(phase);
      },
      onGameFinished: (payload) => {
        this.scoreSnapshot = recordScore(payload.score);
        this.menuScreen.renderProfile(this.scoreSnapshot);
        this.endScreen.showResult({
          score: payload.score,
          milestoneScore: payload.targetScore,
          movesUsed: payload.movesUsed,
          summary: this.scoreSnapshot,
        });
      },
    });

    this.menuScreen = new MenuScreen(() => {
      this.endScreen.setVisible(false);
      this.gameScene.startNewGame();
    });

    this.hud = new Hud();
    this.menuScreen.renderProfile(this.scoreSnapshot);

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

    this.sceneLayer.append(this.gameScene.element);
    overlayLayer.append(this.hud.element, this.menuScreen.element, this.endScreen.element);
    this.shell.append(this.sceneLayer, overlayLayer);

    this.stateMachine.subscribe((state) => {
      this.applyState(state);
    });

    window.addEventListener("resize", this.handleResize);
    window.visualViewport?.addEventListener("resize", this.handleResize);
    window.visualViewport?.addEventListener("scroll", this.handleResize);

    if ("ResizeObserver" in window) {
      this.hudResizeObserver = new ResizeObserver(() => {
        this.syncSceneLayout();
        this.resizeSceneToContainer();
      });
      this.hudResizeObserver.observe(this.hud.element);
    } else {
      this.hudResizeObserver = null;
    }

    this.handleResize();
    this.loop();
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    window.visualViewport?.removeEventListener("resize", this.handleResize);
    window.visualViewport?.removeEventListener("scroll", this.handleResize);
    this.hudResizeObserver?.disconnect();
    cancelAnimationFrame(this.animationFrame);
    this.gameScene.dispose();
  }

  private readonly handleResize = (): void => {
    this.syncSceneLayout();
    this.resizeSceneToContainer();
  };

  private applyState(state: GameState): void {
    this.currentState = state;
    this.shell.dataset.state = state;
    const onMenu = state === "menu";
    const hudVisible = state === "playing" || state === "resolving";
    this.menuScreen.setVisible(onMenu);
    this.hud.setVisible(hudVisible);

    if (onMenu) {
      this.endScreen.setVisible(false);
      this.gameScene.showMenuBoard();
    }

    if (state === "playing" || state === "resolving") {
      this.endScreen.setVisible(false);
    }

    this.handleResize();
  }

  private syncSceneLayout(): void {
    const gameplayVisible = this.currentState !== "menu" && !this.hud.element.hidden;
    const hudHeight = gameplayVisible
      ? Math.ceil(this.hud.element.getBoundingClientRect().height)
      : 0;
    const compactSpacing = (this.root.clientWidth || window.innerWidth) < 720;

    this.shell.style.setProperty("--hud-height", `${hudHeight}px`);
    this.shell.style.setProperty("--scene-gap", gameplayVisible ? (compactSpacing ? "8px" : "14px") : "0px");
    this.shell.style.setProperty("--scene-bottom-gap", gameplayVisible ? (compactSpacing ? "18px" : "24px") : "0px");
  }

  private resizeSceneToContainer(): void {
    const width = this.sceneLayer.clientWidth || this.root.clientWidth || window.innerWidth;
    const height = this.sceneLayer.clientHeight || this.root.clientHeight || window.innerHeight;
    this.gameScene.resize(width, height);
  }

  private loop = (): void => {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.gameScene.update(delta);
    this.animationFrame = requestAnimationFrame(this.loop);
  };
}
