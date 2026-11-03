// ============================================================
// Discord Rich Presence tests' scenario: main.js on the fake globals with
// only Discord Rich Presence on, a fake Discord on one of its pipes (or
// none), and readers of what it received. Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { OPCODE } from "../support/fake_discord.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import config from "../../common/core/config.js";

export const NOW = new Date(2026, 10, 1, 21, 0, 0);
export const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// The "Virtual Pinball" application's ID (#380).
export const SHIPPED_APPLICATION_ID = "1566536566082506823";
export const LOGO_URL = "https://raw.githubusercontent.com/F3L1X79/PinballY-Expansion-Pack/main/docs/images/logo.png";
export const MARS = {
    id: 1, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", manufacturer: "Bally", year: 1995,
    categories: [], isConfigured: true, isHidden: false,
};
// An Adult Table, in config.adultCategory.
export const PLAYBOY = {
    id: 2, configId: "Playboy (Stern 2002)", title: "Playboy", manufacturer: "Stern", year: 2002,
    categories: ["NSFW"], isConfigured: true, isHidden: false,
};
// In every scenario's tables: by default both Period Tables, locked there so
// that the tables a scenario plays are never one of them by a random pick.
export const MEDIEVAL = {
    id: 4, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", manufacturer: "Williams", year: 1997,
    categories: [], isConfigured: true, isHidden: false,
};
// NOW's day and the Monday of its week.
const DAY_PERIOD = "2026-11-01";
const WEEK_PERIOD = "2026-10-26";
// Longer than the client's poll interval: every waiting frame is read.
export const POLL_MS = 1000;
// The time between two startup tries, and the pipes each one goes through.
export const TRY_GAP_MS = 15000;
export const PIPES_PER_TRY = 10;
// Long enough for a toast with nothing in its way to be drawn.
export const TOAST_ARRIVAL_MS = 1000;
export const WARNING_CARD = "WARNING | Discord Rich Presence | Discord not found: the table being played won't show on Discord. Start Discord before PinballY.";

// discord: { pipeNumber, holdReady } for a fake Discord, null for none;
// profiles: { name: profile.json data } added before the start;
// applicationId: config.discordApplicationId;
// dayTable, weekTable: the current Table of the Day and Table of the Week;
// addOns: the Add-ons on; settings: config values; seed(fake): before the start.
export async function startDiscordScenario({ discord = {}, tables = [MARS, PLAYBOY], profiles = {}, applicationId = "", dayTable = MEDIEVAL, weekTable = MEDIEVAL, addOns = ["discordRichPresence"], settings = {}, seed = () => {} } = {}) {
    const fake = createFakePinballYHost({ now: NOW, tables: [...tables, MEDIEVAL] });
    seed(fake);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({
        version: 1,
        activeProfile: "guest",
        tableOfTheDay: { configId: dayTable.configId, period: DAY_PERIOD },
        tableOfTheWeek: { configId: weekTable.configId, period: WEEK_PERIOD },
    }));
    for (const [name, data] of Object.entries(profiles)) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, ...data }));
    }
    const fakeDiscord = discord ? fake.startDiscord(discord) : null;
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.adultCategory = "NSFW";
    config.discordApplicationId = applicationId;
    Object.assign(config, settings);
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    return { fake, discord: fakeDiscord, profileStore: getProfileStore() };
}

// The activities sent with SET_ACTIVITY, in order (undefined for a clear).
export const activitiesSent = discord => discord.commands()
    .filter(command => command.cmd === "SET_ACTIVITY")
    .map(command => command.args.activity);

export const handshakes = discord => discord.frames().filter(frame => frame.opcode === OPCODE.HANDSHAKE).map(frame => frame.payload);

// Every frame's payload as written, to look for what must never be sent.
export const everythingSent = discord => discord.frames().map(frame => JSON.stringify(frame.payload)).join("\n");

// Every toast card drawn so far, one per card, as "HEADER | title | description".
export const toastCardsDrawn = fake => toastDrawings(fake).filter(drawing => drawing.texts.length > 0).map(drawing => drawing.texts.join(" | "));

// A game of the table, from its start to the wheel, elapsedMs long.
export async function playGame(fake, table, elapsedMs = 5 * 60 * 1000) {
    fake.playGame(table);
    fake.gameStarted(table);
    fake.advanceTime(elapsedMs);
    fake.gameOver(table);
    await settle();
    fake.advanceTime(POLL_MS);
}
