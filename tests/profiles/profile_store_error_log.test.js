// ============================================================
// Profile store recovery in the Error Log, at the host seam: why a file
// could not be read and what was kept under which name go to errors.log,
// each line reaching logfile.log once and unchanged. A file never saved
// writes nothing there; a locked errors.log changes nothing to the recovery.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

const NOW = new Date(2026, 8, 24, 21, 0, 0);
const DATE = "2026-09-24_21-00-00";
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const ERROR_LOG = `${PACK}\\errors.log`;
const PROFILES = `${PACK}\\profiles`;
const ALICE = `${PROFILES}\\Alice`;
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false };

const profileJson = (version, count) => JSON.stringify({
    version, plays: { [MEDIEVAL.configId]: { count, seconds: count * 60, lastPlayed: "2026-09-20T20:00:00" } },
});

function createFake() {
    return createFakePinballYHost({ now: NOW, tables: [MEDIEVAL] });
}

function seedActiveAlice(fake, { profile, backup }) {
    fake.addFolder(ALICE);
    if (profile !== undefined) fake.addFile(`${ALICE}\\profile.json`, profile);
    if (backup !== undefined) fake.addFile(`${ALICE}\\profile.bak.json`, backup);
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "Alice" }));
}

// The errors.log lines after their date, time and Pack Version.
const errorsLogFileLines = fake => (fake.files.fileExists(ERROR_LOG) ? fake.readFile(ERROR_LOG) : "")
    .split("\r\n").filter(line => line.length > 0).map(line => line.replace(/^\S+ \S+ v\S+ /, ""));

// Every errors.log line reached logfile.log exactly once, unchanged.
function assertEachInLogfileOnce(fake) {
    for (const line of errorsLogFileLines(fake)) {
        assert.equal(fake.logLines().filter(logged => logged === line).length, 1, line);
    }
}

test("a broken profile.json with a good backup: its cause and its restore are in the Error Log", () => {
    const fake = createFake();
    seedActiveAlice(fake, { profile: "{ \"isAdmin\": true \"version\": 1 }", backup: profileJson(1, 3) });

    createProfileStore(fake);

    const lines = errorsLogFileLines(fake);
    assert.equal(lines.length, 2, lines.join("\n"));
    assert.match(lines[0], /^\[ProfileStore\] .*Alice\\profile\.json cannot be read: \S/);
    assert.equal(lines[1], `[ProfileStore] Alice\\profile.json is missing or unreadable; restored from its backup`
        + ` (broken file kept as profile.broken-${DATE}.json).`);
    assertEachInLogfileOnce(fake);
});

test("a broken profile.json with a broken backup: both causes and both kept names are in the Error Log", () => {
    const fake = createFake();
    seedActiveAlice(fake, { profile: "not json", backup: "[]" });

    createProfileStore(fake);

    const lines = errorsLogFileLines(fake);
    assert.equal(lines.length, 3, lines.join("\n"));
    assert.match(lines[0], /Alice\\profile\.json cannot be read: /);
    assert.match(lines[1], /Alice\\profile\.bak\.json does not hold a JSON object\.$/);
    assert.equal(lines[2], `[ProfileStore] Alice\\profile.json and its backup are unreadable; kept aside as`
        + ` profile.broken-${DATE}.json and profile.bak.broken-${DATE}.json, starting from zero.`);
    assertEachInLogfileOnce(fake);
});

test("a newer profile.json: the file kept aside and the restore from its backup are in the Error Log", () => {
    const fake = createFake();
    seedActiveAlice(fake, { profile: profileJson(2, 5), backup: profileJson(1, 3) });

    createProfileStore(fake);

    const lines = errorsLogFileLines(fake);
    assert.equal(lines.length, 2, lines.join("\n"));
    assert.match(lines[0], new RegExp(`Alice\\\\profile\\.json has version 2, newer than this pack's 1; kept aside as profile\\.newer-${DATE}\\.json`));
    assert.match(lines[1], new RegExp(`is newer; restored from its backup \\(newer file kept as profile\\.newer-${DATE}\\.json\\)\\.$`));
    assertEachInLogfileOnce(fake);
});

test("a broken cabinet.json is in the Error Log too", () => {
    const fake = createFake();
    fake.addFile(CABINET_FILE, "{");

    createProfileStore(fake);

    const lines = errorsLogFileLines(fake);
    assert.match(lines[0], /cabinet\.json cannot be read: /);
    assert.match(lines[1], new RegExp(`cabinet\\.json and its backup are unreadable; kept aside as cabinet\\.broken-${DATE}\\.json`));
    assertEachInLogfileOnce(fake);
});

test("a Play Log year without a \"plays\" list is in the Error Log", () => {
    const fake = createFake();
    seedActiveAlice(fake, { profile: profileJson(1, 0) });
    fake.addFile(`${ALICE}\\play-log-2026.json`, JSON.stringify({ version: 1, play: [] }));
    const store = createProfileStore(fake);

    store.getPlayLogOf("Alice", 2026);

    assert.deepEqual(errorsLogFileLines(fake), [`[ProfileStore] Alice\\play-log-2026.json has no "plays" list;`
        + ` kept aside as play-log-2026.broken-${DATE}.json, starting from zero.`]);
    assertEachInLogfileOnce(fake);
});

test("a file never saved writes nothing to the Error Log", () => {
    const fake = createFake();
    fake.addFolder(ALICE);

    const store = createProfileStore(fake);
    store.switchTo("Alice");
    store.getPlayLogOf("Alice", 2026);

    assert.deepEqual(errorsLogFileLines(fake), []);
});

// Must stay last: a failed errors.log write is reported once per process, then silent.
test("a locked errors.log changes nothing to the recovery", () => {
    const fake = createFake();
    seedActiveAlice(fake, { profile: "not json", backup: profileJson(1, 3) });
    fake.addFile(ERROR_LOG, "");
    fake.lockFile(ERROR_LOG);

    const store = createProfileStore(fake);

    assert.equal(store.getPlay(MEDIEVAL.configId).count, 3);
    assert.equal(JSON.parse(fake.readFile(`${ALICE}\\profile.json`)).plays[MEDIEVAL.configId].count, 3);
    assert.equal(fake.readFile(`${ALICE}\\profile.broken-${DATE}.json`), "not json");
    assert.ok(fake.logLines().some(line => /restored from its backup/.test(line)));
    assert.equal(fake.readFile(ERROR_LOG), "");
});
