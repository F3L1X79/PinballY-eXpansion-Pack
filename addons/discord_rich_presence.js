// ============================================================
// Discord Rich Presence: the cabinet's Discord account shows "Choosing a table"
// on the wheel, nothing during attract mode, and during a game the table with
// its elapsed time and, if it is one, "Table of the Day" or "Table of the Week",
// under the "Virtual Pinball" name and the pack's logo (docs/adr/0022). Off by
// default; three tries at startup, then one Warning Toast until PinballY restarts.
// - Never the wheel's selection, a Profile name, or anything but the fields below: they are public.
// - A Discord not found, or a connection lost, is logged as a plain line: never an error.
// - Asking the Period Tables starts their lock and Streaks, even with this the only Add-on using them.
// ============================================================

import config from "../common/core/config.js";
import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { createDiscordClient } from "../common/discord/discord_client.js";
import { getAchievementToasts, TOAST_KIND } from "../common/achievements/achievement_toast.js";
import { getTableOfTheDay, getTableOfTheWeek } from "../common/tables/period_table.js";
import { cleanTitle } from "../common/tables/table_title.js";

const SCRIPT_NAME = "DiscordRichPresence";
const LOG_PREFIX = `[${SCRIPT_NAME}]`;
// The "Virtual Pinball" application on Discord's Developer Portal, owned by
// the pack's author: its name is the first line Discord shows.
const SHIPPED_APPLICATION_ID = "1566536566082506823";
// So that Discord starting a little after PinballY at boot is still found.
const STARTUP_TRIES = 3;
const TRY_GAP_MS = 15000;
// The pack's square logo, shown by Discord from its public URL.
const LOGO_URL = "https://raw.githubusercontent.com/F3L1X79/PinballY-Expansion-Pack/main/docs/images/logo.png";

const choosingTableActivity = () => ({ details: lang.discordRichPresence.choosingTable, assets: { large_image: LOGO_URL } });

// An Adult Table's name too, as the owner chose (spec #379): only an adult
// can launch one, since a Child Profile's wheel never shows them.
const playingActivity = (game, startMs, state) => ({
    details: cleanTitle(game.title),
    ...(state ? { state } : {}),
    timestamps: { start: startMs },
    assets: { large_image: LOGO_URL },
});

const isTableOfPeriod = (periodTable, game) => {
    const table = periodTable.getTable();
    return table !== null && table.configId === game.configId;
};

export default function init() {
    const host = createPinballYHost();
    const toasts = getAchievementToasts();
    // Asked here rather than at the first game: each one listens from its
    // first call, which would otherwise fall in the middle of a "gamestarted".
    const tableOfTheDay = getTableOfTheDay();
    const tableOfTheWeek = getTableOfTheWeek();
    // The Day first: it wins when the table is both.
    function periodStateOf(game) {
        if (isTableOfPeriod(tableOfTheDay, game)) return lang.discordRichPresence.tableOfTheDay;
        return isTableOfPeriod(tableOfTheWeek, game) ? lang.discordRichPresence.tableOfTheWeek : null;
    }
    // Once a session: a connection can only be lost after the tries have ended.
    function giveUp(reason) {
        host.log(`${LOG_PREFIX} ${reason}. Nothing shown on Discord until PinballY restarts.`);
        toasts.submit({ kind: TOAST_KIND.WARNING, title: lang.discordRichPresence.warningTitle, description: lang.discordRichPresence.warning, onShown() {} });
    }
    const client = createDiscordClient(host, {
        scriptName: SCRIPT_NAME,
        applicationId: config.discordApplicationId || SHIPPED_APPLICATION_ID,
        onLost: (reason) => giveUp(`Connection to Discord lost: ${reason}`),
    });
    client.setActivity(choosingTableActivity());

    function tryToConnect(triesLeft) {
        if (client.connect()) return;
        if (triesLeft > 1) host.setTimeout(safeHandler(SCRIPT_NAME, () => tryToConnect(triesLeft - 1)), TRY_GAP_MS);
        else giveUp("Discord not found: start it before PinballY");
    }
    tryToConnect(STARTUP_TRIES);

    let isPlaying = false;
    // Fires when the table's game has started.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, (ev) => {
        isPlaying = true;
        client.setActivity(playingActivity(ev.game, host.now().getTime(), periodStateOf(ev.game)));
    }));
    // Fires on the wheel after a game, among other times.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        if (!isPlaying) return;
        isPlaying = false;
        client.setActivity(choosingTableActivity());
    }));
    // Fires when the idle cabinet starts attract mode: nothing shown overnight.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, () => client.setActivity(null)));
    // Fires on the button press that ends attract mode, back to the wheel.
    host.on("attractmodeend", safeHandler(SCRIPT_NAME, () => client.setActivity(choosingTableActivity())));
}
