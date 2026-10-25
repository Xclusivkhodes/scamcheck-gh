import { CheckError } from "@/lib/errors";
import { runCheck } from "@/lib/pipeline";
import { allowRequest } from "@/lib/rate-limit";
import type { CheckRequest, CheckResult } from "@/lib/types";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(ip)) {
    return Response.json(
      { error: "Too many checks from this connection. Wait a few minutes and try again.", code: "busy" },
      { status: 429 },
    );
  }

  let body: CheckRequest;
  try {
    body = (await request.json()) as CheckRequest;
  } catch {
    return Response.json({ error: "Send the message as JSON.", code: "bad_json" }, { status: 400 });
  }

  const wantsStream = (request.headers.get("accept") || "").includes("text/event-stream") || body.stream === true;

  if (!wantsStream) {
    try {
      const result = await runCheck(body);
      return Response.json(result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        const result = await runCheck(body);
        for (const step of result.trace) {
          send({ type: "step.start", step });
          if (step.output) send({ type: "step.delta", id: step.id, text: step.output });
          send({ type: "step.done", id: step.id, ms: step.ms ?? step.durationMs, step });
        }
        send({ type: "result", result: publicResult(result) });
      } catch (error) {
        if (error instanceof CheckError) {
          send({ type: "error", message: error.message, code: error.code, status: error.status });
        } else {
          console.error("check failed");
          send({ type: "error", message: "We could not finish this check. Try again.", code: "error", status: 500 });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function errorResponse(error: unknown) {
  if (error instanceof CheckError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error("check failed");
  return Response.json({ error: "We could not finish this check. Try again.", code: "error" }, { status: 500 });
}

/** The browser already has the message. The reply does not need a second copy. */
function publicResult(result: CheckResult): CheckResult {
  return result;
}
