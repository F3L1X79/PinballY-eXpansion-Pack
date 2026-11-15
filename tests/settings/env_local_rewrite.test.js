// ============================================================
// The one-line rewrite of .env.local: given its text (or none), a
// configuration key path and a value, checks the new text byte for byte,
// and that the override parser reads the new value back. An appended key
// takes its comment from .env.example; saveEnvSetting runs on the fake host.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewriteEnvLine, saveEnvSetting } from "../../common/settings/env_local_rewrite.js";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { applyEnvOverrides } from "../../common/core/env_overrides.js";
import { DEFAULTS } from "../../common/core/config.js";

const PROJECT = "C:\\PinballY\\Scripts\\ExpansionPack";

test("an existing line takes the new value, the rest of the file kept", () => {
    const text = "# My cabinet\r\nLANGUAGE=fr\r\nADD_ON_ACHIEVEMENTS=true\r\n\r\nADD_ON_CLOCK=false\r\n";
    assert.equal(rewriteEnvLine(text, "addOns.achievements", false),
        "# My cabinet\r\nLANGUAGE=fr\r\nADD_ON_ACHIEVEMENTS=false\r\n\r\nADD_ON_CLOCK=false\r\n");
});

test("every active line of a repeated key takes the new value, spaces and quotes included", () => {
    const text = "LANGUAGE=fr\n  LANGUAGE = \"it\"  \nADD_ON_CLOCK=true\nLANGUAGE=de";
    assert.equal(rewriteEnvLine(text, "language", "pt"), "LANGUAGE=pt\nLANGUAGE=pt\nADD_ON_CLOCK=true\nLANGUAGE=pt");
});

test("a commented line stays as it is, the active line appended at the end", () => {
    assert.equal(rewriteEnvLine("# ADD_ON_CLOCK=true\r\nLANGUAGE=fr\r\n", "addOns.clock", false),
        "# ADD_ON_CLOCK=true\r\nLANGUAGE=fr\r\nADD_ON_CLOCK=false\r\n");
});

test("a key with no line gets one at the end, with the file's own line ending", () => {
    assert.equal(rewriteEnvLine("LANGUAGE=fr\n", "addOns.menuCleanup", true), "LANGUAGE=fr\nADD_ON_MENU_CLEANUP=true\n");
    assert.equal(rewriteEnvLine("LANGUAGE=fr", "addOns.menuCleanup", true), "LANGUAGE=fr\r\nADD_ON_MENU_CLEANUP=true\r\n", "a last line without its ending");
    assert.equal(rewriteEnvLine("", "language", "de"), "LANGUAGE=de\r\n", "an empty file");
});

test("a missing file gives that one line, with Windows line endings", () => {
    assert.equal(rewriteEnvLine(null, "addOns.highScores", false), "ADD_ON_HIGH_SCORES=false\r\n");
});

test("the BOM is kept, on a rewritten first line or before an appended one", () => {
    assert.equal(rewriteEnvLine("\uFEFFLANGUAGE=fr\r\n", "language", "es"), "\uFEFFLANGUAGE=es\r\n");
    assert.equal(rewriteEnvLine("\uFEFF", "language", "es"), "\uFEFFLANGUAGE=es\r\n");
});

test("a key whose name only starts like it is another key", () => {
    const text = "ADD_ON_HIDDEN_TABLES_X=true\r\n";
    assert.equal(rewriteEnvLine(text, "addOns.hiddenTables", false), "ADD_ON_HIDDEN_TABLES_X=true\r\nADD_ON_HIDDEN_TABLES=false\r\n");
});

test("an appended key takes its comment from .env.example, in the file's line ending", () => {
    const example = "\uFEFF# Header\r\n\r\n# Interface language.\r\n# en or fr.\r\nLANGUAGE=en\r\n# The clock.\r\nADD_ON_CLOCK=true\r\n";
    assert.equal(rewriteEnvLine("LANGUAGE=fr\n", "addOns.clock", false, example), "LANGUAGE=fr\n# The clock.\nADD_ON_CLOCK=false\n");
    assert.equal(rewriteEnvLine(null, "language", "de", example), "# Interface language.\r\n# en or fr.\r\nLANGUAGE=de\r\n", "a missing file");
});

test("a key already in the file keeps its own comments, none copied", () => {
    const example = "# The clock.\nADD_ON_CLOCK=true\n";
    assert.equal(rewriteEnvLine("ADD_ON_CLOCK=true\n", "addOns.clock", false, example), "ADD_ON_CLOCK=false\n");
});

test("a key with no comment in .env.example, or missing from it, gets its line alone", () => {
    const example = "# Group title\n\nLANGUAGE=en\n";
    assert.equal(rewriteEnvLine("", "language", "de", example), "LANGUAGE=de\r\n");
    assert.equal(rewriteEnvLine("", "addOns.clock", false, example), "ADD_ON_CLOCK=false\r\n");
});

test("the \"false also\" lines under a key belong to it, not to the key below", () => {
    const example = "# The picker.\nADD_ON_PROFILE_PICKER=true\n# false also: no greeting.\n# false also: no frame.\n# The ratings.\nADD_ON_PROFILE_RATINGS=true\n";
    assert.equal(rewriteEnvLine("", "addOns.profilePicker", false, example),
        "# The picker.\r\nADD_ON_PROFILE_PICKER=false\r\n# false also: no greeting.\r\n# false also: no frame.\r\n");
    assert.equal(rewriteEnvLine("", "addOns.profileRatings", false, example), "# The ratings.\r\nADD_ON_PROFILE_RATINGS=false\r\n");
});

test("the pack's .env.example gives each key its own comment, no group title", () => {
    const example = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    assert.equal(rewriteEnvLine("", "addOns.profilePicker", false, example),
        "# \"Change Player\" in the main menu: pick whose plays and Achievements count.\r\nADD_ON_PROFILE_PICKER=false\r\n"
        + "# false also: Guest's plays count when a Challenge is drawn; the Challenge Card and the Mastery Bar are no longer placed under the Profile badge; the Welcome Screen has no Avatar choice, Avatar Frame or greeting by name.\r\n");
    assert.equal(rewriteEnvLine("", "addOns.statusLineInfo", false, example),
        "# Table info (position, year, manufacturer, plays, play time) in the status line.\r\nADD_ON_STATUS_LINE_INFO=false\r\n");
});

test("saveEnvSetting copies the comment from the pack's .env.example", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROJECT}\\.env.example`, "# The clock.\r\nADD_ON_CLOCK=true\r\n");
    fake.addFile(`${PROJECT}\\.env.local`, "LANGUAGE=fr\r\n");

    saveEnvSetting(fake, "addOns.clock", false, "Test");

    assert.equal(fake.readFile(`${PROJECT}\\.env.local`), "LANGUAGE=fr\r\n# The clock.\r\nADD_ON_CLOCK=false\r\n");
});

test("saveEnvSetting without .env.example writes the line alone and says so in the log", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROJECT}\\.env.local`, "LANGUAGE=fr\r\n");

    saveEnvSetting(fake, "addOns.clock", false, "Test");

    assert.equal(fake.readFile(`${PROJECT}\\.env.local`), "LANGUAGE=fr\r\nADD_ON_CLOCK=false\r\n");
    assert.ok(fake.logLines().some(line => line.includes("[Test] No .env.example") && line.includes("ADD_ON_CLOCK")));
});

test("the override parser reads the new value back, the other keys unchanged", () => {
    const text = "\uFEFF# Mine\r\nADD_ON_ACHIEVEMENTS=false\r\n# ADD_ON_CLOCK=false\r\nLANGUAGE=fr\r\nADD_ON_ACHIEVEMENTS=false\r\n";
    const rewritten = rewriteEnvLine(rewriteEnvLine(text, "addOns.achievements", true), "addOns.clock", false);
    const { config, problems } = applyEnvOverrides(DEFAULTS, rewritten);

    assert.deepEqual(problems, []);
    assert.equal(config.addOns.achievements, true);
    assert.equal(config.addOns.clock, false);
    assert.equal(config.language, "fr");
});
