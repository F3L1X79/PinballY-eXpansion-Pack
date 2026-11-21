// ============================================================
// Profile store at startup, Guest's Avatar files: the avatar.png shipped up
// to v1.7.3 (known by its size) goes once the shipped avatar.jpg is there,
// which an update merges in next to it; any other picture is left alone, and
// a failed deletion is logged without stopping the start.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

const GUEST = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest";
const OLD_PNG = `${GUEST}\\avatar.png`;
const SHIPPED_JPG = `${GUEST}\\avatar.jpg`;
const SET_ASIDE_JPG = `${GUEST}\\avatar.jpg.bak`;
const OLD_SHIPPED_PICTURE = "x".repeat(1210489);

const guestAvatarOf = store => store.listProfiles().find(profile => profile.isGuest).avatarPath;

test("Guest's old shipped avatar.png goes when the shipped avatar.jpg is there, and Guest wears it as its Own Picture", () => {
    const fake = createFakePinballYHost();
    fake.addFile(OLD_PNG, OLD_SHIPPED_PICTURE);
    fake.addFile(SHIPPED_JPG, "shipped jpg");

    const store = createProfileStore(fake);

    assert.equal(fake.files.fileExists(OLD_PNG), false);
    assert.equal(fake.files.readText(SHIPPED_JPG), "shipped jpg");
    assert.equal(guestAvatarOf(store), SHIPPED_JPG);
    assert.deepEqual(store.getOwnPictureOf("Guest"), { path: SHIPPED_JPG, isInUse: true });
    assert.ok(fake.logLines().some(line => line.includes("avatar.png") && line.includes("deleted")), "the deletion is logged");
    assertNoErrorLogged(fake);
});

test("a fresh install leaves Guest's shipped avatar.jpg as its Own Picture", () => {
    const fake = createFakePinballYHost();
    fake.addFile(SHIPPED_JPG, "shipped jpg");

    const store = createProfileStore(fake);

    assert.equal(guestAvatarOf(store), SHIPPED_JPG);
    assert.deepEqual(store.getOwnPictureOf("Guest"), { path: SHIPPED_JPG, isInUse: true });
    assertNoErrorLogged(fake);
});

test("without the shipped avatar.jpg, Guest keeps its old avatar.png and the log says why it has no Own Picture", () => {
    const fake = createFakePinballYHost();
    fake.addFile(OLD_PNG, OLD_SHIPPED_PICTURE);

    const store = createProfileStore(fake);

    assert.equal(fake.files.readText(OLD_PNG), OLD_SHIPPED_PICTURE);
    assert.equal(guestAvatarOf(store), OLD_PNG);
    assert.ok(fake.logLines().some(line => line.includes("avatar.jpg") && line.includes("missing")));
    assertNoErrorLogged(fake);
});

test("nothing is done when Guest has set its picture aside, or wears an avatar.png of another size", () => {
    const setAside = createFakePinballYHost();
    setAside.addFile(OLD_PNG, OLD_SHIPPED_PICTURE);
    setAside.addFile(SET_ASIDE_JPG, "shipped jpg");
    setAside.addFile(SHIPPED_JPG, "the owner's photo");
    createProfileStore(setAside);
    assert.equal(setAside.files.fileExists(OLD_PNG), true, "with avatar.jpg.bak");
    assert.equal(setAside.files.readText(SHIPPED_JPG), "the owner's photo");
    assert.equal(setAside.files.readText(SET_ASIDE_JPG), "shipped jpg");

    const otherPicture = createFakePinballYHost();
    otherPicture.addFile(OLD_PNG, "a portrait Guest chose");
    otherPicture.addFile(SHIPPED_JPG, "shipped jpg");
    createProfileStore(otherPicture);
    assert.equal(otherPicture.files.readText(OLD_PNG), "a portrait Guest chose", "another size");

    const noJpg = createFakePinballYHost();
    noJpg.addFile(OLD_PNG, "the owner's picture");
    createProfileStore(noJpg);
    assert.equal(noJpg.files.readText(OLD_PNG), "the owner's picture");
    assert.ok(!noJpg.logLines().some(line => line.includes("missing")), "nothing to say about another picture");

    for (const fake of [setAside, otherPicture, noJpg]) assertNoErrorLogged(fake);
});

test("a deletion that fails is logged and the start goes on with Guest's current Avatar", () => {
    const fake = createFakePinballYHost();
    fake.addFile(OLD_PNG, OLD_SHIPPED_PICTURE);
    fake.addFile(SHIPPED_JPG, "shipped jpg");
    fake.lockFile(OLD_PNG);

    const store = createProfileStore(fake);

    assert.equal(fake.files.fileExists(OLD_PNG), true);
    assert.equal(guestAvatarOf(store), SHIPPED_JPG);
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /avatar\.png/);
});
