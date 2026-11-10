// ============================================================
// Sound paths tests: the sound settings, from the defaults or a
// .env.local, may be relative to the pack's folder; absolute and network
// paths stay as they are, and an empty value still means no sound. The
// defaults are sounds shipped in assets\sounds\, each with its credit.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolveSoundFiles, SHIPPED_SOUNDS } from "../../common/core/config.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";

test("a relative sound path is resolved from the pack's folder, with either slash", () => {
    const resolved = resolveSoundFiles({
        launchSoundFile: "assets\\sounds\\launch.mp3",
        achievementSoundFile: "assets/sounds/local/steam-achievement.mp3",
        profileGreetingSoundFile: ".\\assets\\sounds\\hello.mp3",
        confettiSoundFile: "assets\\sounds\\yay.mp3",
        fireworksSoundFile: "assets\\sounds\\fireworks.mp3",
    }, PACK);

    assert.deepEqual(resolved, {
        launchSoundFile: `${PACK}\\assets\\sounds\\launch.mp3`,
        achievementSoundFile: `${PACK}\\assets\\sounds\\local\\steam-achievement.mp3`,
        profileGreetingSoundFile: `${PACK}\\assets\\sounds\\hello.mp3`,
        confettiSoundFile: `${PACK}\\assets\\sounds\\yay.mp3`,
        fireworksSoundFile: `${PACK}\\assets\\sounds\\fireworks.mp3`,
    });
});

test("absolute and network paths are kept, an empty one still means no sound", () => {
    const resolved = resolveSoundFiles({
        launchSoundFile: "C:\\vPinball\\PinballY\\Media\\Sounds\\launch.mp3",
        achievementSoundFile: "d:/sounds/achievement.mp3",
        profileGreetingSoundFile: "\\\\cabinet\\sounds\\hello.mp3",
        confettiSoundFile: "",
        fireworksSoundFile: "",
    }, PACK);

    assert.deepEqual(resolved, {
        launchSoundFile: "C:\\vPinball\\PinballY\\Media\\Sounds\\launch.mp3",
        achievementSoundFile: "d:/sounds/achievement.mp3",
        profileGreetingSoundFile: "\\\\cabinet\\sounds\\hello.mp3",
        confettiSoundFile: "",
        fireworksSoundFile: "",
    });
});

test("a relative Profile picker sound is resolved too, though none ships with the pack", () => {
    const resolved = resolveSoundFiles({ profilePickerSoundFile: "assets\\sounds\\local\\choose-your-character.mp3" }, PACK);
    assert.deepEqual(resolved, { profilePickerSoundFile: `${PACK}\\assets\\sounds\\local\\choose-your-character.mp3` });
});

test("the other settings are left untouched", () => {
    const settings = { language: "fr", launchSoundFile: "", adultCategory: "assets\\NSFW", addOns: { clock: true } };
    assert.deepEqual(resolveSoundFiles(settings, PACK), settings);
});

test("every default sound ships with the pack and is credited", () => {
    const credits = readFileSync(new URL("../../assets/sounds/CREDITS.md", import.meta.url), "utf8");
    assert.deepEqual(Object.keys(SHIPPED_SOUNDS),
        ["launchSoundFile", "achievementSoundFile", "profileGreetingSoundFile", "confettiSoundFile", "fireworksSoundFile", "rocketMusicFile"]);
    for (const [key, path] of Object.entries(SHIPPED_SOUNDS)) {
        assert.match(path, /^assets\\sounds\\(easter_eggs\\)?[a-z_]+\.(mp3|wav)$/, `${key} is a shipped sound`);
        assert.ok(existsSync(new URL(`../../${path.replace(/\\/g, "/")}`, import.meta.url)), `${path} exists`);
        assert.ok(credits.includes(`\`${path.slice("assets\\sounds\\".length).replace(/\\/g, "/")}\``), `${path} is in CREDITS.md`);
    }
});
