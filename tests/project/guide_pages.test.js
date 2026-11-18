// ============================================================
// Guide pages tests: the player guide of docs/guide has the same pages in
// English and French, every relative link and image of the READMEs and the
// guide leads to an existing file, and every screenshot of docs/images is used.
// - Wording and section titles are never checked: only what a reader reaches.
// - docs/images/raw and docs/images/forum are source material, left out.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUIDE = join(ROOT, "docs", "guide");
const IMAGES = join(ROOT, "docs", "images");
const LANGUAGES = ["en", "fr"];
const PAGES = ["index", "install", "updates", "profiles", "achievements_and_challenges", "choosing_a_table",
    "interface", "settings", "external_add_ons", "troubleshooting", "coming_next"];

const markdownFilesOf = folder => readdirSync(folder).filter(name => name.endsWith(".md")).sort();

function readmesAndGuidePages() {
    const readmes = ["README.md", "README.fr.md"].map(name => join(ROOT, name));
    const pages = LANGUAGES.flatMap(language => markdownFilesOf(join(GUIDE, language)).map(name => join(GUIDE, language, name)));
    return [...readmes, ...pages];
}

// Every link and image target of a Markdown file, anchors cut off, code blocks and inline code left out.
function targetsOf(file) {
    const prose = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    const links = [...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(match => match[1]);
    const images = [...prose.matchAll(/<img\s[^>]*src="([^"]+)"/g)].map(match => match[1]);
    return [...links, ...images].filter(target => !target.startsWith("#")).map(target => target.split("#")[0]);
}

const isRelative = target => !/^[a-z][a-z0-9+.-]*:/i.test(target);
const relativeTargetPathsOf = file => targetsOf(file).filter(isRelative).map(target => join(dirname(file), decodeURI(target)));

test("the English and French guides hold the same pages", () => {
    const expected = PAGES.map(page => `${page}.md`).sort();
    for (const language of LANGUAGES) {
        assert.deepEqual(markdownFilesOf(join(GUIDE, language)), expected, `docs/guide/${language}`);
    }
});

test("every relative link and image of the READMEs and the guide leads to an existing file", () => {
    for (const file of readmesAndGuidePages()) {
        for (const path of relativeTargetPathsOf(file)) {
            assert.ok(existsSync(path), `${relative(ROOT, file)} links to ${relative(ROOT, path)}, which does not exist`);
        }
    }
});

test("every guide page links back to its index, and the index links every page", () => {
    for (const language of LANGUAGES) {
        const index = targetsOf(join(GUIDE, language, "index.md"));
        for (const page of PAGES.filter(name => name !== "index")) {
            assert.ok(index.includes(`${page}.md`), `${language}/index.md links ${page}.md`);
            assert.ok(targetsOf(join(GUIDE, language, `${page}.md`)).includes("index.md"), `${language}/${page}.md links index.md`);
        }
    }
});

test("both READMEs link to the guide index of their language", () => {
    assert.ok(targetsOf(join(ROOT, "README.md")).includes("docs/guide/en/index.md"));
    assert.ok(targetsOf(join(ROOT, "README.fr.md")).includes("docs/guide/fr/index.md"));
});

test("every screenshot of docs/images is used by a README or a guide page", () => {
    const used = new Set(readmesAndGuidePages().flatMap(relativeTargetPathsOf));
    const screenshots = readdirSync(IMAGES).map(name => join(IMAGES, name)).filter(path => statSync(path).isFile());
    for (const screenshot of screenshots) {
        assert.ok(used.has(screenshot), `${relative(ROOT, screenshot)} is used nowhere`);
    }
});
