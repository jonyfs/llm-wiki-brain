/* A restartable inactivity timer. Pure: the scheduler is injected, so it runs in Node tests without real time. */

export interface Scheduler {
	set(fn: () => void, ms: number): unknown;
	clear(handle: unknown): void;
}

export interface IdleTimer {
	/** Starts the countdown, or restarts it from zero. */
	poke(): void;
	/** Cancels the countdown without calling back. */
	stop(): void;
}

const real: Scheduler = {
	set: (fn, ms) => setTimeout(fn, ms),
	clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Calls `onIdle` once, `ms` after the last `poke()`. It does not repeat until poked again. */
export function createIdleTimer(ms: number, onIdle: () => void, sched: Scheduler = real): IdleTimer {
	let handle: unknown = null;
	const stop = () => {
		if (handle !== null) sched.clear(handle);
		handle = null;
	};
	return {
		poke() {
			stop();
			handle = sched.set(() => {
				handle = null;
				onIdle();
			}, ms);
		},
		stop,
	};
}
