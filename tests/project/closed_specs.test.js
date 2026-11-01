// ============================================================
// The maintainer's closed_specs.mjs on a throwaway roadmap and a fake gh:
// the queue items whose spec is closed, and nothing taken from the
// section below the queue. Never loaded by PinballY.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve("maintainer/roadmap/closed_specs.mjs");
const ISSUES = "https://github.com/F3L1X79/PinballY-Expansion-Pack/issues";

const item = (id, title, links) => [
    `      <li draggable="true" tabindex="0" class="item tr-share" id="${id}" data-track="share" data-rank="silver">`,
    `          <h3>${title}</h3>`,
    `          <div class="links">${links}</div>`,
    "          <details><ul><li>A decision</li></ul></details>",
    "      </li>",
].join("\n");

// A folder holding docs/roadmap.html and a fake gh listing the closed issues.
function roadmap(queueItems, closedIssues) {
    const folder = mkdtempSync(join(tmpdir(), "closed-specs-"));
    mkdirSync(join(folder, "docs"));
    writeFileSync(join(folder, "docs", "roadmap.html"), [
        "<section>",
        '    <ol class="queue">',
        ...queueItems,
        "    </ol>",
        "  </section>",
        "  <!-- ===== PinballY docs ===== -->",
        `  <li><span>Spec <a href="${ISSUES}/400">#400</a> close.</span></li>`,
    ].join("\n"));
    const bin = join(folder, ".bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "issues.json"), JSON.stringify(closedIssues.map(number => ({ number }))));
    writeFileSync(join(bin, "gh"), `#!/bin/sh\ncat "${join(bin, "issues.json")}"\n`);
    chmodSync(join(bin, "gh"), 0o755);
    return () => execFileSync("node", [SCRIPT], { cwd: folder, encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
}

test("a queue item whose spec is closed is listed; one with an open spec or no spec is not", () => {
    const run = roadmap([
        item("drawn-dialogs", "Dialogues lisibles", `Spec <a href="${ISSUES}/357">#357</a>, reste <a href="${ISSUES}/361">#361</a> (humain)`),
        item("release-1-0", "Sortie 1.0", `Spec <a href="${ISSUES}/345">#345</a>, reste <a href="${ISSUES}/352">#352</a>`),
        item("clock", "Heure à l'écran", "Flow Matt : <code>/grill-with-docs</code>"),
    ], [357, 361, 400]);

    assert.equal(run(), "Spec #357 closed: Dialogues lisibles (#drawn-dialogs). Take it off the roadmap.\n");
});

test("a closed ticket linked by an item with an open spec does not list it", () => {
    const run = roadmap([
        item("release-1-0", "Sortie 1.0", `Spec <a href="${ISSUES}/345">#345</a>, tickets <a href="${ISSUES}/351">#351</a>`),
    ], [351, 400]);

    assert.equal(run(), "No roadmap item has a closed spec.\n");
});
