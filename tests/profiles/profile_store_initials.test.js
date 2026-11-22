// ============================================================
// A Profile's Initials at the Profile store's seam, on the fake file system:
// set, read, cleared, kept through a Profile Reset; refused for Guest,
// anything but three letters A-Z, and Initials another Profile holds;
// invalid Initials edited by hand logged once and read as none.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

function createStore(profiles) {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0) });
    fake.addFolder(`${PROFILES}\\guest`);
    for (const [name, data] of Object.entries(profiles)) fake.addFile(profileFile(name), JSON.stringify({ version: 1, ...data }));
    return { fake, store: createProfileStore(fake) };
}

const fileOf = (fake, name) => fake.readFile(profileFile(name)) ?? null;

test("a Profile without Initials reads none", () => {
    const { store } = createStore({ Alice: {} });
    assert.equal(store.getInitialsOf("Alice"), null);
});

test("Initials set are read back, kept through a Profile Reset, then cleared", () => {
    const { store } = createStore({ Alice: { isAdmin: true } });
    store.setInitials("Alice", "FEL");
    assert.equal(store.getInitialsOf("Alice"), "FEL");
    assert.equal(store.getInitialsOf("alice"), "FEL", "by the Profile's name in any case");

    store.resetProfile("Alice");
    assert.equal(store.getInitialsOf("Alice"), "FEL", "kept through a Profile Reset");

    store.clearInitials("Alice");
    assert.equal(store.getInitialsOf("Alice"), null);
});

test("Initials held by another Profile are found, in any letter case", () => {
    const { store } = createStore({ Alice: {}, Bob: {} });
    store.setInitials("Alice", "FEL");
    assert.equal(store.findInitialsHolder("fel"), "Alice");
    assert.equal(store.findInitialsHolder("BOB"), null);
});

test("setting refuses Guest, anything but three letters A-Z, and Initials another Profile holds, writing nothing", () => {
    const { fake, store } = createStore({ Alice: {}, Bob: {} });
    store.setInitials("Alice", "FEL");
    const before = { guest: fileOf(fake, "guest"), Alice: fileOf(fake, "Alice"), Bob: fileOf(fake, "Bob") };

    assert.throws(() => store.setInitials("guest", "GST"), /Guest/);
    for (const refused of ["", "AB", "ABCD", "ab1", "A-B", "abc", "ÉRI"]) {
        assert.throws(() => store.setInitials("Bob", refused), /three capital letters/, JSON.stringify(refused));
    }
    assert.throws(() => store.setInitials("Bob", "FEL"), /Alice/, "held by Alice");

    assert.deepEqual({ guest: fileOf(fake, "guest"), Alice: fileOf(fake, "Alice"), Bob: fileOf(fake, "Bob") }, before);
    assert.equal(store.getInitialsOf("Bob"), null);
});

test("a Profile setting its own Initials again is not refused as holding them", () => {
    const { store } = createStore({ Alice: {} });
    store.setInitials("Alice", "FEL");
    store.setInitials("Alice", "FEL");
    store.setInitials("Alice", "FLX");
    assert.equal(store.getInitialsOf("Alice"), "FLX");
});

test("invalid Initials edited by hand are logged once and read as none", () => {
    const { fake, store } = createStore({
        guest: { initials: "GST" }, Alice: { initials: "fe" }, Bob: { initials: 42 }, Carol: { initials: "fel" },
    });
    for (const name of ["guest", "Alice", "Bob", "Carol"]) {
        assert.equal(store.getInitialsOf(name), null, name);
        assert.equal(store.getInitialsOf(name), null, `${name}, read again`);
    }
    const problems = fake.logLines().filter(line => line.includes("initials"));
    assert.equal(problems.length, 4, problems.join("\n"));
    assert.equal(store.findInitialsHolder("FEL"), null, "invalid Initials hold nothing");
});
