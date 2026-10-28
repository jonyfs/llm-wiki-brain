/* Attention: every page can attend to every other, linked or not, with weights that exist only for the moment
   (Transformers), where a neuron only reaches what its axon touches. Here: similarity of vocabulary, then softmax. Pure. */

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "was", "not", "wiki", "para", "com", "uma", "que", "los", "las", "des", "les", "est", "por", "del"]);

export function tokens(text: string): Set<string> {
	const out = new Set<string>();
	for (const w of text.toLowerCase().split(/[^\p{L}\p{N}#]+/u)) if (w.length >= 3 && !STOP.has(w)) out.add(w);
	return out;
}

/** Cosine similarity of two binary bags of words. */
export function similarity(a: Set<string>, b: Set<string>): number {
	if (!a.size || !b.size) return 0;
	let hit = 0;
	for (const w of a) if (b.has(w)) hit++;
	return hit / Math.sqrt(a.size * b.size);
}

export interface Attended {
	id: number;
	w: number; // softmax weight; the weights of the result sum to 1
}

/**
 * The `k` pages `focus` attends to most, skipping `exclude` (itself and what it already links to: those have synapses).
 * `tau` is the softmax temperature: lower sharpens the weights toward the best match.
 */
export function attend(focus: number, docs: { id: number; text: string }[], exclude: Set<number>, k = 6, tau = 0.2): Attended[] {
	const me = docs.find((d) => d.id === focus);
	if (!me) return [];
	const mine = tokens(me.text);
	const scored: { id: number; s: number }[] = [];
	for (const d of docs) {
		if (d.id === focus || exclude.has(d.id)) continue;
		const s = similarity(mine, tokens(d.text));
		if (s > 0) scored.push({ id: d.id, s });
	}
	scored.sort((a, b) => b.s - a.s || a.id - b.id);
	const top = scored.slice(0, k);
	if (!top.length) return [];
	const max = top[0].s, ex = top.map((t) => Math.exp((t.s - max) / tau)), sum = ex.reduce((x, y) => x + y, 0);
	return top.map((t, i) => ({ id: t.id, w: ex[i] / sum }));
}
