// ============================================================
// Rating Plate tests' scenario: main.js on the fake globals with Profiles
// whose ratings.json already holds their Ratings, the active one's on
// PinballY's columns. Reads which Rating the plate shows and where.
// Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { RATING_PLATE_Z_INDEX, RATING_PLATE_STAR_COLORS, RATING_PLATE_RATED_EDGE_COLOR } from "../../common/profiles/rating_plate.js";
import { CHALLENGE_CARD_Z_INDEX } from "../../common/challenges/challenge_card.js";
import { MASTERY_BAR_Z_INDEX } from "../../common/mastery/mastery_bar.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import config from "../../common/core/config.js";

export const NOW = new Date(2026, 8, 23, 10, 0, 0);
// The startup over and every Rating drawn ahead.
export const DRAWN_AHEAD_MS = 10000;
const REFERENCE_HEIGHT = 1920;
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

const table = (id, title, manufacturer, year) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isFavorite: false, isHidden: false,
});
export const TABLES = [
    table(1, "Medieval Madness", "Williams", 1997),
    table(2, "Attack from Mars", "Bally", 1995),
    table(3, "Theatre of Magic", "Bally", 1995),
    table(4, "Twilight Zone", "Bally", 1993),
];

// addOns: the Add-ons on; ratings: { profileName: { configId: rating } },
// the active Profile's put on PinballY's columns; active: the active Profile;
// challenge: the week's lock in cabinet.json (undefined lets the Challenges draw one).
export async function startScenario({ addOns = ["profileRatings"], ratings = { guest: {} }, active = "guest", challenge, now = NOW } = {}) {
    const tables = TABLES.map(game => ({ ...game, rating: (ratings[active] || {})[game.configId] ?? -1 }));
    const fake = createFakePinballYHost({ now, tables });
    for (const [name, values] of Object.entries(ratings)) {
        fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [] }));
        fake.addFile(`${PROFILES_FOLDER}\\${name}\\ratings.json`, JSON.stringify({ version: 1, ratings: values, favorites: [] }));
    }
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({
        version: 1, activeProfile: active, ...(challenge ? { challenge: { current: challenge, previous: null } } : {}),
    }));
    fake.addFile(`${PROFILES_FOLDER}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: active }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = "welcome";

    await import("../../main.js");
    await settle();
    return fake;
}

export const plateLayers = fake => fake.drawingLayers().filter(layer => layer.zIndex === RATING_PLATE_Z_INDEX);
const shownPlates = fake => plateLayers(fake).filter(layer => layer.alpha > 0);

// Pixels of this colour among a layer's fills.
function areaOf(layer, color) {
    return layer.strokes().filter(stroke => stroke.fill === color)
        .reduce((sum, { rect }) => sum + rect.width * rect.height, 0);
}

// The Rating the plate shows, to the half star (the gold part of its five
// stars); null without a plate. Throws when more than one plate shows.
export function shownRating(fake) {
    const shown = shownPlates(fake);
    if (shown.length === 0) return null;
    if (shown.length > 1) throw new Error(`${shown.length} Rating Plates show at once.`);
    const filled = areaOf(shown[0], RATING_PLATE_STAR_COLORS.filled);
    const empty = areaOf(shown[0], RATING_PLATE_STAR_COLORS.empty);
    return Math.round(10 * filled / (filled + empty)) / 2;
}

// Whether the shown plate wears the rated edge along its top (a rated
// table, 0 stars included); null without a plate.
export function shownAsRated(fake) {
    const [shown] = shownPlates(fake);
    if (!shown) return null;
    return areaOf(shown, RATING_PLATE_RATED_EDGE_COLOR) > 0;
}

// How far below the top of the window the plate sits, in reference px;
// null when it does not show at the top right.
export function shownTop(fake) {
    const [shown] = shownPlates(fake);
    if (!shown) return null;
    const { x, y, align } = shown.position();
    if (x !== 0 || align !== "top right") return null;
    return Math.round(-y * REFERENCE_HEIGHT);
}

const panelStrokeOf = layer => layer.strokes().find(stroke => stroke.fill === STEAMBALL_COLORS.panelTranslucent);
// The Profile badge shares the card's plane, but draws no panel.
const shownOn = (fake, zIndex) => fake.drawingLayers()
    .filter(layer => layer.zIndex === zIndex && layer.alpha > 0 && panelStrokeOf(layer));
const topOf = layer => {
    const { x, y, align } = layer.position();
    return x === 0 && align === "top right" ? Math.round((0 - y) * REFERENCE_HEIGHT) : NaN;
};

// How far below the window's top each piece of the top right stack sits,
// in reference px: the plate's, the card's and the Mastery Bar's canvases,
// null for a piece not shown.
export function stackTops(fake) {
    const [plate] = shownPlates(fake);
    const [card] = shownOn(fake, CHALLENGE_CARD_Z_INDEX);
    const [bar] = shownOn(fake, MASTERY_BAR_Z_INDEX.panel);
    return { plate: plate ? topOf(plate) : null, card: card ? topOf(card) : null, bar: bar ? topOf(bar) : null };
}

// A shown piece's panel, in reference px from the window's top (the canvas
// is drawn at reference size): its top, its bottom and its left edge's
// distance from the window's right edge.
function panelOf(layer) {
    const panel = panelStrokeOf(layer);
    const top = topOf(layer) + panel.rect.y;
    return { top, bottom: top + panel.rect.height, left: layer.canvasSize().width - panel.rect.x };
}

// The shown panels of the stack, top to bottom: plate, card, bar.
export function stackPanels(fake) {
    return [shownPlates(fake), shownOn(fake, CHALLENGE_CARD_Z_INDEX), shownOn(fake, MASTERY_BAR_Z_INDEX.panel)]
        .filter(layers => layers.length > 0)
        .map(([layer]) => panelOf(layer));
}

// The player moves the wheel onto this table.
export function select(fake, game) {
    const offset = fake.getWheelTables().findIndex(candidate => candidate.configId === game.configId);
    fake.moveWheel(offset);
}

// The player rates the selected table in PinballY's dialog, which then closes.
export function rate(fake, game, rating) {
    fake.getGameInfo(game.configId).update({ rating });
    fake.fire("popupclose", { id: "rate game" });
}
