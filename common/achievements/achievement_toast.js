// ============================================================
// Achievement Toast: announces each unlocked Achievement with a small card
// in the bottom-right corner, on a non-blocking drawing layer (see
// docs/adr/0003). Also shows the Challenge, Mastery, Level, High Score,
// Frame, Error and Warning Toasts, which share its queue. Cards stack, at most five on screen.
// - Toasts wait during a game and while a drawn dialog is open (docs/adr/0011).
// - A celebrated toast starts the Confetti Shower, a Level Toast the Fireworks.
// - A Level Toast waits until a second before the shower ends.
// - An Error or Warning Toast comes last, holds at least 10 s, plays no sound, never celebrates.
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import config from "../core/config.js";
import { STEAMBALL_COLORS, STEAMBALL_FONTS, RANK_COLORS } from "../drawing/steamball_palette.js";
import { playerLevelColorOf } from "../drawing/steamball_drawing.js";
import { getConfettiShower } from "../celebrations/confetti_shower.js";
import { getFireworks } from "../celebrations/fireworks.js";
import { getWheelDialogs } from "../core/wheel_dialog.js";
import { createHiddenLayer, hideLayer, placeAligned, WINDOW_SPAN } from "../drawing/placed_layers.js";

const SCRIPT_NAME = "AchievementToast";

// Above PinballY's menus and popups. Exported for the tests' reader.
export const ACHIEVEMENT_TOAST_Z_INDEX = 6500;
const FRAME_MS = 16;
const DEFAULT_TOAST_SECONDS = 4;
const MAX_TOAST_SECONDS = 60;
const FADE_MS = 250;
// Fraction of the remaining distance covered each frame while rising (ease-out).
const RISE_EASE = 0.2;
const ARRIVAL_GAP_MS = 350;
const MAX_CARDS = 5;
// A Level Toast and its Fireworks start this long before a falling
// Confetti Shower's end, so the celebrations follow each other without a gap.
const LEVEL_TOAST_SHOWER_LEAD_MS = 1000;
// An Error or Warning Toast holds at least this long: a whole sentence to read.
const BAD_NEWS_MIN_HOLD_MS = 10000;

// Card look at scale 1, validated with a prototype in PinballY; sizes in
// pixels, fonts in points. The player's scale multiplies all of them.
const BASE_LOOK = Object.freeze({
    cardWidth: 440,
    border: 1,
    edgeMargin: 24,
    stackGap: 10,
    paddingY: 22,
    paddingRight: 14,
    accentBarWidth: 5,
    tileSize: 64,
    tileGap: 20,
    tileFrame: 3,
    iconInset: 10,
    // A Rank emblem's image is cropped to its edges: it nearly meets the frame.
    emblemInset: 5,
    // One-pixel frames, so the glow widens with the tile.
    glowRings: 10,
    smallFont: 11,
    titleFont: 13,
});
// The validated card, unscaled; a player enlarges it with ACHIEVEMENT_TOAST_SCALE.
const DEFAULT_TOAST_SCALE = 1;
// Below it, the tile frame and the small font round down to nothing.
const MIN_TOAST_SCALE = 0.5;
const MAX_TOAST_SCALE = 3;
const GLOW_MAX_ALPHA = 0x38;
const FONT = STEAMBALL_FONTS.body;
// The number drawn in place of an icon, as a share of the tile.
const TILE_NUMBER_SHARE = 0.5;
const COLORS = Object.freeze({
    gradientTop: STEAMBALL_COLORS.panelTop,
    gradientBottom: STEAMBALL_COLORS.panel,
    border: STEAMBALL_COLORS.border,
    tile: STEAMBALL_COLORS.tile,
    title: STEAMBALL_COLORS.title,
    description: STEAMBALL_COLORS.description,
    transparent: STEAMBALL_COLORS.transparent,
});

export const TOAST_KIND = Object.freeze({
    ACHIEVEMENT: "achievement", CHALLENGE: "challenge", MASTERY: "mastery", LEVEL: "level", HIGH_SCORE: "highScore", FRAME: "frame",
    ERROR: "error", WARNING: "warning",
});

const isBadNews = toast => toast.kind === TOAST_KIND.ERROR || toast.kind === TOAST_KIND.WARNING;

// Icons in the pack's assets folder, drawn by absolute path: drawImage
// resolves relative paths from the PinballY folder, not the pack's.
const KIND_LOOKS = Object.freeze({
    [TOAST_KIND.ACHIEVEMENT]: {
        accent: STEAMBALL_COLORS.gold,
        iconFile: "assets\\images\\achievement_trophy.png",
        header: () => lang.achievements.toastHeader,
    },
    // The Challenge Card's accent, so the toast reads as the card's news.
    [TOAST_KIND.CHALLENGE]: {
        accent: STEAMBALL_COLORS.challengeAccent,
        iconFile: "assets\\images\\challenge_target.png",
        header: () => lang.challenges.toastHeader,
    },
    // No icon: each toast brings its accent and the number its tile shows.
    [TOAST_KIND.MASTERY]: {
        header: () => lang.tableMastery.toastHeader,
    },
    // No icon either: the reached level's number fills the tile, in that
    // level's metal.
    [TOAST_KIND.LEVEL]: {
        accent: toast => playerLevelColorOf(toast.tileNumber),
        header: () => lang.playerLevel.toastHeader,
    },
    // No trophy: the place won fills the tile.
    [TOAST_KIND.HIGH_SCORE]: {
        accent: STEAMBALL_COLORS.highScoreAccent,
        header: () => lang.highScores.toastHeader,
    },
    // The frame won fills the tile, from the toast's imagePath.
    [TOAST_KIND.FRAME]: {
        accent: STEAMBALL_COLORS.gold,
        header: () => lang.profileRewards.toastHeader,
    },
    // A failure the player would not see otherwise: a warning sign, never a celebration.
    [TOAST_KIND.ERROR]: {
        accent: STEAMBALL_COLORS.errorAccent,
        iconFile: "assets\\images\\error_warning.png",
        header: () => lang.errorToast.header,
    },
    // Something the owner turned on that won't work this session: the Error
    // Toast's look in amber, since it is no failure of the pack.
    [TOAST_KIND.WARNING]: {
        accent: STEAMBALL_COLORS.warningAccent,
        iconFile: "assets\\images\\warning_sign.png",
        header: () => lang.warningToast.header,
    },
});

function mixColors(from, to, ratio) {
    let color = 0;
    for (const shift of [24, 16, 8, 0]) {
        const start = (from >>> shift) & 0xFF;
        const end = (to >>> shift) & 0xFF;
        color += Math.round(start + (end - start) * ratio) * 2 ** shift;
    }
    return color;
}

// Drawn as one-pixel rows: the drawing context has no gradient fill.
function fillGradient(dc, x, y, width, height, topColor, bottomColor) {
    for (let row = 0; row < height; row++) {
        dc.fillRect(x, y + row, width, 1, mixColors(topColor, bottomColor, row / Math.max(1, height - 1)));
    }
}

const scaleLook = scale => Object.freeze(Object.fromEntries(
    Object.entries(BASE_LOOK).map(([name, size]) => [name, Math.round(size * scale)])));

// Dark tile with an accent frame, a soft accent glow made of fading
// frames, and the icon inset by iconInset, or else the number in the accent.
function drawTile(host, dc, look, x, y, accent, { iconPath, iconInset, number }) {
    const { tileSize, glowRings } = look;
    const accentRgb = accent & 0xFFFFFF;
    for (let ring = glowRings; ring >= 1; ring--) {
        const alpha = Math.round(GLOW_MAX_ALPHA * (1 - ring / (glowRings + 1)));
        dc.frameRect(x - ring, y - ring, tileSize + 2 * ring, tileSize + 2 * ring, 1, alpha * 2 ** 24 + accentRgb);
    }
    dc.fillRect(x, y, tileSize, tileSize, COLORS.tile);
    dc.frameRect(x, y, tileSize, tileSize, look.tileFrame, accent);
    if (iconPath) {
        dc.drawImage(iconPath, x + iconInset, y + iconInset, tileSize - 2 * iconInset, tileSize - 2 * iconInset);
        return;
    }
    // A Frame Toast whose image is missing: an empty tile.
    if (number === undefined) return;
    const text = host.createStyledText({
        textAlign: "center",
        textStyle: { font: STEAMBALL_FONTS.display, size: Math.round(tileSize * TILE_NUMBER_SHARE), weight: 700, color: accent },
    });
    text.add(String(number));
    const height = text.measure(tileSize).height;
    text.draw(dc, { x, y: y + (tileSize - height) / 2, width: tileSize, height });
}

// Draws the card flush with the bottom-right corner of the layer's layout
// (rotation-aware) and returns its height and the layout height.
// Backgrounds use fillRect and frameRect: a StyledText holding only a
// space draws no background.
// iconOf(toast, iconFile): the tile's icon, { path, isEmblem }.
function drawCard(host, dc, look, toast, iconOf) {
    const { cardWidth, edgeMargin, accentBarWidth, tileSize, tileGap, smallFont } = look;
    const kindLook = KIND_LOOKS[toast.kind || TOAST_KIND.ACHIEVEMENT];
    const kindAccent = typeof kindLook.accent === "function" ? kindLook.accent(toast) : kindLook.accent;
    const accent = toast.accent || RANK_COLORS[toast.rank] || kindAccent;
    const size = dc.getSize();
    const textLeft = accentBarWidth + tileGap + tileSize + tileGap;
    const textWidth = cardWidth - textLeft - look.paddingRight;
    const text = host.createStyledText({ textStyle: { font: FONT, size: smallFont, color: COLORS.description } });
    text.add({ size: smallFont, weight: 600, color: accent, text: (toast.header || kindLook.header()).toLocaleUpperCase() + "\n" });
    text.add({ size: look.titleFont, weight: 600, color: COLORS.title, text: toast.title + "\n" });
    if (toast.extraLine) {
        text.add(toast.description + "\n");
        text.add({ weight: 600, color: accent, text: toast.extraLine });
    } else text.add(toast.description);
    const textHeight = text.measure(textWidth).height;
    const height = Math.max(textHeight, tileSize) + 2 * look.paddingY;
    const x = size.width - cardWidth - edgeMargin;
    const y = size.height - height - edgeMargin;

    fillGradient(dc, x, y, cardWidth, height, COLORS.gradientTop, COLORS.gradientBottom);
    dc.frameRect(x, y, cardWidth, height, look.border, COLORS.border);
    dc.fillRect(x, y, accentBarWidth, height, accent);
    let icon = kindLook.iconFile ? iconOf(toast, kindLook.iconFile) : null;
    if (toast.imagePath) icon = { path: toast.imagePath, isEmblem: true };
    drawTile(host, dc, look, x + accentBarWidth + tileGap, y + (height - tileSize) / 2, accent, icon
        ? { iconPath: icon.path, iconInset: icon.isEmblem ? look.emblemInset : look.iconInset }
        : { number: toast.tileNumber });
    text.draw(dc, { x: x + textLeft, y: y + (height - textHeight) / 2, width: textWidth, height: textHeight });
    return { height, layoutHeight: size.height };
}

// Seconds a card stays fully visible; an absurd value falls back to the default.
function toHoldMs(host, toastSeconds) {
    if (toastSeconds > 0 && toastSeconds <= MAX_TOAST_SECONDS) return toastSeconds * 1000;
    host.log(`[${SCRIPT_NAME}] achievementToastSeconds must be above 0 and at most ${MAX_TOAST_SECONDS}, `
        + `not ${toastSeconds}; using ${DEFAULT_TOAST_SECONDS}.`);
    return DEFAULT_TOAST_SECONDS * 1000;
}

// An absurd scale falls back to the default.
function toScale(host, scale) {
    if (scale >= MIN_TOAST_SCALE && scale <= MAX_TOAST_SCALE) return scale;
    host.log(`[${SCRIPT_NAME}] achievementToastScale must be from ${MIN_TOAST_SCALE} to ${MAX_TOAST_SCALE}, `
        + `not ${scale}; using ${DEFAULT_TOAST_SCALE}.`);
    return DEFAULT_TOAST_SCALE;
}

// soundFile: absolute path played at the start of each card, empty for none.
// confettiShower: started by a celebrated toast, and followed by a Level
// Toast; the tests may leave it out.
// fireworks: started by a Level Toast; the tests may leave it out.
// wheelDialogs: the wheel dialog module, whose drawn dialogs toasts wait
// for; the tests may leave it out.
export function createAchievementToasts(host, {
    toastSeconds = DEFAULT_TOAST_SECONDS, soundFile = "", scale = DEFAULT_TOAST_SCALE, confettiShower = { start() {}, endsAtMs: () => null, onStopped() {} },
    fireworks = { start() {} }, wheelDialogs = { hasDrawnDialog: () => false, onDrawnDialogClosed() {} },
} = {}) {
    const holdMs = toHoldMs(host, toastSeconds);
    const look = scaleLook(toScale(host, scale));
    // A sound that cannot play is logged and never stops the card.
    const playSound = safeHandler(SCRIPT_NAME, () => { if (soundFile) host.playSound(soundFile); });
    // A shower that fails is logged and never stops the card.
    const celebrate = safeHandler(SCRIPT_NAME, () => confettiShower.start());
    // Fireworks that fail are logged and never stop the Level Toast.
    const startFireworks = safeHandler(SCRIPT_NAME, () => fireworks.start());
    const waiting = [];
    const projectFolder = host.getProjectFolder();
    // Each Rank's emblem path, or null when its file is missing: checked once.
    const rankEmblems = new Map();
    // Cards on screen, oldest first. Each one: its layer, its height, the
    // layout height, its lift above the bottom slot (layout pixels, up is
    // positive), its alpha and whether it is leaving.
    const cards = [];
    // Layers of cards that left, points kept for the next ones.
    const freeLayers = [];
    let frameTimer = null;
    // False for ARRIVAL_GAP_MS after a card arrives, so a batch arrives staggered.
    let arrivalOpen = true;
    // Shows the Level Toast that waits for a Confetti Shower's end, or null.
    let showerTimer = null;

    // The plain emblem cropped to its edges, so it fills the tile; the list
    // keeps the uncropped one, framed like its muted twin.
    function rankEmblemOf(rank) {
        if (!rankEmblems.has(rank)) {
            const path = `${projectFolder}\\assets\\images\\rank_${rank}_tile.png`;
            const exists = host.files.fileExists(path);
            if (!exists) host.log(`[${SCRIPT_NAME}] Rank emblem not found, drawing the trophy instead: ${path}`);
            rankEmblems.set(rank, exists ? path : null);
        }
        return rankEmblems.get(rank);
    }

    // An Achievement Toast's Rank emblem, else the kind's icon.
    function iconOf(toast, iconFile) {
        const emblem = toast.rank ? rankEmblemOf(toast.rank) : null;
        return emblem ? { path: emblem, isEmblem: true } : { path: `${projectFolder}\\${iconFile}`, isEmblem: false };
    }

    // Every other card holds as long from its arrival, so the oldest leaves first.
    const holdMsOf = toast => (isBadNews(toast) ? Math.max(BAD_NEWS_MIN_HOLD_MS, holdMs) : holdMs);

    function placeLayer(card) {
        card.layer.alpha = card.alpha;
        card.layer.setPos(0, card.lift / card.layoutHeight);
    }

    function startFrames() {
        if (frameTimer === null) frameTimer = host.setInterval(safeHandler(SCRIPT_NAME, step), FRAME_MS);
    }

    function stopFrames() {
        host.clearInterval(frameTimer);
        frameTimer = null;
    }

    // Every card's slot sits above the newer cards below it.
    function targetLift(index) {
        let lift = 0;
        for (let newer = index + 1; newer < cards.length; newer++) lift += cards[newer].height + look.stackGap;
        return lift;
    }

    function startLeaving(card) {
        card.leaving = true;
        startFrames();
    }

    // Runs every frame while a card rises, eases up or fades, then stops.
    function step() {
        let moving = false;
        cards.forEach((card, index) => {
            const remaining = targetLift(index) - card.lift;
            if (Math.abs(remaining) * (1 - RISE_EASE) >= 0.5) {
                card.lift += remaining * RISE_EASE;
                moving = true;
            } else card.lift += remaining;
            if (card.leaving) {
                card.alpha = Math.max(0, card.alpha - FRAME_MS / FADE_MS);
                moving = true;
            }
            placeLayer(card);
        });
        // Any faded card, not only the oldest: an Error Toast outlasts the cards after it.
        const gone = cards.filter(card => card.leaving && card.alpha === 0);
        if (gone.length > 0) {
            for (const card of gone) {
                cards.splice(cards.indexOf(card), 1);
                card.layer.clear(COLORS.transparent);
                hideLayer(card.layer);
                freeLayers.push(card.layer);
            }
            showNext();
            moving = true;
        }
        if (!moving) stopFrames();
    }

    function openArrival() {
        arrivalOpen = true;
        showNext();
    }

    // Holds a Level Toast while the Confetti Shower falls, with a timer that
    // shows it a second before the shower's end; true when it holds it.
    function holdForShower(toast) {
        if (toast.kind !== TOAST_KIND.LEVEL) return false;
        const endMs = confettiShower.endsAtMs();
        if (endMs === null) return false;
        const waitMs = endMs - LEVEL_TOAST_SHOWER_LEAD_MS - host.now().getTime();
        if (waitMs <= 0) return false;
        if (showerTimer === null) {
            showerTimer = host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                showerTimer = null;
                showNext();
            }), waitMs);
        }
        return true;
    }

    function showNext() {
        if (!arrivalOpen || cards.length >= MAX_CARDS || waiting.length === 0) return;
        // PinballY stops redrawing its window while a game starts, runs or
        // exits, and the game covers it.
        if (host.getFullUIMode().runMode !== undefined) return;
        // A drawn dialog is the one exception to "over everything": the
        // toast, and the confetti or Fireworks it may start, would hide what it asks.
        if (wheelDialogs.hasDrawnDialog()) return;
        // A toast gone stale while it waited (its Profile was reset, the
        // active Profile no longer the one it is for) never shows. Decided
        // only now: the Startup Screen's pick may still change the Profile.
        while (waiting.length > 0 && waiting[0].isStale && waiting[0].isStale()) waiting.shift();
        if (waiting.length === 0) return;
        if (holdForShower(waiting[0])) return;

        const toast = waiting.shift();
        const layer = freeLayers.pop() || createHiddenLayer(host, ACHIEVEMENT_TOAST_Z_INDEX);
        // The card is drawn on a canvas the window's size, stretched back over it.
        placeAligned(layer, WINDOW_SPAN, 0, 0);
        let drawn = null;
        layer.draw(dc => { drawn = drawCard(host, dc, look, toast, iconOf); });
        // Starts just below the bottom edge, then rises into place.
        const card = {
            layer, height: drawn.height, layoutHeight: drawn.layoutHeight,
            lift: -(drawn.height + look.edgeMargin), alpha: 1, leaving: false,
        };
        cards.push(card);
        placeLayer(card);
        host.setTimeout(safeHandler(SCRIPT_NAME, () => startLeaving(card)), holdMsOf(toast));
        arrivalOpen = false;
        host.setTimeout(safeHandler(SCRIPT_NAME, openArrival), ARRIVAL_GAP_MS);
        // Animated before onShown, so a failing callback never leaves the card stuck on screen.
        startFrames();
        // Bad news never sounds like a success.
        if (toast.celebrate && !isBadNews(toast)) celebrate();
        if (toast.kind === TOAST_KIND.LEVEL) startFireworks();
        if (!isBadNews(toast)) playSound();
        toast.onShown();
    }

    const safeShowNext = safeHandler(SCRIPT_NAME, showNext);

    // Fires on every return to the wheel: starts the toasts that waited for a game.
    host.on("wheelmode", safeShowNext);
    wheelDialogs.onDrawnDialogClosed(safeShowNext);
    // Fires when a shower ends or vanishes early (a launch, attract mode):
    // releases a Level Toast that waited for it, which then follows the usual
    // waits. A tick later: on "prelaunch" the game is not launched yet, so
    // the toast would not see it running and would show under it.
    confettiShower.onStopped(safeHandler(SCRIPT_NAME, () => {
        if (showerTimer !== null) host.clearTimeout(showerTimer);
        showerTimer = null;
        host.setTimeout(safeShowNext, 0);
    }));

    // toast: { kind, title, description, onShown, isStale, celebrate,
    // rank, accent, tileNumber, header, extraLine }, kind a TOAST_KIND (an Achievement when
    // missing), rank (optional) the Achievement Rank of an Achievement
    // Toast, onShown running when the toast starts, isStale (optional)
    // dropping it unshown when it returns true at its turn, celebrate
    // (optional) starting the Confetti Shower with it; a Mastery Toast
    // gives its accent and the number its tile shows, a Level Toast and a
    // High Score Toast that number only, a Frame Toast the image of its
    // frame (imagePath, null when missing), header (optional) replaces the
    // kind's, and extraLine (optional) shows under the description, in the
    // accent, growing the card. An Error or Warning Toast waits behind every
    // other kind: the bad news comes last.
    function submit(toast) {
        if (isBadNews(toast)) {
            // Joins the queue a moment later, to come after the other kinds: a
            // Play's Achievements are checked a tick after it, when the wheel
            // may already be back.
            host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                waiting.push(toast);
                showNext();
            }), ARRIVAL_GAP_MS);
            return;
        }
        const firstBadNews = waiting.findIndex(isBadNews);
        waiting.splice(firstBadNews === -1 ? waiting.length : firstBadNews, 0, toast);
        safeShowNext();
    }

    // True while a card is on screen or waits its turn, for what must not
    // start over a toast. A stale waiting one counts: asking would drop it.
    const hasToasts = () => cards.length > 0 || waiting.length > 0;

    return { submit, hasToasts };
}

let sharedAchievementToasts = null;

export function getAchievementToasts() {
    if (!sharedAchievementToasts) {
        sharedAchievementToasts = createAchievementToasts(createPinballYHost(), {
            toastSeconds: config.achievementToastSeconds,
            soundFile: config.achievementSoundFile,
            scale: config.achievementToastScale,
            confettiShower: getConfettiShower(),
            fireworks: getFireworks(),
            wheelDialogs: getWheelDialogs(),
        });
    }
    return sharedAchievementToasts;
}
