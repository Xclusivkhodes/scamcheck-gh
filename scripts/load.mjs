import { spawn } from "node:child_process";
import autocannon from "autocannon";

const port = Number(process.env.LOAD_PORT || 4321);
const url = `http://127.0.0.1:${port}`;
const body = JSON.stringify({
  text: "MTN MoMo: You have received GHS 50.00 from Ama. Your new balance is GHS 120.00. Txn ID 88991.",
  language: "en",
  stream: false,
});

const child = spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: {
    ...process.env,
    DEMO_MODE: "true",
    PORT: String(port),
    RATE_LIMIT_PER_MINUTE: "100000",
    RATE_LIMIT_PER_DAY: "100000",
    PIPELINE_CONCURRENCY: "32",
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});

function waitForReady() {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      if (Date.now() - started > 60_000) {
        clearInterval(timer);
        reject(new Error("server did not become ready"));
        return;
      }
      try {
        const response = await fetch(`${url}/api/healthz`);
        if (response.ok) {
          clearInterval(timer);
          resolve();
        }
      } catch {
        // still booting
      }
    }, 400);
  });
}

try {
  await waitForReady();
  const result = await autocannon({
    url: `${url}/api/check`,
    method: "POST",
    connections: 20,
    duration: 30,
    headers: { "content-type": "application/json" },
    body,
  });
  const summary = {
    connections: 20,
    duration: 30,
    p50: result.latency.p50,
    p99: result.latency.p99,
    average: result.latency.average,
    non2xx: result.non2xx,
    errors: result.errors,
    requests: result.requests.total,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (summary.p50 > 150 || summary.p99 > 800) {
    console.error("demo check missed the latency target (p50 ≤ 150 ms, p99 ≤ 800 ms)");
    process.exitCode = 1;
  }
  if (summary.non2xx > summary.requests * 0.01) {
    console.error("too many non-2xx responses; raise RATE_LIMIT only for this run, production stays at 5/min");
    process.exitCode = 1;
  }
} finally {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  setTimeout(() => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      // already gone
    }
    process.exit(process.exitCode ?? 0);
  }, 1500).unref();
}
