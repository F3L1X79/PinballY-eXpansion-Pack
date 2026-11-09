// ============================================================
// Untracked Tables at the PinballY host seam: on both adapters, a table
// listed in UNTRACKED_TABLES leaves the visible tables and stays on the
// wheel; names are trimmed and compared exactly, empty entries ignored.
// ============================================================

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createPinballYHost, isVisibleTable } from "../../common/core/pinbally_host.js";
import { setUntrackedTables } from "../../common/core/untracked_tables.js";

const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" };
const PLAYER = { id: 2, configId: "Media Player", title: "Media Player" };
const JUKEBOX = { id: 3, configId: "Jukebox (Homebrew)", title: "Jukebox" };
const TABLES = [MEDIEVAL, PLAYER, JUKEBOX];

const titles = games => games.map(game => game.title);

const ADAPTERS = [
    { name: "fake host", createHost: fake => fake },
    { name: "production host over fake globals", createHost: () => createPinballYHost(), usesGlobals: true },
];

for (const { name, createHost, usesGlobals } of ADAPTERS) {
    describe(name, () => {
        let fake;
        let host;
        let uninstallGlobals = () => {};

        beforeEach(() => {
            fake = createFakePinballYHost({ tables: TABLES });
            if (usesGlobals) uninstallGlobals = fake.installGlobals();
            host = createHost(fake);
        });

        afterEach(() => {
            uninstallGlobals();
            setUntrackedTables("");
        });

        test("a listed table leaves the visible tables and stays on the wheel", () => {
            setUntrackedTables("Media Player");

            assert.deepEqual(titles(host.getVisibleTables()), ["Medieval Madness", "Jukebox"]);
            assert.deepEqual(titles(host.getWheelTables()), ["Medieval Madness", "Media Player", "Jukebox"]);
            assert.deepEqual(titles(host.getAllTables()), ["Medieval Madness", "Media Player", "Jukebox"]);
        });

        test("names are trimmed and empty entries ignored", () => {
            setUntrackedTables("  Media Player , ,Jukebox,");

            assert.deepEqual(titles(host.getVisibleTables()), ["Medieval Madness"]);
        });

        test("back in the visible tables once the list is empty", () => {
            setUntrackedTables("Media Player");
            setUntrackedTables("");

            assert.deepEqual(titles(host.getVisibleTables()), ["Medieval Madness", "Media Player", "Jukebox"]);
        });

        test("a title is compared exactly", () => {
            setUntrackedTables("media player,Juke");

            assert.deepEqual(titles(host.getVisibleTables()), ["Medieval Madness", "Media Player", "Jukebox"]);
        });
    });
}

test("isVisibleTable is false for a listed table only", () => {
    setUntrackedTables("Media Player");

    assert.equal(isVisibleTable(PLAYER), false);
    assert.equal(isVisibleTable(MEDIEVAL), true);
    setUntrackedTables("");
});
