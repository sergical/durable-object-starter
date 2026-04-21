import { tool } from "ai";
import { z } from "zod";

const WEATHER_CONDITIONS = [
	"sunny ☀️",
	"cloudy ☁️",
	"rainy 🌧️",
	"partly cloudy ⛅",
	"windy 🌬️",
	"snowy ❄️",
	"thunderstorm ⛈️",
];

export const chatTools = {
	get_weather: tool({
		description: "Get the current weather conditions and temperature for any city.",
		inputSchema: z.object({
			city: z.string().describe("The name of the city to get weather for"),
		}),
		execute: async ({ city }: { city: string }) => {
			const temp = Math.floor(Math.random() * 35) + 2;
			const condition =
				WEATHER_CONDITIONS[Math.floor(Math.random() * WEATHER_CONDITIONS.length)];
			const humidity = Math.floor(Math.random() * 60) + 30;
			return { city, temperature: `${temp}°C`, condition, humidity: `${humidity}%` };
		},
	}),

	get_current_time: tool({
		description: "Get the current UTC date and time.",
		inputSchema: z.object({}),
		execute: async () => {
			const now = new Date();
			return {
				utc: now.toUTCString(),
				iso: now.toISOString(),
				timestamp: now.getTime(),
			};
		},
	}),

	flip_coin: tool({
		description: "Flip a fair coin one or more times.",
		inputSchema: z.object({
			flips: z
				.number()
				.int()
				.min(1)
				.max(10)
				.optional()
				.describe("Number of coins to flip (1–10, default 1)"),
		}),
		execute: async ({ flips = 1 }: { flips?: number }) => {
			const results = Array.from({ length: flips }, () =>
				Math.random() < 0.5 ? "heads" : "tails",
			);
			return {
				results,
				heads: results.filter((r) => r === "heads").length,
				tails: results.filter((r) => r === "tails").length,
			};
		},
	}),

	roll_dice: tool({
		description: "Roll one or more dice with a given number of sides.",
		inputSchema: z.object({
			count: z
				.number()
				.int()
				.min(1)
				.max(20)
				.optional()
				.describe("Number of dice to roll (default 1)"),
			sides: z
				.number()
				.int()
				.min(2)
				.max(100)
				.optional()
				.describe("Number of sides per die (default 6)"),
		}),
		execute: async ({ count = 1, sides = 6 }: { count?: number; sides?: number }) => {
			const rolls = Array.from(
				{ length: count },
				() => Math.floor(Math.random() * sides) + 1,
			);
			return {
				rolls,
				total: rolls.reduce((a, b) => a + b, 0),
				count,
				sides,
			};
		},
	}),
};
