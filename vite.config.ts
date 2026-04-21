import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "node:path";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		// Uploads sourcemaps to Sentry during `vite build` when the auth token
		// is present. Silently no-ops in dev / when creds are missing.
		...(sentryAuthToken && sentryOrg && sentryProject
			? [
					sentryVitePlugin({
						org: sentryOrg,
						project: sentryProject,
						authToken: sentryAuthToken,
						sourcemaps: {
							filesToDeleteAfterUpload: ["./dist/client/**/*.map"],
						},
					}),
				]
			: []),
	],
	root: "web",
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "web/src"),
			"@shared": path.resolve(__dirname, "src/shared"),
		},
	},
	build: {
		outDir: "../dist/client",
		emptyOutDir: true,
		// Required for Sentry to symbolicate browser stack traces.
		sourcemap: true,
	},
	server: {
		port: 5173,
		proxy: {
			"/api": "http://localhost:8787",
		},
	},
});
