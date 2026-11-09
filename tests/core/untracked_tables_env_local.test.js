// ============================================================
// UNTRACKED_TABLES read from .env.local at load: empty by default, and the
// listed tables are out of the visible tables from then on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";

const PROJECT = "C:\\PinballY\\Scripts\\ExpansionPack";

test("UNTRACKED_TABLES in .env.local takes the listed tables out of the visible tables", async () => {
    const fake = createFakePinballYHost({
        tables: [
            { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" },
            { id: 2, configId: "Media Player", title: "Media Player" },
            { id: 3, configId: "Jukebox (Homebrew)", title: "Jukebox" },
        ],
    });
    fake.addFile(`${PROJECT}\\.env.local`, "UNTRACKED_TABLES=Media Player, Jukebox\r\n");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();

    // Imported after the globals, so the configuration reads .env.local.
    const { default: config, DEFAULTS } = await import("../../common/core/config.js");
    const { createPinballYHost } = await import("../../common/core/pinbally_host.js");

    assert.equal(DEFAULTS.untrackedTables, "");
    assert.equal(config.untrackedTables, "Media Player, Jukebox");
    assert.deepEqual(createPinballYHost().getVisibleTables().map(game => game.title), ["Medieval Madness"]);
});
