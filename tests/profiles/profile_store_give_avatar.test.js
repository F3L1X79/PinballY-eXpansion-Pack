// ============================================================
// Profile store giving a Profile an image, at the host seam on the fake
// file system: copied as the Profile's avatar.png, replacing one already
// there, with no key in profile.json, its Own Picture (avatar.jpg) then set
// aside as avatar.jpg.bak and taken back from there; a failed copy throws.
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

test("a portrait given over an Own Picture in use sets the photo aside as avatar.jpg.bak, after the copy", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Max" }));
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg`, "Max's photo");
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);
    const told = [];
    store.onAvatarChange(profileName => told.push([profileName, store.getActiveProfile().avatarPath]));

    store.giveAvatar("Max", PORTRAIT);

    const operations = fake.fileOperations().filter(operation => `${operation.path} ${operation.to ?? ""}`.includes("\\Max\\avatar"));
    assert.deepEqual(operations.map(operation => operation.operation), ["copy", "rename"], "the copy first, then the rename");
    assert.equal(fake.files.fileExists(`${PROFILES}\\Max\\avatar.jpg`), false);
    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.jpg.bak`), "Max's photo", "the photo is kept");
    assert.deepEqual(store.getOwnPictureOf("Max"), { path: `${PROFILES}\\Max\\avatar.jpg.bak`, isInUse: false });
    assert.deepEqual(told, [["Max", `${PROFILES}\\Max\\avatar.png`]], "the Profile wears the portrait at once");
});

test("a newer photo set aside replaces the older avatar.jpg.bak, which is logged", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg`, "newer photo");
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg.bak`, "older photo");
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);

    store.giveAvatar("Max", PORTRAIT);

    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.jpg.bak`), "newer photo");
    assert.ok(fake.logLines().some(line => line.includes("Max") && line.includes("older avatar.jpg.bak")), "the older one replaced is logged");
});

test("the Own Picture in use is the one shown when a set-aside one is there too", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg`, "newer photo");
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg.bak`, "older photo");
    fake.addFolder(`${PROFILES}\\Zoe`);
    const store = createProfileStore(fake);

    assert.deepEqual(store.getOwnPictureOf("max"), { path: `${PROFILES}\\Max\\avatar.jpg`, isInUse: true });
    assert.equal(store.getOwnPictureOf("Zoe"), null, "no photo, no Own Picture");
});

test("the set-aside Own Picture taken back becomes avatar.jpg again, worn at once", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Max" }));
    fake.addFile(`${PROFILES}\\Max\\avatar.png`, "portrait 7");
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg.bak`, "Max's photo");
    const store = createProfileStore(fake);
    const told = [];
    store.onAvatarChange(profileName => told.push([profileName, store.getActiveProfile().avatarPath]));

    store.wearOwnPicture("max");

    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.jpg`), "Max's photo");
    assert.equal(fake.files.fileExists(`${PROFILES}\\Max\\avatar.jpg.bak`), false);
    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.png`), "portrait 7", "the portrait may stay: avatar.jpg wins");
    assert.deepEqual(told, [["Max", `${PROFILES}\\Max\\avatar.jpg`]]);

    const operationsBefore = fake.fileOperations().length;
    store.wearOwnPicture("Max");
    assert.equal(fake.fileOperations().length, operationsBefore, "the Own Picture in use: nothing changes");
    assert.equal(told.length, 1, "nothing to tell");
});

test("a failed copy over an Own Picture in use leaves it in use; a failed rename throws, the photo still worn", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Max" }));
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg`, "Max's photo");
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);
    const told = [];
    store.onAvatarChange(profileName => told.push(profileName));

    fake.failNextCopy();
    assert.throws(() => store.giveAvatar("Max", PORTRAIT), /Permission denied/);
    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.jpg`), "Max's photo");
    assert.equal(fake.files.fileExists(`${PROFILES}\\Max\\avatar.png`), false, "a failed copy changes nothing");

    fake.lockFile(`${PROFILES}\\Max\\avatar.jpg`);
    assert.throws(() => store.giveAvatar("Max", PORTRAIT), /Permission denied/);
    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.jpg`), "Max's photo", "the photo stays in place");
    assert.equal(store.getActiveProfile().avatarPath, `${PROFILES}\\Max\\avatar.jpg`, "and worn");
    assert.deepEqual(told, [], "nothing to tell");
});

test("a failed rename keeps the older avatar.jpg.bak it would have replaced", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg`, "newer photo");
    fake.addFile(`${PROFILES}\\Max\\avatar.jpg.bak`, "older photo");
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);

    fake.lockFile(`${PROFILES}\\Max\\avatar.jpg`);
    assert.throws(() => store.giveAvatar("Max", PORTRAIT), /Permission denied/);
    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.jpg`), "newer photo");
    assert.equal(fake.files.readText(`${PROFILES}\\Max\\avatar.jpg.bak`), "older photo", "the older photo is not lost");
    assert.deepEqual(fake.files.listFiles(`${PROFILES}\\Max`).sort(), ["avatar.jpg", "avatar.jpg.bak", "avatar.png"], "nothing left over");
});

test("an image given to no Profile throws, copying nothing", () => {
    const fake = createFakePinballYHost();
    fake.addFile(PORTRAIT, "portrait 7");
    const store = createProfileStore(fake);

    assert.throws(() => store.giveAvatar("Nobody", PORTRAIT), /Nobody/);
    assert.equal(fake.files.listFolders(PROFILES).includes("Nobody"), false);
});
