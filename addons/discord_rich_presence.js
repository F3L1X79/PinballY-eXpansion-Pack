// ============================================================
// Discord Rich Presence: the Discord account signed in on the cabinet's PC
// shows "Choosing a table" on the wheel, and the table being played with its
// elapsed time during a game, under the "Virtual Pinball" application's name
// and the pack's logo (docs/adr/0022). Off by default; three tries at startup,
// then one Warning Toast and nothing more until PinballY restarts.
// - Never the wheel's selection, a Profile name, or anything but the fields below: they are public.
// - A Discord not found, or a connection lost, is logged as a plain line: never an error.
// ============================================================

import config from "../common/core/config.js";
import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { createDiscordClient } from "../common/discord/discord_client.js";
import { getAchievementToasts, TOAST_KIND } from "../common/achievements/achievement_toast.js";
import { cleanTitle } from "../common/tables/table_title.js";

const SCRIPT_NAME = "DiscordRichPresence";
const LOG_PREFIX = `[${SCRIPT_NAME}]`;
// The "Virtual Pinball" application on Discord's Developer Portal, owned by
// the pack's author: its name is the first line Discord shows.
const SHIPPED_APPLICATION_ID = "1566536566082506823";
// So that Discord starting a little after PinballY at boot is still found.
const STARTUP_TRIES = 3;
const TRY_GAP_MS = 15000;
// The pack's 1024x1024 logo, shown by Discord from its public URL.
const LOGO_URL = "https://raw.githubusercontent.com/F3L1X79/PinballY-Expansion-Pack/main/assets/images/discord_logo.png";

const choosingTableActivity = () => ({ details: lang.discordRichPresence.choosingTable, assets: { large_image: LOGO_URL } });

// An Adult Table's name too, as the owner chose (spec #379): only an adult
// can launch one, since a Child Profile's wheel never shows them.
const playingActivity = (game, startMs) => ({ details: cleanTitle(game.title), timestamps: { start: startMs }, assets: { large_image: LOGO_URL } });

export default function init() {
    const host = createPinballYHost();
    const toasts = getAchievementToasts();
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
        client.setActivity(playingActivity(ev.game, host.now().getTime()));
    }));
    // Fires on the wheel after a game, among other times.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        if (!isPlaying) return;
        isPlaying = false;
        client.setActivity(choosingTableActivity());
    }));
}
