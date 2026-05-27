import { isAnthropicThinkingModel, isDeepSeekReasoner, rejectsTemperature, requiresFixedSampling } from "./quirks";

/** Maps an OpenAI-style reasoning effort to an Anthropic `thinking` budget (tokens). */
const EFFORT_TO_BUDGET: Record<string, number> = {
	minimal: 1024,
	low: 4096,
	medium: 8192,
	high: 16384,
};

const MIN_ANTHROPIC_BUDGET = 1024;
const DEFAULT_ANTHROPIC_BUDGET = 8192;

/**
 * Transforms the OpenAI-compatible request body OrcaRouter receives so that per-vendor
 * reasoning protocols and upstream parameter quirks are honored. Pure function — returns a
 * new object and never mutates the input.
 *
 * Reasoning protocols (the request leaves the SDK with a flat `reasoning_effort`; we reshape
 * it per upstream):
 *   - Anthropic Claude thinking models → top-level `thinking: { type: "enabled", budget_tokens }`
 *     (budget derived from the effort, clamped to >= 1024 and kept strictly below max_tokens).
 *   - DeepSeek r1 / reasoner → reasoning is automatic; strip any reasoning control field.
 *   - OpenAI / Gemini / Grok / Qwen / Kimi → flat `reasoning_effort` passes through unchanged.
 *
 * Parameter quirks:
 *   - `orcarouter/*` virtual routers, Claude Opus 4.7, the gpt-5 family, and DeepSeek r1 reject
 *     `temperature` (and `top_k`) — omit them.
 *   - Kimi K2.6 only accepts `temperature: 1` / `top_p: 0.95` — pin them.
 */
export function transformOrcaRouterRequestBody(body: Record<string, unknown>): Record<string, unknown> {
	const next: Record<string, unknown> = { ...body };
	const modelId = typeof next.model === "string" ? next.model : "";

	// --- Reasoning protocol reshaping ---
	const effort = typeof next.reasoning_effort === "string" ? next.reasoning_effort : undefined;

	if (isDeepSeekReasoner(modelId)) {
		// Reasons automatically; rejects any reasoning control field.
		delete next.reasoning_effort;
	} else if (isAnthropicThinkingModel(modelId) && effort && effort !== "none") {
		// Convert the flat effort to Anthropic's native thinking block.
		const budget = Math.max(MIN_ANTHROPIC_BUDGET, EFFORT_TO_BUDGET[effort] ?? DEFAULT_ANTHROPIC_BUDGET);
		next.thinking = { type: "enabled", budget_tokens: budget };
		delete next.reasoning_effort;

		// Anthropic requires max_tokens strictly greater than budget_tokens.
		const maxTokens = typeof next.max_tokens === "number" ? next.max_tokens : undefined;
		if (maxTokens === undefined || maxTokens <= budget) {
			next.max_tokens = budget + 4096;
		}
	}
	// else: leave `reasoning_effort` untouched for OpenAI/Gemini/Grok/Qwen/Kimi.

	// --- Parameter quirks ---
	if (requiresFixedSampling(modelId)) {
		next.temperature = 1;
		next.top_p = 0.95;
	} else if (rejectsTemperature(modelId)) {
		delete next.temperature;
		delete next.top_k;
	}

	// Anthropic thinking mode does not allow non-default temperature/top_p.
	if (next.thinking) {
		delete next.temperature;
		delete next.top_p;
		delete next.top_k;
	}

	return next;
}
