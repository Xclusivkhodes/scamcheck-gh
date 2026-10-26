import { CheckError } from "@/lib/errors";
import { codeForStatus, jsonError, readJson, requestIdFrom } from "@/lib/http";
import { allowIp, clientIp, leavePipeline, tryEnterPipeline } from "@/lib/limits";
import { hashIp, logRequest } from "@/lib/observe";
import { runCheck } from "@/lib/pipeline";
import { CHECK_DEADLINE_MS, runWithContext } from "@/lib/request-context";
import { checkBodySchema } from "@/lib/schemas";
import type { CheckResult, TraceStep } from "@/lib/types";

const CHECK_BYTES = 2_600_000;

export async function POST(request: Request) {
  const started = Date.now();
  const requestId = requestIdFrom(request);
  const ip = clientIp(request.headers);
  let status = 500;
  let mode = "demo";
  let entered = false;
  let releaseInFinally = true;

  const finish = (response: Response, nextMode = mode) => {
    status = response.status;
    mode = nextMode;
    response.headers.set("x-request-id", requestId);
    return response;
  };

  try {
    const gate = allowIp(ip);
    if (!gate.ok) return finish(jsonError(429, gate.error, "RATE_LIMITED", requestId));
    if (!tryEnterPipeline()) {
      return finish(jsonError(429, "Too many checks are running. Try again in a moment.", "RATE_LIMITED", requestId));
    }
    entered = true;

    const raw = await readJson(request, CHECK_BYTES);
    const parsed = checkBodySchema.safeParse(raw);
    if (!parsed.success) {
      const tooBig = parsed.error.issues.some((issue) => issue.code === "too_big");
      return finish(jsonError(
        tooBig ? 413 : 400,
        tooBig ? "That message is too long. Paste 2000 characters or fewer." : "Send the message as JSON.",
        "BAD_INPUT",
        requestId,
      ));
    }
    const body = parsed.data;
    const wantsStream = (request.headers.get("accept") || "").includes("text/event-stream") || body.stream === true;
    const signal = AbortSignal.timeout(CHECK_DEADLINE_MS);

    if (!wantsStream) {
      const result = await runWithContext(
        { signal, ip, requestId, startedAt: Date.now(), deadlineMs: CHECK_DEADLINE_MS },
        () => runCheck(body),
      );
      mode = result.mode;
      return finish(Response.json(publicResult(result)), result.mode);
    }

    releaseInFinally = false;
    const encoder = new TextEncoder();
    let streamed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };
        try {
          const result = await runWithContext(
            {
              signal,
              ip,
              requestId,
              startedAt: Date.now(),
              deadlineMs: CHECK_DEADLINE_MS,
              onStep: (step: TraceStep) => {
                streamed = true;
                send({ type: "step.done", id: step.id, ms: step.ms ?? step.durationMs, step });
              },
            },
            () => runCheck(body),
          );
          if (!streamed) {
            for (const step of result.trace) send({ type: "step.done", id: step.id, ms: step.ms ?? step.durationMs, step });
          }
          mode = result.mode;
          status = 200;
          send({ type: "result", result: publicResult(result) });
        } catch (error) {
          const payload = errorBody(error, requestId);
          status = payload.status;
          send({ type: "error", message: payload.error, code: payload.code, reason: payload.reason, status: payload.status });
        } finally {
          if (entered) leavePipeline();
          entered = false;
          controller.close();
          logRequest({
            ts: new Date().toISOString(),
            level: status >= 500 ? "error" : "info",
            requestId,
            route: "/api/check",
            status,
            ms: Date.now() - started,
            mode,
            ipHash: hashIp(ip),
          });
        }
      },
    });
    return finish(new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "x-request-id": requestId,
      },
    }));
  } catch (error) {
    return finish(errorResponse(error, requestId));
  } finally {
    if (entered && releaseInFinally) leavePipeline();
    if (releaseInFinally) logRequest({
      ts: new Date().toISOString(),
      level: status >= 500 ? "error" : "info",
      requestId,
      route: "/api/check",
      status,
      ms: Date.now() - started,
      mode,
      ipHash: hashIp(ip),
    });
  }
}

function publicResult(result: CheckResult): CheckResult {
  return { ...result, inputText: "" };
}

function errorBody(error: unknown, requestId: string): { status: number; error: string; code: string; reason?: string } {
  if (error instanceof CheckError) {
    const code = error.code === "blurry_photo" ? "BAD_INPUT" : codeForStatus(error.status, error.code);
    return {
      status: error.status,
      error: error.message,
      code,
      reason: error.code === "blurry_photo" ? "blurry_photo" : undefined,
    };
  }
  console.error("check failed", requestId);
  return { status: 500, error: "We could not finish this check. Try again.", code: "INTERNAL" };
}

function errorResponse(error: unknown, requestId: string): Response {
  const body = errorBody(error, requestId);
  return jsonError(body.status, body.error, codeForStatus(body.status, body.code), requestId, body.reason ? { reason: body.reason } : undefined);
}
