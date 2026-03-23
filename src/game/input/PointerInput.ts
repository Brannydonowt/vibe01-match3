import * as THREE from "three";

import type { BoardPosition } from "../board/boardTypes";
import { BoardRenderer } from "../board/BoardRenderer";

interface PointerInputOptions {
  onHover: (cell: BoardPosition | null) => void;
  onSelect: (cell: BoardPosition) => void;
}

export class PointerInput {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private enabled = false;

  constructor(
    private readonly domElement: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly boardRenderer: BoardRenderer,
    private readonly options: PointerInputOptions,
  ) {
    this.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.domElement.addEventListener("pointerleave", this.handlePointerLeave);
    this.domElement.addEventListener("click", this.handleClick);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.options.onHover(null);
    }
  }

  dispose(): void {
    this.domElement.removeEventListener("pointermove", this.handlePointerMove);
    this.domElement.removeEventListener("pointerleave", this.handlePointerLeave);
    this.domElement.removeEventListener("click", this.handleClick);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled) {
      return;
    }

    this.options.onHover(this.pickCell(event));
  };

  private readonly handlePointerLeave = (): void => {
    this.options.onHover(null);
  };

  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.enabled) {
      return;
    }

    const cell = this.pickCell(event);
    if (cell) {
      this.options.onSelect(cell);
    }
  };

  private pickCell(event: MouseEvent | PointerEvent): BoardPosition | null {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.boardRenderer.getInteractiveMeshes());
    const target = intersections[0]?.object;
    return target ? this.boardRenderer.resolveCellFromObject(target) : null;
  }
}
