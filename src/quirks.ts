/**
 * OrcaRouter upstream quirk classification.
 *
 * OrcaRouter forwards requests to many upstream providers, and a handful of them reject
 * or constrain parameters that the generic OpenAI-compatible request shape would send.
 * These helpers classify a model id so the request-body transform can pre-apply the
 * right override and avoid HTTP 400s. Confirmed against the live OrcaRouter API.
 *
 * See the OrcaRouter docs for the canonical per-vendor reasoning/parameter reference.
 */

/**
 * Models whose upstream rejects a `temperature` field (HTTP 400).
 *
 * Includes every `orcarouter/` virtual router (e.g. `orcarouter/auto`): the router picks
 * an upstream per request and may land on a reasoning model that rejects temperature, so
 * we omit it for the whole namespace.
 *
 * Only the reasoning-locked Opus flagships (4.7, 4.8) are listed; earlier Opus 4.x accept
 * temperature normally, so a blanket `claude-opus-4.` prefix would silently drop a working
 * parameter. The OrcaRouter gateway currently absorbs these parameters before they reach
 * the upstream, but that is undocumented channel behavior, so the client-side strip stays
 * as defense in depth.
 */
export function rejectsTemperature(modelId: string): boolean {
	return (
		modelId.startsWith("orcarouter/") ||
		modelId.startsWith("anthropic/claude-opus-4.7") ||
		modelId.startsWith("anthropic/claude-opus-4.8") ||
		modelId.startsWith("openai/gpt-5") ||
		isDeepSeekReasoner(modelId)
	);
}

/** Kimi K2.6 requires `temperature` to be exactly 1 and `top_p` to be exactly 0.95. */
export function requiresFixedSampling(modelId: string): boolean {
	return modelId.startsWith("kimi/kimi-k2.6");
}

/** Anthropic Claude models that accept a native `thinking` block for extended reasoning. */
export function isAnthropicThinkingModel(modelId: string): boolean {
	return (
		modelId.startsWith("anthropic/claude-opus-4") ||
		modelId.startsWith("anthropic/claude-sonnet-4") ||
		modelId.startsWith("anthropic/claude-haiku-4") ||
		modelId.startsWith("anthropic/claude-3.7-sonnet") ||
		modelId.startsWith("anthropic/claude-3-7-sonnet")
	);
}

/**
 * DeepSeek r1 / reasoner models. They reason automatically and reject both reasoning
 * control fields and non-default `temperature`.
 */
export function isDeepSeekReasoner(modelId: string): boolean {
	return modelId === "deepseek/deepseek-reasoner" || modelId.startsWith("deepseek/deepseek-r1");
}
