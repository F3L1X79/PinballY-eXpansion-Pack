// ============================================================
// "Every Profile" in the Profile Reset list: one confirmation, then every
// Profile starts over with its dated copy and marks. A failing Profile is named and does not stop others.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";

const NOW = new Date(2026, 9, 1, 20, 15, 30);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const COPY_NAME = "profile.reset-2026-10-01_20-15-30.json";

test("Every Profile resets them all, and a failing one does not stop the others", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "customMenuCommands";
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    const GUEST = lang.profiles.guestName;
    await import("../../main.js");
    await settle();

    const openList = () => {
        fake.openOperatorMenu();
        fake.selectMenuItem(TEXT.menuEntry);
        return fake.currentMenu().items.map(item => item.title ?? "");
    };
    const shownMessage = () => {
        const menu = fake.currentMenu();
        return {
            titles: menu.items.map(item => item.title ?? ""),
            selected: menu.items.filter(item => item.selected).map(item => item.title),
            dialogStyle: menu.options.dialogStyle,
        };
    };

    const guestFile = JSON.stringify({ version: 1, randomGames: 1 });
    const aliceFile = JSON.stringify({ version: 1, isAdmin: true, randomGames: 4 });
    const bobFile = JSON.stringify({ version: 1, isChild: true, randomGames: 3 });
    fake.addFile(profileFile("guest"), guestFile);
    fake.addFile(profileFile("Alice"), aliceFile);
    fake.addFile(profileFile("Bob"), bobFile);
    fake.addFile(profileFile("Carol"), JSON.stringify({ version: 1, randomGames: 2 }));
    getProfileStore().switchTo("Alice");

    assert.deepEqual(openList(),
        [TEXT.listTitle, "", GUEST, "Alice", "Bob", "Carol", "", TEXT.everyProfile, "", TEXT.cancel],
        "the list ends with Every Profile and Cancel, each after a separator");
    fake.selectMenuItem(TEXT.everyProfile);
    assert.deepEqual(shownMessage(), {
        titles: [TEXT.confirmEvery(4), "", TEXT.yes, TEXT.no], selected: [TEXT.no], dialogStyle: true,
    }, "one confirmation citing the number of Profiles, cursor on No");
    fake.selectMenuItem(TEXT.no);
    assert.equal(fake.currentMenu(), null);
    assert.equal(fake.readFile(profileFile("Bob")), bobFile, "No changes nothing");

    fake.lockFile(profileFile("Bob"));
    openList();
    fake.selectMenuItem(TEXT.everyProfile);
    fake.selectMenuItem(TEXT.yes);
    assert.deepEqual(shownMessage(), {
        titles: [TEXT.everyFailed(3, ["Bob"]), "", TEXT.ok], selected: [TEXT.ok], dialogStyle: true,
    }, "the message gives the count reset and names the failed Profile");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^\[ProfileReset\] .*Permission denied: .*\\Bob\\/s, "the failure is logged");
    for (const name of ["guest", "Alice", "Carol"]) {
        assert.equal(JSON.parse(fake.readFile(profileFile(name))).randomGames, 0, `${name} starts over`);
        assert.ok(fake.readFile(`${PROFILES}\\${name}\\${COPY_NAME}`), `${name} keeps its dated copy`);
    }
    assert.equal(fake.readFile(`${PROFILES}\\guest\\${COPY_NAME}`), guestFile);
    assert.equal(fake.readFile(`${PROFILES}\\Alice\\${COPY_NAME}`), aliceFile);
    assert.equal(JSON.parse(fake.readFile(profileFile("Alice"))).isAdmin, true, "Alice keeps her Admin mark");
    assert.ok(getProfileStore().isAdmin("Alice"));
    fake.selectMenuItem(TEXT.ok);
    assert.equal(fake.currentMenu(), null, "OK closes the message");

    fake.unlockFile(profileFile("Bob"));
    openList();
    fake.selectMenuItem(TEXT.everyProfile);
    fake.selectMenuItem(TEXT.yes);
    assert.deepEqual(shownMessage(), {
        titles: [TEXT.everyDone(4), "", TEXT.ok], selected: [TEXT.ok], dialogStyle: true,
    }, "when all succeed, the message gives the count reset");
    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).randomGames, 0);
    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).isChild, true, "Bob keeps his Child mark");
    assert.equal(errorLines(fake).length, 1, "no new failure");
});
