import * as THREE from "three";

import { TweenQueue } from "./animation/TweenQueue";
import { BoardModel } from "./board/BoardModel";
import { BoardRenderer } from "./board/BoardRenderer";
import { isAdjacent } from "./board/MatchResolver";
import { SwapController } from "./board/SwapController";
import type { BoardPosition, ResolutionStep } from "./board/boardTypes";
import { gameConfig } from "./config/gameConfig";
import { PointerInput } from "./input/PointerInput";
import type { GameHudState } from "../ui/Hud";

interface SessionState {
  board: BoardModel;
  score: number;
  movesRemaining: number;
  targetScore: number;
  milestoneReached: boolean;
}

interface GameSceneOptions {
  onHudUpdate: (state: GameHudState) => void;
  onPhaseChange: (phase: "playing" | "resolving" | "results") => void;
  onGameFinished: (payload: { score: number; targetScore: number; movesUsed: number }) => void;
}

export class GameScene {
  readonly element: HTMLDivElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly tweens = new TweenQueue();
  private readonly boardRenderer: BoardRenderer;
  private readonly pointerInput: PointerInput;
  private readonly swapController = new SwapController();
  private readonly options: GameSceneOptions;
  private session: SessionState | null = null;
  private selectedCell: BoardPosition | null = null;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private presentationMode: "menu" | "gameplay" = "menu";

  constructor(options: GameSceneOptions) {
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = "game-scene";

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(gameConfig.backgroundColor);

    this.camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 50);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.className = "game-canvas";
    this.element.append(this.renderer.domElement);

    this.boardRenderer = new BoardRenderer(this.scene, gameConfig, this.tweens);
    this.pointerInput = new PointerInput(
      this.renderer.domElement,
      this.camera,
      this.boardRenderer,
      {
        onHover: (cell) => {
          this.boardRenderer.setHovered(cell);
        },
        onSelect: (cell) => {
          void this.handleCellSelection(cell);
        },
      },
    );
    this.pointerInput.setEnabled(false);

    this.seedPreviewBoard();
  }

  startNewGame(): void {
    this.presentationMode = "gameplay";
    const board = BoardModel.createPlayable(
      gameConfig.boardWidth,
      gameConfig.boardHeight,
      gameConfig.tileKinds.length,
    );

    this.session = {
      board,
      score: 0,
      movesRemaining: gameConfig.startingMoves,
      targetScore: gameConfig.targetScore,
      milestoneReached: false,
    };

    this.selectedCell = null;
    this.boardRenderer.setSelected(null);
    this.boardRenderer.setHovered(null);
    this.boardRenderer.setBoard(board.getGrid());
    this.pointerInput.setEnabled(true);
    this.updateCameraFrame();
    this.options.onPhaseChange("playing");
    this.publishHud(
      `Run up the biggest score you can in ${this.session.movesRemaining} moves.`,
    );
  }

  showMenuBoard(): void {
    this.presentationMode = "menu";
    this.pointerInput.setEnabled(false);
    this.selectedCell = null;
    this.boardRenderer.setSelected(null);
    this.boardRenderer.setHovered(null);
    this.updateCameraFrame();
  }

  resize(width: number, height: number): void {
    this.viewportWidth = Math.max(width, 1);
    this.viewportHeight = Math.max(height, 1);
    this.renderer.setSize(width, height, false);
    this.updateCameraFrame();
  }

  private updateCameraFrame(): void {
    const aspect = this.viewportWidth / this.viewportHeight;
    const bounds = this.boardRenderer.getBoardBounds();
    const targetWidth = bounds.width + gameConfig.cameraMargin * 2;
    const targetHeight = bounds.height + gameConfig.cameraMargin * 2;

    let cameraWidth = targetWidth;
    let cameraHeight = targetHeight;

    if (aspect > targetWidth / targetHeight) {
      cameraWidth = cameraHeight * aspect;
    } else {
      cameraHeight = cameraWidth / aspect;
    }

    const topBias = this.getTopBias(aspect);
    const bottomBias = this.getBottomBias(aspect);

    this.camera.left = -cameraWidth / 2;
    this.camera.right = cameraWidth / 2;
    this.camera.top = cameraHeight / 2 + topBias;
    this.camera.bottom = -cameraHeight / 2 - bottomBias;
    this.camera.updateProjectionMatrix();
  }

  update(deltaMs: number): void {
    this.tweens.update(deltaMs);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.pointerInput.dispose();
    this.renderer.dispose();
  }

  private seedPreviewBoard(): void {
    const previewBoard = BoardModel.createPlayable(
      gameConfig.boardWidth,
      gameConfig.boardHeight,
      gameConfig.tileKinds.length,
    );
    this.boardRenderer.setBoard(previewBoard.getGrid());
  }

  private async handleCellSelection(cell: BoardPosition): Promise<void> {
    if (!this.session) {
      return;
    }

    if (!this.selectedCell) {
      this.selectedCell = cell;
      this.boardRenderer.setSelected(cell);
      this.publishHud("Pick a nearby tile to launch the swap.");
      return;
    }

    if (this.selectedCell.x === cell.x && this.selectedCell.y === cell.y) {
      this.selectedCell = null;
      this.boardRenderer.setSelected(null);
      this.publishHud("Selection cleared. Ready for a cleaner line.");
      return;
    }

    if (!isAdjacent(this.selectedCell, cell)) {
      this.selectedCell = cell;
      this.boardRenderer.setSelected(cell);
      this.publishHud("Only adjacent tiles can trade places.");
      return;
    }

    const from = this.selectedCell;
    this.selectedCell = null;
    this.boardRenderer.setSelected(null);

    await this.resolveSwap(from, cell);
  }

  private async resolveSwap(first: BoardPosition, second: BoardPosition): Promise<void> {
    if (!this.session) {
      return;
    }

    this.pointerInput.setEnabled(false);
    this.options.onPhaseChange("resolving");

    const result = this.swapController.trySwap(this.session.board, first, second);
    const swapStep = result.steps[0];

    if (swapStep?.type === "swap") {
      await this.boardRenderer.animateSwap(first, second, swapStep.valid, swapStep.valid ? swapStep.grid : undefined);
    }

    if (!result.valid) {
      this.pointerInput.setEnabled(true);
      this.options.onPhaseChange("playing");
      this.publishHud("No match from that move. Try setting up a louder combo.");
      return;
    }

    this.session.movesRemaining -= 1;
    let reshuffled = false;
    let reachedMilestoneThisTurn = false;
    this.publishHud(`${this.session.movesRemaining} moves left. Resolving the combo...`);

    for (const step of result.steps.slice(1)) {
      await this.runResolutionStep(step);
      if (step.type === "clear") {
        const scoreGain = this.calculateResolutionScore(step.cleared.length, step.cascade);
        this.session.score += scoreGain;
        this.publishHud(this.describeClear(step.cleared.length, step.cascade, scoreGain));
      }

      if (step.type === "reshuffle") {
        reshuffled = true;
        this.publishHud("Stage remixed. Fresh tiles dropped in.");
      }
    }

    if (!this.session.milestoneReached && this.session.score >= this.session.targetScore) {
      this.session.milestoneReached = true;
      reachedMilestoneThisTurn = true;
    }

    if (this.session.movesRemaining <= 0) {
      this.pointerInput.setEnabled(false);
      this.options.onPhaseChange("results");
      this.publishHud("No moves left. Final score locked in.");
      this.options.onGameFinished({
        score: this.session.score,
        targetScore: this.session.targetScore,
        movesUsed: gameConfig.startingMoves - this.session.movesRemaining,
      });
      return;
    }

    this.pointerInput.setEnabled(true);
    this.options.onPhaseChange("playing");
    this.publishHud(
      reachedMilestoneThisTurn
        ? `Milestone ${this.session.targetScore} reached. ${this.session.movesRemaining} moves left to push higher.`
        : reshuffled
        ? "Fresh board dealt. Find the next big pop."
        : "Board settled. Pick the next spotlight move.",
    );
  }

  private async runResolutionStep(step: ResolutionStep): Promise<void> {
    if (step.type === "clear") {
      await this.boardRenderer.animateClear(step.cleared);
    }

    if (step.type === "fall") {
      await this.boardRenderer.animateFall(step.grid, step.movements, step.spawned);
    }

    if (step.type === "reshuffle") {
      await this.boardRenderer.animateReshuffle(step.grid);
    }
  }

  private publishHud(message: string): void {
    const state = this.session;
    this.options.onHudUpdate({
      score: state?.score ?? 0,
      targetScore: state?.targetScore ?? gameConfig.targetScore,
      movesRemaining: state?.movesRemaining ?? gameConfig.startingMoves,
      message,
    });
  }

  private calculateResolutionScore(clearedCount: number, cascade: number): number {
    const comboMultiplier = 1 + cascade * 0.35;
    return Math.round(clearedCount * 100 * comboMultiplier);
  }

  private describeClear(clearedCount: number, cascade: number, scoreGain: number): string {
    if (cascade === 0) {
      return `Match landed. +${scoreGain} score from ${clearedCount} cleared tiles.`;
    }

    return `Encore combo x${cascade + 1}. +${scoreGain} score.`;
  }

  private getTopBias(aspect: number): number {
    if (this.presentationMode === "gameplay") {
      return aspect < 0.72 ? 0.18 : 0;
    }

    if (aspect < 0.72) {
      return 1.1;
    }

    return 0;
  }

  private getBottomBias(aspect: number): number {
    if (this.presentationMode === "menu") {
      return aspect < 0.72 ? 0.55 : 0.15;
    }

    return aspect < 0.72 ? 0.25 : 0.06;
  }
}
