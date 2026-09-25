// serve-systemone.ts — THE SYSTEMONE WIRE ADAPTER.
//
// WHY THIS EXISTS (measured 2026-09-24): Beacon's memory evaluator posts the TypeSafe
// System One shape — POST <endpoint> with {state, model, questions}, expecting
// {model, answers, usage}. JM's HTTP surface (serve.ts) speaks {state, schema, questions}
// -> {answers, cached, model, cost_usd} at POST /decide and 404s any other path
// (route-before-store law, serve.ts:94). This adapter translates the two shapes so Beacon
// evaluates traces against the LOCAL decision model (JevK5-4B on the RTX 4080 via
// beellama llama-server :8008, canon-gguf readout) instead of the hosted TypeSafe API
// (which is credits-blocked: billing_error, measured in the Jev_Gates precontext §0).
//
// WIRE:  beacon --jev-endpoint http://127.0.0.1:7778/v1/systemone --jev-model jevk5-4b
//        -> :7778 (this adapter) -> :7777/decide (JM judge) -> :8008 (JevK5 GGUF, GPU)
//
// FAIL POLARITY: fail-closed. A judge error passes through with its status; nothing is
// invented. The usage block is DERIVED from JM's cost_usd at the published $0.042/M rate
// and is labeled approximate — Beacon uses it for cost display only.

const JM_DECIDE = process.env.JM_DECIDE_URL ?? "http://127.0.0.1:7777/decide";
const PRICE_PER_TOKEN = 0.042 / 1_000_000; // the published input-token rate

Bun.serve({
	port: Number(process.env.PORT ?? 7778),
	hostname: "127.0.0.1",
	async fetch(req) {
		if (req.method !== "POST") {
			return Response.json({ error: "JM_SYS_ROUTE: POST only on /v1/systemone" }, { status: 404 });
		}
		const url = new URL(req.url);
		if (!url.pathname.endsWith("/v1/systemone")) {
			return Response.json({ error: "JM_SYS_ROUTE: unknown path" }, { status: 404 });
		}
		let body: { state?: unknown; questions?: unknown; model?: unknown };
		try {
			body = (await req.json()) as typeof body;
		} catch {
			return Response.json({ error: "JM_SYS_JSON_INVALID" }, { status: 400 });
		}
		if (!body?.state || !body?.questions) {
			return Response.json({ error: "JM_SYS_ARGS: state + questions required" }, { status: 400 });
		}
		// JM's body cap (transport.ts:31) is enforced upstream; a 1 MB adapter cap here keeps
		// oversized payloads from even reaching the judge (D-036/D-051 class, same reasoning).
		const raw = JSON.stringify({ state: body.state, questions: body.questions });
		if (raw.length > 1_048_576) {
			return Response.json({ error: "JM_SYS_BODY_TOO_LARGE: 1 MiB cap" }, { status: 413 });
		}
		// ★ BUG-1 FIX (found live, P4 OP-1): a real omp session projected 24,934 tokens —
		// JevK5's context is 16,384. The doomed forward surfaced as a raw 500 overflow.
		// Bound the STATE at the adapter: ~48K chars ≈ 12K tokens leaves prompt headroom on
		// the 16,384-ctx server. Named refusal, fail-closed — never a truncated silent judge.
		if (raw.length > 48_000) {
			return Response.json(
				{ error: `JM_SYS_STATE_TOO_LARGE: state ≈${Math.round(raw.length / 4)} tokens exceeds the ~12K-token judge budget — narrow the evidence (D004: the deterministic layer narrows before the judge; use the bridge's ≤2KB rows, not whole-trace projections)` },
				{ status: 413 },
			);
		}
		let res: Response;
		try {
			res = await fetch(JM_DECIDE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: raw,
				signal: AbortSignal.timeout(Number(process.env.TIMEOUT_MS ?? 30_000)),
			});
		} catch (e) {
			return Response.json({ error: `JM_SYS_JUDGE_UNREACHABLE: ${String(e).slice(0, 120)}` }, { status: 503 });
		}
		const j = (await res.json().catch(() => null)) as
			| { answers?: unknown; model?: string; cost_usd?: number; error?: string }
			| null;
		if (!res.ok || !j?.answers) {
			// fail-closed: pass the judge's own named error through, never synthesize answers
			return Response.json(j ?? { error: "JM_SYS_JUDGE_ERROR" }, { status: res.ok ? 502 : res.status });
		}
		const inputTokens = Math.round((j.cost_usd ?? 0) / PRICE_PER_TOKEN);
		return Response.json({
			model: j.model ?? "jevk5-4b",
			answers: j.answers,
			usage: { input_tokens: inputTokens, output_tokens: 0, approximate: true },
		});
	},
});
