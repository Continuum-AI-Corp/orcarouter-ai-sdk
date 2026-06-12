/**
 * OrcaRouter AI SDK provider — live e2e smoke test.
 *
 * Exercises the REAL path: createOrcaRouter() -> AI SDK generateText/streamText ->
 * live https://api.orcarouter.ai/v1 -> real response. This is the end-to-end check the
 * unit tests can't give (they only cover the request-body transform in isolation).
 *
 * Run:
 *   PowerShell:  $env:ORCAROUTER_API_KEY="sk-orca-..."; npx tsx e2e/smoke.ts
 *   Bash:        ORCAROUTER_API_KEY=sk-orca-... npx tsx e2e/smoke.ts
 *
 * Optional: --only=<substring> to run a subset.
 */
import { generateText, streamText } from "ai"
import { createOrcaRouter } from "../src/index"

const apiKey = process.env.ORCAROUTER_API_KEY
if (!apiKey) {
	console.error("❌ ORCAROUTER_API_KEY is required.")
	process.exit(1)
}

const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1]?.toLowerCase()

const orcarouter = createOrcaRouter({
	apiKey,
	appUrl: "https://www.orcarouter.ai",
	appName: "orcarouter-ai-sdk-e2e",
})

const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

type Case = {
	name: string
	run: () => Promise<{ ok: boolean; detail: string }>
}

const cases: Case[] = [
	{
		name: "generateText: orcarouter/auto",
		run: async () => {
			const { text, usage } = await generateText({
				model: orcarouter("orcarouter/auto"),
				prompt: "Reply with the single word: pong",
			})
			return { ok: text.trim().length > 0, detail: `text="${text.slice(0, 40)}" usage=${JSON.stringify(usage)}` }
		},
	},
	{
		name: "generateText: anthropic/claude-opus-4.8 + reasoningEffort high",
		run: async () => {
			const { text, reasoningText } = await generateText({
				model: orcarouter("anthropic/claude-opus-4.8"),
				prompt: "What is 17 * 23? Answer with just the number.",
				providerOptions: { orcarouter: { reasoningEffort: "high" } },
			})
			return {
				ok: text.trim().length > 0,
				detail: `text="${text.slice(0, 40)}" reasoning=${reasoningText ? `${reasoningText.length}chars` : "none"}`,
			}
		},
	},
	{
		name: "generateText: openai/gpt-5.5 + reasoningEffort low",
		run: async () => {
			const { text } = await generateText({
				model: orcarouter("openai/gpt-5.5"),
				prompt: "Reply with the single word: pong",
				providerOptions: { orcarouter: { reasoningEffort: "low" } },
			})
			return { ok: text.trim().length > 0, detail: `text="${text.slice(0, 40)}"` }
		},
	},
	{
		name: "generateText: kimi/kimi-k2.6 (temperature quirk)",
		run: async () => {
			const { text } = await generateText({
				model: orcarouter("kimi/kimi-k2.6"),
				prompt: "Reply with the single word: pong",
			})
			return { ok: text.trim().length > 0, detail: `text="${text.slice(0, 40)}"` }
		},
	},
	{
		name: "streamText: orcarouter/auto",
		run: async () => {
			const { textStream } = streamText({
				model: orcarouter("orcarouter/auto"),
				prompt: "Count from 1 to 3.",
			})
			let acc = ""
			for await (const chunk of textStream) {
				acc += chunk
			}
			return { ok: acc.trim().length > 0, detail: `streamed="${acc.slice(0, 40)}"` }
		},
	},
]

async function main() {
	console.log(`OrcaRouter AI SDK provider e2e — key ${apiKey!.slice(0, 8)}...${apiKey!.slice(-4)}\n`)
	let failures = 0
	for (const c of cases) {
		if (only && !c.name.toLowerCase().includes(only)) {
			continue
		}
		process.stdout.write(`${c.name.padEnd(58)} `)
		const start = Date.now()
		try {
			const { ok, detail } = await c.run()
			console.log(`${ok ? green("PASS") : red("FAIL")} ${dim(`(${Date.now() - start}ms)`)}`)
			console.log(dim(`    ${detail}`))
			if (!ok) {
				failures++
			}
		} catch (e: any) {
			failures++
			console.log(`${red("ERROR")} ${dim(`(${Date.now() - start}ms)`)}`)
			console.log(dim(`    ${e?.message ?? e}`))
		}
	}
	console.log(`\n${failures === 0 ? green("all passed") : red(`${failures} failing`)}`)
	process.exit(failures ? 1 : 0)
}

main()
