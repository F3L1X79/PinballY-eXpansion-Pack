// ============================================================
// Update Check on the fake host: one GET of the latest release per start,
// a newer Pack Version remembered in the update state file, an equal or
// older one forgetting it, every failure one log line and nothing saved,
// no request with the check off or in a git checkout.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";
import { createUpdateState } from "../../common/updates/update_state.js";
import { runUpdateCheck, LATEST_RELEASE_URL } from "../../common/updates/update_check.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const NOW = new Date(2026, 9, 26, 20, 0, 0);
const PROJECT = "C:\\PinballY\\Scripts\\ExpansionPack";
const STATE_FILE = `${PROJECT}\\pack_update.json`;
const ZIP_URL = "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip";
const SHA256 = "3f".repeat(32);

const releaseReply = ({ tag = "v9.0.0", assets } = {}) => JSON.stringify({
    tag_name: tag,
    assets: assets ?? [
        { name: "notes.txt", browser_download_url: "https://example.com/notes.txt", digest: `sha256:${"00".repeat(32)}` },
        { name: "ExpansionPack.zip", browser_download_url: ZIP_URL, digest: `sha256:${SHA256}` },
    ],
});

const REMEMBERED = { version: 1, latestRelease: { packVersion: "8.0.0", zipUrl: "https://example.com/old.zip", sha256: "aa".repeat(32) } };

// Runs one check on a fresh fake host, after seed(fake); gives the fake.
async function check({ reply, enabled = true, seed = () => {} } = {}) {
    const fake = createFakePinballYHost({ now: NOW });
    seed(fake);
    if (reply) fake.replyToHttp(reply);
    await runUpdateCheck(fake, createUpdateState(fake), { enabled });
    return fake;
}

const savedState = fake => (fake.readFile(STATE_FILE) === undefined ? undefined : JSON.parse(fake.readFile(STATE_FILE)));
const checkLines = fake => fake.logLines().filter(line => line.startsWith("[UpdateCheck]"));

test("one GET of the latest release, with a User-Agent and a cache-busting query", async () => {
    const fake = await check({ reply: { text: releaseReply() } });

    const requests = fake.httpRequests();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "GET");
    assert.equal(LATEST_RELEASE_URL, "https://api.github.com/repos/F3L1X79/PinballY-Expansion-Pack/releases/latest");
    assert.ok(requests[0].url.startsWith(`${LATEST_RELEASE_URL}?`), requests[0].url);
    assert.ok(requests[0].url.includes(String(NOW.getTime())), "the query changes at every start");
    assert.match(requests[0].headers["User-Agent"], /PinballY-Expansion-Pack/);
});

test("a newer release with a zip and its digest is remembered, and nothing shows", async () => {
    const fake = await check({ reply: { text: releaseReply() } });

    assert.deepEqual(savedState(fake), { version: 1, latestRelease: { packVersion: "9.0.0", zipUrl: ZIP_URL, sha256: SHA256 } });
    assert.deepEqual(fake.shownMenus(), []);
    assert.deepEqual(fake.drawingLayers(), []);
    assert.equal(checkLines(fake).length, 1);
    assertNoErrorLogged(fake);
});

test("the running Pack Version forgets a remembered release", async () => {
    const fake = await check({
        reply: { text: releaseReply({ tag: `v${PACK_VERSION}` }) },
        seed: f => f.addFile(STATE_FILE, JSON.stringify(REMEMBERED)),
    });

    assert.deepEqual(savedState(fake), { version: 1 });
    assertNoErrorLogged(fake);
});

test("an older release forgets a remembered release", async () => {
    const fake = await check({
        reply: { text: releaseReply({ tag: "v0.0.1" }) },
        seed: f => f.addFile(STATE_FILE, JSON.stringify(REMEMBERED)),
    });

    assert.deepEqual(savedState(fake), { version: 1 });
});

test("an equal release with nothing remembered writes no file", async () => {
    const fake = await check({ reply: { text: releaseReply({ tag: `v${PACK_VERSION}` }) } });

    assert.equal(fake.readFile(STATE_FILE), undefined);
    assert.deepEqual(fake.fileOperations(), []);
});

const FAILURES = [
    ["offline", { status: 0, statusText: "The server name or address could not be resolved" }],
    ["forbidden", { status: 403, statusText: "rate limit exceeded" }],
    ["too many requests", { status: 429, statusText: "Too Many Requests" }],
    ["bad JSON", { text: "<html>Unicorn!</html>" }],
    ["no tag", { text: JSON.stringify({ assets: [] }) }],
    ["no zip asset", { text: releaseReply({ assets: [{ name: "Source.zip", browser_download_url: ZIP_URL, digest: `sha256:${SHA256}` }] }) }],
    ["no digest", { text: releaseReply({ assets: [{ name: "ExpansionPack.zip", browser_download_url: ZIP_URL, digest: null }] }) }],
    ["another digest", { text: releaseReply({ assets: [{ name: "ExpansionPack.zip", browser_download_url: ZIP_URL, digest: "md5:1234" }] }) }],
    ["no download URL", { text: releaseReply({ assets: [{ name: "ExpansionPack.zip", digest: `sha256:${SHA256}` }] }) }],
];

for (const [name, reply] of FAILURES) {
    test(`${name}: one log line, the remembered release kept, nothing shown`, async () => {
        const fake = await check({ reply, seed: f => f.addFile(STATE_FILE, JSON.stringify(REMEMBERED)) });

        assert.equal(checkLines(fake).length, 1, checkLines(fake).join("\n"));
        assert.deepEqual(savedState(fake), REMEMBERED);
        assert.deepEqual(fake.fileOperations(), []);
        assert.deepEqual(fake.shownMenus(), []);
        assertNoErrorLogged(fake);
    });
}

test("with the check off, no request", async () => {
    const fake = await check({ enabled: false });

    assert.deepEqual(fake.httpRequests(), []);
    assertNoErrorLogged(fake);
});

test("in a git checkout, no request", async () => {
    const fake = await check({ seed: f => f.addFolder(`${PROJECT}\\.git`) });

    assert.deepEqual(fake.httpRequests(), []);
    assertNoErrorLogged(fake);
});

test("in a git worktree, whose .git is a file, no request", async () => {
    const fake = await check({ seed: f => f.addFile(`${PROJECT}\\.git`, "gitdir: C:/repo/.git/worktrees/pack") });

    assert.deepEqual(fake.httpRequests(), []);
});

test("an unreadable update state file is logged, deleted, and the check goes on", async () => {
    const fake = await check({
        reply: { text: releaseReply() },
        seed: f => f.addFile(STATE_FILE, "{ \"version\": 1, \"latestRel"),
    });

    const errors = errorLines(fake);
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.ok(errors[0].startsWith("[UpdateCheck]") && errors[0].includes("pack_update.json"), errors[0]);
    assert.deepEqual(fake.fileOperations().map(({ operation, path }) => `${operation} ${path}`),
        [`append ${PROJECT}\\logs\\errors.log`, `delete ${STATE_FILE}`, `write ${STATE_FILE}`], "the error in the Error Log too");
    assert.equal(savedState(fake).latestRelease.packVersion, "9.0.0");
});

test("a remembered release is read back from the file", () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(STATE_FILE, JSON.stringify(REMEMBERED));

    assert.deepEqual(createUpdateState(fake).latestRelease(), REMEMBERED.latestRelease);
});

test("a request MSXML refuses to open is one log line, like an offline one", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.httpGet = () => { throw new Error("Class not registered"); };
    await runUpdateCheck(fake, createUpdateState(fake), { enabled: true });

    assert.deepEqual(checkLines(fake), ["[UpdateCheck] No answer from GitHub: Class not registered."]);
    assertNoErrorLogged(fake);
});
