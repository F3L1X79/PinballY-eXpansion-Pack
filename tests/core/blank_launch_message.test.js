// ============================================================
// An External Add-on registered before the pack blanks PinballY's launch
// message: through main.js with the Seamless Launch Overlay off, UI
// Translation leaves it blank, and still translates the other messages.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { installVpxtool } from "../support/vpxtool.js";

test("a launch message blanked by an earlier listener stays blank, the others are translated", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 17, 20, 0, 0), tables: [{ configId: "afm", title: "Attack from Mars" }] });
    const game = fake.getAllTables()[0];
    installVpxtool(fake);
    // The External Add-on: a static import of Scripts\main.js registers before the pack.
    fake.on("launchoverlaymessage", ev => {
        if (ev.id === "launching") ev.message = "";
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    config.addOns.seamlessLaunchOverlay = false;
    config.language = "en";
    await import("../../main.js");
    await settle();
    // The events as PinballY reads them back once every listener has run.
    const messages = new Map();
    fake.on("launchoverlaymessage", ev => messages.set(ev.id, ev.message));

    fake.playGame(game);
    fake.gameStarted(game);
    assert.equal(messages.get("launching"), "", "the other script's blank message stays");
    assert.equal(messages.get("init"), "", "PinballY's null message is translated");
    fake.runCommand(fake.getBuiltInCommand("KillGame"));
    assert.equal(messages.get("terminating"), "Returning to tables…", "PinballY's text is translated");
    fake.gameOver(game);
    assertNoErrorLogged(fake);
});
