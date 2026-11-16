// ============================================================
// An External Add-on registered before the pack adds "Table setup" to the
// main menu (the official command_example): through main.js, the drawn
// main menu shows that entry alone, without the pack's own, and choosing
// it runs the other script's command.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { drawnMenuLines, openMainMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const isTableSetup = line => line.toLowerCase() === "table setup";

test("an earlier script's Table setup entry replaces the pack's own", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 10, 20, 0, 0) });
    fake.addFolder(`${PROFILES}\\Alice`);
    // The External Add-on: a static import of Scripts\main.js registers before the pack.
    const externalCmd = fake.allocateCommand("showTableSetup");
    const externalRuns = [];
    let externalTitle = "Table setup";
    fake.on("menuopen", ev => {
        if (ev.id === "main") ev.addMenuItem({ after: fake.getBuiltInCommand("PlayGame") }, { title: externalTitle, cmd: externalCmd });
    });
    fake.on("command", ev => {
        if (ev.id === externalCmd) externalRuns.push(ev.id);
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    // No Admin Profile: Alice sees the Setup Entries.
    getProfileStore().switchTo("Alice");

    openMainMenu(fake);
    const lines = drawnMenuLines(fake);
    assert.deepEqual(lines.filter(isTableSetup), ["Table setup"], "the other script's entry, once");
    assert.ok(!lines.includes(lang.customMenuLabels.tableSetup), "the pack's own entry gives way");
    assert.equal(lines.indexOf("Table setup"), lines.indexOf("Play") + 1, "in the place of the pack's entry, under Play");

    chooseEntry(fake, "Table setup");
    assert.deepEqual(externalRuns, [externalCmd], "the other script's command runs");
    assert.ok(!fake.executedCommands().includes(fake.getBuiltInCommand("ShowGameSetupMenu")), "not the pack's action");

    // Titled like the pack's own label, in another case.
    externalTitle = lang.customMenuLabels.tableSetup.toUpperCase();
    openMainMenu(fake);
    const ownLabel = lang.customMenuLabels.tableSetup.toLowerCase();
    assert.deepEqual(drawnMenuLines(fake).filter(line => line.toLowerCase() === ownLabel), [externalTitle], "still a single entry");
    assertNoErrorLogged(fake);
});
