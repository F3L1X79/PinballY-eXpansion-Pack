// ============================================================
// Shared scenario for the Achievement Progress tests: starts main.js on the
// fake PinballY globals with the given tables and Profile files, plays
// tables for real and reads how the Achievement List shows the given
// Achievements (Unlocked or missing, and their Achievement Progress). Each
// test file runs in its own process, so each starts one scenario.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import config from "../../common/core/config.js";
import { pressAndGlide, readRows, untilListShown } from "./achievement_list_reader.js";

export const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// Longer than a toast's whole life (rise, hold, fade).
const ONE_TOAST_MS = 6000;
const ADD_ONS_UNDER_TEST = ["customMenuCommands", "randomGame", "achievements", "sessionStatsTracker"];

// PinballY's own play stats count for nothing: only the Profiles' plays do.
export function table(id, title, manufacturer, year, categories = []) {
    return {
        id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories,
        playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false,
    };
}

export async function startScenario({ now, tables, files = {}, folders = [] }) {
    const fake = createFakePinballYHost({ now, tables });
    for (const folder of folders) fake.addFolder(folder);
    for (const [path, content] of Object.entries(files)) fake.addFile(path, JSON.stringify(content));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    }
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    const TEXT = lang.achievementList;

    // Lets every waiting toast show, so the wheel is free again.
    async function showEveryToast() {
        for (let guard = 0; guard < 100; guard++) {
            const shownCount = toastDrawings(fake).length;
            fake.advanceTime(ONE_TOAST_MS);
            await settle();
            if (toastDrawings(fake).length === shownCount) break;
        }
    }

    async function play(game, seconds = 60) {
        fake.playGame(game);
        fake.gameStarted(game);
        await settle();
        fake.advanceTime(seconds * 1000);
        fake.gameOver(game);
        await settle();
        await showEveryToast();
    }

    // How the list shows each of these Achievements, by title, in the given
    // order: { title, progress, unlocked }, progress being the short text
    // of its Achievement Progress or null. A title given again is the next
    // row showing it, such as a second Secret Achievement's "???". Opened
    // from the main menu and closed again with Exit.
    function readAllRows() {
        fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
        fake.selectMenuItem(TEXT.menuEntry);
        untilListShown(fake);
        const rows = readRows(fake, TEXT);
        pressAndGlide(fake, "Exit");
        return rows;
    }

    function readShown(titles) {
        const rows = readAllRows();
        const taken = new Set();
        return titles.map(title => {
            const row = rows.find(shownRow => shownRow.title === title && !taken.has(shownRow));
            if (!row) throw new Error(`"${title}" is not in the Achievement List.`);
            taken.add(row);
            return { title, progress: row.progress, unlocked: row.unlocked };
        });
    }

    // The titles of every row of the list, opened and closed as above.
    const listedTitles = () => readAllRows().map(row => row.title);

    const unlockedRow = title => ({ title, progress: null, unlocked: true });
    // Without a unit, a missing Achievement showing no Achievement Progress.
    const missingRow = (title, unit, current, target) => ({
        title,
        progress: unit === undefined ? null : TEXT.progressUnits[unit].short(current, target),
        unlocked: false,
    });

    return { fake, lang, getProfileStore, play, showEveryToast, readShown, listedTitles, unlockedRow, missingRow };
}
