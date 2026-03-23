export type GameState = "menu" | "playing" | "resolving" | "win" | "lose";

type Listener = (state: GameState) => void;

export class GameStateMachine {
  private state: GameState = "menu";
  private readonly listeners = new Set<Listener>();

  getState(): GameState {
    return this.state;
  }

  setState(nextState: GameState): void {
    if (nextState === this.state) {
      return;
    }

    this.state = nextState;
    this.listeners.forEach((listener) => listener(nextState));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
