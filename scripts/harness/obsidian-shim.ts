// A stand-in for the parts of the `obsidian` module that the view and the graph builder use, so the real BrainView,
// the real engine and the real styles.css can run in a browser page (see ui.ts). It is not Obsidian: it only
// provides the DOM helpers and classes the plugin calls.
export class TFile {
	path = "";
	basename = "";
	stat = { ctime: 0, mtime: 0 };
	parent: { path: string } | null = null;
}
export class WorkspaceLeaf {}
export class HoverPopover {}
export class Notice {
	constructor(public message: string) {
		(window as unknown as { notices?: string[] }).notices?.push(message);
	}
}
export class Menu {
	addItem(fn: (i: { setTitle: (t: string) => unknown; setIcon: (i: string) => unknown; onClick: (f: () => void) => unknown }) => void): this {
		const item = { setTitle: () => item, setIcon: () => item, onClick: () => item };
		fn(item);
		return this;
	}
	addSeparator(): this {
		return this;
	}
	showAtMouseEvent(): void {}
}
export class ItemView {
	contentEl: HTMLElement = document.createElement("div");
	containerEl: HTMLElement = this.contentEl;
	app: unknown;
	constructor(public leaf: unknown) {}
	getState(): Record<string, unknown> {
		return {};
	}
	async setState(): Promise<void> {}
	registerEvent(): void {}
	registerInterval(id: number): number {
		return id;
	}
}

interface DomOpts {
	cls?: string;
	text?: string;
	attr?: Record<string, string>;
	type?: string;
	value?: string;
	title?: string;
}

function apply<T extends HTMLElement>(el: T, o?: DomOpts | string): T {
	if (!o) return el;
	if (typeof o === "string") {
		el.className = o;
		return el;
	}
	if (o.cls) el.className = o.cls;
	if (o.text !== undefined) el.textContent = o.text;
	if (o.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, v);
	if (o.type !== undefined) (el as unknown as HTMLInputElement).type = o.type;
	if (o.value !== undefined) (el as unknown as HTMLInputElement).value = o.value;
	if (o.title) el.title = o.title;
	return el;
}

/** Obsidian adds these helpers to every element; the plugin uses them throughout. */
export function installDomHelpers(): void {
	const P = HTMLElement.prototype as unknown as Record<string, unknown>;
	P.createEl = function (this: HTMLElement, tag: string, o?: DomOpts) {
		const el = document.createElement(tag);
		apply(el, o);
		this.appendChild(el);
		return el;
	};
	P.createDiv = function (this: HTMLElement, o?: DomOpts) {
		return (this as unknown as { createEl: (t: string, o?: DomOpts) => HTMLElement }).createEl("div", o);
	};
	P.createSpan = function (this: HTMLElement, o?: DomOpts) {
		return (this as unknown as { createEl: (t: string, o?: DomOpts) => HTMLElement }).createEl("span", o);
	};
	P.empty = function (this: HTMLElement) {
		this.textContent = "";
	};
	P.addClass = function (this: HTMLElement, c: string) {
		this.classList.add(c);
	};
	P.removeClass = function (this: HTMLElement, c: string) {
		this.classList.remove(c);
	};
	P.hasClass = function (this: HTMLElement, c: string) {
		return this.classList.contains(c);
	};
	P.toggleClass = function (this: HTMLElement, c: string, on: boolean) {
		this.classList.toggle(c, on);
	};
	P.setText = function (this: HTMLElement, t: string) {
		this.textContent = t;
	};
	P.show = function (this: HTMLElement) {
		this.style.display = "";
		this.removeAttribute("data-hidden");
	};
	P.hide = function (this: HTMLElement) {
		this.style.display = "none";
		this.setAttribute("data-hidden", "1");
	};
	P.isShown = function (this: HTMLElement) {
		return this.style.display !== "none";
	};
}
