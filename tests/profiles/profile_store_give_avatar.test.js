// ============================================================
// Profile store giving a Profile an image, at the host seam on the fake
// file system: copied as the Profile's avatar.png, replacing one already
// there, with no key in profile.json; a failed copy throws.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const PORTRAIT = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\avatar_choice\\avatar_choice_07.png";

test("an image given to a Profile becomes its avatar.png, replacing the one there, and its Avatar", () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES}\\Max`);
    fake.addFile(`${PROFILES}\\Zoe\\avatar.png`, "Zoe's own");
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);

    store.giveAvatar("max", PORTRAIT);
    store.giveAvatar("Zoe", PORTRAIT);

    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.png`), "portrait 7");
    assert.equal(fake.files.readText(`${PROFILES}\\Zoe\\avatar.png`), "portrait 7", "the copy overwrites");
    assert.equal(fake.files.fileExists(PORTRAIT), true, "the pack keeps its portrait");
    assert.equal(store.listProfiles().find(profile => profile.name === "Max").avatarPath, `${PROFILES}\\Max\\avatar.png`);
    assert.equal(fake.files.fileExists(`${PROFILES}\\Max\\profile.json`), false, "nothing records the portrait taken");
    assert.ok(fake.logLines().some(line => line.includes("Max") && line.includes(PORTRAIT)), "the copy is logged");
});

test("a given image is told to the listeners, and the active Profile wears it at once", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Max" }));
    fake.addFolder(`${PROFILES}\\Max`);
    fake.addFolder(`${PROFILES}\\Zoe`);
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);
    const told = [];
    store.onAvatarChange(profileName => told.push([profileName, store.getActiveProfile().avatarPath]));

    store.giveAvatar("max", PORTRAIT);
    store.giveAvatar("Zoe", PORTRAIT);

    const maxAvatar = `${PROFILES}\\Max\\avatar.png`;
    assert.deepEqual(told, [["Max", maxAvatar], ["Zoe", maxAvatar]], "told by folder name, the active Profile's Avatar already new");
});

test("a failed copy throws and leaves the Profile with the Default Avatar", () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES}\\Max`);
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);
    const told = [];
    store.onAvatarChange(profileName => told.push(profileName));

    fake.failNextCopy();
    assert.throws(() => store.giveAvatar("Max", PORTRAIT));
    assert.deepEqual(told, [], "nothing to tell");

    assert.equal(fake.files.fileExists(`${PROFILES}\\Max\\avatar.png`), false);
    assert.match(store.listProfiles().find(profile => profile.name === "Max").avatarPath, /default_avatar\.png$/);
});

test("an image given to no Profile throws, copying nothing", () => {
    const fake = createFakePinballYHost();
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);

    assert.throws(() => store.giveAvatar("Nobody", PORTRAIT), /Nobody/);
    assert.equal(fake.files.listFolders(PROFILES).includes("Nobody"), false);
});
