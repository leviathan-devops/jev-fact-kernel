// tests/live-judge-guard.ts — refuse the live judge ports.
//
// The suite's judge calls go to a mock this process bound with `port: 0`, or to the canned
// JM_MOCK_DIR transport, which never opens a socket. 127.0.0.1:8090 and :18090 are the live
// Leviathan judge. A test that reaches either one is not a test of this checkout.

const FORBIDDEN_PORTS = new Set([8090, 18090]);
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export interface LiveJudgeHit {
  target: string;
}

const hits: LiveJudgeHit[] = [];
let installed = false;

export function forbiddenJudgeTarget(target: string): boolean {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return false;
  }
  if (!LOOPBACK.has(url.hostname)) return false;
  const port = url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
  return FORBIDDEN_PORTS.has(port);
}

export function liveJudgeHits(): readonly LiveJudgeHit[] {
  return hits;
}

export function clearLiveJudgeHits(): void {
  hits.length = 0;
}

function requestTarget(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/** Install once. A forbidden target is recorded and thrown before `fetch` opens a socket. */
export function installLiveJudgeGuard(): void {
  if (installed) return;
  installed = true;
  const original = globalThis.fetch.bind(globalThis);
  const guarded = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const target = requestTarget(input);
    if (forbiddenJudgeTarget(target)) {
      hits.push({ target });
      throw new Error(`JM_LIVE_JUDGE_FORBIDDEN: refused connection to ${target}`);
    }
    return original(input, init);
  };
  globalThis.fetch = guarded as typeof fetch;
}
