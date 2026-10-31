type Stage = "session" | "finance";
export class RequestTiming {
  private started: number;
  private stages = new Map<Stage, number>();
  constructor(private clock: () => number = () => performance.now()) {
    this.started = this.clock();
  }
  async measure<T>(stage: Stage, work: () => Promise<T>): Promise<T> {
    const started = this.clock();
    try {
      return await work();
    } finally {
      this.stages.set(stage, Math.max(0, this.clock() - started));
    }
  }
  header() {
    const entries = [
      ...this.stages,
      ["total", Math.max(0, this.clock() - this.started)] as const,
    ];
    return entries
      .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
      .join(", ");
  }
}
