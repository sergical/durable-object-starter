import * as Sentry from "@sentry/cloudflare";
import { ChatSession } from "./chat-session";
import { USERS, isValidUserId } from "./shared/users";

export { ChatSession };

export default Sentry.withSentry(
	(env: Env) => ({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 1.0,
		sendDefaultPii: true,
		enabled: !!env.SENTRY_DSN,
		debug: true,
		integrations: [Sentry.vercelAIIntegration()],
	}),
	{
		async fetch(request: Request, env: Env): Promise<Response> {
			const url = new URL(request.url);

			if (request.method === "OPTIONS") {
				return new Response(null, { headers: cors() });
			}

			// API routes → forward to the user's DO via fetch()
			if (url.pathname.startsWith("/api/")) {
				const res = await handleApi(request, env, url);
				return withCors(res);
			}

			// Everything else → static assets (the built React app)
			return env.ASSETS.fetch(request);
		},
	} satisfies ExportedHandler<Env>,
);

// ---- API routing ----

async function handleApi(
	request: Request,
	env: Env,
	url: URL,
): Promise<Response> {
	// GET /api/users → hardcoded user list
	if (url.pathname === "/api/users" && request.method === "GET") {
		return json(USERS);
	}

	// All other endpoints require a valid userId
	const userId = getUserId(request, url);
	if (!userId) {
		return json({ error: "Missing or invalid userId" }, 400);
	}
	const stub = env.CHAT_SESSION.getByName(userId);

	// Rewrite `/api/...` → `/...` and forward to the DO via fetch().
	// This keeps all business logic inside the DO and lets Sentry's
	// fetch-based trace propagation flow naturally (sentry-trace header).
	const innerUrl = new URL(url);
	innerUrl.pathname = url.pathname.replace(/^\/api/, "");

	// Pass the original request as the init — this correctly handles method,
	// headers, and body (including skipping body for GET/HEAD).
	const innerRequest = new Request(innerUrl.toString(), request);

	return stub.fetch(innerRequest);
}

// ---- helpers ----

function getUserId(request: Request, url: URL): string | null {
	const id =
		url.searchParams.get("userId") ?? request.headers.get("x-user-id") ?? "";
	return isValidUserId(id) ? id : null;
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function cors(): Record<string, string> {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, x-user-id",
	};
}

// Response headers from `stub.fetch()` are immutable in the Workers runtime,
// so we clone into a new Response to attach CORS headers.
function withCors(res: Response): Response {
	const headers = new Headers(res.headers);
	for (const [k, v] of Object.entries(cors())) {
		headers.set(k, v);
	}
	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers,
	});
}
