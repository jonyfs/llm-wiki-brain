/* Obsidian Canvas (.canvas, JSON Canvas) from a set of notes laid out as the brain shows them. Pure. */

export interface CanvasNode {
	id: string;
	type: "file";
	file: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CanvasEdge {
	id: string;
	fromNode: string;
	toNode: string;
	toEnd: "arrow";
}

/** Notes become cards at their (x, y) scaled to canvas units; links between the chosen notes become arrows. */
export function toCanvas(items: { path: string; x: number; y: number }[], links: [string, string][], scale = 2.2): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
	const id = new Map<string, string>();
	const nodes: CanvasNode[] = items.map((it, i) => {
		const nid = "n" + i;
		id.set(it.path, nid);
		return { id: nid, type: "file", file: it.path, x: Math.round(it.x * scale), y: Math.round(it.y * scale), width: 240, height: 120 };
	});
	const edges: CanvasEdge[] = [];
	for (const [a, b] of links) {
		const from = id.get(a), to = id.get(b);
		if (from && to) edges.push({ id: "e" + edges.length, fromNode: from, toNode: to, toEnd: "arrow" });
	}
	return { nodes, edges };
}
