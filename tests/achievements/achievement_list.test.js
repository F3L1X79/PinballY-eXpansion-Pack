// ============================================================
// Achievement List module tests over the fake host, with fake Achievements
// and a real Profile store: drives the list like the player and checks the
// header, section order, highlighted line, Exit Button, rank emblems,
// Achievement Progress, Unlock Rate, navigation sound and drawing ahead.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createAchievementList, ACHIEVEMENT_LIST_Z_INDEX } from "../../common/achievements/achievement_list.js";
import { createDrawingAhead } from "../../common/core/drawing_ahead.js";
import { createDrawnScreenControls } from "../../common/core/drawn_screen_controls.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { ACHIEVEMENT_FAMILY, ACHIEVEMENT_RANK, PROGRESS_UNIT } from "../../common/achievements/achievements.js";
import { RANK_COLORS, STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { LIST_LOOK } from "../../common/achievements/achievement_list_painter.js";
import lang from "../../common/core/i18n.js";
import {
    press, pressAndGlide, chromeTexts, headerRankCounts, headerEmblemImages, isListOpen, shownItems, highlightedTexts, readSections,
    readRows, readWholeList, untilListShown, footerHints, isMarkerOnExitButton, isExitButtonShown, exitButtonTooltip, isARowHighlighted,
} from "./achievement_list_reader.js";

const TEXT = lang.achievementList;
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const upper = text => text.toLocaleUpperCase();

function fakeAchievement(id, unlocked = false, progress = undefined, rank = ACHIEVEMENT_RANK.BRONZE) {
    const achievement = {
        id,
        family: ACHIEVEMENT_FAMILY.COLLECTION,
        rank,
        unlocked,
        progress,
        getTitle: () => `${id} title`,
        getDescription: () => `${id} description`,
        checkUnlocked: () => achievement.unlocked,
    };
    if (progress !== undefined) achievement.getProgress = () => achievement.progress;
    return achievement;
}

// Unlocked: alpha, beta, gamma, delta; missing: epsilon, zeta.
function sampleAchievements() {
    return [
        fakeAchievement("alpha", true),
        fakeAchievement("epsilon", false),
        fakeAchievement("beta", true),
        fakeAchievement("gamma", true),
        fakeAchievement("zeta", false),
        fakeAchievement("delta", true),
    ];
}

const avatarOf = name => `${PROFILES}\\${name}\\avatar.png`;
const ASSETS = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images";
// Plain (without its halo) for an Unlocked row and the header, greyed for a missing one.
const emblemOf = (rank, variant = "") => `${ASSETS}\\rank_${rank}${variant}.png`;
const EMBLEM_IMAGES = Object.values(ACHIEVEMENT_RANK).flatMap(rank => ["_plain", "_missing"].map(variant => emblemOf(rank, variant)));
const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";

// Alice is active. She was Notified of gamma, then alpha, then delta; the
// toast of beta still waits. household: the other Profiles' notified
// lists, by name, each Profile with its own Avatar. emblemImages: the
// emblem image files installed, none by default (the emblems are drawn).
function setUp({
    achievements = sampleAchievements(), notified = ["gamma", "alpha", "delta"], household = {}, withNavigationSound = true, opened = true,
    emblemImages = [],
} = {}) {
    const fake = createFakePinballYHost();
    if (withNavigationSound) fake.addFile(NAVIGATION_SOUND);
    for (const path of emblemImages) fake.addFile(path, "PNG");
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    for (const [name, profileNotified] of Object.entries({ Alice: notified, ...household })) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, notified: profileNotified }));
        fake.addFile(avatarOf(name), "PNG");
    }
    const profileStore = createProfileStore(fake);
    const list = createAchievementList(fake, { getAchievements: () => achievements, profileStore, drawingAhead: createDrawingAhead(fake), drawnScreenControls: createDrawnScreenControls(fake) });
    const exits = [];
    const open = () => {
        // Opened from the main menu, as the player does.
        fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
        list.open(() => exits.push("exit"));
        untilListShown(fake);
    };
    if (opened) open();
    return { fake, list, achievements, profileStore, exits, open };
}

// The Selection Marker redraws itself on its own tick while it shows.
const LIST_Z_INDEXES = Object.values(ACHIEVEMENT_LIST_Z_INDEX)
    .filter(zIndex => zIndex !== ACHIEVEMENT_LIST_Z_INDEX.backdrop && zIndex !== ACHIEVEMENT_LIST_Z_INDEX.marker);
// Every draw of the list's rows, section headers, emblems, Unlock Rates,
// header, footer and Exit Button so far, as the texts and images drawn.
const listDrawings = fake => fake.drawings().filter(drawing => LIST_Z_INDEXES.includes(drawing.zIndex));
const IDLE_ENOUGH_MS = 60 * 1000;

const rowTexts = id => [`${id} title`, `${id} description`];

test("the list opens over the menu with the Profile's header, both sections and the footer", () => {
    const { fake } = setUp();

    assert.ok(fake.executedCommands().includes(fake.getBuiltInCommand("MenuReturn")), "the main menu is closed first");
    const chrome = chromeTexts(fake);
    for (const text of [upper(TEXT.title), "Alice", TEXT.totalLine(4, 6, 67)]) {
        assert.ok(chrome.includes(text), `"${text}" is shown in ${JSON.stringify(chrome)}`);
    }
    assert.deepEqual(footerHints(fake), [
        { keys: ["PREV", "NEXT"], label: "BROWSE" }, { keys: ["SELECT"], label: "CHOOSE" }, { keys: ["EXIT"], label: "BACK" },
    ]);
    assert.deepEqual(readSections(fake, TEXT), [
        {
            header: [upper(TEXT.unlockedSection), TEXT.sectionCount(4)],
            // The waiting toast first, then from the most recently Notified.
            rows: [rowTexts("beta"), rowTexts("delta"), rowTexts("alpha"), rowTexts("gamma")],
        },
        {
            header: [upper(TEXT.missingSection), TEXT.sectionCount(2)],
            // In the natural order of the definitions.
            rows: [rowTexts("epsilon"), rowTexts("zeta")],
        },
    ]);
});

test("the section headers' texts sit inside their layer, with no text layout error", () => {
    const { fake } = setUp();

    const titles = [upper(TEXT.unlockedSection), upper(TEXT.missingSection)];
    const headers = fake.drawingLayers()
        .filter(layer => layer.zIndex === ACHIEVEMENT_LIST_Z_INDEX.items && titles.includes(layer.texts()[0]));
    assert.equal(headers.length, 2, "both section headers are drawn");
    for (const header of headers) {
        const { height } = header.canvasSize();
        for (const { text, rect } of header.strokes().filter(stroke => "text" in stroke)) {
            assert.ok(rect.y >= 0 && rect.y + rect.height <= height,
                `"${text}" drawn from y=${rect.y} to y=${rect.y + rect.height} fits the ${height}-pixel header`);
        }
    }
    assert.deepEqual(fake.logLines().filter(line => line.includes("styled text layout")), []);
});

test("the list always opens at the top, on the Exit Button", () => {
    const { fake, list } = setUp();
    pressAndGlide(fake, "Next");
    pressAndGlide(fake, "Next");
    pressAndGlide(fake, "Exit");

    list.open();
    untilListShown(fake);

    assert.ok(isMarkerOnExitButton(fake));
    assert.deepEqual(shownItems(fake)[0].texts, [upper(TEXT.unlockedSection), TEXT.sectionCount(4)]);
    pressAndGlide(fake, "Next");
    assert.deepEqual(highlightedTexts(fake), rowTexts("beta"), "Next from it goes to the first Achievement");
});

test("Next and Prev move the highlight one Achievement at a time, skip the section headers and loop through the Exit Button", () => {
    const { fake } = setUp();
    const highlightedTitle = () => highlightedTexts(fake)[0];

    pressAndGlide(fake, "Next");
    assert.equal(highlightedTitle(), "beta title");
    for (const title of ["delta title", "alpha title", "gamma title", "epsilon title", "zeta title"]) {
        pressAndGlide(fake, "Next");
        assert.equal(highlightedTitle(), title);
    }
    pressAndGlide(fake, "Next");
    assert.ok(isMarkerOnExitButton(fake), "Next from the last Achievement selects the Exit Button");
    pressAndGlide(fake, "Next");
    assert.equal(highlightedTitle(), "beta title", "Next from the Exit Button goes to the first Achievement");
    pressAndGlide(fake, "Prev");
    assert.ok(isMarkerOnExitButton(fake), "Prev from the first Achievement selects the Exit Button");
    pressAndGlide(fake, "Prev");
    assert.equal(highlightedTitle(), "zeta title", "Prev from the Exit Button goes to the last Achievement");
    pressAndGlide(fake, "Prev");
    assert.equal(highlightedTitle(), "epsilon title");
    pressAndGlide(fake, "Prev");
    assert.equal(highlightedTitle(), "gamma title", "the missing section's header is skipped");
});

test("on the Exit Button, the Selection Marker surrounds it, its tooltip says Back and no line is highlighted", () => {
    const { fake } = setUp();
    assert.ok(isExitButtonShown(fake), "the Exit Button shows");
    assert.ok(isMarkerOnExitButton(fake), "the list opens on the Exit Button");
    assert.equal(exitButtonTooltip(fake), lang.buttonHints.back);
    assert.ok(!isARowHighlighted(fake), "no line is highlighted");

    pressAndGlide(fake, "Next");
    assert.ok(!isMarkerOnExitButton(fake), "the marker leaves with the selection");
    assert.equal(exitButtonTooltip(fake), null);
    assert.deepEqual(highlightedTexts(fake), rowTexts("beta"));
    const scrollBefore = shownItems(fake).map(item => item.texts);

    pressAndGlide(fake, "Prev");

    assert.ok(isMarkerOnExitButton(fake));
    assert.equal(exitButtonTooltip(fake), lang.buttonHints.back);
    assert.ok(!isARowHighlighted(fake), "no line is highlighted");
    assert.deepEqual(shownItems(fake).map(item => item.texts), scrollBefore, "selecting it never scrolls");
});

test("on a long list, Next from the last row selects the Exit Button without scrolling, and Prev from it scrolls back to the last row", () => {
    const achievements = Array.from({ length: 30 }, (_, index) => fakeAchievement(`a${index}`, false));
    const { fake } = setUp({ achievements, notified: [] });
    const shownTitles = () => shownItems(fake).map(item => item.texts[0]);

    assert.ok(isMarkerOnExitButton(fake));
    assert.ok(shownTitles().includes("a0 title"), "at the top");
    pressAndGlide(fake, "Prev");
    assert.equal(highlightedTexts(fake)[0], "a29 title", "scrolled to the last row");
    const atBottom = shownTitles();
    assert.ok(!atBottom.includes("a0 title"));
    pressAndGlide(fake, "Next");
    assert.ok(isMarkerOnExitButton(fake));
    assert.deepEqual(shownTitles(), atBottom, "selecting the Exit Button never scrolls");
    pressAndGlide(fake, "Next");
    assert.equal(highlightedTexts(fake)[0], "a0 title");
    assert.ok(shownTitles().includes("a0 title"), "back at the top");
});

test("the Exit Button sits at the header's top right, clear of the header's texts, in landscape and portrait", () => {
    for (const size of [{ width: 1920, height: 1080 }, { width: 1080, height: 1920 }]) {
        const { fake, open } = setUp({ opened: false, emblemImages: EMBLEM_IMAGES });
        fake.setLayoutSize(size);
        open();
        const where = `${size.width}x${size.height}`;
        const [button] = fake.drawingLayers().filter(layer => layer.zIndex === ACHIEVEMENT_LIST_Z_INDEX.exitButton && layer.alpha > 0);
        const side = button.scale().ySpan * size.height;
        const left = (button.position().x + 0.5) * size.width - side / 2;
        const top = (0.5 - button.position().y) * size.height - side / 2;
        const [mask] = fake.drawingLayers().filter(layer => layer.zIndex === ACHIEVEMENT_LIST_Z_INDEX.mask);
        const panelRight = (size.width + Math.round(size.width * 0.75)) / 2;
        assert.ok(left + side <= panelRight && top >= (size.height - Math.round(size.height * 0.75)) / 2, `${where}: inside the panel`);
        const headerBottom = (size.height - Math.round(size.height * 0.75)) / 2 + LIST_LOOK.headerHeight;
        const headerTexts = mask.strokes().filter(stroke => "text" in stroke && stroke.rect.y < headerBottom);
        assert.ok(headerTexts.length > 0);
        for (const { text, rect } of headerTexts) {
            assert.ok(rect.x + rect.width <= left, `${where}: "${text}" ends at ${rect.x + rect.width}, left of the Exit Button at ${left}`);
        }
        for (const emblem of fake.drawingLayers().filter(layer => layer.zIndex === ACHIEVEMENT_LIST_Z_INDEX.headerEmblems && layer.alpha > 0)) {
            const right = (emblem.position().x + 0.5) * size.width + emblem.scale().ySpan * size.height / 2;
            assert.ok(right <= left, `${where}: a header emblem ends at ${right}, left of the Exit Button at ${left}`);
        }
    }
});

test("Select or Launch on the Exit Button closes the list and goes back as Exit does", () => {
    for (const buttonCommand of ["Select", "Launch"]) {
        const { fake, exits } = setUp();

        assert.equal(press(fake, buttonCommand).defaultPrevented, true, `${buttonCommand} never reaches the wheel`);

        assert.equal(isListOpen(fake), false, `${buttonCommand} closed it`);
        assert.deepEqual(exits, ["exit"]);
        assert.equal(isExitButtonShown(fake), false, "the Exit Button closes with it");
        assert.equal(isMarkerOnExitButton(fake), false, "and so does the Selection Marker");
    }
});

test("each Next / Prev plays PinballY's navigation sound once, quick presses on three players in turn", () => {
    const { fake } = setUp();
    assert.deepEqual(fake.soundsPlayed(), [], "opening plays nothing");

    for (const button of ["Next", "Next", "Prev", "Next"]) press(fake, button);

    assert.deepEqual(fake.soundsPlayed(), Array(4).fill(NAVIGATION_SOUND));
    const [first, second, third, fourth] = fake.soundPlayers();
    assert.equal(new Set([first, second, third]).size, 3, "three different players");
    assert.equal(fourth, first);
});

test("a missing navigation sound is logged once and the highlight still moves", () => {
    const { fake } = setUp({ withNavigationSound: false });

    pressAndGlide(fake, "Next");
    pressAndGlide(fake, "Next");

    assert.equal(highlightedTexts(fake)[0], "delta title");
    assert.deepEqual(fake.soundsPlayed(), []);
    const soundLines = fake.logLines().filter(line => line.startsWith("[AchievementList]") && line.includes("Next.wav"));
    assert.equal(soundLines.length, 1);
});

test("the other lines are dimmed, and the highlight glides to its next line", () => {
    const { fake } = setUp();
    pressAndGlide(fake, "Next");

    for (const item of shownItems(fake)) {
        if (item.texts[0] !== "beta title") assert.ok(item.alpha < 1 && item.alpha >= 0.6, `${item.texts[0]} is dimmed`);
    }
    press(fake, "Next");
    fake.advanceTime(16);
    const [beta, delta] = ["beta title", "delta title"].map(title => shownItems(fake).find(item => item.texts[0] === title));
    assert.ok(beta.alpha < 1 && delta.alpha < 1, "halfway, neither line is fully lit");
    fake.advanceTime(1000);
    assert.equal(highlightedTexts(fake)[0], "delta title");
});

test("only the items inside the rows area are shown, and the list scrolls to keep the highlight in view", () => {
    const achievements = Array.from({ length: 30 }, (_, index) => fakeAchievement(`a${index}`, false));
    const { fake } = setUp({ achievements, notified: [] });
    const shownTitles = () => shownItems(fake).map(item => item.texts[0]);

    assert.ok(shownTitles().length < 10, `only a few items fit: ${shownTitles().join(", ")}`);
    assert.ok(!shownTitles().includes("a29 title"));
    for (let press = 0; press < 30; press++) pressAndGlide(fake, "Next");
    assert.equal(highlightedTexts(fake)[0], "a29 title");
    assert.ok(!shownTitles().includes("a0 title"), "the top of the list has scrolled out");
    assert.equal(readRows(fake, TEXT).length, 30);
});

test("the list shows no native menu", () => {
    const fake = createFakePinballYHost();
    const list = createAchievementList(fake, {
        getAchievements: sampleAchievements, profileStore: createProfileStore(fake), drawingAhead: createDrawingAhead(fake), drawnScreenControls: createDrawnScreenControls(fake),
    });

    list.open();
    untilListShown(fake);
    pressAndGlide(fake, "Next");
    pressAndGlide(fake, "Select");
    pressAndGlide(fake, "Exit");

    assert.deepEqual(fake.shownMenus(), []);
});

test("an empty section keeps its header with a count of 0", () => {
    const { fake } = setUp({ achievements: [fakeAchievement("alpha", false), fakeAchievement("beta", false)], notified: [] });

    assert.deepEqual(readSections(fake, TEXT), [
        { header: [upper(TEXT.unlockedSection), TEXT.sectionCount(0)], rows: [] },
        { header: [upper(TEXT.missingSection), TEXT.sectionCount(2)], rows: [rowTexts("alpha"), rowTexts("beta")] },
    ]);
    pressAndGlide(fake, "Next");
    assert.deepEqual(highlightedTexts(fake), rowTexts("alpha"));
    assert.ok(chromeTexts(fake).includes(TEXT.totalLine(0, 2, 0)));
});

test("Unlocked, the order and the counts are read again on each opening", () => {
    const { fake, list, achievements, profileStore } = setUp();
    pressAndGlide(fake, "Exit");
    achievements.find(achievement => achievement.id === "zeta").unlocked = true;
    profileStore.updateProfileData(data => { data.notified.push("beta"); });

    list.open();
    untilListShown(fake);

    const [unlocked, missing] = readSections(fake, TEXT);
    assert.deepEqual(unlocked.rows.map(texts => texts[0]), ["zeta title", "beta title", "delta title", "alpha title", "gamma title"]);
    assert.deepEqual(missing.rows.map(texts => texts[0]), ["epsilon title"]);
    assert.ok(chromeTexts(fake).includes(TEXT.totalLine(5, 6, 83)));
    assert.deepEqual(list.countAll(), { unlocked: 5, total: 6 });
});

test("the list follows the active Profile: its name and its own Notified order", () => {
    const { fake, list, profileStore } = setUp();
    pressAndGlide(fake, "Exit");
    profileStore.switchTo("guest");

    list.open();
    untilListShown(fake);

    assert.ok(chromeTexts(fake).includes(lang.profiles.guestName));
    // Guest was Notified of nothing: every Unlocked one waits for its toast.
    assert.deepEqual(readSections(fake, TEXT)[0].rows.map(texts => texts[0]), ["alpha title", "beta title", "gamma title", "delta title"]);
});

test("a missing Achievement shows its Achievement Progress with a gold bar; an Unlocked one or one without shows none", () => {
    const tables = (current, target) => ({ current, target, unit: PROGRESS_UNIT.TABLES });
    const { fake } = setUp({
        achievements: [
            fakeAchievement("williams", false, tables(3, 5)),
            fakeAchievement("bally", true, tables(12, 12)),
            fakeAchievement("stern", false, null),
            fakeAchievement("gottlieb", false),
        ],
        notified: ["bally"],
    });

    const hasBar = row => row.fills.includes(STEAMBALL_COLORS.gold) && row.fills.includes(STEAMBALL_COLORS.track);
    assert.deepEqual(readRows(fake, TEXT).map(row => [row.title, row.progress, hasBar(row)]), [
        ["bally title", null, false],
        ["williams title", "3/5", true],
        ["stern title", null, false],
        ["gottlieb title", null, false],
    ]);
});

test("an Achievement Progress in an unknown unit is an error, not a blank", () => {
    const fake = createFakePinballYHost();
    const achievements = [fakeAchievement("odd", false, { current: 1, target: 2, unit: "parsecs" })];
    const list = createAchievementList(fake, {
        getAchievements: () => achievements, profileStore: createProfileStore(fake), drawingAhead: createDrawingAhead(fake), drawnScreenControls: createDrawnScreenControls(fake),
    });

    assert.throws(() => list.open(), /parsecs/);
});

const isHalo = (fill, color) => fill >>> 24 < 0xFF && fill % 0x1000000 === color % 0x1000000;

test("an Unlocked row shows its rank's emblem in full, a missing one of the same rank a muted one, neither with a halo", () => {
    const { PLATINUM } = ACHIEVEMENT_RANK;
    const { fake } = setUp({
        achievements: [fakeAchievement("shiny", true, undefined, PLATINUM), fakeAchievement("far", false, undefined, PLATINUM)],
        notified: ["shiny"],
    });

    const [shiny, far] = readRows(fake, TEXT);
    assert.equal(shiny.title, "shiny title");
    const inRankColor = row => row.fills.filter(fill => fill === RANK_COLORS[PLATINUM]).length;
    assert.ok(inRankColor(shiny) > 1, "the Unlocked emblem is in the rank's colour, not only the left edge");
    assert.ok(!shiny.fills.some(fill => isHalo(fill, RANK_COLORS[PLATINUM])), "the Unlocked emblem has no halo: the colour and the edge already tell it");
    assert.ok(!far.fills.includes(RANK_COLORS[PLATINUM]), "the missing emblem is muted");
    assert.ok(!far.fills.some(fill => fill >>> 24 < 0xFF), "the missing emblem has no halo");
});

test("each row's emblem is in its own rank's colour", () => {
    const achievements = Object.values(ACHIEVEMENT_RANK).map(rank => fakeAchievement(rank, true, undefined, rank));
    const { fake } = setUp({ achievements, notified: Object.values(ACHIEVEMENT_RANK).reverse() });

    for (const row of readRows(fake, TEXT)) {
        const rank = row.title.replace(" title", "");
        for (const [otherRank, color] of Object.entries(RANK_COLORS)) {
            assert.equal(row.fills.includes(color), otherRank === rank, `${rank} row in ${otherRank}'s colour`);
        }
    }
});

test("the header counts the Unlocked Achievements of each rank next to its emblem", () => {
    const { BRONZE, SILVER, GOLD, PLATINUM } = ACHIEVEMENT_RANK;
    const { fake } = setUp({
        achievements: [
            fakeAchievement("b1", true, undefined, BRONZE),
            fakeAchievement("b2", true, undefined, BRONZE),
            fakeAchievement("s1", false, undefined, SILVER),
            fakeAchievement("g1", true, undefined, GOLD),
            fakeAchievement("p1", true, undefined, PLATINUM),
            fakeAchievement("p2", false, undefined, PLATINUM),
        ],
        notified: [],
    });

    assert.deepEqual(headerRankCounts(fake), { [BRONZE]: "2", [SILVER]: "0", [GOLD]: "1", [PLATINUM]: "1" });
});

test("an Achievement without an Achievement Rank is an error, not a blank emblem", () => {
    const fake = createFakePinballYHost();
    const achievements = [fakeAchievement("odd", false, undefined, "mithril")];
    const list = createAchievementList(fake, {
        getAchievements: () => achievements, profileStore: createProfileStore(fake), drawingAhead: createDrawingAhead(fake), drawnScreenControls: createDrawnScreenControls(fake),
    });

    assert.throws(() => list.open(), /mithril/);
});

// Every rank, Unlocked and missing, with the Unlocked first in rank order.
function oneOfEachRank() {
    const ranks = Object.values(ACHIEVEMENT_RANK);
    return {
        achievements: ranks.flatMap(rank => [fakeAchievement(`${rank}+`, true, undefined, rank), fakeAchievement(`${rank}-`, false, undefined, rank)]),
        notified: ranks.map(rank => `${rank}+`).reverse(),
    };
}

const titleOf = row => row.title.replace(" title", "");
const hasHalo = row => row.fills.some(fill => fill >>> 24 < 0xFF);
// The colours of the header and footer, where a drawn header emblem shows.
const maskFills = fake => fake.drawingLayers().filter(layer => layer.zIndex === ACHIEVEMENT_LIST_Z_INDEX.mask).flatMap(layer => layer.fills());

test("with the emblem images installed, rows and header show the images, not the drawn emblems", () => {
    const { fake } = setUp({ ...oneOfEachRank(), emblemImages: EMBLEM_IMAGES });

    for (const row of readRows(fake, TEXT)) {
        const [rank, state] = [titleOf(row).slice(0, -1), titleOf(row).at(-1)];
        assert.equal(row.emblem, emblemOf(rank, state === "+" ? "_plain" : "_missing"), `${titleOf(row)} shows its image`);
        // Only the Unlocked row's left edge is in the rank's colour.
        assert.equal(row.fills.filter(fill => fill === RANK_COLORS[rank]).length, state === "+" ? 1 : 0, `${titleOf(row)} draws no emblem`);
        assert.ok(!hasHalo(row), `${titleOf(row)} draws no halo`);
    }
    assert.deepEqual(headerEmblemImages(fake), Object.values(ACHIEVEMENT_RANK).map(rank => emblemOf(rank, "_plain")));
    for (const color of Object.values(RANK_COLORS)) assert.ok(!maskFills(fake).includes(color), "the header draws no emblem");
    assert.equal(chromeTexts(fake).filter(text => text === "1").length, 4, "each rank's count is still shown");
});

test("with one emblem image missing, only the emblems using it are drawn, and it is logged once", () => {
    const { GOLD } = ACHIEVEMENT_RANK;
    const { fake, list } = setUp({ ...oneOfEachRank(), emblemImages: EMBLEM_IMAGES.filter(path => path !== emblemOf(GOLD, "_plain")) });
    pressAndGlide(fake, "Exit");
    list.open();
    untilListShown(fake);

    for (const row of readRows(fake, TEXT)) {
        const isFallback = titleOf(row) === `${GOLD}+`;
        assert.equal(row.emblem === null, isFallback, `${titleOf(row)}'s emblem is ${isFallback ? "drawn" : "an image"}`);
    }
    const gold = readRows(fake, TEXT).find(row => titleOf(row) === `${GOLD}+`);
    assert.ok(!hasHalo(gold), "the drawn emblem has no halo either");
    const ranksButGold = Object.values(ACHIEVEMENT_RANK).filter(rank => rank !== GOLD);
    assert.deepEqual(headerEmblemImages(fake), ranksButGold.map(rank => emblemOf(rank, "_plain")), "the header draws its Gold emblem too");
        const logged = fake.logLines().filter(line => line.includes(emblemOf(GOLD, "_plain")));
    assert.equal(logged.length, 1, JSON.stringify(fake.logLines()));
    assert.match(logged[0], /^\[AchievementList\] /);
});

test("without a rank's greyed image, only its missing row gets the drawn emblem", () => {
    const { SILVER } = ACHIEVEMENT_RANK;
    const absent = emblemOf(SILVER, "_missing");
    const { fake } = setUp({ ...oneOfEachRank(), emblemImages: EMBLEM_IMAGES.filter(path => path !== absent) });

    for (const row of readRows(fake, TEXT)) {
        const isFallback = titleOf(row) === `${SILVER}-`;
        assert.equal(row.emblem === null, isFallback, `${titleOf(row)}'s emblem is ${isFallback ? "drawn" : "an image"}`);
    }
    assert.deepEqual(headerEmblemImages(fake), Object.values(ACHIEVEMENT_RANK).map(rank => emblemOf(rank, "_plain")));
    for (const color of Object.values(RANK_COLORS)) assert.ok(!maskFills(fake).includes(color), "the header draws no emblem");
    assert.equal(fake.logLines().filter(line => line.includes(absent)).length, 1, `${absent} is logged once`);
});

test("with the emblem images installed, moving the highlight draws no image", () => {
    const { fake, open } = setUp({ ...oneOfEachRank(), emblemImages: EMBLEM_IMAGES, opened: false });
    fake.advanceTime(IDLE_ENOUGH_MS);
    const drawnImages = () => listDrawings(fake).flatMap(drawing => drawing.images);
    const drawnAhead = drawnImages().length;
    assert.ok(drawnImages().includes(emblemOf(ACHIEVEMENT_RANK.PLATINUM, "_plain")), "the emblems were drawn ahead");

    open();
    readWholeList(fake);

    assert.equal(drawnImages().length, drawnAhead);
});

const ownersByTitle = fake => Object.fromEntries(readRows(fake, TEXT).map(row => [titleOf(row), row.owners]));
const avatarsOnly = (...names) => ({ avatars: names.map(avatarOf), more: null });

test("a row shows the Avatars of the other Profiles Notified of it, never the active Profile's nor Guest's", () => {
    const { fake } = setUp({ household: { Bob: ["alpha", "epsilon"], Carol: ["alpha"], guest: ["zeta", "alpha"] } });

    assert.deepEqual(ownersByTitle(fake), {
        beta: avatarsOnly(),
        delta: avatarsOnly(),
        alpha: avatarsOnly("Bob", "Carol"),
        gamma: avatarsOnly(),
        epsilon: avatarsOnly("Bob"),
        zeta: avatarsOnly(),
    });
});

test("a row shows at most four Avatars, then a \"+N\" pill for the other Profiles", () => {
    const names = ["Bob", "Carol", "Dave", "Erin", "Frank", "Grace"];
    const { fake } = setUp({ household: Object.fromEntries(names.map(name => [name, ["alpha"]])) });

    const { alpha } = ownersByTitle(fake);
    assert.equal(alpha.avatars.length, 4);
    assert.ok(alpha.avatars.every(path => names.map(avatarOf).includes(path)));
    assert.equal(alpha.more, TEXT.moreOwners(2));
});

test("with one Profile besides Guest, no Unlock Rate is shown, even what Guest was Notified of", () => {
    const { fake } = setUp({ household: { guest: ["alpha", "epsilon"] } });

    for (const [title, owners] of Object.entries(ownersByTitle(fake))) {
        assert.deepEqual(owners, avatarsOnly(), `${title} shows no Unlock Rate`);
    }
});

test("Guest viewing the list sees the other Profiles' Avatars", () => {
    const { fake, list, profileStore } = setUp({ household: { Bob: ["alpha"] } });
    pressAndGlide(fake, "Exit");
    profileStore.switchTo("guest");

    list.open();
    untilListShown(fake);

    const owners = ownersByTitle(fake);
    assert.deepEqual(owners.alpha, avatarsOnly("Alice", "Bob"));
    assert.deepEqual(owners.gamma, avatarsOnly("Alice"));
    assert.deepEqual(owners.epsilon, avatarsOnly());
});

test("a missing Achievement the active Profile was once Notified of does not rise above one another Profile has", () => {
    const { fake } = setUp({
        achievements: [fakeAchievement("lost", false), fakeAchievement("bobs", false), fakeAchievement("nobody", false)],
        // Unlocked once, missing again since the collection changed.
        notified: ["lost"],
        household: { Bob: ["bobs"] },
    });

    const [, missing] = readSections(fake, TEXT);
    assert.deepEqual(missing.rows.map(texts => texts[0].replace(" title", "")), ["bobs", "lost", "nobody"]);
});

test("the missing section puts the highest Unlock Rate first, then the furthest Achievement Progress, then the definitions' order", () => {
    const tables = (current, target) => ({ current, target, unit: PROGRESS_UNIT.TABLES });
    const achievements = [
        fakeAchievement("a", false),
        fakeAchievement("b", false, tables(1, 5)),
        fakeAchievement("c", false),
        fakeAchievement("d", false),
        fakeAchievement("e", false, tables(4, 5)),
        fakeAchievement("f", false, tables(8, 10)),
        fakeAchievement("g", false, tables(3, 5)),
        fakeAchievement("h", false, null),
    ];
    const { fake } = setUp({
        achievements,
        notified: [],
        // Guest's "a" never counts.
        household: { Bob: ["c", "d", "g", "h"], Carol: ["d"], guest: ["a", "a"] },
    });

    const [, missing] = readSections(fake, TEXT);
    assert.deepEqual(missing.rows.map(texts => texts[0].replace(" title", "")), ["d", "g", "c", "h", "e", "f", "b", "a"]);
});

test("after startup and enough idle time, opening the list draws nothing new: every item was drawn ahead", () => {
    const { fake, open } = setUp({ opened: false, household: { Bob: ["alpha", "epsilon"], Carol: ["alpha"] } });
    fake.advanceTime(IDLE_ENOUGH_MS);
    const drawnAhead = listDrawings(fake).length;
    assert.ok(drawnAhead > 0, "the list was drawn ahead while closed");
    assert.deepEqual(shownItems(fake), [], "nothing drawn ahead shows while the list is closed");

    open();

    assert.equal(listDrawings(fake).length, drawnAhead);
    assert.ok(isMarkerOnExitButton(fake));
    assert.deepEqual(ownersByTitle(fake).alpha, avatarsOnly("Bob", "Carol"));
    assert.equal(listDrawings(fake).length, drawnAhead, "browsing the whole list draws nothing either");
});

test("nothing is drawn ahead within 400 ms of a button press, nor while a game runs", () => {
    const { fake } = setUp({ opened: false });
    const table = { configId: "mm", title: "Medieval Madness" };
    fake.setTables([table]);

    for (let presses = 0; presses < 5; presses++) {
        fake.advanceTime(300);
        press(fake, "Next");
    }
    fake.advanceTime(399);
    assert.deepEqual(listDrawings(fake), [], "the wheel was browsed with less than 400 ms between presses");

    fake.playGame(table);
    fake.gameStarted(table);
    fake.advanceTime(IDLE_ENOUGH_MS);
    assert.deepEqual(listDrawings(fake), [], "nothing while the game runs");

    fake.gameOver(table);
    fake.advanceTime(IDLE_ENOUGH_MS);
    assert.ok(listDrawings(fake).length > 0, "drawn ahead once back on the wheel");
});

test("after a new unlock and after a Profile switch, the next opening shows the new state and redraws only what changed", () => {
    const { fake, list, achievements, profileStore, open } = setUp({ opened: false, household: { Bob: ["alpha"] } });
    fake.advanceTime(IDLE_ENOUGH_MS);
    const drawnTitles = () => listDrawings(fake).map(drawing => drawing.texts[0]);
    const drawCountOf = title => drawnTitles().filter(text => text === title).length;

    achievements.find(achievement => achievement.id === "zeta").unlocked = true;
    fake.advanceTime(IDLE_ENOUGH_MS);
    open();
    // Its toast still waits: after beta, in the definitions' order.
    assert.deepEqual(readSections(fake, TEXT)[0].rows.map(texts => texts[0]), ["beta title", "zeta title", "delta title", "alpha title", "gamma title"]);
    for (const title of ["alpha title", "beta title", "epsilon title"]) assert.equal(drawCountOf(title), 1, `${title} is not redrawn`);
    assert.equal(drawCountOf("zeta title"), 2, "zeta is redrawn Unlocked");
    pressAndGlide(fake, "Exit");

    profileStore.switchTo("Bob");
    fake.advanceTime(IDLE_ENOUGH_MS);
    const drawnBeforeOpening = listDrawings(fake).length;
    // With a return, as every caller: the Exit Button drawn ahead is the back arrow.
    list.open(() => {});
    untilListShown(fake);
    assert.equal(listDrawings(fake).length, drawnBeforeOpening, "the switch was drawn ahead");
    assert.ok(chromeTexts(fake).includes("Bob"));
    assert.deepEqual(readSections(fake, TEXT)[0].rows.map(texts => texts[0]), ["beta title", "gamma title", "zeta title", "delta title", "alpha title"]);
    assert.equal(drawCountOf("epsilon title"), 1, "a row showing the same is never redrawn");
});

test("the other Profiles' files are read again only once their Notified Achievements may have changed", () => {
    const { fake, list, profileStore } = setUp({ household: { Bob: ["alpha"] } });
    const bobReads = () => fake.fileReads().filter(path => path.startsWith(`${PROFILES}\\Bob\\`)).length;
    assert.ok(bobReads() > 0);
    pressAndGlide(fake, "Exit");
    fake.advanceTime(IDLE_ENOUGH_MS);
    const readsBefore = bobReads();
    list.open();
    untilListShown(fake);
    pressAndGlide(fake, "Exit");
    assert.equal(bobReads(), readsBefore, "neither drawing ahead nor opening again reads Bob's file");

    profileStore.updateProfileData(data => { data.notified.push("epsilon"); }, "Bob");
    list.open();
    untilListShown(fake);

    assert.deepEqual(ownersByTitle(fake).epsilon, avatarsOnly("Bob"));
});

test("an unlock after a game is drawn ahead: the next opening draws nothing new", () => {
    const { fake, achievements, profileStore, open } = setUp({ opened: false });
    fake.advanceTime(IDLE_ENOUGH_MS);

    // Unlocked by the plays a finished game saves.
    achievements.find(achievement => achievement.id === "zeta").unlocked = true;
    profileStore.updateProfileData(data => { data.plays.mm = { count: 1, seconds: 60, lastPlayed: "" }; });
    fake.advanceTime(IDLE_ENOUGH_MS);
    const drawnAhead = listDrawings(fake).length;
    open();

    assert.equal(listDrawings(fake).length, drawnAhead);
    assert.equal(readSections(fake, TEXT)[0].rows[1][0], "zeta title");
});
