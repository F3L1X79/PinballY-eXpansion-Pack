// ============================================================
// Discord Rich Presence: the Discord account signed in on the cabinet's PC
// shows "Choosing a table" on the wheel, and the table being played with its
// elapsed time during a game, under the "Virtual Pinball" application's name
// and the pack's logo (docs/adr/0022). Off by default; one try at startup.
// - Never the wheel's selection, a Profile name, or anything but the fields below: they are public.
// - A Discord not found, or a connection lost, is logged as a plain line: never an error.
// ============================================================

import config from "../common/core/config.js";
import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { createDiscordClient } from "../common/discord/discord_client.js";
import { cleanTitle } from "../common/tables/table_title.js";

const SCRIPT_NAME = "DiscordRichPresence";
const LOG_PREFIX = `[${SCRIPT_NAME}]`;
// The "Virtual Pinball" application on Discord's Developer Portal, owned by
// the pack's author: its name is the first line Discord shows.
const SHIPPED_APPLICATION_ID = "1566536566082506823";
// The pack's 1024x1024 logo, shown by Discord from its public URL.
const LOGO_URL = "https://raw.githubusercontent.com/F3L1X79/PinballY-Expansion-Pack/main/assets/images/discord_logo.png";

const choosingTableActivity = () => ({ details: lang.discordRichPresence.choosingTable, assets: { large_image: LOGO_URL } });

// An Adult Table's name too, as the owner chose (spec #379): only an adult
// can launch one, since a Child Profile's wheel never shows them.
const playingActivity = (game, startMs) => ({ details: cleanTitle(game.title), timestamps: { start: startMs }, assets: { large_image: LOGO_URL } });

export default function init() {
    const host = createPinballYHost();
    const client = createDiscordClient(host, {
        scriptName: SCRIPT_NAME,
        applicationId: config.discordApplicationId || SHIPPED_APPLICATION_ID,
        onLost: (reason) => { host.log(`${LOG_PREFIX} Connection to Discord lost: ${reason}. Nothing shown on Discord until PinballY restarts.`); },
    });
    client.setActivity(choosingTableActivity());
    if (!client.connect()) {
        host.log(`${LOG_PREFIX} Discord not found: start it before PinballY. Nothing shown on Discord until PinballY restarts.`);
        return;
    }

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
