export type SaveState = { status: "saved" | "pending" | "saving" | "error"; revision: number; error: string; dirty: boolean };
// Serial saves keep the latest local edits separate from the acknowledged snapshot.
export class DraftAutosave<T> {
  private current: T;
  private saved: string;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private flight?: Promise<void>;
  private closed = false;
  private paused = false;
  private state: SaveState;
  constructor(initial: T, revision: number, private persist: (input: T, revision: number) => Promise<{ revision: number } | { error: string }>, private delay = 650) {
    this.current = initial; this.saved = JSON.stringify(initial); this.state = { status: "saved", revision, error: "", dirty: false };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private emit(state: Partial<SaveState>) { this.state = { ...this.state, ...state }; if (!this.closed) this.listeners.forEach(listener => listener()); }
  update(input: T) {
    this.current = input;
    const dirty = JSON.stringify(input) !== this.saved;
    this.emit({ dirty, status: this.flight ? "saving" : dirty ? "pending" : "saved", error: "" });
    clearTimeout(this.timer);
    if (dirty && !this.paused && !this.closed) this.timer = setTimeout(() => { void this.flush().catch(() => undefined); }, this.delay);
  }
  pause(paused: boolean) { this.paused = paused; clearTimeout(this.timer); if (!paused && this.state.dirty) this.timer = setTimeout(() => { void this.flush().catch(() => undefined); }, this.delay); }
  async flush() {
    clearTimeout(this.timer);
    if (this.paused) throw new Error("Espera a que termine la subida de fotos");
    if (this.flight) await this.flight;
    while (this.state.dirty && !this.paused) {
      if (this.flight) { await this.flight; continue; }
      const input = this.current, sent = JSON.stringify(input);
      this.emit({ status: "saving", error: "" });
      const task = (async () => {
        try {
          const result = await this.persist(input, this.state.revision);
          if ("error" in result) throw new Error(result.error);
          this.saved = sent;
          const dirty = JSON.stringify(this.current) !== sent;
          this.emit({ revision: result.revision, dirty, status: dirty ? "pending" : "saved" });
        } catch (error) { const message = error instanceof Error ? error.message : "No pudimos guardar"; this.emit({ status: "error", error: message, dirty: true }); throw error; }
      })();
      this.flight = task;
      try { await task; } finally { if (this.flight === task) this.flight = undefined; }
    }
  }
  dispose() { if (this.state.dirty && !this.paused) void this.flush().catch(() => undefined); this.closed = true; clearTimeout(this.timer); this.listeners.clear(); }
  resume() { this.closed = false; if (this.state.dirty) this.update(this.current); }
}
