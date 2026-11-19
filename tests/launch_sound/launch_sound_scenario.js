// ============================================================
// Launch Sound scenario on the fake host: a .env.local read by the
// configuration, the Add-on started alone, then a table launched twice.
// One scenario per test file: the configuration loads once per process.
// ============================================================

import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { errorLines } from "../support/error_log.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
export const ERROR_LOG = `${PACK}\\logs\\errors.log`;
const MARS = { id: 1, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars" };

// envLocal: the .env.local text, after the line setting the launch sound.
export async function launchTwice(envLocal) {
    const fake = createFakePinballYHost({ tables: [MARS] });
    fake.addFile(`${PACK}\\.env.local`, `LAUNCH_SOUND_FILE=assets\\sounds\\launch.mp3\r\n${envLocal}`);
    fake.addFile(`${PACK}\\assets\\sounds\\launch.mp3`, "");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    // Imported after the globals, so the configuration reads .env.local.
    const { DEFAULTS } = await import("../../common/core/config.js");
    const { default: init } = await import("../../addons/play_launch_sound.js");
    init();
    for (let launch = 0; launch < 2; launch++) {
        fake.gameStarted(MARS);
        fake.gameOver(MARS);
    }
    return { fake, defaultVolume: DEFAULTS.launchSoundVolume };
}

// The errors.log lines, after checking they are the only errors logged and
// all name the setting as the owner writes it.
export function volumeErrors(fake) {
    const lines = (fake.readFile(ERROR_LOG) || "").split("\r\n").filter(line => line !== "");
    assert.equal(errorLines(fake).length, lines.length);
    for (const line of lines) assert.match(line, /LAUNCH_SOUND_VOLUME/);
    return lines;
}
