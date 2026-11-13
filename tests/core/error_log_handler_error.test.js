// ============================================================
// The Error Log, through main.js: an error caught by a safeHandler (a Play
// whose Profile data cannot be written) lands in errors.log with the date,
// the time, the Pack Version, the script and its stack on indented lines,
// and still in logfile.log as before. Warning and information lines stay out.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { BETA_10_VERSION, createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const NOW = new Date(2026, 9, 27, 20, 5, 9);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const ERROR_LOG = `${PACK}\\logs\\errors.log`;
const ALICE_FILE = `${PACK}\\profiles\\Alice\\profile.json`;
const MARS = {
    id: 1, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", manufacturer: "Bally", year: 1995,
    categories: [], isConfigured: true, isHidden: false,
};

test("a safeHandler error lands in errors.log and still in logfile.log", async () => {
    // Newer than the last version the pack was tested with: the startup summary warns.
    const pinballYVersion = { ...BETA_10_VERSION, display: "9.0.0", semantic: "9.0.0" };
    const fake = createFakePinballYHost({ now: NOW, tables: [MARS], pinballYVersion });
    fake.addFile(ALICE_FILE, JSON.stringify({ version: 1 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = false;
    config.language = "en";
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");
    assert.equal(fake.readFile(ERROR_LOG), undefined, "no error yet, no errors.log");
    // Warnings and information lines of the start never reach errors.log.
    assert.ok(fake.logLines().some(line => line.includes("WARNING: PinballY 9.0.0 is newer")));
    assert.ok(fake.logLines().some(line => line.includes("skipped (disabled in config)")));

    fake.lockFile(ALICE_FILE);
    fake.gameStarted(MARS);
    fake.advanceTime(60 * 1000);
    fake.gameOver(MARS);
    await settle();

    const [logged] = errorLines(fake);
    assert.equal(errorLines(fake).length, 1);
    assert.match(logged, /^\[ProfileStore\] ERROR in handler: Error: Permission denied: .*profile\.json\n\s+at /,
        "the logfile.log line is the same as before, stack included");

    const lines = fake.readFile(ERROR_LOG).split("\r\n");
    assert.equal(lines.at(-1), "", "each line ends with CRLF");
    assert.match(lines[0], new RegExp(`^2026-10-27 20:06:09 v${PACK_VERSION.replace(/\./g, "\\.")} \\[ProfileStore\\] ERROR in handler: Error: Permission denied: .*profile\\.json$`));
    const stack = lines.slice(1, -1);
    assert.ok(stack.length > 0, "the stack follows");
    for (const line of stack) assert.match(line, /^ {4}at \S/, "each stack line indented by four spaces");
});
