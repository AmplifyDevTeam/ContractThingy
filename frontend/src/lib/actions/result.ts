import { unstable_rethrow } from "next/navigation";

/**
 * Server actions must not throw for expected failures: in production React replaces the
 * message with "Minified React error #441". Actions return this shape instead, and the
 * client wrappers in ./client.ts turn it back into a normal Error with the real message.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function toResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error); // keep redirect()/notFound() working
    return { ok: false, error: error instanceof Error && error.message ? error.message : "Request failed" };
  }
}
