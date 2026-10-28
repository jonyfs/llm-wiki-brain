/* The neuron analogy as arithmetic. Pure, testable in Node.

   A link is a synapse: it leaves the axon of the page that holds the link and lands on a dendrite of the page it points to.
   A page is a soma that adds up what its dendrites receive (weight per link), leaks a little over time, and fires
   all-or-nothing once the sum reaches its threshold. Busy pages (many inputs) need more input to fire, as in a neuron
   with a high threshold. Links used together grow stronger (Hebb) and fade back when idle. */

export interface Synapse {
	from: number;
	to: number;
	w: number; // current strength; negative inhibits (not produced by the vault yet, but the maths supports it)
	base: number; // resting strength, where w drifts back to
}

export interface NetOptions {
	threshold?: number; // input needed by a page with one input
	spread?: number; // how much the threshold grows with sqrt(inputs)
	leak?: number; // fraction of the charge kept per tick
	wMax?: number;
	hebb?: number;
}

export const DEFAULTS: Required<NetOptions> = { threshold: 1, spread: 0.35, leak: 0.75, wMax: 2.2, hebb: 0.12 };

/** Strength of a link mentioned `count` times: one mention is 1, repeated mentions up to 1.6. */
export function weightOf(count: number): number {
	return Math.min(1.6, 0.8 + 0.2 * Math.max(1, count));
}

export class Net {
	readonly out: Synapse[][];
	readonly inn: Synapse[][];
	readonly v: Float64Array;
	readonly theta: Float64Array;
	readonly rest: Uint8Array; // ticks left in the refractory period
	readonly o: Required<NetOptions>;

	constructor(readonly n: number, syn: Synapse[], o: NetOptions = {}) {
		this.o = { ...DEFAULTS, ...o };
		this.out = Array.from({ length: n }, () => []);
		this.inn = Array.from({ length: n }, () => []);
		for (const s of syn) {
			if (s.from === s.to || s.from < 0 || s.to < 0 || s.from >= n || s.to >= n) continue;
			this.out[s.from].push(s);
			this.inn[s.to].push(s);
		}
		this.v = new Float64Array(n);
		this.rest = new Uint8Array(n);
		this.theta = new Float64Array(n);
		for (let i = 0; i < n; i++) this.theta[i] = this.o.threshold + this.o.spread * (Math.sqrt(Math.max(1, this.inn[i].length)) - 1);
	}

	/** Charge delivered to `i`. True when it reaches the threshold and fires. A resting cell ignores input. */
	receive(i: number, amount: number): boolean {
		if (this.rest[i]) return false;
		this.v[i] = Math.max(0, this.v[i] + amount);
		return this.v[i] >= this.theta[i];
	}

	/** All or nothing: the charge resets, the cell rests, and its outgoing synapses are returned. */
	fire(i: number): Synapse[] {
		this.v[i] = 0;
		this.rest[i] = 2;
		return this.out[i];
	}

	/** One tick of time: charge leaks, rest counts down. */
	tick(): void {
		for (let i = 0; i < this.n; i++) {
			this.v[i] *= this.o.leak;
			if (this.v[i] < 0.01) this.v[i] = 0;
			if (this.rest[i]) this.rest[i]--;
		}
	}

	/** 0..1: how close the cell is to firing. */
	charge(i: number): number {
		return Math.min(1, this.v[i] / this.theta[i]);
	}

	reset(): void {
		this.v.fill(0);
		this.rest.fill(0);
	}
}

export interface Spike {
	tick: number;
	from: number;
	to: number;
	w: number;
	fires: boolean; // the target fired because of this spike
}

/**
 * What happens when `seeds` fire together: spikes run along outgoing links only, charge adds up at each target,
 * and a target fires once it crosses its threshold. A cell fires at most once. Returns the spikes in order.
 * Works on the net's own state but leaves it as it found it.
 */
export function cascade(net: Net, seeds: number[], maxTicks = 5, maxSpikes = 80): Spike[] {
	const saveV = net.v.slice(), saveR = net.rest.slice();
	net.reset();
	const done = new Set<number>();
	let live: number[] = [];
	for (const s of seeds) if (s >= 0 && s < net.n && !done.has(s)) {
		done.add(s);
		live.push(s);
		net.fire(s);
	}
	const spikes: Spike[] = [];
	for (let t = 1; t <= maxTicks && live.length && spikes.length < maxSpikes; t++) {
		// Everything that arrives in the same tick adds up before a cell decides to fire (spatial summation).
		const arrivals = new Map<number, { from: number; w: number }[]>();
		let queued = 0;
		for (const f of live) {
			for (const s of net.out[f]) {
				if (spikes.length + queued >= maxSpikes) break;
				if (done.has(s.to)) {
					spikes.push({ tick: t, from: f, to: s.to, w: s.w, fires: false });
					continue;
				}
				const list = arrivals.get(s.to) ?? [];
				list.push({ from: f, w: s.w });
				queued++;
				arrivals.set(s.to, list);
			}
		}
		const next: number[] = [];
		for (const [to, list] of arrivals) {
			net.rest[to] = 0;
			const fires = net.receive(to, list.reduce((sum, a) => sum + a.w, 0));
			list.forEach((a, k) => spikes.push({ tick: t, from: a.from, to, w: a.w, fires: fires && k === list.length - 1 }));
			if (fires) {
				done.add(to);
				next.push(to);
				net.fire(to);
			}
		}
		net.tick();
		live = next;
	}
	net.v.set(saveV);
	net.rest.set(saveR);
	return spikes;
}

/** Hebb: a synapse whose source and target both fired grows; every other synapse eases back to rest. */
export function hebb(net: Net, spikes: Spike[]): void {
	const used = new Set<Synapse>();
	for (const sp of spikes) {
		if (!sp.fires) continue;
		const s = net.out[sp.from].find((x) => x.to === sp.to);
		if (s) {
			s.w = Math.min(net.o.wMax, s.w + net.o.hebb);
			used.add(s);
		}
	}
	for (let i = 0; i < net.n; i++) for (const s of net.out[i]) if (!used.has(s)) s.w += (s.base - s.w) * 0.1;
}

/** Synapses from directed links `[from, to, count]`; a link both ways gives two synapses. */
export function synapsesOf(links: [number, number, number?][]): Synapse[] {
	const seen = new Map<string, Synapse>();
	for (const [a, b, c] of links) {
		if (a === b) continue;
		const k = a + ">" + b, w = weightOf(c ?? 1), prev = seen.get(k);
		if (prev) {
			prev.base = prev.w = Math.max(prev.w, w);
		} else seen.set(k, { from: a, to: b, w, base: w });
	}
	return Array.from(seen.values());
}
