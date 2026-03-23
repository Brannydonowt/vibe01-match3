type EasingFunction = (value: number) => number;

interface Tween {
  durationMs: number;
  elapsedMs: number;
  update: (progress: number) => void;
  resolve: () => void;
  easing: EasingFunction;
}

export class TweenQueue {
  private tweens: Tween[] = [];

  update(deltaMs: number): void {
    this.tweens = this.tweens.filter((tween) => {
      tween.elapsedMs += deltaMs;
      const linear = Math.min(1, tween.elapsedMs / tween.durationMs);
      tween.update(tween.easing(linear));

      if (linear >= 1) {
        tween.resolve();
        return false;
      }

      return true;
    });
  }

  animate(
    durationMs: number,
    update: (progress: number) => void,
    easing: EasingFunction = TweenQueue.easeInOutCubic,
  ): Promise<void> {
    update(0);

    if (durationMs <= 0) {
      update(1);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.tweens.push({
        durationMs,
        elapsedMs: 0,
        update,
        resolve,
        easing,
      });
    });
  }

  static easeInOutCubic(value: number): number {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  static easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
  }
}
