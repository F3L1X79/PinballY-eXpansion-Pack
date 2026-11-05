// ============================================================
// Profile store recovery at the host seam: a broken file restored from its
// backup or set aside, a missing active folder giving Guest, reserved folder
// names, an unreadable Avatar giving the default. Every case is logged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

const NOW = new Date(2026, 8, 24, 21, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const ALICE = `${PROFILES}\\Alice`;
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const DEFAULT_AVATAR = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\default_avatar.png";

const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false };

function createFake() {
    return createFakePinballYHost({ now: NOW, tables: [MEDIEVAL] });
}

function play(fake, game, seconds) {
    fake.gameStarted(game);
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
}

const profileJson = (count) => JSON.stringify({
    version: 1, plays: { [MEDIEVAL.configId]: { count, seconds: count * 60, lastPlayed: "2026-09-20T20:00:00" } },
});
const readJson = (fake, path) => JSON.parse(fake.readFile(path));
const loggedAbout = (fake, pattern) => fake.logLines().some(line => line.startsWith("[ProfileStore]") && pattern.test(line));

// Alice active, as after a switch in an earlier session.
function seedActiveAlice(fake, { profile, backup }) {
    fake.addFolder(ALICE);
    if (profile !== undefined) fake.addFile(`${ALICE}\\profile.json`, profile);
    if (backup !== undefined) fake.addFile(`${ALICE}\\profile.bak.json`, backup);
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "Alice" }));
}

test("a broken profile.json with a good backup is restored and play goes on", () => {
    const fake = createFake();
    seedActiveAlice(fake, { profile: "{ \"version\": 1, \"plays\": {", backup: profileJson(3) });

    const store = createProfileStore(fake);
    assert.equal(store.getPlay(MEDIEVAL.configId).count, 3);
    assert.equal(readJson(fake, `${ALICE}\\profile.json`).plays[MEDIEVAL.configId].count, 3);
    assert.ok(loggedAbout(fake, /Alice.*restored from its backup/));

    play(fake, MEDIEVAL, 60);
    assert.equal(readJson(fake, `${ALICE}\\profile.json`).plays[MEDIEVAL.configId].count, 4);
});

test("a missing profile.json with a good backup, as after a crash during a save, is restored", () => {
    const fake = createFake();
    seedActiveAlice(fake, { backup: profileJson(2) });

    const store = createProfileStore(fake);

    assert.equal(store.getPlay(MEDIEVAL.configId).count, 2);
    assert.ok(loggedAbout(fake, /Alice.*restored from its backup/));
});

test("a broken profile.json with a broken backup is kept aside under a dated name and the Profile starts from zero", () => {
    const fake = createFake();
    seedActiveAlice(fake, { profile: "not json", backup: "[]" });

    const store = createProfileStore(fake);

    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(store.getPlay(MEDIEVAL.configId).count, 0);
    assert.equal(fake.readFile(`${ALICE}\\profile.broken-2026-09-24_21-00-00.json`), "not json");
    assert.ok(loggedAbout(fake, /Alice.*profile\.broken-2026-09-24_21-00-00\.json.*from zero/));

    play(fake, MEDIEVAL, 60);
    assert.equal(readJson(fake, `${ALICE}\\profile.json`).plays[MEDIEVAL.configId].count, 1);
});

test("a folder without profile.json is a new, empty Profile, and nothing is logged", () => {
    const fake = createFake();
    seedActiveAlice(fake, {});

    const store = createProfileStore(fake);

    assert.equal(store.getPlay(MEDIEVAL.configId).count, 0);
    assert.deepEqual(fake.logLines(), []);
});

test("a broken cabinet.json is restored from its backup", () => {
    const fake = createFake();
    fake.addFolder(ALICE);
    fake.addFile(CABINET_FILE, "{ broken");
    fake.addFile(`${PROFILES}\\cabinet.bak.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));

    const store = createProfileStore(fake);

    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(readJson(fake, CABINET_FILE).activeProfile, "Alice");
    assert.ok(loggedAbout(fake, /cabinet\.json.*restored from its backup/));
});

test("a broken cabinet.json without a backup is kept aside and Guest becomes active", () => {
    const fake = createFake();
    fake.addFile(CABINET_FILE, "{ broken");

    const store = createProfileStore(fake);

    assert.equal(store.getActiveProfile().name, "guest");
    assert.equal(fake.readFile(`${PROFILES}\\cabinet.broken-2026-09-24_21-00-00.json`), "{ broken");
    assert.equal(readJson(fake, CABINET_FILE).activeProfile, "guest");
    assert.ok(loggedAbout(fake, /cabinet\.json.*from zero/));
});

test("removing the active Profile's folder makes Guest active at the next start", () => {
    const fake = createFake();
    fake.addFolder(ALICE);
    createProfileStore(fake).switchTo("Alice");

    fake.removeFolder(ALICE);
    const restarted = createProfileStore(fake);

    assert.equal(restarted.getActiveProfile().name, "guest");
    assert.equal(readJson(fake, CABINET_FILE).activeProfile, "guest");
    assert.ok(loggedAbout(fake, /"Alice".*Guest/));
});

test("folders named Guest or GUEST are Guest; .hidden and _parked folders are not listed", () => {
    for (const guestFolder of ["Guest", "GUEST"]) {
        const fake = createFake();
        fake.addFolder(`${PROFILES}\\${guestFolder}`);
        fake.addFolder(`${PROFILES}\\.hidden`);
        fake.addFolder(`${PROFILES}\\_parked`);
        fake.addFolder(ALICE);

        const store = createProfileStore(fake);

        assert.deepEqual(store.listProfiles().map(profile => [profile.name, profile.isGuest]),
            [[guestFolder, true], ["Alice", false]]);
        assert.throws(() => store.switchTo("_parked"), /_parked/);
    }
});

test("a parked active Profile makes Guest active at the next start", () => {
    const fake = createFake();
    fake.addFolder(`${PROFILES}\\_Alice`);
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "_Alice" }));

    assert.equal(createProfileStore(fake).getActiveProfile().name, "guest");
});

test("an unreadable Avatar shows the default Avatar, and is logged once", () => {
    const fake = createFake();
    fake.addUnreadableImage(`${ALICE}\\avatar.png`);
    const store = createProfileStore(fake);

    const alice = () => store.listProfiles().find(profile => profile.name === "Alice");
    assert.equal(alice().avatarPath, DEFAULT_AVATAR);
    assert.equal(alice().avatarPath, DEFAULT_AVATAR);

    const avatarLines = fake.logLines().filter(line => line.includes("avatar.png"));
    assert.equal(avatarLines.length, 1);
    assert.match(avatarLines[0], /^\[ProfileStore\].*Alice\\avatar\.png.*default Avatar/);
});

test("an unreadable avatar.jpg is logged and the avatar.png next to it shows", () => {
    const fake = createFake();
    fake.addUnreadableImage(`${ALICE}\\avatar.jpg`);
    fake.addFile(`${ALICE}\\avatar.png`);
    const store = createProfileStore(fake);

    const alice = store.listProfiles().find(profile => profile.name === "Alice");
    assert.equal(alice.avatarPath, `${ALICE}\\avatar.png`);

    const avatarLines = fake.logLines().filter(line => line.includes("avatar.jpg"));
    assert.equal(avatarLines.length, 1);
    assert.match(avatarLines[0], /^\[ProfileStore\].*Alice\\avatar\.jpg.*next image/);
});
