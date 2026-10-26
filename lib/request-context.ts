import { AsyncLocalStorage } from "node:async_hooks";
import type { TraceStep } from "./types";

export const CHECK_DEADLINE_MS = 18_000;

export interface CheckContext {
  signal?: AbortSignal;
  onStep?: (step: TraceStep) => void;
  ip?: string;
  requestId?: string;
  startedAt: number;
  deadlineMs: number;
}

const storage = new AsyncLocalStorage<CheckContext>();

export function runWithContext<T>(context: CheckContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn);
}

export function currentContext(): CheckContext | undefined {
  return storage.getStore();
}

export function remainingMs(now = Date.now()): number {
  const context = storage.getStore();
  if (!context) return CHECK_DEADLINE_MS;
  return Math.max(0, context.startedAt + context.deadlineMs - now);
}

export function noteStep(step: TraceStep): void {
  storage.getStore()?.onStep?.(step);
}
