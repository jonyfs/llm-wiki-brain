/* Small pure helpers the view uses. */

export interface DeferredRefreshOptions {
	isBusy: () => boolean;
	run: () => void;
	now: () => number;
	schedule: (fn: () => void, ms: number) => unknown;
	cancel: (handle: unknown) => void;
	maxWaitMs?: number;
	pollMs?: number;
}

/**
 * Many vault events arrive while an animation is playing. Rebuilding the graph would erase it, so the rebuild
 * waits until the animation is idle, but never longer than `maxWaitMs` (the graph must not go stale).
 * Requests made while waiting are coalesced into one run.
 */
export function createDeferredRefresh(o: DeferredRefreshOptions): { request(): void; cancel(): void; pending(): boolean } {
	const maxWait = o.maxWaitMs ?? 5000, poll = o.pollMs ?? 250;
	let handle: unknown = null;
	let since = 0;
	let waiting = false;
	const attempt = () => {
		handle = null;
		if (!o.isBusy() || o.now() - since >= maxWait) {
			waiting = false;
			o.run();
			return;
		}
		handle = o.schedule(attempt, poll);
	};
	return {
		request() {
			if (waiting) return;
			waiting = true;
			since = o.now();
			attempt();
		},
		cancel() {
			if (handle !== null) o.cancel(handle);
			handle = null;
			waiting = false;
		},
		pending: () => waiting,
	};
}

/** Calls `report(message)` the first time only. */
export function once(report: (message: string) => void): (message: string) => void {
	let done = false;
	return (message) => {
		if (done) return;
		done = true;
		report(message);
	};
}
