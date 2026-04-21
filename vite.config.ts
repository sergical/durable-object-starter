import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
	plugins: [react(), tailwindcss()],
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
	},
	server: {
		port: 5173,
		proxy: {
			"/api": "http://localhost:8787",
		},
	},
});
