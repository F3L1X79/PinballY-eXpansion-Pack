// ============================================================
// Checks that each path .gitignore keeps out of git is either kept by a
// Pack Update (tools/pack_update.ps1's $KeptFiles, $KeptFolders, or tools\)
// or listed below as not kept, with why, and that the guide's "Updating
// offline" section copies back exactly those paths. Reads the files only.
// - A new file the pack writes in its folder is otherwise wiped by the next update.
// - The guide's copy-back list is that section's indented bullets, each starting with its path in backticks.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

// The ignored paths a Pack Update rightly drops, with why.
const NOT_KEPT = {
    // The maintainer's machine only, never in a release or on a cabinet.
    ".devcontainer": "development", ".claude": "development", ".agents": "development", ".scratch": "development",
    "CLAUDE.md": "development", "skills-lock.json": "development", ".githooks": "development",
    ".bash_profile": "sandbox placeholder", ".bashrc": "sandbox placeholder", ".gitconfig": "sandbox placeholder",
    ".gitmodules": "sandbox placeholder", ".idea": "sandbox placeholder", ".mcp.json": "sandbox placeholder",
    ".profile": "sandbox placeholder", ".ripgreprc": "sandbox placeholder", ".vscode": "sandbox placeholder",
    ".zprofile": "sandbox placeholder", ".zshrc": "sandbox placeholder",
    "docs\\images\\raw": "maintainer's raw screenshots",
    "assets\\images\\drawn_menu\\sheet.png": "maintainer's check sheet",
    "assets\\images\\default_scores\\worskpace": "maintainer's source sheets",
    // Written by the pack, but remade when needed.
    "play_scores": "the .nv copies, remade at each launch",
    // Left by a version before the logs folder; the older version's own helper keeps them.
    "errors.log": "moved into logs at the next start", "errors.old.log": "moved into logs at the next start",
    "play_scores_anomalies.log": "moved into logs at the next start", "play_scores_anomalies.old.log": "moved into logs at the next start",
};

// .gitignore's ignoring lines as Windows paths of the pack folder: no
// comment, no "!" exception, no leading or trailing slash or "/*".
function ignoredPaths() {
    return read(".gitignore").split(/\r?\n/).map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith("#") && !line.startsWith("!"))
        .map(line => line.replace(/^\//, "").replace(/\/\*?$/, "").replace(/\//g, "\\"));
}

// The quoted names of a PowerShell array assigned to the variable.
function psArray(script, variable) {
    const match = script.match(new RegExp(`^\\$${variable} = @\\(([^)]*)\\)`, "m"));
    assert.ok(match, `$${variable} found in pack_update.ps1`);
    return [...match[1].matchAll(/'([^']*)'/g)].map(quoted => quoted[1]);
}

const HELPER = read("tools/pack_update.ps1");
// The pack folder's paths a Pack Update copies into the new version; tools\ but for $ShippedTools.
const KEPT_PATHS = [...psArray(HELPER, "KeptFiles"), ...psArray(HELPER, "KeptFolders"), "tools"];
const OFFLINE_SECTIONS = { en: "## Updating offline", fr: "## Mettre à jour hors ligne" };

// The guide's copy-back bullets, as { path, line }.
function offlineCopyBack(language) {
    const page = read(`docs/guide/${language}/updates.md`).replace(/\r\n/g, "\n");
    const start = page.indexOf(`\n${OFFLINE_SECTIONS[language]}\n`);
    assert.ok(start >= 0, `${OFFLINE_SECTIONS[language]} found in docs/guide/${language}/updates.md`);
    const end = page.indexOf("\n## ", start + 1);
    return page.slice(start, end < 0 ? undefined : end).split("\n")
        .map(line => ({ line, match: /^\s+- `([^`]+)`/.exec(line) }))
        .filter(({ match }) => match)
        .map(({ line, match }) => ({ path: match[1], line }));
}

test("every path kept out of git is kept by a Pack Update, or said not to be", () => {
    const kept = new Set(KEPT_PATHS);
    // A path inside a kept folder goes with it.
    const isKept = path => [...kept].some(keptPath => path === keptPath || path.startsWith(`${keptPath}\\`));
    const forgotten = ignoredPaths().filter(path => !isKept(path) && !(path in NOT_KEPT));
    assert.deepEqual(forgotten, [], "add each to $KeptFiles / $KeptFolders in tools/pack_update.ps1 (and docs/guide/*/updates.md), or to NOT_KEPT here with why");
});

for (const language of Object.keys(OFFLINE_SECTIONS)) {
    test(`the ${language} guide's offline update copies back exactly what a Pack Update keeps`, () => {
        assert.deepEqual(offlineCopyBack(language).map(({ path }) => path).sort(), [...KEPT_PATHS].sort());
    });

    test(`the ${language} guide's offline update names the tools the release ships, not to be copied back`, () => {
        const tools = offlineCopyBack(language).find(({ path }) => path === "tools");
        assert.ok(tools, "a tools bullet");
        for (const name of psArray(HELPER, "ShippedTools")) assert.ok(tools.line.includes(`\`${name}\``), `${name} named`);
    });
}

test("NOT_KEPT lists only paths .gitignore still has", () => {
    const ignored = new Set(ignoredPaths());
    assert.deepEqual(Object.keys(NOT_KEPT).filter(path => !ignored.has(path)), []);
});
