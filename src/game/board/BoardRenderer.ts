import * as THREE from "three";

import { TweenQueue } from "../animation/TweenQueue";
import type { GameConfig } from "../config/gameConfig";
import type {
  BoardPosition,
  CellGrid,
  SpawnedTile,
  Tile,
  TileMovement,
} from "./boardTypes";

type TileMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
type BlockerMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

export class BoardRenderer {
  private readonly config: GameConfig;
  private readonly tweens: TweenQueue;
  private readonly group = new THREE.Group();
  private readonly tileGeometry: THREE.PlaneGeometry;
  private readonly blockerGeometry: THREE.PlaneGeometry;
  private readonly tileMeshes = new Map<number, TileMesh>();
  private readonly blockerMeshes = new Map<string, BlockerMesh>();
  private readonly textures = new Map<number, THREE.Texture>();
  private boardBackdrop: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly hoverIndicator: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly selectionIndicator: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private currentGrid: CellGrid = [];

  constructor(scene: THREE.Scene, config: GameConfig, tweens: TweenQueue) {
    this.config = config;
    this.tweens = tweens;
    this.tileGeometry = new THREE.PlaneGeometry(config.tileSize, config.tileSize);
    this.blockerGeometry = new THREE.PlaneGeometry(config.tileSize * 0.92, config.tileSize * 0.92);

    this.boardBackdrop = this.createBackdrop(config.boardWidth, config.boardHeight);

    this.hoverIndicator = new THREE.Mesh(
      new THREE.RingGeometry(0.43, 0.49, 32),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#58ddff"),
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.hoverIndicator.visible = false;
    this.group.add(this.hoverIndicator);

    this.selectionIndicator = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.52, 32),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ff5fd0"),
        transparent: true,
        opacity: 0.95,
      }),
    );
    this.selectionIndicator.visible = false;
    this.group.add(this.selectionIndicator);

    scene.add(this.group);
    this.createFallbackTextures();
    this.loadGeneratedTextures();
  }

  private createBackdrop(width: number, height: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(
        this.getBoardWidthWorldForDims(width, height) + this.config.boardPadding * 2,
        this.getBoardHeightWorldForDims(width, height) + this.config.boardPadding * 2,
      ),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#1b0d2c"),
        transparent: true,
        opacity: 0.95,
      }),
    );
    mesh.position.z = -0.4;
    this.group.add(mesh);
    return mesh;
  }

  private refreshBackdrop(): void {
    const w = this.currentGrid[0]?.length ?? this.config.boardWidth;
    const h = this.currentGrid.length || this.config.boardHeight;
    const geom = this.boardBackdrop.geometry as THREE.PlaneGeometry;
    geom.dispose();
    this.boardBackdrop.geometry = new THREE.PlaneGeometry(
      this.getBoardWidthWorldForDims(w, h) + this.config.boardPadding * 2,
      this.getBoardHeightWorldForDims(w, h) + this.config.boardPadding * 2,
    );
  }

  getObject3D(): THREE.Object3D {
    return this.group;
  }

  getBoardBounds(): { width: number; height: number } {
    const w = this.currentGrid[0]?.length ?? this.config.boardWidth;
    const h = this.currentGrid.length || this.config.boardHeight;
    return {
      width: this.getBoardWidthWorldForDims(w, h) + this.config.boardPadding * 2,
      height: this.getBoardHeightWorldForDims(w, h) + this.config.boardPadding * 2,
    };
  }

  getInteractiveMeshes(): THREE.Object3D[] {
    return Array.from(this.tileMeshes.values());
  }

  setBoard(grid: CellGrid): void {
    this.currentGrid = grid.map((row) =>
      row.map((c) => ({
        piece: c.piece ? { ...c.piece } : null,
        blocker: c.blocker ? { ...c.blocker } : null,
      })),
    );
    this.refreshBackdrop();
    this.syncMeshesToGrid();
  }

  setHovered(cell: BoardPosition | null): void {
    if (!cell) {
      this.hoverIndicator.visible = false;
      return;
    }

    this.hoverIndicator.visible = true;
    this.hoverIndicator.position.copy(this.gridToWorld(cell));
    this.hoverIndicator.position.z = 0.22;
  }

  setSelected(cell: BoardPosition | null): void {
    if (!cell) {
      this.selectionIndicator.visible = false;
      return;
    }

    this.selectionIndicator.visible = true;
    this.selectionIndicator.position.copy(this.gridToWorld(cell));
    this.selectionIndicator.position.z = 0.24;
  }

  async animateSwap(
    first: BoardPosition,
    second: BoardPosition,
    valid: boolean,
    resultGrid?: CellGrid,
  ): Promise<void> {
    const c1 = this.currentGrid[first.y]?.[first.x];
    const c2 = this.currentGrid[second.y]?.[second.x];
    const firstTile = c1?.piece;
    const secondTile = c2?.piece;
    if (!firstTile || !secondTile) {
      return;
    }

    const firstMesh = this.tileMeshes.get(firstTile.id);
    const secondMesh = this.tileMeshes.get(secondTile.id);
    if (!firstMesh || !secondMesh) {
      return;
    }

    const firstStart = firstMesh.position.clone();
    const secondStart = secondMesh.position.clone();
    const firstEnd = this.gridToWorld(second);
    const secondEnd = this.gridToWorld(first);

    await Promise.all([
      this.tweens.animate(this.config.swapDurationMs, (progress) => {
        firstMesh.position.lerpVectors(firstStart, firstEnd, progress);
      }),
      this.tweens.animate(this.config.swapDurationMs, (progress) => {
        secondMesh.position.lerpVectors(secondStart, secondEnd, progress);
      }),
    ]);

    if (valid && resultGrid) {
      this.currentGrid = resultGrid.map((row) =>
        row.map((c) => ({
          piece: c.piece ? { ...c.piece } : null,
          blocker: c.blocker ? { ...c.blocker } : null,
        })),
      );
      this.syncMeshesToGrid();
      return;
    }

    await Promise.all([
      this.tweens.animate(
        this.config.invalidSwapBounceMs,
        (progress) => {
          firstMesh.position.lerpVectors(firstEnd, firstStart, progress);
        },
        TweenQueue.easeOutCubic,
      ),
      this.tweens.animate(
        this.config.invalidSwapBounceMs,
        (progress) => {
          secondMesh.position.lerpVectors(secondEnd, secondStart, progress);
        },
        TweenQueue.easeOutCubic,
      ),
    ]);

    this.syncMeshesToGrid();
  }

  async animateClear(cells: BoardPosition[], gridAfterClear?: CellGrid): Promise<void> {
    const targets = cells
      .map((cell) => this.currentGrid[cell.y]?.[cell.x]?.piece)
      .filter((tile): tile is Tile => tile !== null && tile !== undefined);

    await Promise.all(
      targets.map((tile) => {
        const mesh = this.tileMeshes.get(tile.id);
        if (!mesh) {
          return Promise.resolve();
        }

        const startScale = mesh.scale.clone();
        const material = mesh.material;
        return this.tweens.animate(this.config.clearDurationMs, (progress) => {
          const size = THREE.MathUtils.lerp(1, 0.08, progress);
          mesh.scale.set(startScale.x * size, startScale.y * size, 1);
          material.opacity = THREE.MathUtils.lerp(1, 0, progress);
        });
      }),
    );

    if (gridAfterClear) {
      this.currentGrid = gridAfterClear.map((row) =>
        row.map((c) => ({
          piece: c.piece ? { ...c.piece } : null,
          blocker: c.blocker ? { ...c.blocker } : null,
        })),
      );
    } else {
      for (const cell of cells) {
        const c = this.currentGrid[cell.y]?.[cell.x];
        const tile = c?.piece;
        if (!tile) {
          continue;
        }

        const mesh = this.tileMeshes.get(tile.id);
        if (mesh) {
          this.group.remove(mesh);
          mesh.material.dispose();
          this.tileMeshes.delete(tile.id);
        }
        if (c) {
          c.piece = null;
        }
      }
    }
    this.syncMeshesToGrid();
  }

  async animateFall(grid: CellGrid, movements: TileMovement[], spawned: SpawnedTile[]): Promise<void> {
    const animations: Promise<void>[] = [];

    for (const movement of movements) {
      const mesh = this.tileMeshes.get(movement.tile.id);
      if (!mesh) {
        continue;
      }

      const start = this.gridToWorld(movement.from);
      const end = this.gridToWorld(movement.to);
      mesh.position.copy(start);
      animations.push(
        this.tweens.animate(
          this.config.fallDurationMs,
          (progress) => {
            mesh.position.lerpVectors(start, end, progress);
          },
          TweenQueue.easeOutCubic,
        ),
      );
    }

    for (const spawn of spawned) {
      const mesh = this.createTileMesh(spawn.tile);
      const start = this.gridToWorld(spawn.from);
      const end = this.gridToWorld(spawn.to);
      mesh.position.copy(start);
      mesh.scale.setScalar(0.92);
      this.group.add(mesh);
      this.tileMeshes.set(spawn.tile.id, mesh);
      animations.push(
        this.tweens.animate(
          this.config.fallDurationMs,
          (progress) => {
            mesh.position.lerpVectors(start, end, progress);
            const scale = THREE.MathUtils.lerp(0.92, 1, progress);
            mesh.scale.setScalar(scale);
          },
          TweenQueue.easeOutCubic,
        ),
      );
    }

    await Promise.all(animations);
    this.currentGrid = grid.map((row) =>
      row.map((c) => ({
        piece: c.piece ? { ...c.piece } : null,
        blocker: c.blocker ? { ...c.blocker } : null,
      })),
    );
    this.syncMeshesToGrid();
  }

  async animateReshuffle(grid: CellGrid): Promise<void> {
    const meshes = Array.from(this.tileMeshes.values());
    await Promise.all(
      meshes.map((mesh) =>
        this.tweens.animate(120, (progress) => {
          mesh.material.opacity = THREE.MathUtils.lerp(1, 0.2, progress);
          const size = THREE.MathUtils.lerp(1, 0.82, progress);
          mesh.scale.set(size, size, 1);
        }),
      ),
    );

    this.currentGrid = grid.map((row) =>
      row.map((c) => ({
        piece: c.piece ? { ...c.piece } : null,
        blocker: c.blocker ? { ...c.blocker } : null,
      })),
    );
    this.syncMeshesToGrid();

    await Promise.all(
      Array.from(this.tileMeshes.values()).map((mesh) =>
        this.tweens.animate(160, (progress) => {
          mesh.material.opacity = THREE.MathUtils.lerp(0.4, 1, progress);
          const size = THREE.MathUtils.lerp(0.9, 1, progress);
          mesh.scale.set(size, size, 1);
        }),
      ),
    );
  }

  resolveCellFromObject(object: THREE.Object3D): BoardPosition | null {
    const data = object.userData.gridPosition as BoardPosition | undefined;
    return data ? { ...data } : null;
  }

  private syncMeshesToGrid(): void {
    const activeTileIds = new Set<number>();
    const activeBlockerKeys = new Set<string>();

    const w = this.currentGrid[0]?.length ?? 0;
    const h = this.currentGrid.length;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const cell = this.currentGrid[y]![x]!;
        const key = `${x},${y}`;

        if (cell.blocker) {
          activeBlockerKeys.add(key);
          let bMesh = this.blockerMeshes.get(key);
          if (!bMesh) {
            bMesh = new THREE.Mesh(
              this.blockerGeometry,
              new THREE.MeshBasicMaterial({
                color: new THREE.Color("#5a3d1a"),
                transparent: true,
                opacity: 0.92,
              }),
            );
            bMesh.renderOrder = 2;
            this.blockerMeshes.set(key, bMesh);
            this.group.add(bMesh);
          }
          bMesh.position.copy(this.gridToWorld({ x, y }));
          bMesh.position.z = 0.15;
          bMesh.scale.set(1, 1, 1);
          bMesh.material.opacity = 0.75 + 0.1 * Math.min(cell.blocker.hp, 3);
        }

        const tile = cell.piece;
        if (!tile) {
          continue;
        }

        activeTileIds.add(tile.id);
        let mesh = this.tileMeshes.get(tile.id);
        if (!mesh) {
          mesh = this.createTileMesh(tile);
          this.tileMeshes.set(tile.id, mesh);
          this.group.add(mesh);
        }

        mesh.position.copy(this.gridToWorld({ x, y }));
        mesh.position.z = 0.05;
        mesh.scale.set(1, 1, 1);
        mesh.material.opacity = 1;
        mesh.material.map = this.textures.get(tile.kind) ?? null;
        this.applySpecialTint(mesh, tile);
        mesh.material.needsUpdate = true;
        mesh.userData.gridPosition = { x, y };
      }
    }

    for (const [tileId, mesh] of this.tileMeshes.entries()) {
      if (activeTileIds.has(tileId)) {
        continue;
      }

      this.group.remove(mesh);
      mesh.material.dispose();
      this.tileMeshes.delete(tileId);
    }

    for (const [bKey, mesh] of this.blockerMeshes.entries()) {
      if (activeBlockerKeys.has(bKey)) {
        continue;
      }

      this.group.remove(mesh);
      mesh.material.dispose();
      this.blockerMeshes.delete(bKey);
    }
  }

  private applySpecialTint(mesh: TileMesh, tile: Tile): void {
    const base = new THREE.Color("#ffffff");
    switch (tile.special) {
      case "line_h":
      case "line_v":
        mesh.material.color = base.lerp(new THREE.Color("#66ffee"), 0.45);
        break;
      case "bomb":
        mesh.material.color = base.lerp(new THREE.Color("#ffaa33"), 0.5);
        break;
      case "color_bomb":
        mesh.material.color = base.lerp(new THREE.Color("#dd66ff"), 0.55);
        break;
      default:
        mesh.material.color = base;
    }
  }

  private createTileMesh(tile: Tile): TileMesh {
    const mesh = new THREE.Mesh(
      this.tileGeometry,
      new THREE.MeshBasicMaterial({
        map: this.textures.get(tile.kind) ?? null,
        transparent: true,
      }),
    );
    mesh.renderOrder = 1;
    this.applySpecialTint(mesh, tile);
    return mesh;
  }

  private createFallbackTextures(): void {
    this.config.tileKinds.forEach((kind, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createRadialGradient(88, 84, 20, 128, 128, 112);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.2, kind.color);
      gradient.addColorStop(1, "#1d2642");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(128, 128, 92, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 10;
      ctx.stroke();

      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(100, 88, 40, 26, -0.4, 0, Math.PI * 2);
      ctx.fill();

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set(index, texture);
    });
  }

  private loadGeneratedTextures(): void {
    const loader = new THREE.TextureLoader();

    this.config.tileKinds.forEach((kind, index) => {
      const url = `${import.meta.env.BASE_URL}${kind.assetPath}`;
      loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          this.textures.set(index, texture);
          this.syncMeshesToGrid();
        },
        undefined,
        () => {
          // Keep the generated fallback texture if an asset is still missing.
        },
      );
    });
  }

  private gridToWorld(position: BoardPosition): THREE.Vector3 {
    const w = this.currentGrid[0]?.length ?? this.config.boardWidth;
    const h = this.currentGrid.length || this.config.boardHeight;
    const stride = this.config.tileSize + this.config.tileGap;
    const width = this.getBoardWidthWorldForDims(w, h);
    const height = this.getBoardHeightWorldForDims(w, h);
    const x = -width / 2 + this.config.tileSize / 2 + position.x * stride;
    const y = height / 2 - this.config.tileSize / 2 - position.y * stride;
    return new THREE.Vector3(x, y, 0);
  }

  private getBoardWidthWorldForDims(boardWidth: number, boardHeight: number): number {
    void boardHeight;
    return boardWidth * this.config.tileSize + (boardWidth - 1) * this.config.tileGap;
  }

  private getBoardHeightWorldForDims(boardWidth: number, boardHeight: number): number {
    void boardWidth;
    return boardHeight * this.config.tileSize + (boardHeight - 1) * this.config.tileGap;
  }
}
