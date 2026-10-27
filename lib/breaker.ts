const WINDOW_MS = 30_000;
const OPEN_MS = 30_000;
const THRESHOLD = 5;

type State = "closed" | "open" | "half";

let state: State = "closed";
let openedAt = 0;
let halfInFlight = false;
const failures: number[] = [];

function refresh(now = Date.now()): void {
  if (state === "open" && now - openedAt >= OPEN_MS) {
    state = "half";
    halfInFlight = false;
  }
}

/** True when a new model call should be refused. A half-open window allows one probe. */
export function breakerOpen(): boolean {
  refresh();
  return state === "open" || (state === "half" && halfInFlight);
}

export function beginModelCall(): boolean {
  refresh();
  if (state === "open") return false;
  if (state === "half") {
    if (halfInFlight) return false;
    halfInFlight = true;
  }
  return true;
}

export function noteBreakerSuccess(): void {
  state = "closed";
  openedAt = 0;
  halfInFlight = false;
  failures.length = 0;
}

export function noteBreakerFailure(now = Date.now()): void {
  if (state === "half") {
    state = "open";
    openedAt = now;
    halfInFlight = false;
    return;
  }
  const recent = failures.filter((stamp) => now - stamp < WINDOW_MS);
  recent.push(now);
  failures.length = 0;
  failures.push(...recent);
  if (recent.length >= THRESHOLD) {
    state = "open";
    openedAt = now;
  }
}

export function breakerLabel(): "ok" | "breaker_open" {
  return breakerOpen() ? "breaker_open" : "ok";
}

export function resetBreaker(): void {
  state = "closed";
  openedAt = 0;
  halfInFlight = false;
  failures.length = 0;
}
