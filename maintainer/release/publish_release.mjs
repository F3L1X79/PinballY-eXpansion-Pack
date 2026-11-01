// ============================================================
// Publishes the GitHub release of the Pack Version: refuses a dirty tree, a
// HEAD not tagged vX.Y.Z with it or a CHANGELOG.md without its section,
// builds ExpansionPack.zip from the tag with git archive, and creates the
// release with gh, that section as its notes. Never loaded by PinballY.
// Run: node maintainer/release/publish_release.mjs (after git tag vX.Y.Z && git push && git push --tags)
// - git archive applies the export-ignore list of .gitattributes: players get only the pack.
// ============================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REPOSITORY = "F3L1X79/PinballY-Expansion-Pack";

// The body of the "## vX.Y.Z (YYYY-MM-DD)" section of packVersion, up to
// the next "## " heading, or null when the CHANGELOG has no such section.
export function changelogSection(changelog, packVersion) {
    const lines = changelog.split(/\r?\n/);
    const heading = new RegExp(`^## v${packVersion.replace(/\./g, "\\.")} \\(\\d{4}-\\d{2}-\\d{2}\\)\\s*$`);
    const start = lines.findIndex(line => heading.test(line));
    if (start < 0) return null;
    const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
    return lines.slice(start + 1, next < 0 ? lines.length : next).join("\n").trim();
}

// The reason not to release, or null when the tree is clean, HEAD carries
// the tag of the Pack Version and the CHANGELOG has its section.
export function releaseRefusal({ status, headTags, packVersion, changelog }) {
    const expectedTag = `v${packVersion}`;
    if (status.trim() !== "") return "The working tree has uncommitted changes: commit or stash them first.";
    const versionTags = headTags.filter(tag => /^v\d/.test(tag));
    if (!headTags.includes(expectedTag)) {
        if (versionTags.length === 0) return `No tag ${expectedTag} on HEAD: run git tag ${expectedTag} first, or check out the commit that has it.`;
        return `HEAD is tagged ${versionTags.join(", ")}, but the Pack Version is ${packVersion} (common/core/pack_version.js).`;
    }
    if (!changelogSection(changelog, packVersion)) return `CHANGELOG.md has no "## ${expectedTag} (YYYY-MM-DD)" section, or it is empty: write it first (see "Releasing" in CONTRIBUTING.md).`;
    return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const run = (command, args) => execFileSync(command, args, { encoding: "utf8" });
    // The Pack Version of the repository being released, run from its root.
    const { PACK_VERSION } = await import(pathToFileURL(resolve("common/core/pack_version.js")).href);
    const changelog = existsSync("CHANGELOG.md") ? readFileSync("CHANGELOG.md", "utf8") : "";
    const refusal = releaseRefusal({
        status: run("git", ["status", "--porcelain"]),
        headTags: run("git", ["tag", "--points-at", "HEAD"]).split("\n").filter(Boolean),
        packVersion: PACK_VERSION,
        changelog,
    });
    if (refusal) {
        console.error(refusal);
        process.exit(1);
    }
    const tag = `v${PACK_VERSION}`;
    const folder = mkdtempSync(join(tmpdir(), "expansion-pack-release-"));
    const zip = join(folder, "ExpansionPack.zip");
    const notes = join(folder, "changelog-section.md");
    writeFileSync(notes, `${changelogSection(changelog, PACK_VERSION)}\n`);
    run("git", ["archive", "--format=zip", "--prefix=ExpansionPack/", "-o", zip, tag]);
    // --verify-tag: gh would otherwise create a tag the remote doesn't have yet.
    run("gh", ["release", "create", tag, zip, "--repo", REPOSITORY, "--verify-tag", "--title", `eXpansion Pack ${tag}`, "--notes-file", notes]);
    console.log(`Released ${tag} with ${zip}.`);
}
