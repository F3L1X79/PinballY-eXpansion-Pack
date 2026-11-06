// ============================================================
// Achievement Toast module on the fake host: stacking (at most five), hold
// duration, scale and sound settings (out of range values logged), Challenge
// and Error Toasts in the same queue, Confetti Shower and Fireworks starts,
// rank emblems with the trophy fallback, and a gone card's layer a point until reused.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createAchievementToasts, TOAST_KIND } from "../../common/achievements/achievement_toast.js";
import lang from "../../common/core/i18n.js";
import { ACHIEVEMENT_RANK } from "../../common/achievements/achievements.js";
import { RANK_COLORS, STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { playerLevelColorOf } from "../../common/drawing/steamball_drawing.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";

const ARRIVAL_GAP_MS = 350;
const MAX_CARDS = 5;
const SOUND_FILE = "C:\\Sounds\\achievement.wav";
// Enough for a card to rise into place, shorter than any hold.
const SETTLE_MS = 1000;
const ASSETS = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images";
const TROPHY = `${ASSETS}\\achievement_trophy.png`;
const emblemOf = rank => `${ASSETS}\\rank_${rank}_tile.png`;
const WINDOW_SPAN = { xSpan: 1, ySpan: 1 };

// Titles of the cards on screen, oldest (highest) first.
function cardsOnScreen(fake) {
    return fake.drawingLayers()
        .filter(layer => layer.texts().length > 0)
        .sort((a, b) => b.position().y - a.position().y)
        .map(layer => layer.texts()[1]);
}

function submitOne(toasts, title) {
    toasts.submit({ title, description: "", onShown() {} });
}

test("a batch of Achievement Toasts stacks, five at most, and the oldest leaves first", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const toasts = createAchievementToasts(fake);
    const titles = ["1", "2", "3", "4", "5", "6", "7"];
    for (const title of titles) submitOne(toasts, title);

    fake.advanceTime(10 * ARRIVAL_GAP_MS);
    assert.deepEqual(cardsOnScreen(fake), ["1", "2", "3", "4", "5"], "the newest card lowest, five at most");

    let maxOnScreen = 0;
    for (let elapsedMs = 0; fake.drawings().length < titles.length || cardsOnScreen(fake).length > 0; elapsedMs += 100) {
        assert.ok(elapsedMs < 60000, "every toast leaves");
        const before = cardsOnScreen(fake);
        fake.advanceTime(100);
        const after = cardsOnScreen(fake);
        maxOnScreen = Math.max(maxOnScreen, after.length);
        const gone = before.filter(title => !after.includes(title));
        assert.deepEqual(gone, before.slice(0, gone.length), "the oldest card leaves first");
    }
    assert.equal(maxOnScreen, MAX_CARDS);
    assert.equal(fake.drawingLayers().length, MAX_CARDS, "layers reused from a pool");
});

test("a card holds for the configured duration, 4 s when the setting is out of range", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const tenSeconds = createAchievementToasts(fake, { toastSeconds: 10 });
    submitOne(tenSeconds, "ten");
    fake.advanceTime(9900);
    assert.deepEqual(cardsOnScreen(fake), ["ten"]);
    fake.advanceTime(SETTLE_MS);
    assert.deepEqual(cardsOnScreen(fake), []);

    assert.deepEqual(fake.logLines(), []);
    const outOfRange = createAchievementToasts(fake, { toastSeconds: 0 });
    assert.equal(fake.logLines().filter(line => line.includes("achievementToastSeconds")).length, 1);
    submitOne(outOfRange, "default");
    fake.advanceTime(3900);
    assert.deepEqual(cardsOnScreen(fake), ["default"]);
    fake.advanceTime(SETTLE_MS);
    assert.deepEqual(cardsOnScreen(fake), []);
});

// The card's outer frame (the widest) and the trophy tile's frame (the narrowest).
function cardAndTileWidths(scale) {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    submitOne(createAchievementToasts(fake, { scale }), "scaled");
    const widths = fake.drawingLayers()[0].frames().map(frame => frame.width);
    return { card: Math.max(...widths), tile: Math.min(...widths), logLines: fake.logLines() };
}

test("the configured scale enlarges the whole card, 1 when the setting is out of range", () => {
    const normal = cardAndTileWidths(1);
    const doubled = cardAndTileWidths(2);
    assert.equal(doubled.card, 2 * normal.card);
    assert.equal(doubled.tile, 2 * normal.tile);
    assert.deepEqual(doubled.logLines, []);

    const outOfRange = cardAndTileWidths(0);
    assert.equal(outOfRange.card, cardAndTileWidths(1).card);
    assert.equal(outOfRange.logLines.filter(line => line.includes("achievementToastScale")).length, 1);
    assert.equal(cardAndTileWidths(undefined).card, cardAndTileWidths(1).card, "1 by default");
});

test("the configured sound plays once per card, and a failing one never stops the card", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    fake.addFile(SOUND_FILE);
    const toasts = createAchievementToasts(fake, { soundFile: SOUND_FILE });
    submitOne(toasts, "1");
    submitOne(toasts, "2");
    fake.advanceTime(SETTLE_MS);
    assert.deepEqual(fake.soundsPlayed(), [SOUND_FILE, SOUND_FILE]);

    fake.playSound = () => { throw new Error("Windows Media Player unavailable"); };
    let shown = false;
    toasts.submit({ title: "3", description: "", onShown() { shown = true; } });
    fake.advanceTime(SETTLE_MS);
    assert.ok(shown, "the card still starts");
    assert.ok(cardsOnScreen(fake).includes("3"));
    assert.equal(fake.logLines().filter(line => line.includes("Windows Media Player unavailable")).length, 1);
});

test("a Challenge Toast shares the queue with the Achievement Toasts, with its own header and icon from the pack's assets", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const toasts = createAchievementToasts(fake);
    submitOne(toasts, "achievement");
    toasts.submit({ kind: TOAST_KIND.CHALLENGE, title: "challenge", description: "", onShown() {} });
    fake.advanceTime(SETTLE_MS);

    assert.deepEqual(cardsOnScreen(fake), ["achievement", "challenge"], "both show, in order");
    const byTitle = title => fake.drawingLayers().find(layer => layer.texts()[1] === title);
    assert.equal(byTitle("achievement").texts()[0], lang.achievements.toastHeader.toLocaleUpperCase());
    assert.equal(byTitle("challenge").texts()[0], lang.challenges.toastHeader.toLocaleUpperCase());
    const [trophy] = byTitle("achievement").images();
    const [target] = byTitle("challenge").images();
    assert.equal(trophy, TROPHY);
    assert.equal(target, "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\challenge_target.png");
});

test("a celebrated toast starts the Confetti Shower when it starts, never when it went stale", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const starts = [];
    const toasts = createAchievementToasts(fake, { confettiShower: { start: () => starts.push(fake.now().getTime()), endsAtMs: () => null, onStopped() {} } });
    submitOne(toasts, "plain");
    toasts.submit({ title: "stale", description: "", celebrate: true, isStale: () => true, onShown() {} });
    toasts.submit({ title: "celebrated", description: "", celebrate: true, onShown() {} });
    assert.deepEqual(starts, [], "not before its turn");

    fake.advanceTime(SETTLE_MS);
    assert.deepEqual(cardsOnScreen(fake), ["plain", "celebrated"]);
    assert.deepEqual(starts, [fake.now().getTime() - SETTLE_MS + ARRIVAL_GAP_MS], "once, when its card arrives");
});

test("an Error Toast waits behind the other kinds, in its copper red and warning sign, and never celebrates", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const starts = [];
    const toasts = createAchievementToasts(fake, { confettiShower: { start: () => starts.push("shower"), endsAtMs: () => null, onStopped() {} } });
    toasts.submit({ kind: TOAST_KIND.ERROR, title: "error", description: "", celebrate: true, onShown() {} });
    submitOne(toasts, "achievement");
    toasts.submit({ kind: TOAST_KIND.CHALLENGE, title: "challenge", description: "", onShown() {} });
    fake.advanceTime(3 * SETTLE_MS);

    assert.deepEqual(cardsOnScreen(fake), ["achievement", "challenge", "error"], "the bad news comes last");
    assert.deepEqual(starts, []);
    const errorCard = fake.drawingLayers().find(layer => layer.texts()[1] === "error");
    assert.equal(errorCard.texts()[0], lang.errorToast.header.toLocaleUpperCase());
    assert.deepEqual(errorCard.images(), [`${ASSETS}\\error_warning.png`]);
    assert.ok(errorCard.fills().includes(STEAMBALL_COLORS.errorAccent), "the accent bar in copper red");
});

test("a Warning Toast waits behind the other kinds, in amber with its warning sign, silent, and never celebrates", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    fake.addFile(SOUND_FILE);
    const starts = [];
    const toasts = createAchievementToasts(fake, { soundFile: SOUND_FILE, confettiShower: { start: () => starts.push("shower"), endsAtMs: () => null, onStopped() {} } });
    toasts.submit({ kind: TOAST_KIND.WARNING, title: "warning", description: "", celebrate: true, onShown() {} });
    submitOne(toasts, "achievement");
    fake.advanceTime(3 * SETTLE_MS);

    assert.deepEqual(cardsOnScreen(fake), ["achievement", "warning"], "the bad news comes last");
    assert.deepEqual(starts, []);
    assert.deepEqual(fake.soundsPlayed(), [SOUND_FILE], "the Achievement's alone");
    const warningCard = fake.drawingLayers().find(layer => layer.texts()[1] === "warning");
    assert.equal(warningCard.texts()[0], lang.warningToast.header.toLocaleUpperCase());
    assert.deepEqual(warningCard.images(), [`${ASSETS}\\warning_sign.png`]);
    assert.ok(warningCard.fills().includes(STEAMBALL_COLORS.warningAccent), "the accent bar in amber");
    assert.ok(!warningCard.fills().includes(STEAMBALL_COLORS.errorAccent), "never the Error Toast's colour");
});

test("a Warning Toast holds at least 10 s, like an Error Toast", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const toasts = createAchievementToasts(fake, { toastSeconds: 4 });
    toasts.submit({ kind: TOAST_KIND.WARNING, title: "warning", description: "", onShown() {} });
    fake.advanceTime(9900);
    assert.deepEqual(cardsOnScreen(fake), ["warning"], "still there after the 4 s of the others");
    fake.advanceTime(SETTLE_MS + ARRIVAL_GAP_MS);
    assert.deepEqual(cardsOnScreen(fake), []);
});

test("a Level Toast starts the Fireworks when it starts, and failing ones never stop it", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const starts = [];
    let failing = false;
    const fireworks = {
        start() {
            if (failing) throw new Error("no film drawn");
            starts.push(fake.now().getTime());
        },
    };
    const toasts = createAchievementToasts(fake, { fireworks });
    const shown = [];
    const levelToast = (title, tileNumber) => ({
        kind: TOAST_KIND.LEVEL, title, description: "", tileNumber, onShown: () => shown.push(title),
    });
    toasts.submit({ title: "plain", description: "", celebrate: true, onShown: () => shown.push("plain") });
    toasts.submit(levelToast("level 2", 2));
    assert.deepEqual(starts, [], "not before its turn");

    fake.advanceTime(SETTLE_MS);
    assert.deepEqual(shown, ["plain", "level 2"]);
    assert.deepEqual(starts, [fake.now().getTime() - SETTLE_MS + ARRIVAL_GAP_MS], "once, when the Level Toast arrives");

    failing = true;
    toasts.submit(levelToast("level 3", 3));
    fake.advanceTime(SETTLE_MS);
    assert.deepEqual(shown, ["plain", "level 2", "level 3"], "the Level Toast still starts");
    assert.ok(fake.drawingLayers().some(layer => layer.texts().includes("level 3")), "and is drawn");
    assert.equal(fake.logLines().filter(line => line.startsWith("[AchievementToast]") && line.includes("no film drawn")).length, 1);
});

test("an Achievement Toast shows its Rank's emblem in its Rank's colour", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    for (const rank of Object.values(ACHIEVEMENT_RANK)) fake.addFile(emblemOf(rank), "PNG");
    const toasts = createAchievementToasts(fake);
    for (const rank of Object.values(ACHIEVEMENT_RANK)) toasts.submit({ title: rank, description: "", rank, onShown() {} });
    fake.advanceTime(SETTLE_MS + 4 * ARRIVAL_GAP_MS);

    for (const rank of Object.values(ACHIEVEMENT_RANK)) {
        const layer = fake.drawingLayers().find(candidate => candidate.texts()[1] === rank);
        assert.deepEqual(layer.images(), [emblemOf(rank)], `${rank} shows its emblem, not the trophy`);
        assert.ok(layer.fills().includes(RANK_COLORS[rank]), `${rank} takes its Rank's colour`);
        assert.ok(!layer.fills().includes(STEAMBALL_COLORS.gold), `${rank} drops the default gold`);
    }
    assert.deepEqual(fake.logLines(), []);
});

test("a Level Toast takes the metal of the level it reaches, as the level pip", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const toasts = createAchievementToasts(fake);
    for (const level of [3, 12]) toasts.submit({ kind: TOAST_KIND.LEVEL, title: `level ${level}`, description: "", tileNumber: level, onShown() {} });
    fake.advanceTime(SETTLE_MS + 2 * ARRIVAL_GAP_MS);

    for (const level of [3, 12]) {
        const layer = fake.drawingLayers().find(candidate => candidate.texts().includes(`level ${level}`));
        assert.ok(layer.fills().includes(playerLevelColorOf(level)), `level ${level} in its metal`);
    }
    assert.notEqual(playerLevelColorOf(3), playerLevelColorOf(12));
    assert.deepEqual(fake.logLines(), []);
});

test("a missing Rank emblem falls back to the trophy, logged once", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const toasts = createAchievementToasts(fake);
    const { SILVER } = ACHIEVEMENT_RANK;
    toasts.submit({ title: "first", description: "", rank: SILVER, onShown() {} });
    toasts.submit({ title: "second", description: "", rank: SILVER, onShown() {} });
    fake.advanceTime(SETTLE_MS);

    for (const title of ["first", "second"]) {
        const layer = fake.drawingLayers().find(candidate => candidate.texts()[1] === title);
        assert.deepEqual(layer.images(), [TROPHY]);
        assert.ok(layer.fills().includes(RANK_COLORS[SILVER]), "still in its Rank's colour");
    }
    assert.equal(fake.logLines().filter(line => line.includes(emblemOf(SILVER))).length, 1);
});

test("a gone toast's layer is a point, and the toasts reusing it show at the window's span", () => {
    const fake = createFakePinballYHost();
    fake.installGlobals();
    const toasts = createAchievementToasts(fake);
    const placesOf = titles => titles.map(title => {
        const layer = fake.drawingLayers().find(candidate => candidate.texts()[1] === title);
        return { scale: layer.scale(), position: layer.position(), alpha: layer.alpha };
    });
    const firstBatch = ["1", "2", "3"];
    for (const title of firstBatch) submitOne(toasts, title);
    fake.advanceTime(SETTLE_MS);
    const usualPlaces = placesOf(firstBatch);
    assert.deepEqual(layersBreakingTheRule(fake), [], "on screen");
    assert.deepEqual(usualPlaces.map(place => place.scale), firstBatch.map(() => WINDOW_SPAN));

    fake.advanceTime(60000);
    assert.equal(cardsOnScreen(fake).length, 0, "every card gone");
    assert.ok(fake.drawingLayers().every(isPoint), "every gone card's layer is a point");

    const secondBatch = ["4", "5", "6"];
    for (const title of secondBatch) submitOne(toasts, title);
    fake.advanceTime(SETTLE_MS);
    assert.equal(fake.drawingLayers().length, firstBatch.length, "the layers reused");
    assert.deepEqual(placesOf(secondBatch), usualPlaces, "at the usual place and size, several at once");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    assert.deepEqual(fake.logLines(), []);
});
