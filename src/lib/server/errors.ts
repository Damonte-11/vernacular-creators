/** Why a lookup failed, in words the team can act on. */
export type LookupErrorCode =
  | "not_found" // no such account / channel
  | "not_professional" // Instagram personal or private account, or doesn't exist
  | "hidden_subscribers" // YouTube channel hides its subscriber count
  | "rate_limited" // the platform asked us to slow down
  | "quota" // YouTube daily allowance used up
  | "auth" // our access token is wrong or expired
  | "config" // API keys not set up yet
  | "upstream"; // the platform had a problem

export class LookupError extends Error {
  constructor(
    public code: LookupErrorCode,
    message: string,
    /** For rate limits: how long to wait before trying again. */
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "LookupError";
  }
}

/** Retry a call when the platform says "slow down", waiting longer each time. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 2_000): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const retriable = e instanceof LookupError && (e.code === "rate_limited" || e.code === "upstream");
      if (!retriable || i >= attempts - 1) throw e;
      const wait = Math.min(((e as LookupError).retryAfterSeconds ?? 0) * 1000 || baseDelayMs * 2 ** i, 30_000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
