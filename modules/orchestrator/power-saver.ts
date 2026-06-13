export interface PowerSaverTarget {
  setLowPower(enabled: boolean): void;
}

export class PowerSaver {
  private idleTimeoutMs: number;
  private target: PowerSaverTarget | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isLowPower = false;
  private onWakeCallbacks: Array<() => void> = [];

  constructor(idleTimeoutMs: number = 10000) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  setTarget(target: PowerSaverTarget): void {
    this.target = target;
  }

  /** Signal user activity — resets idle timer */
  activity(): void {
    if (this.isLowPower) {
      this.isLowPower = false;
      this.target?.setLowPower(false);
      for (const cb of this.onWakeCallbacks) cb();
    }
    this.resetTimer();
  }

  onWake(callback: () => void): void {
    this.onWakeCallbacks.push(callback);
  }

  isActive(): boolean {
    return !this.isLowPower;
  }

  stop(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.isLowPower = false;
  }

  private resetTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      this.isLowPower = true;
      this.target?.setLowPower(true);
    }, this.idleTimeoutMs);
  }
}
