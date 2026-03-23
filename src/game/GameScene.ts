import * as THREE from "three";

import { TweenQueue } from "./animation/TweenQueue";
import { BoardModel } from "./board/BoardModel";
import { BoardRenderer } from "./board/BoardRenderer";
import { isAdjacent } from "./board/MatchResolver";
import { SwapController } from "./board/SwapController";
import type { BoardPosition, ResolutionStep } from "./board/boardTypes";
import { gameConfig } from "./config/gameConfig";
import { PointerInput } from "./input/PointerInput";
import type { HudState } from "../ui/Hud";

interface SessionState {
  board: BoardModel;
  score: number;
  movesRemaining: number;
  targetScore: number;
}

interface GameSceneOptions {
  onHudUpdate: (state: HudState) => void;
  onPhaseChange: (phase: "playing" | "resolving" | "win" | "lose") => void;
  onGameFinished: (payload: { won: boolean; score: number; targetScore: number }) => void;
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
    };

    this.selectedCell = null;
    this.boardRenderer.setSelected(null);
    this.boardRenderer.setHovered(null);
    this.boardRenderer.setBoard(board.getGrid());
    this.pointerInput.setEnabled(true);
    this.options.onPhaseChange("playing");
    this.publishHud("Reach the target score before your moves run out.");
  }

  showMenuBoard(): void {
    this.pointerInput.setEnabled(false);
    this.selectedCell = null;
    this.boardRenderer.setSelected(null);
    this.boardRenderer.setHovered(null);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);

    const aspect = width / Math.max(height, 1);
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

    this.camera.left = -cameraWidth / 2;
    this.camera.right = cameraWidth / 2;
    this.camera.top = cameraHeight / 2;
    this.camera.bottom = -cameraHeight / 2;
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
      this.publishHud("Choose a neighboring tile to swap.");
      return;
    }

    if (this.selectedCell.x === cell.x && this.selectedCell.y === cell.y) {
      this.selectedCell = null;
      this.boardRenderer.setSelected(null);
      this.publishHud("Selection cleared.");
      return;
    }

    if (!isAdjacent(this.selectedCell, cell)) {
      this.selectedCell = cell;
      this.boardRenderer.setSelected(cell);
      this.publishHud("Pick an adjacent tile to make the swap.");
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
      this.publishHud("That move does not create a match.");
      return;
    }

    this.session.movesRemaining -= 1;
    let reshuffled = false;

    for (const step of result.steps.slice(1)) {
      await this.runResolutionStep(step);
      if (step.type === "reshuffle") {
        reshuffled = true;
      }
    }

    this.session.score += result.scoreDelta;

    if (this.session.score >= this.session.targetScore) {
      this.pointerInput.setEnabled(false);
      this.options.onPhaseChange("win");
      this.publishHud("Target cleared. You win.");
      this.options.onGameFinished({
        won: true,
        score: this.session.score,
        targetScore: this.session.targetScore,
      });
      return;
    }

    if (this.session.movesRemaining <= 0) {
      this.pointerInput.setEnabled(false);
      this.options.onPhaseChange("lose");
      this.publishHud("No moves left.");
      this.options.onGameFinished({
        won: false,
        score: this.session.score,
        targetScore: this.session.targetScore,
      });
      return;
    }

    this.pointerInput.setEnabled(true);
    this.options.onPhaseChange("playing");
    this.publishHud(
      reshuffled
        ? "Fresh board dealt. Keep pushing for the target score."
        : "Board settled. Pick your next swap.",
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
}
