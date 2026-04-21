// Extend the generated Env interface with secrets set via `wrangler secret put`
// or via `.dev.vars` in local dev.
interface Env {
	ANTHROPIC_API_KEY: string;
	SENTRY_DSN?: string;
}
