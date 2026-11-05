// ============================================================
// Profile store at the host seam, on the fake file system: each Play is
// recorded for the Profile active at its start and announced to onPlay;
// cabinet.json remembers the active Profile; saves use tmp / backup / rename.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore, MIN_PLAY_SECONDS } from "../../common/profiles/profile_store.js";

const NOW = new Date(2026, 8, 24, 21, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const GUEST_FILE = `${PROFILES}\\guest\\profile.json`;
const CABINET_FILE = `${PROFILES}\\cabinet.json`;

const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false };
const MARS = { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", isHidden: false };

function createFake() {
    return createFakePinballYHost({ now: NOW, tables: [MEDIEVAL, MARS] });
}

function play(fake, game, seconds) {
    fake.gameStarted(game);
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
}

const readJson = (fake, path) => JSON.parse(fake.readFile(path));

test("on a fresh install, a game is recorded for Guest and cabinet.json names Guest", () => {
    const fake = createFake();
    createProfileStore(fake);

    play(fake, MEDIEVAL, 90);

    assert.deepEqual(readJson(fake, GUEST_FILE), {
        version: 1,
        plays: { [MEDIEVAL.configId]: { count: 1, seconds: 90, lastPlayed: "2026-09-24T21:01:30" } },
        streaks: {},
        randomGames: 0,
        sessions: {
            longestSeconds: 0, shortestSeconds: 0, rageQuit: false, grandReturn: false,
            dayManufacturers: { day: "", list: [] }, mostManufacturersInADay: 0,
        },
        notified: [],
    });
    assert.deepEqual(readJson(fake, CABINET_FILE), { version: 1, activeProfile: "guest" });
});

test("a start creates the Guest folder, and recreates it and cabinet.json when they were deleted", () => {
    const fake = createFake();
    createProfileStore(fake);
    assert.deepEqual(fake.files.listFolders(PROFILES), ["guest"]);

    fake.removeFolder(`${PROFILES}\\guest`);
    fake.files.deleteFile(CABINET_FILE);
    const restarted = createProfileStore(fake);

    assert.deepEqual(fake.files.listFolders(PROFILES), ["guest"]);
    assert.deepEqual(readJson(fake, CABINET_FILE), { version: 1, activeProfile: "guest" });
    assert.equal(restarted.getActiveProfile().name, "guest");
});

test("a start keeps an existing Guest folder, whatever its letter case", () => {
    const fake = createFake();
    fake.addFolder(`${PROFILES}\\Guest`);

    createProfileStore(fake);

    assert.deepEqual(fake.files.listFolders(PROFILES), ["Guest"]);
});

test("each Play adds one play and its seconds to that table", () => {
    const fake = createFake();
    const store = createProfileStore(fake);

    play(fake, MEDIEVAL, 60);
    play(fake, MARS, 75);
    play(fake, MEDIEVAL, 120);

    assert.deepEqual(store.getActiveProfile().data.plays, {
        [MEDIEVAL.configId]: { count: 2, seconds: 180, lastPlayed: "2026-09-24T21:04:15" },
        [MARS.configId]: { count: 1, seconds: 75, lastPlayed: "2026-09-24T21:02:15" },
    });
    assert.deepEqual(readJson(fake, GUEST_FILE).plays, store.getActiveProfile().data.plays);
});

test("after a switch, games count only for the new Profile, which stays active after a restart", () => {
    const fake = createFake();
    fake.addFolder(`${PROFILES}\\Alice`);
    const store = createProfileStore(fake);
    play(fake, MEDIEVAL, 60);
    const guestBefore = fake.readFile(GUEST_FILE);

    store.switchTo("Alice");
    play(fake, MARS, 75);

    assert.equal(fake.readFile(GUEST_FILE), guestBefore);
    assert.deepEqual(Object.keys(readJson(fake, `${PROFILES}\\Alice\\profile.json`).plays), [MARS.configId]);
    assert.equal(readJson(fake, CABINET_FILE).activeProfile, "Alice");

    const restarted = createProfileStore(fake);
    assert.equal(restarted.getActiveProfile().name, "Alice");
    assert.deepEqual(Object.keys(restarted.getActiveProfile().data.plays), [MARS.configId]);
});

test("a switch loads the new Profile's saved plays and tells the subscribers", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({
        version: 1, plays: { [MARS.configId]: { count: 4, seconds: 400, lastPlayed: "2026-09-01T20:00:00" } },
    }));
    const store = createProfileStore(fake);
    const switchedTo = [];
    store.onSwitch(profile => switchedTo.push(profile.name));

    store.switchTo("Bob");

    assert.deepEqual(switchedTo, ["Bob"]);
    assert.equal(store.getActiveProfile().data.plays[MARS.configId].count, 4);
    play(fake, MARS, 100);
    assert.deepEqual(store.getActiveProfile().data.plays[MARS.configId],
        { count: 5, seconds: 500, lastPlayed: "2026-09-24T21:01:40" });
});

test("a game under a minute changes no total and announces nothing", () => {
    const fake = createFake();
    const store = createProfileStore(fake);
    const announced = [];
    store.onPlay(play => announced.push(play));

    play(fake, MEDIEVAL, MIN_PLAY_SECONDS - 1);

    assert.equal(store.hasPlayed(MEDIEVAL.configId), false);
    assert.equal(fake.files.fileExists(GUEST_FILE), false);
    assert.deepEqual(announced, []);
});

test("a game of one minute updates the totals and announces one Play with its Profile, table, start and seconds", () => {
    const fake = createFake();
    const store = createProfileStore(fake);
    const announced = [];
    store.onPlay(play => announced.push({ ...play, plays: store.getPlay(play.configId) }));

    play(fake, MEDIEVAL, MIN_PLAY_SECONDS + 0.4);

    const totals = { count: 1, seconds: 60, lastPlayed: "2026-09-24T21:01:00" };
    assert.deepEqual(store.getPlay(MEDIEVAL.configId), totals);
    // Announced once the Play is in the totals.
    assert.deepEqual(announced, [{ profileName: "guest", configId: MEDIEVAL.configId, start: NOW, seconds: 60, plays: totals }]);
});

test("a game over without its start changes nothing and announces nothing", () => {
    const fake = createFake();
    const store = createProfileStore(fake);
    const announced = [];
    store.onPlay(play => announced.push(play));

    fake.advanceTime(10 * 60 * 1000);
    fake.gameOver(MEDIEVAL);

    assert.equal(store.hasPlayed(MEDIEVAL.configId), false);
    assert.deepEqual(announced, []);
});

test("a Profile switch during a game announces the Play for the Profile active at its start, Guest included", () => {
    const fake = createFake();
    fake.addFolder(`${PROFILES}\\Alice`);
    const store = createProfileStore(fake);
    const announced = [];
    store.onPlay(({ profileName, configId }) => announced.push({ profileName, configId }));

    fake.gameStarted(MEDIEVAL);
    store.switchTo("Alice");
    fake.advanceTime(90 * 1000);
    fake.gameOver(MEDIEVAL);
    fake.gameStarted(MARS);
    store.switchTo("guest");
    fake.advanceTime(90 * 1000);
    fake.gameOver(MARS);

    assert.deepEqual(announced, [
        { profileName: "guest", configId: MEDIEVAL.configId },
        { profileName: "Alice", configId: MARS.configId },
    ]);
    assert.deepEqual(Object.keys(store.getPlaysOf("guest")), [MEDIEVAL.configId]);
    assert.deepEqual(Object.keys(store.getPlaysOf("Alice")), [MARS.configId]);
});

test("a listener that throws is logged and the next listener still hears of the Play", () => {
    const fake = createFake();
    // The error goes to PinballY's logfile, like any failing handler's.
    const uninstallGlobals = fake.installGlobals();
    try {
        const store = createProfileStore(fake);
        const announced = [];
        store.onPlay(() => { throw new Error("broken counter"); });
        store.onPlay(play => announced.push(play.configId));

        play(fake, MEDIEVAL, 90);

        assert.deepEqual(announced, [MEDIEVAL.configId]);
        assert.ok(fake.logLines().some(line => line.startsWith("[ProfileStore] ERROR") && line.includes("broken counter")));
    } finally {
        uninstallGlobals();
    }
});

test("switching to an unknown Profile fails and keeps the active one", () => {
    const fake = createFake();
    const store = createProfileStore(fake);

    assert.throws(() => store.switchTo("Nobody"), /Nobody/);
    assert.equal(store.getActiveProfile().name, "guest");
});

test("a save writes a tmp file, keeps the previous version as the backup, then renames the tmp into place", () => {
    const fake = createFake();
    createProfileStore(fake);
    play(fake, MEDIEVAL, 60);
    const firstVersion = fake.readFile(GUEST_FILE);
    const operationsBefore = fake.fileOperations().length;

    play(fake, MARS, 75);

    const profileFileOperations = fake.fileOperations().slice(operationsBefore).filter(({ path }) => path.includes("\\profile."));
    assert.deepEqual(profileFileOperations, [
        { operation: "write", path: `${PROFILES}\\guest\\profile.tmp.json` },
        { operation: "rename", path: GUEST_FILE, to: `${PROFILES}\\guest\\profile.bak.json` },
        { operation: "rename", path: `${PROFILES}\\guest\\profile.tmp.json`, to: GUEST_FILE },
    ]);
    assert.equal(fake.readFile(`${PROFILES}\\guest\\profile.bak.json`), firstVersion);
    assert.equal(fake.readFile(`${PROFILES}\\guest\\profile.tmp.json`), undefined);
    assert.deepEqual(Object.keys(readJson(fake, GUEST_FILE).plays), [MEDIEVAL.configId, MARS.configId]);
});

test("the next save replaces the older backup", () => {
    const fake = createFake();
    createProfileStore(fake);
    play(fake, MEDIEVAL, 60);
    play(fake, MARS, 75);
    const secondVersion = fake.readFile(GUEST_FILE);

    play(fake, MARS, 75);

    assert.equal(fake.readFile(`${PROFILES}\\guest\\profile.bak.json`), secondVersion);
});

test("lists Guest first, then the other Profiles alphabetically, re-reading the folder each time", () => {
    const fake = createFake();
    fake.addFolder(`${PROFILES}\\Zoé`);
    fake.addFolder(`${PROFILES}\\Alice`);
    const store = createProfileStore(fake);

    assert.deepEqual(store.listProfiles().map(profile => profile.name), ["guest", "Alice", "Zoé"]);
    assert.deepEqual(store.listProfiles().map(profile => profile.isGuest), [true, false, false]);

    fake.addFolder(`${PROFILES}\\Chloé`);
    assert.deepEqual(store.listProfiles().map(profile => profile.name), ["guest", "Alice", "Chloé", "Zoé"]);
});

test("a Profile's own avatar.png or avatar.jpg is its Avatar, otherwise the default Avatar", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\avatar.png`);
    fake.addFile(`${PROFILES}\\Bob\\avatar.jpg`);
    fake.addFolder(`${PROFILES}\\Chloé`);
    const store = createProfileStore(fake);

    const avatars = Object.fromEntries(store.listProfiles().map(profile => [profile.name, profile.avatarPath]));
    const defaultAvatar = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\default_avatar.png";
    assert.deepEqual(avatars, {
        guest: defaultAvatar,
        Alice: `${PROFILES}\\Alice\\avatar.png`,
        Bob: `${PROFILES}\\Bob\\avatar.jpg`,
        Chloé: defaultAvatar,
    });
    assert.equal(store.getActiveProfile().avatarPath, defaultAvatar);
});

test("a Profile holding both images shows avatar.jpg", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\avatar.png`);
    fake.addFile(`${PROFILES}\\Alice\\avatar.jpg`);
    const store = createProfileStore(fake);

    const alice = store.listProfiles().find(profile => profile.name === "Alice");
    assert.equal(alice.avatarPath, `${PROFILES}\\Alice\\avatar.jpg`);
});

test("the default Avatar is committed in the assets folder", () => {
    assert.ok(existsSync(fileURLToPath(new URL("../../assets/images/default_avatar.png", import.meta.url))));
});

test("Guest ships its own picture, not the default Avatar", () => {
    const shipped = path => readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)));
    assert.notDeepEqual(shipped("profiles/guest/avatar.png"), shipped("assets/images/default_avatar.png"));
});

test("accented Profile names survive a switch, a save and a restart", () => {
    const fake = createFake();
    fake.addFolder(`${PROFILES}\\Émile`);
    createProfileStore(fake).switchTo("Émile");
    play(fake, MEDIEVAL, 60);

    const restarted = createProfileStore(fake);
    assert.equal(restarted.getActiveProfile().name, "Émile");
    assert.equal(restarted.getActiveProfile().data.plays[MEDIEVAL.configId].count, 1);
});

test("the active Profile's data and the cabinet data can be updated, and each update is saved", () => {
    const fake = createFake();
    const store = createProfileStore(fake);

    store.updateProfileData(data => { data.plays.Custom = { count: 1, seconds: 1, lastPlayed: "x" }; });
    store.updateCabinetData(cabinet => { cabinet.note = "kept"; });

    assert.equal(readJson(fake, GUEST_FILE).plays.Custom.count, 1);
    assert.equal(store.getProfileData().plays.Custom.count, 1);
    assert.equal(readJson(fake, CABINET_FILE).note, "kept");
    assert.equal(store.getCabinetData().note, "kept");
});

test("the isAdmin mark is read for the active Profile and by name, and kept when profile.json is rewritten", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFolder(`${PROFILES}\\Bob`);
    const store = createProfileStore(fake);

    assert.equal(store.isAdmin(), false, "Guest, the active Profile, is not marked");
    assert.equal(store.isAdmin("Alice"), true);
    assert.equal(store.isAdmin("Bob"), false, "a missing mark is false");
    assert.equal(store.hasAdminProfile(), true);

    store.switchTo("Alice");
    assert.equal(store.isAdmin(), true);
    play(fake, MEDIEVAL, 60);
    assert.equal(readJson(fake, `${PROFILES}\\Alice\\profile.json`).isAdmin, true, "the mark survives a save");
    assert.equal(createProfileStore(fake).isAdmin(), true, "and a restart");
});

test("the isChild mark is read for the active Profile and by name, and kept when profile.json is rewritten", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isChild: true }));
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isChild: 1 }));
    fake.addFile(GUEST_FILE, JSON.stringify({ version: 1, isChild: true }));
    const store = createProfileStore(fake);

    assert.equal(store.isChild(), false, "Guest is never a Child Profile");
    assert.equal(store.isChild("Alice"), true);
    assert.equal(store.isChild("Bob"), false, "a mark that is not a boolean is false");
    assert.equal(store.isAdmin("Alice"), false, "the marks are independent");

    store.switchTo("Alice");
    assert.equal(store.isChild(), true);
    play(fake, MEDIEVAL, 60);
    assert.equal(readJson(fake, `${PROFILES}\\Alice\\profile.json`).isChild, true, "the mark survives a save");
    assert.equal(createProfileStore(fake).isChild(), true, "and a restart");

    const markLines = fake.logLines().filter(line => line.includes("isChild"));
    assert.ok(markLines.some(line => line.includes("guest\\profile.json")), markLines.join("\n"));
    assert.ok(markLines.some(line => line.includes("Bob\\profile.json")), markLines.join("\n"));
});

test("a mark that is not a boolean, or a mark on Guest, is logged once and read as false", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: "yes" }));
    fake.addFile(GUEST_FILE, JSON.stringify({ version: 1, isAdmin: true }));
    const store = createProfileStore(fake);

    assert.equal(store.isAdmin(), false);
    assert.equal(store.isAdmin("Alice"), false);
    assert.equal(store.hasAdminProfile(), false);
    store.hasAdminProfile();
    store.switchTo("Alice");
    play(fake, MEDIEVAL, 60);
    assert.equal(readJson(fake, `${PROFILES}\\Alice\\profile.json`).isAdmin, "yes", "a wrong mark is kept for the player to fix");

    const markLines = fake.logLines().filter(line => line.includes("isAdmin"));
    assert.equal(markLines.length, 2, markLines.join("\n"));
    assert.ok(markLines.some(line => line.includes("guest\\profile.json")));
    assert.ok(markLines.some(line => line.includes("Alice\\profile.json")));
});

test("setMark writes a true mark, clearing removes the key, and the update listeners hear of each", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isChild: "yes", randomGames: 2 }));
    const store = createProfileStore(fake);
    const updates = [];
    store.onUpdate((profileName, change) => updates.push([profileName, change]));

    store.setMark("Bob", "isChild", true);
    assert.equal(readJson(fake, `${PROFILES}\\Bob\\profile.json`).isChild, true, "a wrong hand-written value is replaced");
    assert.equal(store.isChild("Bob"), true);
    assert.equal(readJson(fake, `${PROFILES}\\Bob\\profile.json`).randomGames, 2, "the rest of the file is kept");

    store.setMark("Bob", "isChild", false);
    assert.ok(!("isChild" in readJson(fake, `${PROFILES}\\Bob\\profile.json`)), "a cleared mark leaves no key");
    assert.equal(store.isChild("Bob"), false);
    assert.deepEqual(updates, [["Bob", { isReset: false }], ["Bob", { isReset: false }]]);
});

test("setMark refuses Guest and the Child mark of an Admin Profile, writing nothing", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    const store = createProfileStore(fake);
    const guestBefore = fake.readFile(GUEST_FILE);

    assert.throws(() => store.setMark("guest", "isChild", true), /Guest/);
    assert.throws(() => store.setMark("Alice", "isChild", true), /Alice/);
    assert.throws(() => store.setMark("Alice", "isOld", true), /isOld/);
    assert.equal(fake.readFile(GUEST_FILE), guestBefore);
    assert.ok(!("isChild" in readJson(fake, `${PROFILES}\\Alice\\profile.json`)));
});

test("setMark sets and clears the Admin mark, refusing it on a Child Profile and on the last Admin Profile", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1 }));
    fake.addFile(`${PROFILES}\\Kid\\profile.json`, JSON.stringify({ version: 1, isChild: true }));
    const store = createProfileStore(fake);

    assert.throws(() => store.setMark("Alice", "isAdmin", false), /Alice/, "the last Admin Profile keeps its mark");
    assert.throws(() => store.setMark("Kid", "isAdmin", true), /Kid/);
    assert.throws(() => store.setMark("guest", "isAdmin", true), /Guest/);
    assert.equal(store.isAdmin("Alice"), true);
    assert.ok(!("isAdmin" in readJson(fake, `${PROFILES}\\Kid\\profile.json`)));

    store.setMark("Bob", "isAdmin", true);
    assert.equal(readJson(fake, `${PROFILES}\\Bob\\profile.json`).isAdmin, true);
    store.setMark("Alice", "isAdmin", false);
    assert.ok(!("isAdmin" in readJson(fake, `${PROFILES}\\Alice\\profile.json`)), "with another admin left, the mark clears");
    assert.throws(() => store.setMark("Bob", "isAdmin", false), /Bob/, "Bob is now the last one");

    fake.addFile(`${PROFILES}\\Both\\profile.json`, JSON.stringify({ version: 1, isAdmin: true, isChild: true }));
    store.setMark("Both", "isAdmin", false);
    assert.ok(!("isAdmin" in readJson(fake, `${PROFILES}\\Both\\profile.json`)), "both marks by hand: the Admin one can still go");
});

test("a mark that cannot be saved is rethrown and left unchanged, on the active Profile too", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1 }));
    fake.addFile(`${PROFILES}\\Carol\\profile.json`, JSON.stringify({ version: 1 }));
    const store = createProfileStore(fake);
    store.switchTo("Carol");
    const updates = [];
    store.onUpdate(profileName => updates.push(profileName));

    fake.lockFile(`${PROFILES}\\Bob\\profile.json`);
    fake.lockFile(`${PROFILES}\\Carol\\profile.json`);
    assert.throws(() => store.setMark("Bob", "isChild", true));
    assert.throws(() => store.setMark("Carol", "isChild", true));

    assert.equal(store.isChild("Bob"), false);
    assert.equal(store.isChild(), false, "the active Profile's data in memory is undone");
    assert.deepEqual(updates, []);
});

test("a key that is a mark but for its letter case or spaces is logged once and ignored", () => {
    const fake = createFake();
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, "isAdmin ": true }));
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, IsAdmin: true, isAdmin: false }));
    const store = createProfileStore(fake);

    assert.equal(store.isAdmin("Alice"), false);
    assert.equal(store.isAdmin("Bob"), false);
    assert.equal(store.hasAdminProfile(), false);

    const misspeltLines = fake.logLines().filter(line => line.includes("did you mean"));
    assert.equal(misspeltLines.length, 2, misspeltLines.join("\n"));
    assert.ok(misspeltLines.some(line => line.includes("Alice\\profile.json") && line.includes('"isAdmin "')));
    assert.ok(misspeltLines.some(line => line.includes("Bob\\profile.json") && line.includes('"IsAdmin"')));
});
