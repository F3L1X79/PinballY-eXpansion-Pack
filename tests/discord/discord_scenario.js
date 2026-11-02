// ============================================================
// Discord Rich Presence tests' scenario: main.js on the fake globals with
// only Discord Rich Presence on, a fake Discord on one of its pipes (or
// none), and readers of what it received. Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { OPCODE } from "../support/fake_discord.js";
import config from "../../common/core/config.js";

export const NOW = new Date(2026, 10, 1, 21, 0, 0);
export const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// The "Virtual Pinball" application's ID (#380).
export const SHIPPED_APPLICATION_ID = "1566536566082506823";
export const LOGO_URL = "https://raw.githubusercontent.com/F3L1X79/PinballY-Expansion-Pack/main/assets/images/discord_logo.png";
export const MARS = {
    id: 1, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", manufacturer: "Bally", year: 1995,
    categories: [], isConfigured: true, isHidden: false,
};
// An Adult Table, in config.adultCategory.
export const PLAYBOY = {
    id: 2, configId: "Playboy (Stern 2002)", title: "Playboy", manufacturer: "Stern", year: 2002,
    categories: ["NSFW"], isConfigured: true, isHidden: false,
};
// Longer than the client's poll interval: every waiting frame is read.
export const POLL_MS = 1000;

// discord: { pipeNumber, holdReady } for a fake Discord, null for none;
// profiles: { name: profile.json data } added before the start;
// applicationId: config.discordApplicationId.
export async function startDiscordScenario({ discord = {}, tables = [MARS, PLAYBOY], profiles = {}, applicationId = "" } = {}) {
    const fake = createFakePinballYHost({ now: NOW, tables });
    for (const [name, data] of Object.entries(profiles)) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, ...data }));
    }
    const fakeDiscord = discord ? fake.startDiscord(discord) : null;
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "discordRichPresence";
    config.language = "en";
    config.adultCategory = "NSFW";
    config.discordApplicationId = applicationId;
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

// A game of the table, from its start to the wheel, elapsedMs long.
export async function playGame(fake, table, elapsedMs = 5 * 60 * 1000) {
    fake.playGame(table);
    fake.gameStarted(table);
    fake.advanceTime(elapsedMs);
    fake.gameOver(table);
    await settle();
    fake.advanceTime(POLL_MS);
}
