// ============================================================
// Contract tests for the PinballY host: the same behaviours are checked on
// the in-memory fake host and on the production adapter running over the
// fake PinballY globals, so both adapters stay interchangeable.
// Run with "node --test" from the project folder.
// ============================================================

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, FAKE_PINBALLY_PID, settle } from "../support/fake_pinbally_host.js";
import { createPinballYHost } from "../../common/core/pinbally_host.js";

const NOW = new Date(2026, 8, 23, 10, 0, 0);

const MEDIEVAL_LOGO = "C:\\PinballY\\Media\\Visual Pinball X\\Wheel Images\\Medieval Madness (Williams 1997).png";

const RESTART_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\restart_pinbally.ps1";
const TEMPORARY_FOLDER = "C:\\Users\\Cabinet\\AppData\\Local\\Temp\\PinballYExpansionPack";
const PACK_UPDATE_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\pack_update.ps1";
const PACK_UPDATE = {
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
    packVersion: "9.0.0",
};

const SCRIPT_READER_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\script_reader_install.ps1";
const SCRIPT_READER = {
    zipUrl: "https://github.com/francisdb/vpxtool/releases/download/v0.38.0/vpxtool-windows-x86_64-v0.38.0.zip",
    sha256: "ea".repeat(32),
    version: "0.38.0",
};
const VPXTOOL = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe";

const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false, wheelImage: MEDIEVAL_LOGO },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", isHidden: false },
    { id: 3, configId: "Hidden Table (Gottlieb 1978)", title: "Hidden Table", isHidden: true },
];

const ADAPTERS = [
    { name: "fake host", createHost: (fake) => fake },
    { name: "production host over fake globals", createHost: () => createPinballYHost(), usesGlobals: true },
];

for (const { name, createHost, usesGlobals } of ADAPTERS) {
    describe(name, () => {
        let fake;
        let host;
        let uninstallGlobals = () => {};

        beforeEach(() => {
            fake = createFakePinballYHost({ now: NOW, tables: TABLES });
            if (usesGlobals) uninstallGlobals = fake.installGlobals();
            host = createHost(fake);
        });

        afterEach(() => uninstallGlobals());

        test("reads back settings with their type, or the default when missing", () => {
            host.settings.set("custom.test.count", 12);
            host.settings.set("custom.test.ratio", 1.5);
            host.settings.set("custom.test.flag", true);
            host.settings.set("custom.test.name", "2026-09-21");

            assert.equal(host.settings.getInt("custom.test.count", 0), 12);
            assert.equal(host.settings.getFloat("custom.test.ratio", 0), 1.5);
            assert.equal(host.settings.getBool("custom.test.flag", false), true);
            assert.equal(host.settings.getString("custom.test.name", ""), "2026-09-21");
            assert.equal(host.settings.getString("custom.test.count", ""), "12");

            assert.equal(host.settings.getInt("custom.test.missing", 7), 7);
            assert.equal(host.settings.getBool("custom.test.missing", false), false);
            assert.equal(host.settings.getString("custom.test.missing", ""), "");
        });

        test("reports the written settings keys, not the seeded ones", () => {
            fake.seedSettings({ "custom.test.seeded": "1" });
            host.settings.set("custom.test.written", 3);

            assert.equal(host.settings.getInt("custom.test.seeded", 0), 1);
            assert.deepEqual([...fake.writtenSettingsKeys()], ["custom.test.written"]);
        });

        test("gives the date set by the test, and moves it forward", () => {
            assert.equal(host.now().getTime(), NOW.getTime());

            fake.advanceTime(90 * 60 * 1000);
            assert.equal(host.now().getTime(), new Date(2026, 8, 23, 11, 30, 0).getTime());

            fake.setNow(new Date(2026, 8, 28, 0, 0, 1));
            assert.equal(host.now().getTime(), new Date(2026, 8, 28, 0, 0, 1).getTime());
        });

        test("lists the visible tables, every table, and finds a table by config ID", () => {
            assert.deepEqual(host.getVisibleTables().map(game => game.configId), [
                "Medieval Madness (Williams 1997)",
                "Attack from Mars (Bally 1995)",
            ]);
            assert.deepEqual(host.getAllTables().map(game => game.configId), [
                "Medieval Madness (Williams 1997)",
                "Attack from Mars (Bally 1995)",
                "Hidden Table (Gottlieb 1978)",
            ]);
            assert.equal(host.getGameInfo("Attack from Mars (Bally 1995)").title, "Attack from Mars");
            assert.equal(host.getGameInfo("No Such Table"), null);

            fake.setTables([{ id: 9, configId: "Theatre of Magic (Bally 1995)", title: "Theatre of Magic" }]);
            assert.deepEqual(host.getVisibleTables().map(game => game.title), ["Theatre of Magic"]);
        });

        test("leaves unconfigured tables out of the visible tables, not out of every table", () => {
            fake.setTables([
                { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isConfigured: true },
                { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars" },
                { id: 3, configId: "Backup.Unconfigured", title: "Backup", isConfigured: false },
            ]);

            assert.deepEqual(host.getVisibleTables().map(game => game.title), ["Medieval Madness", "Attack from Mars"]);
            assert.deepEqual(host.getAllTables().map(game => game.title), ["Medieval Madness", "Attack from Mars", "Backup"]);
            assert.equal(host.getGameInfo("Backup.Unconfigured").title, "Backup");
        });

        test("offers the wheel selection in wheel order, every visible table by default", () => {
            assert.deepEqual(host.getWheelTables().map(game => game.configId), [
                "Medieval Madness (Williams 1997)",
                "Attack from Mars (Bally 1995)",
            ]);

            fake.setWheelTables(["Attack from Mars (Bally 1995)", "Medieval Madness (Williams 1997)"]);
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Attack from Mars", "Medieval Madness"]);
        });

        test("gives the wheel's current table, or null with an empty wheel selection", () => {
            assert.equal(host.getCurrentTable().title, "Medieval Madness");

            fake.setWheelTables(["Attack from Mars (Bally 1995)", "Medieval Madness (Williams 1997)"]);
            assert.equal(host.getCurrentTable().title, "Attack from Mars");

            fake.setWheelTables([]);
            assert.equal(host.getCurrentTable(), null);
        });

        test("moves the wheel's current table by an offset, wrapping around", () => {
            fake.setTables([...TABLES, { id: 4, configId: "Whirlwind (Williams 1990)", title: "Whirlwind" }]);

            host.setWheelGame(2);
            assert.deepEqual(host.getWheelTables().map(game => game.title),
                ["Whirlwind", "Medieval Madness", "Attack from Mars"]);

            host.setWheelGame(-1);
            assert.equal(host.getWheelTables()[0].title, "Attack from Mars");
        });

        test("only the player's wheel moves fire the game selection, with the new table", () => {
            const selected = [];
            host.onGameListEvent("gameselect", ev => selected.push(ev.game.title));

            host.setWheelGame(1);
            fake.moveWheel(1);

            assert.deepEqual(selected, ["Medieval Madness"]);
        });

        test("switches to the all-tables filter, keeping the current table", () => {
            fake.setTables([...TABLES, { id: 4, configId: "Whirlwind (Williams 1990)", title: "Whirlwind", isConfigured: false }]);
            fake.setWheelTables(["Attack from Mars (Bally 1995)"], { filterId: "Favorites" });

            host.setCurrentFilter("All");

            assert.equal(fake.currentFilterId(), "All");
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Attack from Mars", "Medieval Madness"]);
        });

        test("creates a script filter under its full id, then shows it and runs it again on refresh", () => {
            let selected = ["Attack from Mars (Bally 1995)"];
            host.createFilter({ id: "test.Selected", title: "Selected", select: game => selected.includes(game.configId) });

            host.setCurrentFilter("User.test.Selected");
            assert.equal(host.getCurrentFilterId(), "User.test.Selected");
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Attack from Mars"]);

            selected = ["Medieval Madness (Williams 1997)"];
            host.refreshFilter();
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Medieval Madness"]);
        });

        test("a metafilter narrows every filter at once, and decides again only when the filter runs", () => {
            let ruledOut = "Attack from Mars (Bally 1995)";
            host.setCurrentFilter("All");
            host.createMetaFilter({ select: game => game.configId !== ruledOut });
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Medieval Madness"]);

            ruledOut = "Medieval Madness (Williams 1997)";
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Medieval Madness"]);
            host.refreshFilter();
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Attack from Mars"]);

            host.createFilter({ id: "test.Both", title: "Both", select: () => true });
            host.setCurrentFilter("User.test.Both");
            assert.deepEqual(host.getWheelTables().map(game => game.title), ["Attack from Mars"]);
        });

        test("allocates a distinct command ID per name", () => {
            const first = host.allocateCommand("first");
            const second = host.allocateCommand("second");

            assert.notEqual(first, second);
            assert.equal(fake.commandId("second"), second);
        });

        test("shows a menu, then closing it fires menuclose and returns to the wheel", () => {
            const events = [];
            host.on("menuclose", ev => events.push(`menuclose:${ev.id}`));
            host.on("wheelmode", () => events.push("wheelmode"));

            assert.equal(host.getUIMode(), "wheel");
            host.showMenu("testDialog", [{ title: "Hello", cmd: -1 }], { dialogStyle: true });

            assert.equal(host.getUIMode(), "menu");
            assert.equal(fake.currentMenu().id, "testDialog");
            assert.deepEqual(fake.shownMenus().map(menu => menu.id), ["testDialog"]);

            fake.closeMenu();
            assert.equal(host.getUIMode(), "wheel");
            assert.equal(fake.currentMenu(), null);
            assert.deepEqual(events, ["menuclose:testDialog", "wheelmode"]);
        });

        test("selecting a menu item fires its command, then closes the menu", () => {
            const events = [];
            const okCommand = host.allocateCommand("ok");
            host.on("command", ev => events.push(`command:${ev.id}`));
            host.on("menuclose", ev => events.push(`menuclose:${ev.id}`));

            host.showMenu("testDialog", [{ title: "OK", cmd: okCommand }], { dialogStyle: true });
            fake.selectMenuItem("OK");

            assert.deepEqual(events, [`command:${okCommand}`, "menuclose:testDialog"]);
        });

        test("gives PinballY's built-in command IDs, distinct from the allocated ones", () => {
            const allocated = host.allocateCommand("custom");
            const builtIn = ["PlayGame", "MenuReturn", "MenuPageUp", "MenuPageDown"].map(host.getBuiltInCommand);

            assert.ok(builtIn.every(id => Number.isInteger(id)), builtIn.join(", "));
            assert.equal(new Set([...builtIn, allocated]).size, builtIn.length + 1);
        });

        test("a menu shown by a command replaces the current one; an item that stays open keeps it", () => {
            const events = [];
            const submenuCommand = host.allocateCommand("submenu");
            const stayCommand = host.allocateCommand("stay");
            host.on("command", ev => {
                if (ev.id === submenuCommand) host.showMenu("submenu", [{ title: "Stay", cmd: stayCommand, stayOpen: true }]);
            });
            host.on("menuclose", ev => events.push(`menuclose:${ev.id}`));
            host.on("wheelmode", () => events.push("wheelmode"));

            host.showMenu("parent", [{ title: "Open", cmd: submenuCommand }]);
            fake.selectMenuItem("Open");
            fake.selectMenuItem("Stay");

            assert.deepEqual(events, ["menuclose:parent"]);
            assert.equal(fake.currentMenu().id, "submenu");
            assert.equal(host.getUIMode(), "menu");
        });

        test("records table launches and plays the game events the test fires", () => {
            const events = [];
            host.on("gamestarted", ev => events.push(`gamestarted:${ev.game.configId}:${host.getUIMode()}`));
            host.on("gameover", ev => events.push(`gameover:${ev.game.configId}`));
            host.on("wheelmode", () => events.push(`wheelmode:${host.getUIMode()}`));

            const game = host.getGameInfo("Medieval Madness (Williams 1997)");
            host.playGame(game);
            assert.deepEqual(fake.launches().map(launched => launched.configId), [game.configId]);
            assert.equal(host.getUIMode(), "running");

            fake.gameStarted(game);
            fake.gameOver(game);
            assert.deepEqual(events, [
                `gamestarted:${game.configId}:running`,
                `gameover:${game.configId}`,
                "wheelmode:wheel",
            ]);
        });

        test("reads a table's high scores through PINemHi once, then from the cache until forgotten or launched", async () => {
            const events = [];
            host.onGameListEvent("highscoresrequest", ev => events.push(`request:${ev.game.configId}`));
            host.onGameListEvent("highscoresready", ev => events.push(`ready:${ev.success}:${ev.source}:${ev.scores.join("/")}`));
            fake.setNvramBoard("Medieval Madness (Williams 1997)", ["GRAND CHAMPION", "SLL 52.000.000"]);
            const game = host.getGameInfo("Medieval Madness (Williams 1997)");

            const fresh = game.getHighScores();
            fake.advanceTime(1000);
            const lines = await fresh;
            assert.deepEqual([...lines], ["GRAND CHAMPION", "SLL 52.000.000"]);
            assert.equal(lines.source, "pinemhi");
            assert.deepEqual(events, ["request:Medieval Madness (Williams 1997)", "ready:true:pinemhi:GRAND CHAMPION/SLL 52.000.000"]);

            // A board VPinMAME saved since is seen only once the cache is forgotten.
            fake.setNvramBoard("Medieval Madness (Williams 1997)", ["GRAND CHAMPION", "FC 60.000.000"]);
            assert.equal((await game.getHighScores()).source, "cache");
            game.setHighScores(null);
            const forgotten = game.getHighScores();
            fake.advanceTime(1000);
            assert.deepEqual([...await forgotten], ["GRAND CHAMPION", "FC 60.000.000"]);

            // A launch clears the cached board too.
            fake.setNvramBoard("Medieval Madness (Williams 1997)", ["GRAND CHAMPION", "AAA 70.000.000"]);
            host.playGame(game);
            const afterLaunch = game.getHighScores();
            fake.advanceTime(1000);
            assert.equal((await afterLaunch).source, "pinemhi");
        });

        test("a table's high scores read fails when PINemHi fails or is killed after 7.5 s", async () => {
            const ready = [];
            host.onGameListEvent("highscoresready", ev => ready.push(`${ev.game.configId}:${ev.success}:${ev.source}`));
            fake.setNvramBoard("Medieval Madness (Williams 1997)", ["SLL 52.000.000"], { fails: true });
            fake.setNvramBoard("Attack from Mars (Bally 1995)", ["1) SLL 8.000.000"], { durationMs: 9000 });

            const failed = host.getGameInfo("Medieval Madness (Williams 1997)").getHighScores();
            const killed = host.getGameInfo("Attack from Mars (Bally 1995)").getHighScores();
            fake.advanceTime(7500);
            await assert.rejects(failed);
            await assert.rejects(killed);
            assert.deepEqual(ready, ["Medieval Madness (Williams 1997):false:none", "Attack from Mars (Bally 1995):false:none"]);
        });

        test("tables sharing a ROM read the same NVRAM board", async () => {
            fake.setTables([
                { configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false, rom: "mm_109c" },
                { configId: "Medieval Madness Remake (VPX Community 2024)", title: "Medieval Madness Remake", isHidden: false, rom: "mm_109c" },
            ]);
            fake.setNvramBoard("Medieval Madness (Williams 1997)", ["1) SLL 52.000.000"]);

            const read = host.getGameInfo("Medieval Madness Remake (VPX Community 2024)").getHighScores();
            fake.advanceTime(1000);
            assert.deepEqual([...await read], ["1) SLL 52.000.000"]);
        });

        test("draws styled text on a main-window drawing layer and records its position and alpha", () => {
            fake.setLayoutSize({ width: 1080, height: 1920 });
            const layer = host.createDrawingLayer(6500);
            let size = null;
            layer.draw(dc => {
                size = dc.getSize();
                const text = host.createStyledText({ textStyle: { font: "Segoe UI", size: 11 } });
                text.add({ weight: 600, text: "Achievement unlocked\n" });
                text.add("Play 5 tables in one day.");
                const metrics = text.measure(300);
                assert.ok(metrics.height > 0, `measured height ${metrics.height}`);
                text.draw(dc, { x: 0, y: 0, width: 300, height: metrics.height });
            });
            layer.setPos(0, 0.25);
            layer.alpha = 0.5;

            assert.deepEqual(size, { width: 1080, height: 1920 });
            const [recorded] = fake.drawingLayers();
            assert.equal(recorded.zIndex, 6500);
            assert.deepEqual(recorded.texts(), ["Achievement unlocked", "Play 5 tables in one day."]);
            assert.deepEqual(recorded.position(), { x: 0, y: 0.25 });
            assert.equal(recorded.alpha, 0.5);
        });

        test("finds a table's wheel logo, and none for a table without one", () => {
            fake.addFile(MEDIEVAL_LOGO);

            assert.equal(host.getWheelImage(host.getGameInfo("Medieval Madness (Williams 1997)")), MEDIEVAL_LOGO);
            assert.equal(host.getWheelImage(host.getGameInfo("Attack from Mars (Bally 1995)")), null);
        });

        test("removes a drawing layer, leaving the others", () => {
            const kept = host.createDrawingLayer(6100);
            const removed = host.createDrawingLayer(6101);
            host.removeDrawingLayer(removed);

            assert.deepEqual(fake.drawingLayers().map(layer => layer.zIndex), [kept.zIndex]);
        });

        test("reports the run mode while a game starts, runs and exits", () => {
            const runModes = [];
            host.on("gameover", () => runModes.push(host.getFullUIMode().runMode));
            const game = host.getGameInfo("Medieval Madness (Williams 1997)");

            assert.equal(host.getFullUIMode().runMode, undefined);
            host.playGame(game);
            runModes.push(host.getFullUIMode().runMode);
            fake.gameStarted(game);
            runModes.push(host.getFullUIMode().runMode);
            fake.gameOver(game);

            assert.deepEqual(runModes, ["starting", "running", "exiting"]);
            assert.deepEqual(host.getFullUIMode(), { mode: "wheel" });
        });

        test("gives the PinballY program folder and the pack's folder, and plays existing sound files only", () => {
            assert.equal(host.getProgramFolder(), "C:\\PinballY\\");
            assert.equal(host.getProjectFolder(), "C:\\PinballY\\Scripts\\ExpansionPack");

            fake.addFile("C:\\Sounds\\achievement.mp3");
            host.playSound("C:\\Sounds\\achievement.mp3");
            assert.throws(() => host.playSound("C:\\Sounds\\missing.mp3"), /not found/);
            assert.deepEqual(fake.soundsPlayed(), ["C:\\Sounds\\achievement.mp3"]);
        });

        test("plays a sound on several players in turn, and only an existing file", () => {
            const filePath = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";
            fake.addFile(filePath);
            const rotation = host.createSoundRotation(filePath, 3);
            for (let press = 0; press < 4; press++) rotation.play();

            assert.deepEqual(fake.soundsPlayed(), [filePath, filePath, filePath, filePath]);
            const [first, second, third, fourth] = fake.soundPlayers();
            assert.equal(new Set([first, second, third]).size, 3, "three different players");
            assert.equal(fourth, first, "then the first one again");
            assert.throws(() => host.createSoundRotation("C:\\Sounds\\missing.wav", 3), /not found/);
        });

        test("creates folders, lists sub-folders, and writes, reads, renames and deletes UTF-8 files", () => {
            const profiles = "C:\\PinballY\\Scripts\\profiles";
            assert.deepEqual(host.files.listFolders(profiles), []);

            host.files.createFolder(profiles);
            host.files.createFolder(profiles);
            host.files.createFolder(`${profiles}\\Chloé`);
            assert.deepEqual(host.files.listFolders(profiles), ["Chloé"]);

            const path = `${profiles}\\Chloé\\profile.json`;
            assert.equal(host.files.fileExists(path), false);
            host.files.writeText(path, "{\"name\":\"Émile\"}");
            assert.equal(host.files.fileExists(path), true);
            assert.equal(host.files.readText(path), "{\"name\":\"Émile\"}");

            const renamedPath = `${profiles}\\Chloé\\profile.bak.json`;
            host.files.renameFile(path, renamedPath);
            assert.equal(host.files.fileExists(path), false);
            assert.equal(host.files.readText(renamedPath), "{\"name\":\"Émile\"}");

            host.files.writeText(path, "new");
            assert.throws(() => host.files.renameFile(path, renamedPath), /exists/);

            host.files.deleteFile(renamedPath);
            assert.equal(host.files.fileExists(renamedPath), false);
            assert.throws(() => host.files.readText(renamedPath), /not found/);
            assert.deepEqual(fake.fileOperations(), [
                { operation: "write", path },
                { operation: "rename", path, to: renamedPath },
                { operation: "write", path },
                { operation: "delete", path: renamedPath },
            ]);
        });

        test("appends UTF-8 text to a file, creating it when missing, and throws on a locked one", () => {
            const path = "C:\\PinballY\\Scripts\\ExpansionPack\\errors.log";
            host.files.appendText(path, "Chloé\r\n");
            host.files.appendText(path, "Émile\r\n");
            assert.equal(host.files.readText(path), "Chloé\r\nÉmile\r\n");

            fake.lockFile(path);
            assert.throws(() => host.files.appendText(path, "Zoé\r\n"), /Permission denied/);
            fake.unlockFile(path);
            assert.equal(host.files.readText(path), "Chloé\r\nÉmile\r\n");
        });

        test("lists the files of a folder, not its sub-folders nor deeper files, and none for a missing folder", () => {
            const alice = "C:\\PinballY\\Scripts\\profiles\\Alice";
            assert.deepEqual(host.files.listFiles(alice), []);

            fake.addFile(`${alice}\\profile.json`, "{}");
            fake.addFile(`${alice}\\play-log-2026.json`, "{}");
            fake.addFile(`${alice}\\old\\play-log-2025.json`, "{}");

            assert.deepEqual(host.files.listFiles(alice).sort(), ["play-log-2026.json", "profile.json"]);
        });

        test("gives a file's modified date and size in bytes, and null for a missing file", () => {
            const table = "C:\\Visual Pinball\\Tables\\Attack from Mars (Bally 1995).vpx";
            fake.addFile(table, "Chloé", { modified: new Date(2026, 0, 2, 3, 4, 5) });

            assert.deepEqual(host.files.getFileInfo(table), { modified: new Date(2026, 0, 2, 3, 4, 5).getTime(), size: 6 });
            assert.equal(host.files.getFileInfo("C:\\Visual Pinball\\Tables\\missing.vpx"), null);

            fake.advanceTime(1000);
            fake.addFolder("C:\\PinballY\\Scripts\\profiles");
            const written = "C:\\PinballY\\Scripts\\profiles\\cabinet.json";
            host.files.writeText(written, "{}");
            assert.deepEqual(host.files.getFileInfo(written), { modified: NOW.getTime() + 1000, size: 2 });
        });

        test("lists a folder's files with their modified dates and sizes, and null for a missing folder", () => {
            const nvram = "C:\\Visual Pinball\\VPinMAME\\nvram";
            assert.equal(host.files.listFileInfos(nvram), null);

            fake.addFile(`${nvram}\\afm_113.nv`, "Chloé", { modified: new Date(2026, 0, 2, 3, 4, 5) });
            fake.addFile(`${nvram}\\mm_109c.nv`, "nv", { modified: new Date(2026, 0, 3, 3, 4, 5) });
            fake.addFile(`${nvram}\\old\\tz_94h.nv`, "nv");

            const byName = (a, b) => a.name.localeCompare(b.name);
            assert.deepEqual(host.files.listFileInfos(nvram).sort(byName), [
                { name: "afm_113.nv", modified: new Date(2026, 0, 2, 3, 4, 5).getTime(), size: 6 },
                { name: "mm_109c.nv", modified: new Date(2026, 0, 3, 3, 4, 5).getTime(), size: 2 },
            ]);
            assert.deepEqual(host.files.listFileInfos(`${nvram}\\old\\`).map(file => file.name), ["tz_94h.nv"]);
        });

        test("reads a registry value, and null when it is missing", () => {
            const nvramDirectory = "HKCU\\Software\\Freeware\\Visual PinMame\\globals\\nvram_directory";
            assert.equal(host.readRegistryValue(nvramDirectory), null);

            fake.setRegistryValue(nvramDirectory, "C:\\Visual Pinball\\VPinMAME\\nvram");
            assert.equal(host.readRegistryValue(nvramDirectory), "C:\\Visual Pinball\\VPinMAME\\nvram");
            assert.equal(host.readRegistryValue("HKLM\\Software\\Freeware\\Visual PinMame\\globals\\nvram_directory"), null);
        });

        test("runs a program hidden without waiting, its standard output and exit code read once it ends", () => {
            const program = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe";
            fake.addProgram(program, args => ({
                output: `first line\n${args.join("|")}\n`, errorOutput: "warning: NaN", exitCode: 0, durationMs: 300,
            }));

            const run = host.runHiddenProgram(program, ["romname", "C:\\Tables\\Attack & Revenge (Bally 1999).vpx"]);
            assert.equal(run.result(), null, "still running");
            fake.advanceTime(299);
            assert.equal(run.result(), null, "still running");
            fake.advanceTime(1);

            const finished = { exitCode: 0, output: "first line\nromname|C:\\Tables\\Attack & Revenge (Bally 1999).vpx\n" };
            assert.deepEqual(run.result(), finished, "standard error left out");
            assert.deepEqual(run.result(), finished, "the same result when asked again");
            assert.deepEqual(fake.programRuns(), [{ program, args: ["romname", "C:\\Tables\\Attack & Revenge (Bally 1999).vpx"] }]);
        });

        test("a program that fails gives its exit code, and a missing program fails too", () => {
            const program = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe";
            fake.addProgram(program, () => ({ output: "", exitCode: 1 }));

            const failed = host.runHiddenProgram(program, ["romname", "C:\\Tables\\Broken.vpx"]);
            const missing = host.runHiddenProgram("C:\\PinballY\\Scripts\\ExpansionPack\\tools\\missing.exe", []);
            fake.advanceTime(1000);

            assert.deepEqual(failed.result(), { exitCode: 1, output: "" });
            assert.notEqual(missing.result().exitCode, 0);
        });

        test("a restart quits PinballY only once the restart helper is ready", () => {
            fake.addFile(RESTART_HELPER);
            const calls = [];
            host.restartPinballY({ onQuitting: () => calls.push("quitting"), onFailed: error => calls.push(error.message) });

            assert.equal(fake.restartsAsked(), 1);
            fake.advanceTime(1000);
            assert.deepEqual(calls, [], "the helper is not ready yet");
            assert.deepEqual(fake.executedCommands(), []);
            fake.advanceTime(1000);
            assert.deepEqual(calls, ["quitting"]);
            assert.deepEqual(fake.executedCommands(), [fake.getBuiltInCommand("Quit")]);
            fake.advanceTime(60000);
            assert.equal(calls.length, 1, "asked once");
        });

        test("a restart helper never ready fails after 15 s, and PinballY stays", () => {
            fake.addFile(RESTART_HELPER);
            fake.failNextRestart();
            const calls = [];
            host.restartPinballY({ onQuitting: () => calls.push("quitting"), onFailed: error => calls.push(error.message) });

            fake.advanceTime(14999);
            assert.deepEqual(calls, []);
            fake.advanceTime(1);
            assert.equal(calls.length, 1);
            assert.match(calls[0], /not ready after 15 s/);
            fake.advanceTime(60000);
            assert.equal(calls.length, 1, "failed once");
            assert.deepEqual(fake.executedCommands(), [], "no Quit");
        });

        test("a Pack Update quits PinballY only once its helper is ready, and records what it installs", () => {
            fake.addFile(PACK_UPDATE_HELPER);
            const calls = [];
            host.startPackUpdate({
                ...PACK_UPDATE, onQuitting: () => calls.push("quitting"), onFailed: error => calls.push(error.message),
            });

            assert.deepEqual(fake.packUpdatesAsked(), [PACK_UPDATE]);
            fake.advanceTime(4000);
            assert.deepEqual(calls, [], "the helper is still downloading");
            assert.deepEqual(fake.executedCommands(), []);
            fake.advanceTime(1200);
            assert.deepEqual(calls, ["quitting"]);
            assert.deepEqual(fake.executedCommands(), [fake.getBuiltInCommand("Quit")]);
        });

        test("a Pack Update helper never ready fails after 120 s, and PinballY stays", () => {
            fake.addFile(PACK_UPDATE_HELPER);
            fake.failNextPackUpdate();
            const calls = [];
            host.startPackUpdate({
                ...PACK_UPDATE, onQuitting: () => calls.push("quitting"), onFailed: error => calls.push(error.message),
            });

            fake.advanceTime(119999);
            assert.deepEqual(calls, []);
            fake.advanceTime(1);
            assert.equal(calls.length, 1);
            assert.match(calls[0], /Pack Update helper was not ready after 120 s/);
            assert.deepEqual(fake.executedCommands(), [], "no Quit");
        });

        test("installs the Script Reader hidden without waiting, the helper's exit code and output read once it ends", () => {
            fake.addFile(SCRIPT_READER_HELPER);
            fake.answerNextScriptReaderInstall({ exitCode: 0, output: "vpxtool git:v0.38.0\r\n", durationMs: 3000 });

            const install = host.installScriptReader(SCRIPT_READER);
            assert.equal(install.result(), null, "still running");
            fake.advanceTime(2999);
            assert.equal(install.result(), null, "still running");
            assert.equal(fake.files.fileExists(VPXTOOL), false, "not swapped in yet");
            fake.advanceTime(1);

            assert.deepEqual(install.result(), { exitCode: 0, output: "vpxtool git:v0.38.0\r\n" });
            assert.deepEqual(install.result(), { exitCode: 0, output: "vpxtool git:v0.38.0\r\n" }, "the same result when asked again");
            assert.deepEqual(fake.scriptReaderInstallsAsked(), [SCRIPT_READER]);
            assert.equal(fake.files.fileExists(VPXTOOL), true, "swapped in");
        });

        test("a failed Script Reader install gives the helper's exit code and leaves vpxtool as it was", () => {
            fake.addFile(SCRIPT_READER_HELPER);
            fake.answerNextScriptReaderInstall({ exitCode: 1, output: "SHA-256 mismatch\r\n" });

            const install = host.installScriptReader(SCRIPT_READER);
            fake.advanceTime(60000);

            assert.deepEqual(install.result(), { exitCode: 1, output: "SHA-256 mismatch\r\n" });
            assert.equal(fake.files.fileExists(VPXTOOL), false);
        });

        test("writing into a missing folder fails", () => {
            assert.throws(() => host.files.writeText("C:\\PinballY\\Scripts\\missing\\file.json", "{}"), /not found/);
        });

        test("tells an existing folder from a missing one or a file", () => {
            fake.addFolder("C:\\PinballY\\Scripts\\ExpansionPack\\.git");
            fake.addFile("C:\\PinballY\\Scripts\\ExpansionPack\\main.js");

            assert.equal(host.files.folderExists("C:\\PinballY\\Scripts\\ExpansionPack\\.git"), true);
            assert.equal(host.files.folderExists("C:\\PinballY\\Scripts\\ExpansionPack\\missing"), false);
            assert.equal(host.files.folderExists("C:\\PinballY\\Scripts\\ExpansionPack\\main.js"), false);
        });

        test("an HTTP GET sends its headers and gives the reply text on status 200", async () => {
            fake.replyToHttp({ text: "{\"tag_name\":\"v0.2.0\"}" });
            const reply = await host.httpGet("https://example.com/latest?t=1", { "User-Agent": "Test" });

            assert.equal(reply, "{\"tag_name\":\"v0.2.0\"}");
            assert.deepEqual(fake.httpRequests(), [{ method: "GET", url: "https://example.com/latest?t=1", headers: { "User-Agent": "Test" } }]);
        });

        test("an HTTP GET answered with another status rejects with its status text", async () => {
            fake.replyToHttp({ status: 403, statusText: "Forbidden" });
            await assert.rejects(host.httpGet("https://example.com/latest", {}), /Forbidden/);
        });

        test("an HTTP GET with no reply yet stays pending", async () => {
            let settled = false;
            host.httpGet("https://example.com/latest", {}).then(() => { settled = true; }, () => { settled = true; });
            await settle();
            assert.equal(settled, false);
            assert.equal(fake.httpRequests().length, 1);
        });

        test("tells a readable image from a missing or unreadable one, leaving no drawing layer behind", () => {
            const readable = "C:\\PinballY\\Scripts\\profiles\\Alice\\avatar.png";
            const unreadable = "C:\\PinballY\\Scripts\\profiles\\Bob\\avatar.png";
            fake.addFile(readable);
            fake.addUnreadableImage(unreadable);

            assert.equal(host.files.isImageReadable(readable), true);
            assert.equal(host.files.isImageReadable(unreadable), false);
            assert.equal(host.files.isImageReadable("C:\\PinballY\\Scripts\\missing.png"), false);
            assert.deepEqual(fake.drawingLayers(), []);
        });

        test("writes log lines", () => {
            host.log("[Test] hello");
            assert.deepEqual(fake.logLines(), ["[Test] hello"]);
        });
    });
}

describe("production host sound players", () => {
    test("every caller asking for the same sound shares its players, created once", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            const filePath = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";
            fake.addFile(filePath);
            const first = createPinballYHost().createSoundRotation(filePath, 3);
            const second = createPinballYHost().createSoundRotation(filePath, 3);
            first.play();
            second.play();
            first.play();
            second.play();

            const players = fake.soundPlayers();
            assert.equal(new Set(players.slice(0, 3)).size, 3, "the second caller goes on with the next player");
            assert.equal(players[3], players[0], "three players in all");
        } finally {
            uninstallGlobals();
        }
    });
});

describe("production host restart", () => {
    test("starts the helper hidden with PinballY's process id, and a ready file left by an earlier try does not count", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            fake.addFile(RESTART_HELPER);
            fake.addFile(`${TEMPORARY_FOLDER}\\restart-ready`, "1234");
            const calls = [];
            createPinballYHost().restartPinballY({ onQuitting: () => calls.push("quitting"), onFailed: error => calls.push(error.message) });

            assert.deepEqual(fake.programRuns(), [{
                program: "powershell.exe",
                args: [
                    "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", RESTART_HELPER,
                    "-ParentPid", String(FAKE_PINBALLY_PID),
                    "-ReadyFile", `${TEMPORARY_FOLDER}\\restart-ready`, "-LogFile", `${TEMPORARY_FOLDER}\\restart.log`,
                ],
            }]);
            fake.advanceTime(400);
            assert.deepEqual(calls, [], "the stale ready file was deleted first");
        } finally {
            uninstallGlobals();
        }
    });

    test("starts the Pack Update helper hidden with what it installs and where", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            fake.addFile(PACK_UPDATE_HELPER);
            createPinballYHost().startPackUpdate({ ...PACK_UPDATE, onQuitting: () => {}, onFailed: () => {} });

            assert.deepEqual(fake.programRuns(), [{
                program: "powershell.exe",
                args: [
                    "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", PACK_UPDATE_HELPER,
                    "-ParentPid", String(FAKE_PINBALLY_PID),
                    "-ReadyFile", `${TEMPORARY_FOLDER}\\pack-update-ready`, "-LogFile", `${TEMPORARY_FOLDER}\\pack-update.log`,
                    "-ZipUrl", PACK_UPDATE.zipUrl, "-Sha256", PACK_UPDATE.sha256, "-PackVersion", "9.0.0",
                    "-PackFolder", "C:\\PinballY\\Scripts\\ExpansionPack",
                ],
            }]);
            assert.equal(fake.restartsAsked(), 0, "not a restart");
        } finally {
            uninstallGlobals();
        }
    });

    test("a quote in a Pack Update argument throws before any helper starts", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            fake.addFile(PACK_UPDATE_HELPER);
            assert.throws(() => createPinballYHost().startPackUpdate({
                ...PACK_UPDATE, zipUrl: "https://example.com/a\" -Evil \"b.zip", onQuitting: () => {}, onFailed: () => {},
            }), /quote in the Pack Update helper's -ZipUrl argument/);
            assert.deepEqual(fake.programRuns(), []);
        } finally {
            uninstallGlobals();
        }
    });

    test("starts the Script Reader install helper hidden with what it installs, where, and the files it answers through", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            fake.addFile(SCRIPT_READER_HELPER);
            createPinballYHost().installScriptReader(SCRIPT_READER);

            const [{ program, args }] = fake.programRuns();
            assert.equal(program, "powershell.exe");
            const valueOf = name => args[args.indexOf(name) + 1];
            assert.deepEqual(args.slice(0, 7), ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", SCRIPT_READER_HELPER]);
            assert.equal(valueOf("-LogFile"), `${TEMPORARY_FOLDER}\\script-reader-install.log`);
            assert.match(valueOf("-OutputFile"), /^C:\\Users\\Cabinet\\AppData\\Local\\Temp\\PinballYExpansionPack\\script-reader-install-\d+-\d+\.out$/);
            assert.equal(valueOf("-CodeFile"), valueOf("-OutputFile").replace(/\.out$/, ".code"));
            assert.equal(valueOf("-ZipUrl"), SCRIPT_READER.zipUrl);
            assert.equal(valueOf("-Sha256"), SCRIPT_READER.sha256);
            assert.equal(valueOf("-Version"), "0.38.0");
            assert.equal(valueOf("-ToolsFolder"), "C:\\PinballY\\Scripts\\ExpansionPack\\tools");
        } finally {
            uninstallGlobals();
        }
    });

    test("a quote in a Script Reader install argument throws before any helper starts", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            fake.addFile(SCRIPT_READER_HELPER);
            assert.throws(() => createPinballYHost().installScriptReader({ ...SCRIPT_READER, version: "0.38.0\" -Evil \"" }),
                /quote in the Script Reader install helper's -Version argument/);
            assert.deepEqual(fake.programRuns(), []);
        } finally {
            uninstallGlobals();
        }
    });

    test("a missing Script Reader install helper never answers", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            const install = createPinballYHost().installScriptReader(SCRIPT_READER);
            fake.advanceTime(120000);
            assert.equal(install.result(), null);
        } finally {
            uninstallGlobals();
        }
    });

    test("a missing helper never gets ready", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstallGlobals = fake.installGlobals();
        try {
            const calls = [];
            createPinballYHost().restartPinballY({ onQuitting: () => calls.push("quitting"), onFailed: error => calls.push(error.message) });
            fake.advanceTime(15000);
            assert.equal(calls.length, 1);
            assert.match(calls[0], /not ready after 15 s/);
        } finally {
            uninstallGlobals();
        }
    });
});

describe("fake host timers", () => {
    test("run on the manual clock as the test advances time, and can be cleared", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const calls = [];
        fake.setTimeout(() => calls.push(`timeout@${fake.now().getTime() - NOW.getTime()}`), 100);
        const cleared = fake.setTimeout(() => calls.push("cleared"), 50);
        fake.clearTimeout(cleared);
        const interval = fake.setInterval(() => {
            calls.push(`tick@${fake.now().getTime() - NOW.getTime()}`);
            if (calls.length === 4) fake.clearInterval(interval);
        }, 40);

        fake.advanceTime(99);
        assert.deepEqual(calls, ["tick@40", "tick@80"]);

        fake.advanceTime(1000);
        assert.deepEqual(calls, ["tick@40", "tick@80", "timeout@100", "tick@120"]);
        assert.equal(fake.now().getTime() - NOW.getTime(), 1099);
    });
});

describe("fake PinballY globals", () => {
    test("the global Date follows the fake host clock until uninstalled", () => {
        const fake = createFakePinballYHost({ now: NOW });
        const uninstall = fake.installGlobals();
        try {
            assert.equal(new Date().getTime(), NOW.getTime());
            fake.advanceTime(1000);
            assert.equal(Date.now(), new Date(2026, 8, 23, 10, 0, 1).getTime());
            assert.equal(new Date("2020-01-01T00:00:00Z").toISOString(), "2020-01-01T00:00:00.000Z");
        } finally {
            uninstall();
        }
        assert.ok(Math.abs(Date.now() - new Date(2026, 8, 23, 10, 0, 1).getTime()) > 1000);
        assert.equal(globalThis.optionSettings, undefined);
    });
});
