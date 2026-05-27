import { describe, expect, it } from "vitest";
import { transformOrcaRouterRequestBody } from "./transform";

const base = (modelId: string, extra: Record<string, unknown> = {}) => ({
	model: modelId,
	messages: [{ role: "user", content: "hi" }],
	temperature: 0,
	...extra,
});

describe("transformOrcaRouterRequestBody", () => {
	describe("temperature quirks (§16)", () => {
		it("omits temperature for orcarouter/* virtual routers", () => {
			const out = transformOrcaRouterRequestBody(base("orcarouter/auto"));
			expect(out).not.toHaveProperty("temperature");
		});

		it("omits temperature for orcarouter/agent-cheap", () => {
			const out = transformOrcaRouterRequestBody(base("orcarouter/agent-cheap"));
			expect(out).not.toHaveProperty("temperature");
		});

		it("omits temperature + top_k for Claude Opus 4.7", () => {
			const out = transformOrcaRouterRequestBody(base("anthropic/claude-opus-4.7", { top_k: 40 }));
			expect(out).not.toHaveProperty("temperature");
			expect(out).not.toHaveProperty("top_k");
		});

		it("omits temperature for the gpt-5 family", () => {
			expect(transformOrcaRouterRequestBody(base("openai/gpt-5"))).not.toHaveProperty("temperature");
			expect(transformOrcaRouterRequestBody(base("openai/gpt-5-mini"))).not.toHaveProperty("temperature");
		});

		it("pins Kimi K2.6 to temperature=1 / top_p=0.95", () => {
			const out = transformOrcaRouterRequestBody(base("kimi/kimi-k2.6", { top_p: 0.5 }));
			expect(out.temperature).toBe(1);
			expect(out.top_p).toBe(0.95);
		});

		it("keeps default temperature for a non-quirk model", () => {
			const out = transformOrcaRouterRequestBody(base("openai/gpt-4o"));
			expect(out.temperature).toBe(0);
		});
	});

	describe("reasoning protocol reshaping (§15)", () => {
		it("converts reasoning_effort to a thinking block for Anthropic thinking models", () => {
			const out = transformOrcaRouterRequestBody(base("anthropic/claude-opus-4.7", { reasoning_effort: "high" }));
			expect(out.thinking).toEqual({ type: "enabled", budget_tokens: 16384 });
			expect(out).not.toHaveProperty("reasoning_effort");
		});

		it("ensures max_tokens exceeds the thinking budget", () => {
			const out = transformOrcaRouterRequestBody(
				base("anthropic/claude-sonnet-4.6", { reasoning_effort: "medium", max_tokens: 1000 }),
			);
			expect(out.max_tokens).toBe(8192 + 4096);
		});

		it("keeps a sufficiently large max_tokens as-is", () => {
			const out = transformOrcaRouterRequestBody(
				base("anthropic/claude-sonnet-4.6", { reasoning_effort: "low", max_tokens: 50000 }),
			);
			expect(out.max_tokens).toBe(50000);
		});

		it("drops temperature/top_p when a thinking block is set", () => {
			const out = transformOrcaRouterRequestBody(
				base("anthropic/claude-opus-4", { reasoning_effort: "medium", top_p: 0.9 }),
			);
			expect(out).not.toHaveProperty("temperature");
			expect(out).not.toHaveProperty("top_p");
			expect(out.thinking).toBeDefined();
		});

		it("strips reasoning_effort for DeepSeek reasoner", () => {
			const out = transformOrcaRouterRequestBody(base("deepseek/deepseek-reasoner", { reasoning_effort: "high" }));
			expect(out).not.toHaveProperty("reasoning_effort");
			expect(out).not.toHaveProperty("temperature");
		});

		it("passes reasoning_effort through for OpenAI gpt-5", () => {
			const out = transformOrcaRouterRequestBody(base("openai/gpt-5", { reasoning_effort: "high" }));
			expect(out.reasoning_effort).toBe("high");
			expect(out).not.toHaveProperty("thinking");
		});

		it("passes reasoning_effort through for Gemini", () => {
			const out = transformOrcaRouterRequestBody(base("google/gemini-3-flash-preview", { reasoning_effort: "medium" }));
			expect(out.reasoning_effort).toBe("medium");
		});
	});

	it("does not mutate the input body", () => {
		const input = base("anthropic/claude-opus-4.7", { reasoning_effort: "high" });
		const snapshot = JSON.stringify(input);
		transformOrcaRouterRequestBody(input);
		expect(JSON.stringify(input)).toBe(snapshot);
	});
});
