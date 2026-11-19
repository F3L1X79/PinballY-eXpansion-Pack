// ============================================================
// Env overrides tests: given the default configuration and the text of a
// .env.local file, checks the merged configuration, the list of overridden
// keys and the list of problems, and that the tracked .env.example sets
// every configuration key. Pure function; no PinballY host needed.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyEnvOverrides } from "../../common/core/env_overrides.js";
import config from "../../common/core/config.js";

function defaults() {
    return {
        language: "en",
        launchSoundFile: "",
        askToRateAfterMinutesPlayed: 60,
        skipRandomGameAnimation: false,
        addOns: {
            forceBackglass: true,
            achievements: true,
        },
    };
}

test("empty text keeps every default and reports nothing", () => {
    const result = applyEnvOverrides(defaults(), "");
    assert.deepEqual(result, { config: defaults(), overridden: [], problems: [], invalidValues: [] });
});

test("only a value that does not fit its setting counts among the invalid values", () => {
    const { problems, invalidValues } = applyEnvOverrides(defaults(), "FORMER_KEY=1\nLANGUAGE fr\nASK_TO_RATE_AFTER_MINUTES_PLAYED=abc");
    assert.equal(problems.length, 3);
    assert.deepEqual(invalidValues, [problems[2]]);
});

test("UPPER_SNAKE_CASE keys map to top-level and ADD_ON_* keys to addOns", () => {
    const text = "LANGUAGE=fr\nASK_TO_RATE_AFTER_MINUTES_PLAYED=90\nADD_ON_FORCE_BACKGLASS=false\n";
    const result = applyEnvOverrides(defaults(), text);

    assert.equal(result.config.language, "fr");
    assert.equal(result.config.askToRateAfterMinutesPlayed, 90);
    assert.equal(result.config.addOns.forceBackglass, false);
    assert.equal(result.config.addOns.achievements, true);
    assert.deepEqual(result.overridden, ["LANGUAGE", "ASK_TO_RATE_AFTER_MINUTES_PLAYED", "ADD_ON_FORCE_BACKGLASS"]);
    assert.deepEqual(result.problems, []);
});

test("keys left out keep their default", () => {
    const { config } = applyEnvOverrides(defaults(), "LANGUAGE=de");
    assert.deepEqual(config, { ...defaults(), language: "de" });
});

test("the defaults object is not modified", () => {
    const original = defaults();
    applyEnvOverrides(original, "LANGUAGE=fr\nADD_ON_ACHIEVEMENTS=false");
    assert.deepEqual(original, defaults());
});

test("booleans accept only true and false", () => {
    const { config, problems } = applyEnvOverrides(defaults(), "SKIP_RANDOM_GAME_ANIMATION=true\nADD_ON_ACHIEVEMENTS=maybe");

    assert.equal(config.skipRandomGameAnimation, true);
    assert.equal(config.addOns.achievements, true);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /line 2/);
    assert.match(problems[0], /ADD_ON_ACHIEVEMENTS/);
});

test("a number that is not a number keeps the default", () => {
    const { config, overridden, problems } = applyEnvOverrides(defaults(), "ASK_TO_RATE_AFTER_MINUTES_PLAYED=abc");

    assert.equal(config.askToRateAfterMinutesPlayed, 60);
    assert.deepEqual(overridden, []);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /ASK_TO_RATE_AFTER_MINUTES_PLAYED/);
});

test("an empty number keeps the default", () => {
    const { config, problems } = applyEnvOverrides(defaults(), "ASK_TO_RATE_AFTER_MINUTES_PLAYED=");
    assert.equal(config.askToRateAfterMinutesPlayed, 60);
    assert.equal(problems.length, 1);
});

test("an empty string is a valid string value", () => {
    const base = { ...defaults(), launchSoundFile: "C:\\default.mp3" };
    const { config, problems } = applyEnvOverrides(base, "LAUNCH_SOUND_FILE=");
    assert.equal(config.launchSoundFile, "");
    assert.deepEqual(problems, []);
});

test("an unknown key is reported and ignored", () => {
    const { config, overridden, problems } = applyEnvOverrides(defaults(), "LANGAUGE=fr");

    assert.deepEqual(config, defaults());
    assert.deepEqual(overridden, []);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /line 1/);
    assert.match(problems[0], /LANGAUGE/);
});

test("the section name itself is not a key", () => {
    const { problems } = applyEnvOverrides(defaults(), "ADD_ONS=false");
    assert.equal(problems.length, 1);
});

test("a line without = is reported as malformed", () => {
    const { config, problems } = applyEnvOverrides(defaults(), "LANGUAGE fr\nLAUNCH_SOUND_FILE=x.mp3");

    assert.equal(config.launchSoundFile, "x.mp3");
    assert.equal(problems.length, 1);
    assert.match(problems[0], /line 1/);
});

test("surrounding double or single quotes are optional", () => {
    const { config } = applyEnvOverrides(defaults(), "LANGUAGE=\"fr\"\nLAUNCH_SOUND_FILE='C:\\a b.mp3'\nADD_ON_ACHIEVEMENTS=\"false\"");

    assert.equal(config.language, "fr");
    assert.equal(config.launchSoundFile, "C:\\a b.mp3");
    assert.equal(config.addOns.achievements, false);
});

test("comment lines, blank lines and spaces around = are ignored", () => {
    const text = "# Setup\n\n   \n  LANGUAGE = fr  \n# LAUNCH_SOUND_FILE=ignored.mp3\n";
    const { config, overridden, problems } = applyEnvOverrides(defaults(), text);

    assert.equal(config.language, "fr");
    assert.equal(config.launchSoundFile, "");
    assert.deepEqual(overridden, ["LANGUAGE"]);
    assert.deepEqual(problems, []);
});

test("a leading BOM and Windows line endings are ignored", () => {
    const { config, problems } = applyEnvOverrides(defaults(), "\uFEFFLANGUAGE=fr\r\nADD_ON_FORCE_BACKGLASS=false\r\n");

    assert.equal(config.language, "fr");
    assert.equal(config.addOns.forceBackglass, false);
    assert.deepEqual(problems, []);
});

test("Windows paths keep single backslashes and accented characters", () => {
    const path = "C:\\Jeux\\Flipper\\Sons\\entrée été.mp3";
    const { config } = applyEnvOverrides(defaults(), `LAUNCH_SOUND_FILE=${path}`);
    assert.equal(config.launchSoundFile, path);
});

test("a value may contain = and #", () => {
    const { config } = applyEnvOverrides(defaults(), "LAUNCH_SOUND_FILE=C:\\a=b\\#1.mp3");
    assert.equal(config.launchSoundFile, "C:\\a=b\\#1.mp3");
});

test("a key set twice keeps the last value and is listed once", () => {
    const { config, overridden } = applyEnvOverrides(defaults(), "LANGUAGE=fr\nLANGUAGE=it");
    assert.equal(config.language, "it");
    assert.deepEqual(overridden, ["LANGUAGE"]);
});

test("a file cut in the middle of its last line (a crash while saving): that line reported, the others kept", () => {
    const { config, problems } = applyEnvOverrides(defaults(), "LANGUAGE=fr\r\nADD_ON_ACHIEVEMENTS=fa");

    assert.equal(config.language, "fr");
    assert.equal(config.addOns.achievements, true);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /line 2/);
    assert.equal(applyEnvOverrides(defaults(), "LANGUAGE=fr\r\nADD_ON_ACHI").problems.length, 1, "cut before its =");
});

test(".env.example sets every configuration key, with no problem", () => {
    const exampleText = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    const { overridden, problems } = applyEnvOverrides(config, exampleText);

    const keyCount = Object.values(config)
        .reduce((count, value) => count + (typeof value === "object" ? Object.keys(value).length : 1), 0);
    assert.deepEqual(problems, []);
    assert.equal(overridden.length, keyCount);
});
