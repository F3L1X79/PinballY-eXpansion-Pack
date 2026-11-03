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
