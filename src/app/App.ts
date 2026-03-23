import { loadLevelManifest, loadLevelSession } from "../game/levels/levelLoader";
import { sessionForEndlessWave } from "../game/config/endlessConfig";
import { GameScene } from "../game/GameScene";
import { defaultMenuSession } from "../game/session/defaultSession";
import type { SessionDescriptor } from "../game/session/sessionTypes";
import {
  loadProgression,
  recordCampaignProgress,
  recordEndlessProgress,
} from "../scores/progressionStorage";
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
  private progression = loadProgression();
  private levelIds: string[] = [];
  private lastSession: SessionDescriptor | null = null;
  private lastCampaignLevelIndex: number | null = null;
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
        if (payload.mode === "campaign" && this.lastCampaignLevelIndex != null) {
          this.progression = recordCampaignProgress(
            this.lastCampaignLevelIndex,
            payload.score,
            payload.targetScore,
          );
          this.menuScreen.setCampaignLevels(this.levelIds, this.progression);
        }
        if (payload.mode === "endless" && payload.score >= payload.targetScore) {
          this.progression = recordEndlessProgress();
        }
        this.endScreen.showResult({
          score: payload.score,
          milestoneScore: payload.targetScore,
          movesUsed: payload.movesUsed,
          summary: this.scoreSnapshot,
        });
      },
    });

    this.menuScreen = new MenuScreen({
      onCampaignLevel: (levelIndex, levelId) => {
        void this.startCampaignLevel(levelIndex, levelId);
      },
      onEndless: () => {
        void this.startEndless();
      },
    });

    this.hud = new Hud();
    this.menuScreen.renderProfile(this.scoreSnapshot);

    this.endScreen = new EndScreen(
      () => {
        this.endScreen.setVisible(false);
        if (this.lastSession) {
          this.gameScene.startNewGame(this.lastSession);
        } else {
          this.gameScene.startNewGame(defaultMenuSession());
        }
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

    void this.bootstrapLevels();
    this.handleResize();
    this.loop();
  }

  private async bootstrapLevels(): Promise<void> {
    try {
      const manifest = await loadLevelManifest();
      this.levelIds = manifest.levels;
      this.menuScreen.setCampaignLevels(this.levelIds, this.progression);
    } catch {
      this.levelIds = [];
    }
  }

  private async startCampaignLevel(levelIndex: number, levelId: string): Promise<void> {
    try {
      const session = await loadLevelSession(levelId);
      this.lastSession = session;
      this.lastCampaignLevelIndex = levelIndex;
      this.endScreen.setVisible(false);
      this.gameScene.startNewGame(session);
    } catch {
      this.lastSession = defaultMenuSession();
      this.lastCampaignLevelIndex = null;
      this.gameScene.startNewGame(this.lastSession);
    }
  }

  private startEndless(): void {
    const wave = this.progression.nextEndlessWave;
    const seed = (Date.now() ^ (wave * 7919)) >>> 0;
    const session = sessionForEndlessWave(wave, seed);
    this.lastSession = session;
    this.lastCampaignLevelIndex = null;
    this.endScreen.setVisible(false);
    this.gameScene.startNewGame(session);
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
      if (this.levelIds.length > 0) {
        this.menuScreen.setCampaignLevels(this.levelIds, this.progression);
      }
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
