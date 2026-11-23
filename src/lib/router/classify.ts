import {
  DEFAULT_THRESHOLD,
  NEEDS_REVIEW,
  ROUTABLE_QUEUES,
  isQueue,
  thresholdFor,
  type Queue,
} from "./queues";
import { classifyWithRules } from "./rules";

export type ClassifyInput = {
  subject: string;
  body?: string | null;
  fromEmail: string;
  accountName?: string | null;
};

export type ClassifyResult = {
  /** Where the case should actually go, after the threshold is applied. */
  queue: Queue;
  /** Where the model or rules wanted it to go, before the threshold. */
  predictedQueue: Queue;
  confidence: number;
  intent: string | null;
  reason: string;
  /** "ai" when the model answered, "rules" when we fell back. */
  mode: "ai" | "rules";
};

/**
 * Anything that can answer a routing question. MAG-9 owns the real adapter;
 * this is the shape the case router needs from it, so the two can be built in
 * parallel and wired together without either side changing.
 */
export interface RoutingModel {
  route(input: ClassifyInput, queues: readonly string[]): Promise<{
    queue: string;
    confidence: number;
    intent?: string | null;
    reason?: string | null;
  }>;
}

/** Process-wide model. Left null until MAG-9 lands; rules carry the prototype. */
let model: RoutingModel | null = null;
export function setRoutingModel(m: RoutingModel | null) {
  model = m;
}

/**
 * Route one case.
 *
 * Order is: ask the model, fall back to rules if it is absent, errors, times
 * out or answers with a queue that does not exist. Then apply the threshold.
 * The threshold is applied to the *predicted* queue's bar, so a per-queue
 * threshold (MAG-21) changes behaviour here and nowhere else.
 */
export async function classifyCase(
  input: ClassifyInput,
  opts: { threshold?: number; timeoutMs?: number } = {},
): Promise<ClassifyResult> {
  const globalThreshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const rules = classifyWithRules(input);

  let predictedQueue: Queue = rules.queue;
  let confidence = rules.confidence;
  let intent: string | null = null;
  let reason = rules.reason;
  let mode: "ai" | "rules" = "rules";

  if (model) {
    try {
      const answer = await withTimeout(
        model.route(input, ROUTABLE_QUEUES),
        opts.timeoutMs ?? 8000,
      );
      if (isQueue(answer.queue) && answer.queue !== NEEDS_REVIEW) {
        predictedQueue = answer.queue;
        confidence = clampConfidence(answer.confidence);
        intent = answer.intent ?? null;
        reason = answer.reason ?? `Model routed to ${answer.queue}.`;
        mode = "ai";
      } else {
        reason = `Model returned an unknown queue (${answer.queue}); used rules instead. ${rules.reason}`;
      }
    } catch (err) {
      reason = `Model unavailable (${(err as Error).message}); used rules instead. ${rules.reason}`;
    }
  }

  const bar = thresholdFor(predictedQueue, globalThreshold);
  const belowBar = confidence < bar;

  return {
    queue: belowBar ? NEEDS_REVIEW : predictedQueue,
    predictedQueue,
    confidence,
    intent,
    reason: belowBar
      ? `${reason} Confidence ${confidence} is below the ${bar}% threshold for ${predictedQueue}, so this went to Needs review.`
      : reason,
    mode,
  };
}

function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}
