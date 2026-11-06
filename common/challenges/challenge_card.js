// ============================================================
// Challenge Card: the week's Challenge and the active Profile's progress at
// the top right of the wheel screen, on its own layer (see docs/adr/0003).
// Lights up once on something new; shows last week's verdict first in a new
// week. Redrawn at startup, on a Profile switch and on "wheelmode".
// - Hidden, a point, with no Challenge and while a game runs.
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler } from "../core/safe_handler.js";
import { STEAMBALL_COLORS, STEAMBALL_FONTS } from "../drawing/steamball_palette.js";
import { createHiddenLayer, hideLayer, placeAligned } from "../drawing/placed_layers.js";
import { challengeTitleOf } from "./challenge.js";

const SCRIPT_NAME = "ChallengeCard";

// Like the badge: above the wheel and the game info box, under popups and menus.
export const CHALLENGE_CARD_Z_INDEX = 4500;
// Its own canvas pinned to the top right corner, right under the badge's
// canvas when there is one, for the same reason as the badge: a canvas
// drawn at startup, before the window is laid out, would be stretched out
// of shape. Sizes are on the cabinet's 1920 px high playfield; the card's
// right edge lines up with the badge's Avatar, and the canvas leaves room
// for the glow. The Mastery Bar lines up under it with the same sizes.
// Heights are for a one-line title: everything under the title moves down
// by the extra lines of a title that wraps.
export const CARD_REFERENCE_HEIGHT = 1920;
export const BADGE_HEIGHT = 170;
const CANVAS = Object.freeze({ width: 400, height: 124 });
const CARD = Object.freeze({ x: 10, y: 8, width: 360, height: 106, padding: 14, border: 1, accentHeight: 3 });
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
    accent: STEAMBALL_COLORS.challengeAccent,
    accentLit: STEAMBALL_COLORS.challengeAccentLit,
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

// The card's canvas height for this Challenge, in reference px: the Mastery
// Bar sits right under it.
export function challengeCardCanvasHeight(host, challenge) {
    return CANVAS.height + titleExtraHeight(host, challenge);
}

// Fading one-pixel frames around the card, widening outwards.
function drawGlow(dc, cardHeight) {
    const accentRgb = COLORS.accent & 0xFFFFFF;
    for (let ring = HIGHLIGHT.glowRings; ring >= 1; ring--) {
        const alpha = Math.round(HIGHLIGHT.glowMaxAlpha * (1 - ring / (HIGHLIGHT.glowRings + 1)));
        dc.frameRect(CARD.x - ring, CARD.y - ring, CARD.width + 2 * ring, cardHeight + 2 * ring, 1, alpha * 2 ** 24 + accentRgb);
    }
}

// What the card shows: the week's Challenge or the previous one's verdict.
function currentFace({ challenge, value, daysLeft, completed }) {
    const TEXT = lang.challenges;
    const daysText = daysLeft === 1 ? TEXT.lastDay : TEXT.daysLeft(daysLeft);
    return {
        header: TEXT.cardHeader, challenge, value, completed,
        status: completed ? TEXT.completed : TEXT.progress(value, challenge.target, daysText),
    };
}

function verdictFace({ challenge, reached, completed }) {
    const TEXT = lang.challenges;
    return {
        header: TEXT.verdictHeader, challenge, value: reached, completed,
        status: completed ? TEXT.completed : TEXT.missed(reached, challenge.target),
    };
}

// extra: how much taller than one title line the card is drawn.
function drawCard(host, dc, face, lit, extra) {
    const { header, challenge, value, completed, status } = face;
    const cardHeight = CARD.height + extra;
    if (lit) drawGlow(dc, cardHeight);
    dc.fillRect(CARD.x, CARD.y, CARD.width, cardHeight, COLORS.background);
    dc.frameRect(CARD.x, CARD.y, CARD.width, cardHeight, CARD.border, COLORS.border);
    dc.fillRect(CARD.x, CARD.y, CARD.width, CARD.accentHeight, COLORS.accent);

    drawText(host, dc, header.toLocaleUpperCase(), { ...HEADER, weight: 600, color: COLORS.accent });
    drawText(host, dc, challengeTitleOf(challenge), { ...TITLE, weight: 600, color: COLORS.title });

    const barX = CARD.x + CARD.padding;
    const barY = CARD.y + BAR.y + extra;
    dc.fillRect(barX, barY, TEXT_WIDTH, BAR.height, COLORS.barTrack);
    const filled = Math.round(TEXT_WIDTH * value / challenge.target);
    if (filled > 0) dc.fillRect(barX, barY, filled, BAR.height, lit ? COLORS.accentLit : COLORS.accent);

    drawText(host, dc, status,
        { ...PROGRESS, y: PROGRESS.y + extra, weight: completed ? 600 : 400, color: completed ? COLORS.accent : COLORS.text });
}

// underBadge: false when there is no Profile badge to leave room for.
export function createChallengeCard(host, challenges, profileStore, { underBadge = true } = {}) {
    const layer = createHiddenLayer(host, CHALLENGE_CARD_Z_INDEX);
    const yOffset = underBadge ? -BADGE_HEIGHT / CARD_REFERENCE_HEIGHT : 0;
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
        placeAligned(layer, { ySpan: (CANVAS.height + extra) / CARD_REFERENCE_HEIGHT }, 0, yOffset, "top right");
        layer.draw(dc => drawCard(host, dc, face, lit, extra), CANVAS.width, CANVAS.height + extra);
    }

    const drawCurrent = lit => {
        const view = challenges.getActiveView();
        draw(view && currentFace(view), lit);
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
        if (verdict) unseenVerdict = verdictFace(verdict);
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

    // Never over a game.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        stopTimer();
        hideLayer(layer);
    }));
    // Fires back on the wheel, after a game, a menu or a dialog.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => refresh()));
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => refresh({ switched: true })));

    refresh();
}
