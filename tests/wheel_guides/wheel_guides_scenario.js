// ============================================================
// Wheel Guides tests' scenario: main.js on the fake globals with the Wheel
// Guides, the status line and the Wheel Order's Filter Picker on, PinballY's
// main menu and filter commands answered as PinballY does. Reads the Wheel
// Position and Favorite Heart shown, and the lower status line. Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { WHEEL_GUIDES_Z_INDEX } from "../../common/wheel_guides/guide_layers.js";
import config from "../../common/core/config.js";

export const NOW = new Date(2026, 10, 15, 20, 0, 0);
export const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
export const PROFILES_FOLDER = `${PACK}\\profiles`;
export const INFO_LOG = `${PACK}\\logs\\info.log`;
export const DEFAULT_ADD_ONS = ["wheelGuides", "statusLineInfo", "customMenuCommands", "wheelOrder"];

export const table = (title, year, extra = {}) => ({
    id: title, configId: title, title, manufacturer: "Williams", year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isFavorite: false, isHidden: false, ...extra,
});
// In PinballY's alphabetical order, as the fake's All Tables lists them.
export const TABLES = [
    table("Addams Family", 1992, { isFavorite: true }),
    table("Black Knight", 1980),
    table("Cyclone", 1988, { isFavorite: true }),
    table("Dracula", 1993),
    table("Eight Ball", 1977, { isFavorite: true }),
];

// addOns: the Add-ons on; profiles: { name: { isChild } }; active: the
// Profile in cabinet.json; settings: config values set before startup;
// cabinet: more of cabinet.json; pinballYSettings: PinballY's own settings;
// files: more files by path, such as a Profile's ratings.json.
export async function startWheelGuides({
    addOns = DEFAULT_ADD_ONS, tables = TABLES, profiles = {}, active = "guest", settings = {}, cabinet = {}, pinballYSettings = {}, files = {},
} = {}) {
    const fake = createFakePinballYHost({ now: NOW, tables });
    fake.seedSettings(pinballYSettings);
    for (const [path, content] of Object.entries(files)) fake.addFile(path, content);
    for (const [name, { isChild = false } = {}] of Object.entries(profiles)) {
        fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], ...(isChild ? { isChild } : {}) }));
    }
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: active, ...cabinet }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    Object.assign(config, settings);

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    // With the Profile picker off, main.js switched to Guest.
    if (getProfileStore().getActiveProfile().name !== active) getProfileStore().switchTo(active);
    await settle();

    // What PinballY does itself on these commands: a filter's command fires
    // "filterselect" before the filter is applied.
    const COMMAND = globalThis.command;
    fake.setNativeCommand(COMMAND.ShowMainMenu, () => fake.openMainMenu());
    fake.setNativeCommand(globalThis.gameList.getFilterInfo("All").cmd, () => fake.chooseFilter("All"));
    fake.setNativeCommand(globalThis.gameList.getFilterInfo("Favorites").cmd, () => fake.chooseFilter("Favorites"));

    const openFilterPicker = () => {
        fake.openMainMenu();
        fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
    };
    return {
        fake,
        lang,
        switchTo: name => getProfileStore().switchTo(name),
        // The player picks a filter in the Filter Picker, then the delayed reads run.
        async chooseInFilterPicker(title) {
            openFilterPicker();
            fake.selectMenuItem(title);
            await settle();
            fake.advanceTime(300);
            await settle();
        },
        // The player switches the Wheel Order from its page.
        async chooseWheelOrder(entryLabel, orderLabel) {
            openFilterPicker();
            fake.selectMenuItem(entryLabel);
            fake.selectMenuItem(orderLabel);
            await settle();
        },
    };
}

// The Favorite Heart's image for each state.
const HEART_IMAGES = Object.freeze({
    red: `${PACK}\\assets\\images\\favorite_heart.png`,
    grey: `${PACK}\\assets\\images\\favorite_heart_off.png`,
});
const heartOf = layer => Object.keys(HEART_IMAGES).find(state => layer.images().includes(HEART_IMAGES[state]));

// Every layer of the Wheel Guides, shown or hidden.
export const guideLayers = fake => fake.drawingLayers().filter(layer => layer.zIndex === WHEEL_GUIDES_Z_INDEX);
export const positionLayers = fake => guideLayers(fake).filter(layer => heartOf(layer) === undefined);
export const heartLayers = fake => guideLayers(fake).filter(layer => heartOf(layer) !== undefined);

// The Favorite Heart shown: "red", "grey", or null when none shows. Throws
// when more than one shows, or one shows anywhere but the bottom left corner.
export function shownHeart(fake) {
    const shown = heartLayers(fake).filter(layer => layer.alpha > 0);
    if (shown.length === 0) return null;
    if (shown.length > 1) throw new Error(`${shown.length} Favorite Hearts show at once.`);
    const [layer] = shown;
    if (layer.position().align !== "bottom left") throw new Error(`The Favorite Heart shows at ${JSON.stringify(layer.position())}.`);
    return heartOf(layer);
}

// The Wheel Position's text, such as "4/5"; null when none shows. Throws
// when more than one shows, or one shows anywhere but the bottom right corner.
export function shownPosition(fake) {
    const shown = positionLayers(fake).filter(layer => layer.alpha > 0);
    if (shown.length === 0) return null;
    if (shown.length > 1) throw new Error(`${shown.length} Wheel Positions show at once.`);
    const [layer] = shown;
    if (layer.position().align !== "bottom right") throw new Error(`The Wheel Position shows at ${JSON.stringify(layer.position())}.`);
    // The shadow, then the text.
    return layer.texts()[1];
}

// The lower status line's messages that give a table position.
export const positionedMessages = fake => fake.lowerStatusLine().filter(text => /^Table \d+\/\[Filter\.Count\]/.test(text));
