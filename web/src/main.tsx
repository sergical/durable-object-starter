import "./lib/sentry"; // init Sentry before anything else imports React
import React from "react";
import ReactDOM from "react-dom/client";
import { Sentry } from "./lib/sentry";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Sentry.ErrorBoundary
			fallback={
				<div className="flex h-dvh items-center justify-center p-6 text-sm text-muted-foreground">
					Something went wrong. Check the console — the error has been reported.
				</div>
			}
		>
			<App />
		</Sentry.ErrorBoundary>
	</React.StrictMode>,
);
