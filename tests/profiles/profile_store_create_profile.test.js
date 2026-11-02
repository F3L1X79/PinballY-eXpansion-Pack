// ============================================================
// Profile store creating a Profile, at the host seam on the fake file
// system: an empty folder and nothing else, listed afresh, starting from
// zero, the active Profile unchanged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("creating a Profile makes an empty folder, listed in its place, and keeps the active Profile", () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES}\\Zoe`);
    const store = createProfileStore(fake);

    store.createProfile("Max");

    assert.deepEqual(store.listProfiles().map(profile => profile.name), ["guest", "Max", "Zoe"]);
    assert.equal(fake.files.fileExists(`${PROFILES}\\Max\\profile.json`), false, "no profile.json for a Profile with no mark");
    assert.deepEqual(store.getPlaysOf("Max"), {}, "it starts from zero");
    assert.equal(store.getActiveProfile().name, "guest");
});
