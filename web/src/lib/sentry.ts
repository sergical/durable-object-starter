import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
	Sentry.init({
		dsn,
		sendDefaultPii: true,
		tracesSampleRate: 1.0,
		// Trace the backend API so the client span joins the worker's server span
		tracePropagationTargets: [/^\/api\//],
		integrations: [
			Sentry.browserTracingIntegration(),
			Sentry.replayIntegration(),
		],
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		environment: import.meta.env.MODE,
	});
}

export { Sentry };
