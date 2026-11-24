// ============================================================
// The History Import offered again once its Profile is removed, through
// main.js on the fake PinballY globals with Drawn Menus: before, the line is
// greyed on every Profile naming the importer; after "Remove", another
// Profile takes the whole left-over over, the removed Profile's Plays no longer counted.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, squeezed, press, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

const MEDIEVAL = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false,
    playCount: 12, playTime: 18000, lastPlayed: new Date(2026, 5, 1, 21, 30, 0),
};
const MARS = {
    id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", isHidden: false,
    playCount: 3, playTime: 3600, lastPlayed: new Date(2026, 4, 2, 10, 0, 0),
};

test("removing the Profile that took over PinballY's history offers it again to the others", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 21, 20, 0, 0), tables: [MEDIEVAL, MARS] });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    const bobFile = JSON.stringify({
        version: 1,
        plays: {
            [MEDIEVAL.configId]: { count: 12, seconds: 18000, lastPlayed: "2026-06-01T21:30:00" },
            [MARS.configId]: { count: 3, seconds: 3600, lastPlayed: "2026-05-02T10:00:00" },
        },
        historyImport: { date: "2026-11-01T20:00:00" },
    });
    fake.addFile(profileFile("Bob"), bobFile);
    fake.addFile(profileFile("Chloe"), JSON.stringify({
        version: 1, plays: { [MEDIEVAL.configId]: { count: 2, seconds: 300, lastPlayed: "2026-11-20T21:00:00" } },
    }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    const store = getProfileStore();
    store.switchTo("Alice");

    const openProfileMenu = name => {
        openOperatorMenu(fake);
        chooseEntry(fake, TEXT.menuEntry);
        chooseEntry(fake, name);
    };
    const historyRow = () => readDrawnMenu(fake).rows.find(row => row.title === TEXT.historyLine);

    openProfileMenu("Chloe");
    assert.equal(historyRow().reason, TEXT.historyRefusals.done("Bob"), "greyed while Bob holds it");
    press(fake, "Exit");
    chooseEntry(fake, TEXT.cancel);

    openProfileMenu("Bob");
    chooseEntry(fake, TEXT.remove);
    chooseEntry(fake, TEXT.removeYes);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.removeDone("Bob")));
    press(fake, "Select");
    press(fake, "Exit");
    assert.equal(fake.readFile(`${PROFILES}\\_Bob removed 2026-11-21\\profile.json`), bobFile, "Bob's record kept aside");

    openProfileMenu("Chloe");
    assert.equal(historyRow().reason, undefined, "offered to Chloe");
    chooseEntry(fake, TEXT.historyLine);
    // PinballY's 15 games and 21600 s minus Chloe's 2 and 300 s only.
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.historyConfirm("Chloe", 13, 6, 2) + TEXT.historyWarning));
    chooseEntry(fake, TEXT.historyYes);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.historyDone("Chloe", 13, 6, 2)));
    press(fake, "Select");
    assert.deepEqual(store.getPlaysOf("Chloe"), {
        [MEDIEVAL.configId]: { count: 12, seconds: 18000, lastPlayed: "2026-11-20T21:00:00" },
        [MARS.configId]: { count: 3, seconds: 3600, lastPlayed: "2026-05-02T10:00:00" },
    });
    assert.equal(store.getHistoryImportProfile(), "Chloe");

    openProfileMenu("Alice");
    assert.equal(historyRow().reason, TEXT.historyRefusals.done("Chloe"), "greyed again, naming Chloe");

    assertNoErrorLogged(fake);
});
