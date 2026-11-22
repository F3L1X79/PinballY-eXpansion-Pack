// ============================================================
// Challenge Card and Household Challenge Card: the week's challenge and its
// progress at the top right of the wheel screen, each on its own layer (see
// docs/adr/0003), twins but for their colour and texts. Light up once on something
// new; show last week's verdict first in a new week. Wheel Marks (common/core/wheel_marks.js),
// with or without a selected table: redrawn at startup, on a Profile switch and on the return to the wheel.
// - Hidden, a point, with no challenge, while a game runs and in attract mode.
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler } from "../core/safe_handler.js";
import { STEAMBALL_COLORS, STEAMBALL_FONTS } from "../drawing/steamball_palette.js";
import { TOP_RIGHT_STACK } from "../drawing/top_right_stack.js";
import { createHiddenLayer, hideLayer, placeAligned } from "../drawing/placed_layers.js";
import { challengeTitleOf } from "./challenge.js";

// Like the badge: above the wheel and the game info box, under popups and menus.
export const CHALLENGE_CARD_Z_INDEX = 4500;
export const HOUSEHOLD_CHALLENGE_CARD_Z_INDEX = 4501;

// What tells one card from the other: its texts are read on each draw.
const CHALLENGE_LOOK = Object.freeze({
    scriptName: "ChallengeCard",
    zIndex: CHALLENGE_CARD_Z_INDEX,
    place: TOP_RIGHT_STACK.CHALLENGE_CARD,
    accent: STEAMBALL_COLORS.challengeAccent,
    accentLit: STEAMBALL_COLORS.challengeAccentLit,
    texts: () => lang.challenges,
});
const HOUSEHOLD_LOOK = Object.freeze({
    scriptName: "HouseholdChallengeCard",
    zIndex: HOUSEHOLD_CHALLENGE_CARD_Z_INDEX,
    place: TOP_RIGHT_STACK.HOUSEHOLD_CHALLENGE_CARD,
    accent: STEAMBALL_COLORS.householdAccent,
    accentLit: STEAMBALL_COLORS.householdAccentLit,
    texts: () => ({ ...lang.challenges, ...lang.householdChallenge }),
});
// Its own canvas pinned to the top right corner, where the top right stack
// puts it, for the same reason as the badge: a canvas drawn at startup,
// before the window is laid out, would be stretched out of shape. Sizes
// are on the cabinet's 1920 px high playfield; the card's right edge lines
// up with the badge's Avatar, and the canvas leaves room for the glow. The
// Rating Plate and the Mastery Bar line up with the same sizes.
// Heights are for a one-line title: everything under the title moves down
// by the extra lines of a title that wraps.
export const CARD_REFERENCE_HEIGHT = 1920;
const CANVAS = Object.freeze({ width: 400, height: 124 });
const CARD = Object.freeze({ x: 10, y: 8, width: 360, height: 106, padding: 14, border: 1, accentHeight: 3 });
// The canvas's room around the card, which the top right stack keeps.
const CHALLENGE_CARD_MARGINS = Object.freeze({ top: CARD.y, bottom: CANVAS.height - CARD.y - CARD.height });
const HEADER = Object.freeze({ y: 14, size: 11 });
const TITLE = Object.freeze({ y: 34, size: 16 });
const BAR = Object.freeze({ y: 66, height: 6 });
const PROGRESS = Object.freeze({ y: 78, size: 12 });
const FONT = STEAMBALL_FONTS.body;
const HIGHLIGHT = Object.freeze({ ms: 1200, glowRings: 8, glowMaxAlpha: 0x60 });
// How long the verdict stays before the week's Challenge replaces it.
export const CHALLENGE_VERDICT_MS = 5000;
const COLORS = Object.freeze({
    background: STEAMBALL_COLORS.panelTranslucent,
    border: STEAMBALL_COLORS.border,
    barTrack: STEAMBALL_COLORS.track,
    title: STEAMBALL_COLORS.title,
    text: STEAMBALL_COLORS.description,
    transparent: STEAMBALL_COLORS.transparent,
});

const TEXT_WIDTH = CARD.width - 2 * CARD.padding;

function styledText(host, text, { size, weight = 400, color }) {
    const styled = host.createStyledText({ textStyle: { font: FONT, size, weight, color } });
    styled.add(text);
    return styled;
}

function drawText(host, dc, text, { y, ...style }) {
    const styled = styledText(host, text, style);
    styled.draw(dc, { x: CARD.x + CARD.padding, y: CARD.y + y, width: TEXT_WIDTH, height: styled.measure(TEXT_WIDTH).height });
}


// How much taller than one line the challenge's title is once wrapped.
function titleExtraHeight(host, challenge) {
    const style = { size: TITLE.size, weight: 600 };
    const oneLine = styledText(host, "X", style).measure(TEXT_WIDTH).height;
    return Math.max(0, styledText(host, challengeTitleOf(challenge), style).measure(TEXT_WIDTH).height - oneLine);
}

// The card's canvas height for this Challenge, in reference px.
function challengeCardCanvasHeight(host, challenge) {
    return CANVAS.height + titleExtraHeight(host, challenge);
}

// Fading one-pixel frames around the card, widening outwards.
function drawGlow(dc, cardHeight, accent) {
    const accentRgb = accent & 0xFFFFFF;
    for (let ring = HIGHLIGHT.glowRings; ring >= 1; ring--) {
        const alpha = Math.round(HIGHLIGHT.glowMaxAlpha * (1 - ring / (HIGHLIGHT.glowRings + 1)));
        dc.frameRect(CARD.x - ring, CARD.y - ring, CARD.width + 2 * ring, cardHeight + 2 * ring, 1, alpha * 2 ** 24 + accentRgb);
    }
}

// What the card shows: the week's challenge or the previous one's verdict.
function currentFace(texts, { challenge, value, daysLeft, completed }) {
    const TEXT = texts;
    const daysText = daysLeft === 1 ? TEXT.lastDay : TEXT.daysLeft(daysLeft);
    return {
        header: TEXT.cardHeader, challenge, value, completed,
        status: completed ? TEXT.completed : TEXT.progress(value, challenge.target, daysText),
    };
}

function verdictFace(texts, { challenge, reached, completed }) {
    const TEXT = texts;
    return {
        header: TEXT.verdictHeader, challenge, value: reached, completed,
        status: completed ? TEXT.completed : TEXT.missed(reached, challenge.target),
    };
}

// extra: how much taller than one title line the card is drawn.
function drawCard(host, dc, face, lit, extra, { accent, accentLit }) {
    const { header, challenge, value, completed, status } = face;
    const cardHeight = CARD.height + extra;
    if (lit) drawGlow(dc, cardHeight, accent);
    dc.fillRect(CARD.x, CARD.y, CARD.width, cardHeight, COLORS.background);
    dc.frameRect(CARD.x, CARD.y, CARD.width, cardHeight, CARD.border, COLORS.border);
    dc.fillRect(CARD.x, CARD.y, CARD.width, CARD.accentHeight, accent);

    drawText(host, dc, header.toLocaleUpperCase(), { ...HEADER, weight: 600, color: accent });
    drawText(host, dc, challengeTitleOf(challenge), { ...TITLE, weight: 600, color: COLORS.title });

    const barX = CARD.x + CARD.padding;
    const barY = CARD.y + BAR.y + extra;
    dc.fillRect(barX, barY, TEXT_WIDTH, BAR.height, COLORS.barTrack);
    const filled = Math.round(TEXT_WIDTH * value / challenge.target);
    if (filled > 0) dc.fillRect(barX, barY, filled, BAR.height, lit ? accentLit : accent);

    drawText(host, dc, status,
        { ...PROGRESS, y: PROGRESS.y + extra, weight: completed ? 600 : 400, color: completed ? accent : COLORS.text });
}

// challenges: the Challenge module, or any with the same showUp() and getActiveView().
// topOf: how far below the window's top the card sits, in reference px.
// Returns the card as a Wheel Mark, for getWheelMarks().register().
export function createChallengeCard(host, challenges, { topOf, look = CHALLENGE_LOOK }) {
    const SCRIPT_NAME = look.scriptName;
    const layer = createHiddenLayer(host, look.zIndex);
    let timer = null;

    function stopTimer() {
        host.clearTimeout(timer);
        timer = null;
    }

    // The card's one pending step: a new one replaces it.
    function scheduleNext(ms, callback) {
        timer = host.setTimeout(safeHandler(SCRIPT_NAME, () => {
            timer = null;
            callback();
        }), ms);
    }

    function draw(face, lit) {
        layer.clear(COLORS.transparent);
        if (!face) {
            hideLayer(layer);
            return;
        }
        layer.alpha = 1;
        // At least as tall as the week's Challenge needs, the Mastery Bar's
        // place under it, while the previous one's verdict shows.
        const view = challenges.getActiveView();
        const extra = Math.max(titleExtraHeight(host, face.challenge), view ? titleExtraHeight(host, view.challenge) : 0);
        // The span follows the canvas height, so a taller card keeps its proportions.
        // 0 - top: a card at the very top is placed at 0, not -0.
        placeAligned(layer, { ySpan: (CANVAS.height + extra) / CARD_REFERENCE_HEIGHT }, 0, (0 - topOf()) / CARD_REFERENCE_HEIGHT, "top right");
        layer.draw(dc => drawCard(host, dc, face, lit, extra, look), CANVAS.width, CANVAS.height + extra);
    }

    const drawCurrent = lit => {
        const view = challenges.getActiveView();
        draw(view && currentFace(look.texts(), view), lit);
    };

    // Lit up, then resting after the highlight, then whatever comes next.
    function lightUp(drawFace, next = () => {}) {
        drawFace(true);
        scheduleNext(HIGHLIGHT.ms, () => {
            drawFace(false);
            next();
        });
    }

    // The verdict until it has stayed its full time: it is saved as shown
    // as soon as it is judged, so a menu or a dialog closing over it (at
    // startup, the Period Table announcements) shows it again rather than
    // losing it. A Profile switch drops it.
    let unseenVerdict = null;

    // The verdict first, and the week's Challenge lit up once it is gone;
    // otherwise the week's Challenge, lit up when there is something new.
    function refresh(options = {}) {
        stopTimer();
        const { hasNews, verdict } = challenges.showUp(options);
        if (verdict) unseenVerdict = verdictFace(look.texts(), verdict);
        else if (options.switched) unseenVerdict = null;
        if (unseenVerdict) {
            const face = unseenVerdict;
            lightUp(lit => draw(face, lit), () => scheduleNext(CHALLENGE_VERDICT_MS - HIGHLIGHT.ms, () => {
                unseenVerdict = null;
                lightUp(drawCurrent);
            }));
        } else if (hasNews) {
            lightUp(drawCurrent);
        } else {
            drawCurrent(false);
        }
    }

    // Hidden by the Wheel Mark module (a game, attract mode), or never shown yet.
    let isHidden = true;
    // A Profile switch while hidden still drops the previous Profile's verdict.
    let switchedWhileHidden = false;

    return {
        topRight: {
            place: look.place,
            margins: CHALLENGE_CARD_MARGINS,
            // The week's challenge's: the pieces under it follow.
            height: () => {
                const view = challenges.getActiveView();
                return view ? challengeCardCanvasHeight(host, view.challenge) : null;
            },
        },
        // The card follows the active Profile, not the selected table.
        showsWithoutTable: true,
        // Redrawn when it shows again, on the return to the wheel and on a
        // Profile switch; the wheel's moves leave it as it is.
        show(game, { returned, switched }) {
            if (!isHidden && !returned && !switched) return;
            const options = switched || switchedWhileHidden ? { switched: true } : {};
            isHidden = false;
            switchedWhileHidden = false;
            refresh(options);
        },
        // Never over a game nor in attract mode.
        hide({ switched }) {
            if (switched) switchedWhileHidden = true;
            isHidden = true;
            stopTimer();
            hideLayer(layer);
        },
    };
}

// The Household Challenge Card: the Challenge Card's twin, in pastel pink,
// from the Household Challenge module.
export const createHouseholdChallengeCard = (host, householdChallenge, { topOf }) =>
    createChallengeCard(host, householdChallenge, { topOf, look: HOUSEHOLD_LOOK });
