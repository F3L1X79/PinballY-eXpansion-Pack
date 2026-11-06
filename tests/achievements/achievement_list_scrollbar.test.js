// ============================================================
// Achievement List scrollbar over the fake host: the gold thumb shows only
// when the list overflows, is sized to the visible part, follows the glide,
// is drawn ahead and redrawn only on a length or window change.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createAchievementList, ACHIEVEMENT_LIST_Z_INDEX } from "../../common/achievements/achievement_list.js";
import { createDrawingAhead } from "../../common/core/drawing_ahead.js";
import { createDrawnScreenControls } from "../../common/core/drawn_screen_controls.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { ACHIEVEMENT_FAMILY, ACHIEVEMENT_RANK } from "../../common/achievements/achievements.js";
import { LIST_LOOK, computeGeometry } from "../../common/achievements/achievement_list_painter.js";
import { GLIDE_OVER_MS, press, pressAndGlide, scrollbarThumb, highlightedTexts, untilListShown } from "./achievement_list_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const IDLE_ENOUGH_MS = 60 * 1000;
const WINDOW = { width: 1920, height: 1080 };

function fakeAchievement(id) {
    return {
        id,
        family: ACHIEVEMENT_FAMILY.COLLECTION,
        rank: ACHIEVEMENT_RANK.BRONZE,
        getTitle: () => `${id} title`,
        getDescription: () => `${id} description`,
        checkUnlocked: () => false,
    };
}

const achievementsOf = count => Array.from({ length: count }, (_, index) => fakeAchievement(`a${index}`));

function setUp({ count, opened = true }) {
    const fake = createFakePinballYHost({ layoutSize: WINDOW });
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    const achievements = achievementsOf(count);
    const profileStore = createProfileStore(fake);
    const list = createAchievementList(fake, { getAchievements: () => achievements, profileStore, drawingAhead: createDrawingAhead(fake), drawnScreenControls: createDrawnScreenControls(fake) });
    if (opened) {
        list.open();
        untilListShown(fake);
    }
    return { fake, list, achievements, profileStore };
}

// Both section headers (the Unlocked one empty), then every row, all missing.
const listHeightOf = count => 2 * LIST_LOOK.sectionHeight + count * LIST_LOOK.rowHeight + (count + 1) * LIST_LOOK.itemGap;

const geometry = computeGeometry(WINDOW);
const track = {
    top: geometry.areaTop + LIST_LOOK.scrollbarInset,
    bottom: geometry.areaTop + geometry.areaHeight - LIST_LOOK.scrollbarInset,
};
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) <= 1, `${message}: ${actual} vs ${expected}`);
const thumbDraws = fake => fake.drawings().filter(drawing => drawing.zIndex === ACHIEVEMENT_LIST_Z_INDEX.scrollbarThumb).length;

test("a list that fits in the rows area shows no scrollbar", () => {
    const { fake } = setUp({ count: 3 });

    assert.ok(listHeightOf(3) <= geometry.areaHeight);
    assert.equal(scrollbarThumb(fake), null);
});

test("a list that overflows shows its thumb in the panel's right margin, at the top, as tall as the visible part", () => {
    const { fake } = setUp({ count: 30 });

    const thumb = scrollbarThumb(fake);
    assert.ok(thumb, "the thumb shows");
    assert.ok(thumb.x > geometry.rowX + geometry.rowWidth && thumb.x < geometry.x + geometry.panelWidth, `in the right margin: ${thumb.x}`);
    near(thumb.top, track.top, "at the top when the list opens");
    near(thumb.height, (track.bottom - track.top) * geometry.areaHeight / listHeightOf(30), "the visible part of the list");
});

test("a very long list keeps a thumb of the minimum height", () => {
    const { fake } = setUp({ count: 500 });

    near(scrollbarThumb(fake).height, LIST_LOOK.scrollbarMinThumbHeight, "the minimum height");
});

test("the thumb follows the scroll: in the middle halfway down the list, at the bottom on the last row", () => {
    const { fake } = setUp({ count: 30 });
    const travel = () => (scrollbarThumb(fake).top - track.top) / (track.bottom - track.top - scrollbarThumb(fake).height);

    for (let presses = 0; presses < 16; presses++) pressAndGlide(fake, "Next");
    assert.ok(travel() > 0.35 && travel() < 0.65, `about halfway: ${travel()}`);
    for (let presses = 0; presses < 14; presses++) pressAndGlide(fake, "Next");
    assert.equal(highlightedTexts(fake)[0], "a29 title");
    near(scrollbarThumb(fake).top + scrollbarThumb(fake).height, track.bottom, "at the bottom on the last row");

    pressAndGlide(fake, "Next");
    near(scrollbarThumb(fake).top + scrollbarThumb(fake).height, track.bottom, "still at the bottom on the Exit Button");
    pressAndGlide(fake, "Next");
    near(scrollbarThumb(fake).top, track.top, "back at the top on the first row");
});

test("the thumb glides with the rows, frame by frame", () => {
    const { fake } = setUp({ count: 30 });
    for (let presses = 0; presses < 10; presses++) pressAndGlide(fake, "Next");
    const before = scrollbarThumb(fake).top;

    press(fake, "Next");
    fake.advanceTime(20);
    const gliding = scrollbarThumb(fake).top;
    fake.advanceTime(GLIDE_OVER_MS);
    const after = scrollbarThumb(fake).top;
    assert.ok(after > before, "the list scrolled");
    assert.ok(gliding > before && gliding < after, `on its way: ${before} < ${gliding} < ${after}`);
});

test("the thumb is drawn ahead, only moved while scrolling, and hidden when the list closes", () => {
    const { fake, list } = setUp({ count: 30, opened: false });
    fake.advanceTime(IDLE_ENOUGH_MS);
    assert.equal(thumbDraws(fake), 1, "drawn ahead once");
    assert.equal(scrollbarThumb(fake), null, "not shown while the list is closed");

    list.open();
    untilListShown(fake);
    for (let presses = 0; presses < 30; presses++) pressAndGlide(fake, "Next");
    assert.equal(thumbDraws(fake), 1, "never redrawn while scrolling");

    pressAndGlide(fake, "Exit");
    assert.equal(scrollbarThumb(fake), null);
});

test("the thumb is redrawn only when the list's length or the window size changes", () => {
    const { fake, list, achievements, profileStore } = setUp({ count: 30, opened: false });
    fake.advanceTime(IDLE_ENOUGH_MS);
    list.open();
    untilListShown(fake);
    pressAndGlide(fake, "Exit");
    profileStore.updateProfileData(data => { data.notified.push("a0"); });
    fake.advanceTime(IDLE_ENOUGH_MS);
    assert.equal(thumbDraws(fake), 1, "a change keeping the list's length keeps the thumb");

    achievements.push(...achievementsOf(40).slice(30));
    profileStore.updateProfileData(data => { data.notified.push("a1"); });
    fake.advanceTime(IDLE_ENOUGH_MS);
    assert.equal(thumbDraws(fake), 2, "a longer list redraws it ahead");

    fake.setLayoutSize({ width: 1280, height: 720 });
    list.open();
    untilListShown(fake);
    assert.equal(thumbDraws(fake), 3, "a new window size redraws it");
    assert.ok(scrollbarThumb(fake, { width: 1280, height: 720 }));
});
