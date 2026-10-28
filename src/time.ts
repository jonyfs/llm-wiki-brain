/* Relative dates ("3 days ago") as a key plus numbers, so the view can translate them. Pure. */

export type AgoKey = "time.now" | "time.minutes" | "time.hours" | "time.days" | "time.months" | "time.years";

export function ago(then: number, now: number): { key: AgoKey; n: number } {
	const s = Math.max(0, (now - then) / 1000);
	if (s < 60) return { key: "time.now", n: 0 };
	if (s < 3600) return { key: "time.minutes", n: Math.floor(s / 60) };
	if (s < 86400) return { key: "time.hours", n: Math.floor(s / 3600) };
	if (s < 86400 * 60) return { key: "time.days", n: Math.floor(s / 86400) };
	if (s < 86400 * 365) return { key: "time.months", n: Math.floor(s / (86400 * 30)) };
	return { key: "time.years", n: Math.floor(s / (86400 * 365)) };
}
