// Extend the generated Env interface with secrets set via `wrangler secret put`
interface Env {
	ANTHROPIC_API_KEY: string;
}
