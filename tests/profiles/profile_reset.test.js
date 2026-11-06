// ============================================================
// Profile Reset from Manage profiles in the Operator Menu through main.js: for
// an active Admin only (none marked: "Become admin" alone), lists every
// Profile, then "Reset" in a Profile's menu asks once on "No". "Yes" keeps a
// dated copy, saves empty data with the marks kept, renames its Play Log files;
// the other Profiles' Play Logs are untouched.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { pressAndGlide, readRows, untilListShown } from "../achievements/achievement_list_reader.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Thursday 1 October 2026, 20:15:30.
const NOW = new Date(2026, 9, 1, 20, 15, 30);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const COPY_NAME = "profile.reset-2026-10-01_20-15-30.json";
const playLogFile = (name, fileName) => `${PROFILES}\\${name}\\${fileName}`;
const playLogJson = (...seconds) => JSON.stringify({
    version: 1, plays: seconds.map(count => ({ start: "2025-12-31T23:00:00", configId: "Medieval Madness", seconds: count })),
});

const MEDIEVAL = {
    id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997, categories: ["Fantasy"],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
};
const PLAYED = { count: 3, seconds: 900, lastPlayed: "2026-09-30T21:00:00" };

const BOB_DATA = {
    version: 1,
    isChild: true,
    plays: { [MEDIEVAL.configId]: PLAYED },
    streaks: { tableOfTheDay: { current: 4, longest: 6, lastPeriod: "2026-09-30" } },
    randomGames: 5,
    sessions: { longestSeconds: 900, shortestSeconds: 60, rageQuit: true, grandReturn: false, dayManufacturers: { day: "2026-09-30", list: ["Williams"] }, mostManufacturersInADay: 1 },
    notified: ["collectionMilestone:firstTable"],
    challenge: { week: "2026-09-28", firstWeek: "2026-09-28", games: [], completed: false, completedCount: 2, history: [] },
};

test("an Admin Profile resets another Profile from the Operator Menu, after one confirmation", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [MEDIEVAL] });
    for (const name of ["guest", "Alice", "Bob"]) fake.addFile(`${PROFILES}\\${name}\\avatar.png`, "PNG");
    fake.addFile(profileFile("Bob"), JSON.stringify(BOB_DATA));
    fake.addFile(profileFile("guest"), JSON.stringify({ version: 1, plays: { [MEDIEVAL.configId]: PLAYED }, randomGames: 1 }));
    const bobLog2025 = playLogJson(300);
    const bobLog2026 = playLogJson(600, 900);
    fake.addFile(playLogFile("Bob", "play-log-2025.json"), bobLog2025);
    fake.addFile(playLogFile("Bob", "play-log-2026.json"), bobLog2026);
    fake.addFile(playLogFile("Bob", "play-log-2026.bak.json"), playLogJson(600));
    // A year whose file was lost: its backup is what the Play Log reads.
    const bobLog2024 = playLogJson(200);
    fake.addFile(playLogFile("Bob", "play-log-2024.bak.json"), bobLog2024);
    // A reset copy name already taken, for the copy to be numbered.
    fake.addFile(playLogFile("Bob", "play-log-2025.reset-2026-10-01_20-15-30.json"), "older copy");
    const aliceLog2026 = playLogJson(120);
    fake.addFile(playLogFile("Alice", "play-log-2026.json"), aliceLog2026);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["customMenuCommands", "achievements"].includes(key);
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    const store = getProfileStore();

    const operatorMenuTitles = () => {
        fake.openOperatorMenu();
        const titles = fake.currentMenu().items.map(item => item.title);
        fake.closeMenu();
        return titles;
    };
    const firstTableRow = () => {
        fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
        fake.selectMenuItem(lang.achievementList.menuEntry);
        untilListShown(fake);
        const row = readRows(fake, lang.achievementList)
            .find(item => item.title === lang.achievements.firstTableTitle());
        pressAndGlide(fake, "Exit");
        return row;
    };
    // Up to the confirmation for the Profile shown under this name.
    const askToReset = shownName => {
        // The Achievement List glides on a timer: back to the copy's date.
        fake.setNow(NOW);
        fake.openOperatorMenu();
        fake.selectMenuItem(TEXT.menuEntry);
        fake.selectMenuItem(shownName);
        fake.selectMenuItem(TEXT.reset);
        return fake.currentMenu();
    };

    store.switchTo("Alice");
    fake.openOperatorMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    assert.deepEqual(fake.currentMenu().items.map(item => item.title ?? ""), [TEXT.becomeAdmin, "", TEXT.cancel],
        "no Admin Profile: only Become admin, nobody can reset a Profile");
    fake.selectMenuItem(TEXT.cancel);

    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    store.switchTo("Bob");
    assert.ok(!operatorMenuTitles().includes(TEXT.menuEntry), "a Profile that is not an Admin Profile never sees it");
    store.switchTo("Alice");
    const operatorMenu = operatorMenuTitles();
    assert.equal(operatorMenu.indexOf(TEXT.menuEntry), operatorMenu.indexOf(lang.expansionPackSettings.menuEntry) + 1,
        "right after the eXpansion Pack Settings");
    assert.deepEqual(firstTableRow().owners.avatars, [`${PROFILES}\\Bob\\avatar.png`], "Bob holds the first table");

    fake.openOperatorMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    const listTitles = fake.currentMenu().items.map(item => item.title ?? "");
    assert.deepEqual(listTitles, [TEXT.listTitle, "", lang.profiles.guestName, "Alice", "Bob", "", TEXT.everyProfile, "", TEXT.cancel],
        "every Profile, Guest and the admin included");
    fake.closeMenu();

    // Bob's switch announced his Achievements: his file as it stands now.
    const bobFile = fake.readFile(profileFile("Bob"));
    const confirmation = askToReset("Bob");
    assert.equal(confirmation.items[0].title, TEXT.confirm("Bob"), "the confirmation names the Profile");
    assert.deepEqual(confirmation.items.filter(item => item.selected).map(item => item.title), [TEXT.no], "cursor on No");
    fake.selectMenuItem(TEXT.no);
    assert.equal(fake.readFile(profileFile("Bob")), bobFile, "No changes nothing");
    assert.equal(fake.readFile(`${PROFILES}\\Bob\\${COPY_NAME}`), undefined);

    askToReset("Bob");
    fake.selectMenuItem(TEXT.yes);
    assert.equal(fake.readFile(`${PROFILES}\\Bob\\${COPY_NAME}`), bobFile, "the former file is kept, dated");
    assert.deepEqual(JSON.parse(fake.readFile(profileFile("Bob"))), {
        version: 1,
        plays: {},
        streaks: {},
        randomGames: 0,
        sessions: { longestSeconds: 0, shortestSeconds: 0, rageQuit: false, grandReturn: false, dayManufacturers: { day: "", list: [] }, mostManufacturersInADay: 0 },
        notified: [],
        isChild: true,
    }, "Bob starts over, still a Child Profile");
    assert.ok(fake.readFile(`${PROFILES}\\Bob\\avatar.png`), "with his Avatar");
    assert.ok(store.isChild("Bob"));
    assert.deepEqual(firstTableRow().owners.avatars, [], "Alice's Unlock Rate no longer counts Bob");

    assert.equal(fake.readFile(playLogFile("Bob", "play-log-2026.reset-2026-10-01_20-15-30.json")), bobLog2026,
        "each Play Log year file is kept, dated");
    assert.equal(fake.readFile(playLogFile("Bob", "play-log-2025.reset-2026-10-01_20-15-30-2.json")), bobLog2025,
        "numbered when the dated name is taken");
    assert.equal(fake.readFile(playLogFile("Bob", "play-log-2025.reset-2026-10-01_20-15-30.json")), "older copy");
    assert.equal(fake.readFile(playLogFile("Bob", "play-log-2024.reset-2026-10-01_20-15-30.json")), bobLog2024,
        "a backup without its year file is kept in its place");
    for (const fileName of ["play-log-2024.bak.json", "play-log-2025.json", "play-log-2026.json", "play-log-2026.bak.json"]) {
        assert.equal(fake.files.fileExists(playLogFile("Bob", fileName)), false, `${fileName} is gone`);
    }
    assert.deepEqual(store.getPlayLogOf("Bob", 2024), [], "Bob's Play Log is empty");
    assert.deepEqual(store.getPlayLogOf("Bob", 2025), []);
    assert.deepEqual(store.getPlayLogOf("Bob", 2026), []);
    assert.equal(fake.readFile(playLogFile("Alice", "play-log-2026.json")), aliceLog2026, "Alice's Play Log is untouched");

    askToReset(lang.profiles.guestName);
    fake.selectMenuItem(TEXT.yes);
    assert.deepEqual(JSON.parse(fake.readFile(profileFile("guest"))).plays, {}, "Guest can be reset too");
    assert.ok(fake.readFile(`${PROFILES}\\guest\\${COPY_NAME}`));

    // A second reset in the same second keeps both copies.
    askToReset("Bob");
    fake.selectMenuItem(TEXT.yes);
    assert.equal(fake.readFile(`${PROFILES}\\Bob\\${COPY_NAME}`), bobFile);
    assert.ok(fake.readFile(`${PROFILES}\\Bob\\profile.reset-2026-10-01_20-15-30-2.json`));

    store.switchTo("Bob");
    fake.gameStarted(MEDIEVAL);
    fake.advanceTime(5 * 60 * 1000);
    fake.gameOver(MEDIEVAL);
    assert.deepEqual(store.getPlayLogOf("Bob", 2026).map(play => play.seconds), [300], "his next Play starts a fresh year file");
    assert.equal(fake.readFile(playLogFile("Bob", "play-log-2026.reset-2026-10-01_20-15-30.json")), bobLog2026);

    assertNoErrorLogged(fake);
});
