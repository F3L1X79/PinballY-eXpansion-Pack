// ============================================================
// The Young Players family when an Admin Profile clears a Profile's Child
// mark from Manage profiles, then sets it again, through main.js on the
// fake PinballY globals: the child loses Snack Time, then finds it
// Unlocked again with no new toast.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startSurprisesScenario, showsUnlocked, profileFile } from "./surprises_scenario.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Longer than every toast a Profile switch brings.
const ALL_TOASTS_MS = 600000;

test("a Child mark cleared then set again from the menu brings Young Players back with no toast", async () => {
    // Monday 5 October 2026.
    const { fake, store, TEXT, waitUntil, play, listRows, switchTo } = await startSurprisesScenario({
        now: new Date(2026, 9, 5, 9, 0, 0),
        files: { [profileFile("Carol")]: JSON.stringify({ version: 1, isAdmin: true }) },
        addOns: ["customMenuCommands"],
    });
    const { profileReset: MENU_TEXT } = (await import("../../common/core/i18n.js")).default;
    const snackTime = { title: TEXT.snackTimeTitle(), description: TEXT.snackTimeDescription() };
    // Carol, an Admin Profile, flips Bob's Child mark from his menu.
    const flipBobsChildMark = async () => {
        await switchTo("Carol");
        fake.openOperatorMenu();
        fake.selectMenuItem(MENU_TEXT.menuEntry);
        fake.selectMenuItem("Bob");
        fake.selectMenuItem(MENU_TEXT.childLine(store.isChild("Bob")));
        fake.selectMenuItem(MENU_TEXT.back);
    };
    const toastsOnSwitchTo = async (name) => {
        const before = toastDrawings(fake).length;
        await switchTo(name);
        fake.advanceTime(ALL_TOASTS_MS);
        return toastDrawings(fake).slice(before).flatMap(drawing => drawing.texts);
    };

    await switchTo("Bob");
    waitUntil(2026, 9, 6, 16, 30);
    assert.ok((await play()).includes(snackTime.title));

    await flipBobsChildMark();
    assert.equal(store.isChild("Bob"), false);
    await toastsOnSwitchTo("Bob");
    assert.ok(!listRows().some(row => row.title === snackTime.title), "no longer a child: no Snack Time");

    await flipBobsChildMark();
    assert.equal(store.isChild("Bob"), true);
    assert.ok(!(await toastsOnSwitchTo("Bob")).includes(snackTime.title), "no new toast");
    assert.ok(showsUnlocked(listRows(), snackTime), "marked again: Snack Time is Unlocked");

    assertNoErrorLogged(fake);
});
