// ============================================================
// Profile store creating a Profile, at the host seam on the fake file
// system: an empty folder and nothing else, listed afresh, starting from
// zero, the active Profile unchanged; a refused name creates nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const GUEST_NAME_SHOWN = "Gast";

test("creating a Profile makes an empty folder, listed in its place, and keeps the active Profile", () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES}\\Zoe`);
    const store = createProfileStore(fake);

    store.createProfile("Max", GUEST_NAME_SHOWN);

    assert.deepEqual(store.listProfiles().map(profile => profile.name), ["guest", "Max", "Zoe"]);
    assert.equal(fake.files.fileExists(`${PROFILES}\\Max\\profile.json`), false, "no profile.json for a Profile with no mark");
    assert.deepEqual(store.getPlaysOf("Max"), {}, "it starts from zero");
    assert.equal(store.getActiveProfile().name, "guest");
});

test("the first Profile of an empty Household is an Admin Profile, and the active Profile stays Guest", () => {
    const fake = createFakePinballYHost();
    const store = createProfileStore(fake);
    assert.equal(store.isHouseholdEmpty(), true);

    assert.equal(store.createProfile("Max", GUEST_NAME_SHOWN), "Max");

    assert.equal(JSON.parse(fake.files.readText(`${PROFILES}\\Max\\profile.json`)).isAdmin, true);
    assert.equal(store.isAdmin("Max"), true);
    assert.equal(store.getActiveProfile().name, "guest");
    assert.equal(store.isAdmin(), false);
    assert.equal(store.isHouseholdEmpty(), false);
});

test("a Profile created in a Household that has one gets no mark, marked or not", () => {
    const unmarked = createFakePinballYHost();
    unmarked.addFolder(`${PROFILES}\\Zoe`);
    const storeWithUnmarked = createProfileStore(unmarked);
    assert.equal(storeWithUnmarked.isHouseholdEmpty(), false);
    storeWithUnmarked.createProfile("Max", GUEST_NAME_SHOWN);
    assert.equal(storeWithUnmarked.hasAdminProfile(), false, "a cabinet left open on purpose stays open");

    const marked = createFakePinballYHost();
    marked.addFile(`${PROFILES}\\Zoe\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    const storeWithMarked = createProfileStore(marked);
    storeWithMarked.createProfile("Max", GUEST_NAME_SHOWN);
    assert.equal(storeWithMarked.isAdmin("Max"), false);
    assert.equal(marked.files.fileExists(`${PROFILES}\\Max\\profile.json`), false);
});

test("a first Profile created by hand gets no mark, and only Guest and set-aside folders leave the Household empty", () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES}\\_Parked`);
    const store = createProfileStore(fake);
    assert.equal(store.isHouseholdEmpty(), true, "a folder set aside is not a Profile");

    fake.addFolder(`${PROFILES}\\Zoe`);

    assert.equal(store.isHouseholdEmpty(), false);
    assert.equal(store.hasAdminProfile(), false);
    assert.equal(fake.files.fileExists(`${PROFILES}\\Zoe\\profile.json`), false);
});

test("a mark that cannot be saved keeps the Profile, unmarked, and is logged", () => {
    const fake = createFakePinballYHost();
    const store = createProfileStore(fake);
    fake.lockFile(`${PROFILES}\\Max\\profile.tmp.json`);
    // The error goes to PinballY's logfile, like any failing handler's.
    const uninstallGlobals = fake.installGlobals();
    try {
        assert.equal(store.createProfile("Max", GUEST_NAME_SHOWN), "Max");

        assert.deepEqual(store.listProfileNames(), ["guest", "Max"]);
        assert.equal(store.hasAdminProfile(), false);
        assert.equal(fake.logLines().filter(line => line.startsWith("[ProfileStore] ERROR") && line.includes("Permission denied")).length, 1);
    } finally {
        uninstallGlobals();
    }
});

test("a refused name throws and creates nothing", () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES}\\Zoe`);
    const store = createProfileStore(fake);
    const foldersBefore = fake.files.listFolders(PROFILES);

    for (const name of ["", "-", "guest", "GUEST", "Guest", "Gast", "gast", "con", "NUL", "zoe", "ZOE-"]) {
        assert.throws(() => store.createProfile(name, GUEST_NAME_SHOWN), /cannot be used/, name);
    }

    assert.deepEqual(fake.files.listFolders(PROFILES), foldersBefore);
});

test("a trailing hyphen is dropped before creating, and the name created is handed back", () => {
    const fake = createFakePinballYHost();
    const store = createProfileStore(fake);

    assert.equal(store.createProfile("Max-", GUEST_NAME_SHOWN), "Max");

    assert.deepEqual(store.listProfileNames(), ["guest", "Max"]);
});

test("names that merely look like another are created", () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES}\\Félix`);
    fake.addFolder(`${PROFILES}\\_Max`);
    const store = createProfileStore(fake);

    store.createProfile("Felix", GUEST_NAME_SHOWN);
    store.createProfile("Max", GUEST_NAME_SHOWN);

    assert.deepEqual(store.listProfileNames(), ["guest", "Felix", "Félix", "Max"]);
});

test("a folder that cannot be created throws and lists nothing new", () => {
    const fake = createFakePinballYHost();
    const store = createProfileStore(fake);
    fake.failNextFolderCreation();

    assert.throws(() => store.createProfile("Max", GUEST_NAME_SHOWN));

    assert.deepEqual(store.listProfileNames(), ["guest"]);
    assert.equal(store.createProfile("Max", GUEST_NAME_SHOWN), "Max", "the next try goes through");
});
