export async function register(): Promise<void> {
  const { assertEnv } = await import("./lib/env");
  assertEnv();
}
