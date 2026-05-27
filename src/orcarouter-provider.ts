import { createOpenAICompatible, type OpenAICompatibleProvider } from "@ai-sdk/openai-compatible";
import { transformOrcaRouterRequestBody } from "./transform";

const DEFAULT_BASE_URL = "https://api.orcarouter.ai/v1";

export interface OrcaRouterProviderSettings {
	/**
	 * OrcaRouter API key. Falls back to the `ORCAROUTER_API_KEY` environment variable.
	 * Get one at https://www.orcarouter.ai/console/keys.
	 */
	apiKey?: string;
	/** Base URL for the OrcaRouter API. Defaults to `https://api.orcarouter.ai/v1`. */
	baseURL?: string;
	/** Extra headers to send with every request. */
	headers?: Record<string, string>;
	/**
	 * Optional attribution shown in the OrcaRouter console for traffic from your app.
	 * Sets the `HTTP-Referer` / `X-Title` headers (OpenAI-compatible meta-router convention).
	 */
	appUrl?: string;
	appName?: string;
	/** Custom fetch implementation (e.g. for proxies or tests). */
	fetch?: typeof globalThis.fetch;
}

export type OrcaRouterProvider = OpenAICompatibleProvider;

/**
 * Creates an OrcaRouter provider for the Vercel AI SDK.
 *
 * OrcaRouter is an OpenAI-compatible meta-router: one API key reaches 150+ models across
 * OpenAI, Anthropic, Google, xAI, DeepSeek, Qwen, Kimi, MiniMax, Z-AI and others, plus the
 * `orcarouter/auto` adaptive router that picks an upstream per request. This provider wraps
 * `@ai-sdk/openai-compatible` and reshapes outgoing requests so per-vendor reasoning
 * protocols and upstream parameter quirks are handled automatically.
 *
 * @example
 * ```ts
 * import { createOrcaRouter } from "orcarouter-ai-sdk-provider"
 * import { generateText } from "ai"
 *
 * const orcarouter = createOrcaRouter({ apiKey: process.env.ORCAROUTER_API_KEY })
 * const { text } = await generateText({
 *   model: orcarouter("orcarouter/auto"),
 *   prompt: "Hello",
 * })
 * ```
 */
export function createOrcaRouter(settings: OrcaRouterProviderSettings = {}): OrcaRouterProvider {
	const headers: Record<string, string> = { ...settings.headers };
	if (settings.appUrl) {
		headers["HTTP-Referer"] = settings.appUrl;
	}
	if (settings.appName) {
		headers["X-Title"] = settings.appName;
	}

	return createOpenAICompatible({
		name: "orcarouter",
		baseURL: settings.baseURL ?? DEFAULT_BASE_URL,
		apiKey: settings.apiKey ?? process.env.ORCAROUTER_API_KEY,
		headers,
		fetch: settings.fetch,
		transformRequestBody: transformOrcaRouterRequestBody,
	});
}

/**
 * Default OrcaRouter provider instance. Reads the API key from `ORCAROUTER_API_KEY`.
 *
 * @example
 * ```ts
 * import { orcarouter } from "orcarouter-ai-sdk-provider"
 * const model = orcarouter("anthropic/claude-opus-4.7")
 * ```
 */
export const orcarouter: OrcaRouterProvider = createOrcaRouter();
