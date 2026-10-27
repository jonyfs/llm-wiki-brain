import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parseLog, ctimeCollapsed, creationTimes } from "../.test-build/logParser.mjs";

const SAMPLE = `# Log

This log is the append-only record. Each entry uses \`## [YYYY-MM-DD] operation | title\`.

## [2026-04-07] bootstrap | Initialize LLM wiki template

Created the template.

## [2026-05-02] ingest | Karpathy gist

- added sources/karpathy-gist
`;

test("parses the real entry format", () => {
	const e = parseLog(SAMPLE);
	assert.equal(e.length, 2);
	assert.deepEqual([e[0].op, e[0].title, e[0].line], ["bootstrap", "Initialize LLM wiki template", 5]);
	assert.equal(e[0].date, Date.UTC(2026, 3, 7));
});

test("absent, empty and non-log text give no entries and never throw", () => {
	assert.deepEqual(parseLog(""), []);
	assert.deepEqual(parseLog(null), []);
	assert.deepEqual(parseLog("just some notes\nno headings"), []);
});

test("malformed lines are skipped and the rest is still read", () => {
	const e = parseLog("## [2026-13-01] bad | month 13\n## [2026-02-31] bad | feb 31\n## [oops] x | y\n## [2026-06-01] ok | fine\n");
	assert.equal(e.length, 1);
	assert.equal(e[0].title, "fine");
});

test("tolerates CRLF, a missing title and extra spaces", () => {
	const e = parseLog("##  [2026-06-01]   lint  \r\n## [2026-06-02] query | what is x\r\n");
	assert.equal(e.length, 2);
	assert.equal(e[0].op, "lint");
	assert.equal(e[0].title, "");
});

test("a 10 MB log parses fast and keeps only valid entries", () => {
	const big = (SAMPLE + "garbage line\n").repeat(40000);
	const t = Date.now();
	const e = parseLog(big);
	assert.equal(e.length, 80000);
	assert.ok(Date.now() - t < 3000, "parsed in under 3 s");
});

test("the real llm-wiki log parses when it exists", { skip: !existsSync("/Users/jony/repositorios/ai/llm-wiki/wiki/log.md") }, () => {
	const e = parseLog(readFileSync("/Users/jony/repositorios/ai/llm-wiki/wiki/log.md", "utf8"));
	assert.ok(e.length >= 30);
	assert.ok(e.every((x) => Number.isFinite(x.date)));
});

const DAY = 86400000, T0 = Date.UTC(2026, 9, 1);

test("ctimeCollapsed: all on one day is collapsed, a spread is not, tiny vaults never are", () => {
	assert.equal(ctimeCollapsed(Array(10).fill(T0 + 5000)), true);
	assert.equal(ctimeCollapsed(Array.from({ length: 10 }, (_, i) => T0 + i * DAY)), false);
	assert.equal(ctimeCollapsed([T0, T0, T0]), false);
	assert.equal(ctimeCollapsed([]), false);
});

const pages = (n, ctime) => Array.from({ length: n }, (_, i) => ({ path: `wiki/p${i}.md`, label: `page-${i}`, ctime }));

test("creationTimes keeps file dates when they are fine", () => {
	const p = pages(6, 0).map((x, i) => ({ ...x, ctime: T0 + i * DAY }));
	const t = creationTimes(p, SAMPLE);
	assert.equal(t.get("wiki/p3.md"), T0 + 3 * DAY);
});

test("creationTimes keeps file dates when there is no log", () => {
	const t = creationTimes(pages(6, T0), null);
	assert.equal(t.get("wiki/p0.md"), T0);
});

test("when dates collapse, the log places the pages it names; the rest count as the oldest", () => {
	const p = pages(6, T0);
	p[1].label = "karpathy-gist";
	const t = creationTimes(p, SAMPLE);
	assert.equal(t.get("wiki/p1.md"), Date.UTC(2026, 4, 2)); // named in the second entry
	assert.equal(t.get("wiki/p0.md"), Date.UTC(2026, 3, 7)); // unnamed: earliest log date
});

test("collapsed dates with an empty log fall back to the file dates", () => {
	const t = creationTimes(pages(6, T0), "# Log\nnothing yet\n");
	assert.equal(t.get("wiki/p0.md"), T0);
});
