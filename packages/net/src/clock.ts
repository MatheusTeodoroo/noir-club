/** Monotonic local epoch time, comparable between the page and its Web Workers. */
export function localNow(): number {
  return performance.timeOrigin + performance.now();
}

/**
 * NTP-style clock: estimates `relayTime - localTime` from ping round trips and keeps the sample
 * with the smallest RTT (least queueing noise). All displays share the relay's clock, so a frame
 * stamped `at` fires at the same real instant on every TV.
 */
export class RoomClock {
  offset = 0;
  private bestRtt = Infinity;
  private samples: { rtt: number; offset: number; when: number }[] = [];
  synced = false;

  now(): number {
    return localNow() + this.offset;
  }

  /** Milliseconds from now until a room-clock instant (negative if already past). */
  delayUntil(roomTime: number): number {
    return roomTime - this.now();
  }

  seed(serverTime: number) {
    if (!this.synced) this.offset = serverTime - localNow();
  }

  sample(t0: number, serverTime: number) {
    const t1 = localNow();
    const rtt = t1 - t0;
    const offset = serverTime + rtt / 2 - t1;
    this.samples.push({ rtt, offset, when: t1 });
    // Forget samples older than 2 minutes so drift gets corrected.
    this.samples = this.samples.filter((s) => t1 - s.when < 120_000).slice(-20);
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.bestRtt = best.rtt;
    this.offset = best.offset;
    this.synced = true;
  }

  get rtt() {
    return this.bestRtt;
  }
}
