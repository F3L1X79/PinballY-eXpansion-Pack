// ============================================================
// Maneki-neko tests' scenario: main.js on the fake globals, the cat forced by
// its option, and what the player sees of it. Never loaded by PinballY; one
// start per test file, as main.js loads once per process.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const PROFILES = `${PACK}\\profiles`;
const IMAGES = `${PACK}\\assets\\images\\easter_eggs`;
export const LEFT_IMAGE = `${IMAGES}\\maneki_left.png`;
export const RIGHT_IMAGE = `${IMAGES}\\maneki_right.png`;
export const HORN = `${PACK}\\assets\\sounds\\easter_eggs\\horn.wav`;
export const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
export const TABLES = ["Medieval Madness", "Attack from Mars", "Theatre of Magic"].map((title, index) => ({
    id: index + 1, configId: title, title, manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, audioVolume: 100,
}));
export const OUT_MS = 200;
export const VISIBLE_MS = 2000;
export const WHOLE_MS = 2400;
export const TOAST_LIFE_MS = 6000;

// random: the fake's draw, from before the start; forced: the force option's
// value; files: which of the cat's assets exist; seed(fake): anything else.
export async function startManekiScenario({
    random = () => 0.5, forced = "manekiNeko", addOns = ["achievements", "sessionStatsTracker"],
    files = [LEFT_IMAGE, RIGHT_IMAGE, HORN], seed = () => {},
} = {}) {
    const fake = createFakePinballYHost({ tables: TABLES, now: new Date(2026, 10, 9, 20, 0, 0) });
    fake.setWheelTables(TABLES.map(table => table.configId));
    for (const path of files) fake.addFile(path);
    fake.random = random;
    seed(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    config.forceEasterEgg = forced;

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(100);
    return { fake, lang, store: getProfileStore() };
}

// Back and forth, so that the moves never browse the whole wheel: World Tour's
// toast would make the wheel busy.
let nextOffset = 1;
export const moveWheelTimes = (fake, count) => {
    for (let index = 0; index < count; index++) {
        fake.moveWheel(nextOffset);
        nextOffset = -nextOffset;
    }
};
// Shown or not: none once the cat has gone.
export const catLayers = fake => fake.drawingLayers().filter(layer => layer.images().some(image => image === LEFT_IMAGE || image === RIGHT_IMAGE));
export const shownCat = fake => catLayers(fake).find(layer => layer.alpha > 0);
export const horns = fake => fake.soundsPlayed().filter(path => path === HORN);
