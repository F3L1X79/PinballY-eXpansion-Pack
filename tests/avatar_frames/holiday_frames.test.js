// ============================================================
// Holiday Frames at the Profile Rewards seam, on the fake host's file
// system: which ones a Profile's Play Log unlocks (a Play starting or
// ending on the holiday, local time), the frames listed, the one worn.
// Never loaded by PinballY.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createProfileRewards } from "../../common/avatar_frames/profile_rewards.js";

const NOW = new Date(2027, 0, 10, 12, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const GUEST = `${PROFILES}\\guest`;
const CONFIG_ID = "Medieval Madness (Williams 1997)";

// plays: { year: [[start, seconds], ...] } in the Guest's Play Log.
function rewardsWith(plays, { profileData = {}, isEnabled = () => true, withProfiles = true } = {}) {
    const fake = createFakePinballYHost({ now: NOW, tables: [] });
    fake.addFile(`${GUEST}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], ...profileData }));
    for (const [year, yearPlays] of Object.entries(plays)) {
        fake.addFile(`${GUEST}\\play-log-${year}.json`, JSON.stringify({
            version: 1, plays: yearPlays.map(([start, seconds]) => ({ start, configId: CONFIG_ID, seconds })),
        }));
    }
    const profileStore = createProfileStore(fake);
    const wheelDialogs = { submit() {}, wake() {} };
    // Without the Household frame, which household_frame.test.js covers.
    const rewards = createProfileRewards(fake, { profileStore, isEnabled, withProfiles: () => withProfiles, withHousehold: () => false, wheelDialogs });
    return { fake, profileStore, rewards };
}

const unlockedHolidays = rewards => rewards.framesOf()
    .filter(frame => frame.family === "holiday" && frame.isUnlocked).map(frame => frame.id);

test("a Play starting on 24 or on 25 December unlocks Christmas", () => {
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-12-24T20:00:00", 600]] }).rewards), ["christmas"]);
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-12-25T09:30:00", 60]] }).rewards), ["christmas"]);
});

test("a Play from 23 December ending on the 24th unlocks Christmas; one ending just before midnight does not", () => {
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-12-23T23:50:00", 20 * 60]] }).rewards), ["christmas"]);
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-12-23T23:00:00", 59 * 60 + 59]] }).rewards), []);
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-12-26T00:00:00", 600]] }).rewards), []);
});

test("a Play from 31 December 23:50 to 1 January 00:10 unlocks New Year's Day; one on 31 December or 2 January does not", () => {
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-12-31T23:50:00", 20 * 60]] }).rewards), ["newYear"]);
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-12-31T15:00:00", 600]] }).rewards), []);
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2027: [["2027-01-01T15:00:00", 600]] }).rewards), ["newYear"]);
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2027: [["2027-01-02T00:00:00", 600]] }).rewards), []);
});

test("a game under one minute on Christmas Day is not a Play and unlocks nothing", () => {
    const { fake, profileStore, rewards } = rewardsWith({});
    fake.setNow(new Date(2026, 11, 25, 15, 0, 0));
    const game = { configId: CONFIG_ID };
    fake.gameStarted(game);
    fake.advanceTime(59 * 1000);
    fake.gameOver(game);
    assert.deepEqual(unlockedHolidays(rewards), []);

    fake.gameStarted(game);
    fake.advanceTime(60 * 1000);
    fake.gameOver(game);
    assert.deepEqual(profileStore.getPlayLogYearsOf("guest"), [2026]);
    assert.deepEqual(unlockedHolidays(rewards), ["christmas"], "read again after the Play");
});

test("Plays of every year file count, and the Holiday Frames are listed after the Collection Tiers in the year's order", () => {
    const { rewards } = rewardsWith({ 2026: [["2026-10-01T20:00:00", 600]], 2027: [["2027-12-24T21:00:00", 600]] }, { profileData: { collectionTier: 2 } });
    const frames = rewards.framesOf();
    assert.deepEqual(frames.map(frame => [frame.id, frame.family, frame.isUnlocked]), [
        [1, "collection", true], [2, "collection", true], [3, "collection", false], [4, "collection", false], [5, "collection", false],
        [6, "collection", false], [7, "collection", false], [8, "collection", false], [9, "collection", false], [10, "collection", false],
        ["newYear", "holiday", false], ["chineseNewYear", "holiday", false], ["valentine", "holiday", false], ["mardiGras", "holiday", false], ["stPatrick", "holiday", false],
        ["easter", "holiday", false], ["musicDay", "holiday", false], ["halloween", "holiday", false], ["deadDay", "holiday", false],
        ["thanksgiving", "holiday", false], ["christmas", "holiday", true],
    ]);
    assert.equal(frames[20].name, "Christmas");
    assert.equal(frames[20].holiday, "christmas");
    assert.equal(frames[18].unlockCondition, "A Play on 1 or 2 November", "a locked row tells what wins it");
    assert.equal(frames[19].unlockCondition, "A Play on Thanksgiving, the fourth Thursday of November");
});

// The published dates of Easter Sunday and of Mardi Gras, 2026 to 2035.
const EASTER_AND_MARDI_GRAS = [
    ["2026-04-05", "2026-02-17"], ["2027-03-28", "2027-02-09"], ["2028-04-16", "2028-02-29"], ["2029-04-01", "2029-02-13"],
    ["2030-04-21", "2030-03-05"], ["2031-04-13", "2031-02-25"], ["2032-03-28", "2032-02-10"], ["2033-04-17", "2033-03-01"],
    ["2034-04-09", "2034-02-21"], ["2035-03-25", "2035-02-06"],
];
const playOn = (day, time = "12:00:00", seconds = 600) => ({ [day.slice(0, 4)]: [[`${day}T${time}`, seconds]] });
const dayBefore = day => {
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

test("Easter Sunday and Mardi Gras unlock on their published dates, 2026 to 2035; the Saturday before Easter does not", () => {
    for (const [easter, mardiGras] of EASTER_AND_MARDI_GRAS) {
        assert.deepEqual(unlockedHolidays(rewardsWith(playOn(easter)).rewards), ["easter"], easter);
        assert.deepEqual(unlockedHolidays(rewardsWith(playOn(dayBefore(easter))).rewards), [], `the Saturday before ${easter}`);
        // 17 February 2026 is also Chinese New Year.
        assert.deepEqual(unlockedHolidays(rewardsWith(playOn(mardiGras)).rewards).filter(id => id !== "chineseNewYear"), ["mardiGras"], mardiGras);
        assert.deepEqual(unlockedHolidays(rewardsWith(playOn(dayBefore(mardiGras))).rewards), [], `the day before ${mardiGras}`);
    }
});

test("a Play from Holy Saturday 23:50 ending on Easter Sunday unlocks Easter", () => {
    assert.deepEqual(unlockedHolidays(rewardsWith(playOn("2027-03-27", "23:50:00", 20 * 60)).rewards), ["easter"]);
});

// The published dates of Chinese New Year, 2026 to 2035; 2034 comes after a
// leap month, a third new moon after the December solstice.
const CHINESE_NEW_YEAR = [
    "2026-02-17", "2027-02-06", "2028-01-26", "2029-02-13", "2030-02-03",
    "2031-01-23", "2032-02-11", "2033-01-31", "2034-02-19", "2035-02-08",
];

// 17 February 2026 is also Mardi Gras.
test("Chinese New Year unlocks on its published dates, 2026 to 2035; the day before does not", () => {
    for (const day of CHINESE_NEW_YEAR) {
        assert.ok(unlockedHolidays(rewardsWith(playOn(day)).rewards).includes("chineseNewYear"), day);
        assert.ok(!unlockedHolidays(rewardsWith(playOn(dayBefore(day))).rewards).includes("chineseNewYear"), `the day before ${day}`);
    }
});

test("Thanksgiving is the fourth Thursday of November, in a November starting on a Thursday and in one starting on a Friday", () => {
    // 1 November 2029 is a Thursday, 1 November 2030 a Friday.
    assert.deepEqual(unlockedHolidays(rewardsWith(playOn("2029-11-22")).rewards), ["thanksgiving"]);
    assert.deepEqual(unlockedHolidays(rewardsWith(playOn("2029-11-29")).rewards), [], "the fifth Thursday");
    assert.deepEqual(unlockedHolidays(rewardsWith(playOn("2029-11-15")).rewards), [], "the third Thursday");
    assert.deepEqual(unlockedHolidays(rewardsWith(playOn("2030-11-28")).rewards), ["thanksgiving"]);
    assert.deepEqual(unlockedHolidays(rewardsWith(playOn("2030-11-21")).rewards), [], "the third Thursday");
    assert.deepEqual(unlockedHolidays(rewardsWith(playOn("2026-11-26")).rewards), ["thanksgiving"]);
});

test("each fixed-date holiday unlocks on its own day, not the day before or after", () => {
    const cases = [
        ["valentine", "2027-02-14", "2027-02-13", "2027-02-15"],
        ["stPatrick", "2027-03-17", "2027-03-16", "2027-03-18"],
        ["musicDay", "2027-06-21", "2027-06-20", "2027-06-22"],
        ["halloween", "2026-10-31", "2026-10-30", null],
        ["deadDay", "2026-11-02", null, "2026-11-03"],
    ];
    for (const [id, day, before, after] of cases) {
        assert.deepEqual(unlockedHolidays(rewardsWith(playOn(day)).rewards), [id], day);
        for (const other of [before, after].filter(Boolean)) {
            assert.deepEqual(unlockedHolidays(rewardsWith(playOn(other)).rewards), [], other);
        }
    }
});

test("one Play from 31 October 23:50 to 1 November 00:10 unlocks Halloween and Día de los Muertos", () => {
    assert.deepEqual(unlockedHolidays(rewardsWith({ 2026: [["2026-10-31T23:50:00", 20 * 60]] }).rewards), ["halloween", "deadDay"]);
});

test("Christmas stays with Table Mastery off, which has no Collection frames, and goes without the Profile picker", () => {
    const plays = { 2026: [["2026-12-24T20:00:00", 600]] };
    assert.deepEqual(rewardsWith(plays, { profileData: { collectionTier: 3 }, isEnabled: () => false }).rewards.framesOf()
        .filter(frame => frame.isUnlocked).map(frame => frame.id), ["christmas"]);
    assert.deepEqual(rewardsWith(plays, { profileData: { collectionTier: 3 }, withProfiles: false }).rewards.framesOf().map(frame => frame.id),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(rewardsWith(plays, { isEnabled: () => false, withProfiles: false }).rewards.framesOf(), []);
});

test("choosing Christmas saves its text id and wears it; a Profile Reset takes it back and the Profile wears none", () => {
    const { fake, profileStore, rewards } = rewardsWith({ 2026: [["2026-12-25T20:00:00", 600]] });
    assert.equal(rewards.choose("christmas"), true);
    assert.equal(JSON.parse(fake.readFile(`${GUEST}\\profile.json`)).avatarFrame, "christmas");
    assert.equal(rewards.wornFrameOf().id, "christmas");

    profileStore.resetProfile("guest");
    assert.deepEqual(unlockedHolidays(rewards), []);
    assert.equal(rewards.wornFrameOf(), null);
    assert.equal(rewards.choose("christmas"), false, "locked again");
});

test("the Christmas toast goes stale on a Profile Reset or when another Profile is active", () => {
    const { fake, profileStore, rewards } = rewardsWith({ 2026: [["2026-10-01T20:00:00", 600]] }, { profileData: { avatarFrame: null } });
    fake.addFolder(`${PROFILES}\\Alice`);
    const submitted = [];
    rewards.enablePrompts(() => {}, { submit: toast => submitted.push(toast) });
    const game = { configId: CONFIG_ID };
    const playOnChristmas = () => {
        fake.setNow(new Date(2026, 11, 25, 20, 0, 0));
        fake.gameStarted(game);
        fake.advanceTime(10 * 60 * 1000);
        fake.gameOver(game);
    };

    playOnChristmas();
    assert.deepEqual(submitted.map(toast => [toast.kind, toast.title, toast.isStale()]), [["frame", "New frame: Christmas", false]]);
    profileStore.switchTo("Alice");
    assert.equal(submitted[0].isStale(), true, "another Profile active");
    profileStore.switchTo("guest");
    assert.equal(submitted[0].isStale(), false);
    profileStore.resetProfile("guest");
    assert.equal(submitted[0].isStale(), true, "reset");

    playOnChristmas();
    assert.equal(submitted.length, 2, "won again after the reset");
});

test("an unknown avatarFrame id, or a holiday not won, wears none without error", () => {
    const { fake, rewards } = rewardsWith({}, { profileData: { avatarFrame: "diwali" } });
    assert.equal(rewards.wornFrameOf(), null);
    assert.equal(rewards.wornImageOf("guest", 192), null);
    assert.equal(rewardsWith({}, { profileData: { avatarFrame: "christmas" } }).rewards.wornFrameOf(), null);
    assert.equal(rewards.choose("diwali"), false);
    assert.deepEqual(fake.logLines(), []);
});
