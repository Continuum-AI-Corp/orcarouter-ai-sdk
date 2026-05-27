# OrcaRouter provider for the Vercel AI SDK

[OrcaRouter](https://www.orcarouter.ai) is an OpenAI-compatible meta-router: one API key reaches 150+ models across OpenAI, Anthropic, Google, xAI, DeepSeek, Qwen, Kimi, MiniMax, Z-AI and others. It also exposes `orcarouter/auto`, an adaptive router that picks an upstream per request based on your configured strategy (`cheapest`, `balanced`, `quality`, `adaptive`, `gated_adaptive`).

This package is the OrcaRouter provider for the [Vercel AI SDK](https://ai-sdk.dev). It wraps `@ai-sdk/openai-compatible` and reshapes outgoing requests so per-vendor reasoning protocols and upstream parameter quirks are handled for you.

## Installation

```bash
npm install orcarouter-ai-sdk-provider
```

## Usage

```ts
import { createOrcaRouter } from "orcarouter-ai-sdk-provider"
import { generateText } from "ai"

const orcarouter = createOrcaRouter({
	apiKey: process.env.ORCAROUTER_API_KEY, // get one at https://www.orcarouter.ai/console/keys
})

const { text } = await generateText({
	model: orcarouter("orcarouter/auto"),
	prompt: "Explain adaptive routing in one sentence.",
})
```

Or use the default instance, which reads `ORCAROUTER_API_KEY` from the environment:

```ts
import { orcarouter } from "orcarouter-ai-sdk-provider"

const model = orcarouter("anthropic/claude-opus-4.7")
```

## Configuration

`createOrcaRouter(settings)` accepts:

| Option | Description |
| --- | --- |
| `apiKey` | OrcaRouter API key. Defaults to `process.env.ORCAROUTER_API_KEY`. |
| `baseURL` | API base URL. Defaults to `https://api.orcarouter.ai/v1`. |
| `headers` | Extra headers sent with every request. |
| `appUrl` / `appName` | Optional attribution shown in the OrcaRouter console (sets `HTTP-Referer` / `X-Title`). |
| `fetch` | Custom fetch implementation (e.g. for proxies or tests). |

## Models

Pick any model by its OrcaRouter id, for example:

- `orcarouter/auto` — adaptive routing (recommended default)
- `anthropic/claude-opus-4.7`, `anthropic/claude-sonnet-4.6`
- `openai/gpt-5`, `openai/gpt-5-mini`
- `google/gemini-3-flash-preview`
- `deepseek/deepseek-reasoner`
- `kimi/kimi-k2.6`, `z-ai/glm-4.5`, `qwen/qwen3.6-flash`

The full catalog and live pricing are at [orcarouter.ai/models](https://www.orcarouter.ai/models).

## Reasoning

Pass a reasoning effort via the AI SDK and this provider forwards it in each upstream's native shape:

- **Anthropic Claude** thinking models receive a top-level `thinking` block (the effort is mapped to a token budget).
- **OpenAI / Gemini / Grok / Qwen / Kimi** receive a flat `reasoning_effort`.
- **DeepSeek r1 / reasoner** reason automatically; reasoning control fields are stripped.

Upstream parameter quirks are also handled automatically — for example `temperature` is omitted for `orcarouter/*` routers, Claude Opus 4.7, and the gpt-5 family (which reject it), and Kimi K2.6 is pinned to its only accepted `temperature` / `top_p`.

## Notes on `orcarouter/auto`

The adaptive router's candidate pool may include upstreams that don't support function/tool calling. If a tool-calling request fails with a "function calling not enabled" error, pin a tool-capable model (e.g. `anthropic/claude-opus-4.7`) or adjust the pool in the [routing console](https://www.orcarouter.ai/console/routing).

## License

Apache-2.0
