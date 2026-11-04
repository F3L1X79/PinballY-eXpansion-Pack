// ============================================================
// eXpansion Pack Settings: their entry in the Operator Menu, after PinballY's Options, for whoever
// sees the setup entries, opens the list of Add-on categories (their Add-ons as saved in .env.local,
// read again on each opening, one page per Add-on whose Save rewrites its one line), the Startup screen and
// Language pages, the Offline Mode group's switches, saving at once, and "Update to vX.Y.Z", the vpxtool line and the Backglass Clock Placement while possible.
// Listens to "menuopen", "command" and "commandbuttondown"; writes .env.local.
// - Started by main.js whatever config.addOns says, its "menuopen" listener before the Drawn Menus Add-on's.
// - Always drawn (getPackMenus), even with the Drawn Menus Add-on off.
// - Nothing applies before PinballY restarts but the Script Reader Prompt's No thanks: "on restart" marks a saved value that differs from the running one.
// - Leaving the list with such a value asks Restart now (host.restartPinballY) or Later; attract mode never asks.
// - Saving Discord Rich Presence on from off asks for consent every time, the cursor on Cancel; a hand-edited .env.local never asks.
// ============================================================

import lang from "../core/i18n.js";
import config, { DEFAULTS } from "../core/config.js";
import { applyEnvOverrides } from "../core/env_overrides.js";
import { logHandlerError, safeHandler } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { seesSetupEntries } from "../profiles/setup_entries.js";
import { getDrawnMenus, getPackMenus } from "../drawn_menu/drawn_menu.js";
import { DRAWN_MENU_Z_INDEX } from "../drawn_menu/drawn_menu_painter.js";
import { createLoader } from "../drawing/loader.js";
import { DIMMED_WHEEL } from "../drawing/steamball_drawing.js";
import { DIALOG_PRIORITY, getWheelDialogs } from "../core/wheel_dialog.js";
import { installableRelease } from "../updates/update_check.js";
import { getUpdateState } from "../updates/update_state.js";
import { getPackUpdater } from "../updates/pack_update.js";
import { SCRIPT_READER_VERSION } from "../table_roms/script_reader_version.js";
import { getScriptReaderInstaller, scriptReaderDialogText } from "../table_roms/script_reader_install.js";
import { getScriptReaderState } from "../table_roms/script_reader_state.js";
import { getBackglassClockPlacement } from "../clock/backglass_clock_placement.js";
import { ADD_ON_GROUPS } from "./add_on_catalogue.js";
import { saveEnvSetting } from "./env_local_rewrite.js";

const SCRIPT_NAME = "ExpansionPackSettings";
const OPERATOR_MENU_ID = "operator";
const LIST_MENU_ID = "expansionPackSettings";
const CATEGORY_MENU_ID = "expansionPackSettingsCategory";
const PAGE_MENU_ID = "expansionPackSettingsPage";
const LANGUAGE_MENU_ID = "expansionPackSettingsLanguage";
const STARTUP_SCREEN_MENU_ID = "expansionPackSettingsStartupScreen";
const OFFLINE_MODE_MENU_ID = "expansionPackSettingsOfflineMode";
const UPDATE_CHECK_MENU_ID = "expansionPackSettingsUpdateCheck";
const OFFER_VPXTOOL_MENU_ID = "expansionPackSettingsOfferVpxtool";
const DISCORD_RICH_PRESENCE_MENU_ID = "expansionPackSettingsDiscordRichPresence";
const SCRIPT_READER_MENU_ID = "expansionPackSettingsScriptReader";
const CLOCK_PLACEMENT_MENU_ID = "expansionPackSettingsClockPlacement";
const BACKGLASS_CLOCK_KEY = "backglassClock";
const DISCORD_CONSENT_MENU_ID = "expansionPackSettingsDiscordConsent";
const NOT_SAVED_MENU_ID = "expansionPackSettingsNotSaved";
const RESTART_MENU_ID = "expansionPackSettingsRestart";
const RESTART_FAILED_MENU_ID = "expansionPackSettingsRestartFailed";
const SEPARATOR = { cmd: -1 };
// Just under the Drawn Menus, which the failure message may show over them.
const RESTART_VEIL_Z_INDEX = DRAWN_MENU_Z_INDEX.backdrop - 2;
const RESTART_LOADER_Z_INDEX = DRAWN_MENU_Z_INDEX.backdrop - 1;
const BOLD_WEIGHT = 700;

// getMenus: what shows the screens, asked on each opening
// (common/drawn_menu/drawn_menu.js); running: the configuration loaded at startup.
export function createExpansionPackSettings(host, profileStore, getMenus, running = config) {
    const { expansionPackSettings: TEXT } = lang;
    const entryCommand = host.allocateCommand("expansionPackSettings");
    const optionsCommand = host.getBuiltInCommand("Options");
    const operatorMenuCommand = host.getBuiltInCommand("ShowOperatorMenu");
    const menuReturnCommand = host.getBuiltInCommand("MenuReturn");
    // One command per category and per Add-on line, so that each line can be chosen.
    const groupCommands = new Map(ADD_ON_GROUPS
        .map(({ group }) => [group, host.allocateCommand(`expansionPackSettings_group_${group}`)]));
    const groupOfCommand = new Map([...groupCommands].map(([group, cmd]) => [cmd, group]));
    const groupOfAddOn = new Map(ADD_ON_GROUPS.flatMap(({ group, addOns }) => addOns.map(key => [key, group])));
    const addOnCommands = new Map([...groupOfAddOn.keys()]
        .map(key => [key, host.allocateCommand(`expansionPackSettings_${key}`)]));
    const addOnOfCommand = new Map([...addOnCommands].map(([key, cmd]) => [cmd, key]));
    // The settings picked on a page of choices and saved at once (but for
    // asksConsent's On from off), in the list's order: each by its config key,
    // its choices' names in their order, and its value as compared (a language
    // whatever its case, as i18n.js reads it), offline when its line is in the
    // Offline Mode group. One command for its line, one per choice. A switch's
    // choices are keyed "true" / "false": String turns the saved boolean into
    // one of them. Discord Rich Presence's key only names its commands, the
    // Add-on's own page having that name; keyPath and read are the Add-on's value.
    const ON_OFF = { true: TEXT.on, false: TEXT.off };
    const choiceSettings = [
        { key: "startupScreen", menuId: STARTUP_SCREEN_MENU_ID, names: TEXT.startupScreenNames, line: TEXT.startupScreenLine, normalize: String },
        { key: "language", menuId: LANGUAGE_MENU_ID, names: TEXT.languageNames, line: TEXT.languageLine, normalize: value => String(value).toLowerCase() },
        { key: "updateCheck", menuId: UPDATE_CHECK_MENU_ID, names: ON_OFF, line: TEXT.updateCheckLine, normalize: String, offline: true },
        { key: "offerVpxtool", menuId: OFFER_VPXTOOL_MENU_ID, names: ON_OFF, line: TEXT.offerVpxtoolLine, normalize: String, offline: true },
        {
            key: "offlineDiscordRichPresence",
            keyPath: "addOns.discordRichPresence",
            read: ({ addOns }) => addOns.discordRichPresence,
            menuId: DISCORD_RICH_PRESENCE_MENU_ID,
            names: ON_OFF,
            line: state => TEXT.addOnLine(TEXT.addOns.discordRichPresence.name, state),
            normalize: String,
            offline: true,
            asksConsent: true,
        },
    ].map(setting => ({
        keyPath: setting.key,
        read: settings => settings[setting.key],
        ...setting,
        lineCommand: host.allocateCommand(`expansionPackSettings_${setting.key}`),
        choiceCommands: new Map(Object.keys(setting.names)
            .map(value => [value, host.allocateCommand(`expansionPackSettings_${setting.key}_${value}`)])),
    }));
    const choiceSettingOfLine = new Map(choiceSettings.map(setting => [setting.lineCommand, setting]));
    // Each choice's command: its setting and value.
    const choiceOfCommand = new Map(choiceSettings.flatMap(setting => [...setting.choiceCommands]
        .map(([value, cmd]) => [cmd, { setting, value }])));
    const offlineModeCommand = host.allocateCommand("expansionPackSettings_offlineMode");
    const switchCommand = host.allocateCommand("expansionPackSettings_switch");
    const saveCommand = host.allocateCommand("expansionPackSettings_save");
    const discordConsentCommand = host.allocateCommand("expansionPackSettings_discordConsent");
    const restartCommand = host.allocateCommand("expansionPackSettings_restart");
    const updateCommand = host.allocateCommand("expansionPackSettings_update");
    const scriptReaderLineCommand = host.allocateCommand("expansionPackSettings_installVpxtool");
    const scriptReaderInstallCommand = host.allocateCommand("expansionPackSettings_scriptReaderInstall");
    const clockPlacementCommand = host.allocateCommand("expansionPackSettings_placeBackglassClock");
    const envLocalPath = `${host.getProjectFolder()}\\.env.local`;
    // The page on screen: its Add-on, the choice saved when it opened, and the switch.
    let page = null;
    // What the consent Dialog on screen saves on Turn on.
    let onConsent = null;

    const readEnvLocal = () => (host.files.fileExists(envLocalPath) ? host.files.readText(envLocalPath) : null);

    // The settings as saved now, the defaults for a missing file or key.
    const readSaved = () => applyEnvOverrides(DEFAULTS, readEnvLocal()).config;

    const stateOf = value => (value ? TEXT.on : TEXT.off);

    const addOnDiffers = (saved, key) => saved.addOns[key] !== running.addOns[key];
    const choiceDiffers = (saved, { read, normalize }) => normalize(read(saved)) !== normalize(read(running));

    // A value the pack does not know shows as written.
    const choiceLineOf = (saved, setting) => {
        const name = setting.names[setting.normalize(setting.read(saved))] || setting.read(saved);
        return { title: setting.line(choiceDiffers(saved, setting) ? TEXT.onRestart(name) : name), cmd: setting.lineCommand };
    };

    const releaseToInstall = () => installableRelease(host, getUpdateState());

    // Only while the running Table ROMs Add-on would read the scripts with it.
    const scriptReaderOffer = () => (running.addOns.tableRoms ? getScriptReaderState().offer() : null);

    // Install while vpxtool is missing, update while older, greyed while up
    // to date; none while its version is unknown.
    function scriptReaderLines() {
        const offer = scriptReaderOffer();
        const { version } = SCRIPT_READER_VERSION;
        if (!offer) return [];
        if (offer.kind === "install") return [{ title: TEXT.installVpxtool(version), cmd: scriptReaderLineCommand }];
        if (offer.kind === "update") return [{ title: TEXT.updateVpxtool(offer.installed, version), cmd: scriptReaderLineCommand }];
        return [{ title: TEXT.vpxtoolUpToDateLine, cmd: scriptReaderLineCommand, disabled: true, reason: TEXT.vpxtoolUpToDate(offer.installed) }];
    }

    // The categories, each opening its page, then the settings picked on a
    // page of choices and the Offline Mode group, then the Pack Update and
    // the Script Reader install while each is possible.
    function openList(selectedCmd = null) {
        page = null;
        const saved = readSaved();
        const release = releaseToInstall();
        const installs = [
            ...(release ? [{ title: TEXT.updateTo(release.packVersion), cmd: updateCommand }] : []),
            ...scriptReaderLines(),
        ];
        getMenus().show(LIST_MENU_ID, [
            ...ADD_ON_GROUPS.map(({ group }) => ({ title: TEXT.groups[group], cmd: groupCommands.get(group), hasSubmenu: true })),
            SEPARATOR,
            ...choiceSettings.filter(setting => !setting.offline).map(setting => choiceLineOf(saved, setting)),
            { title: TEXT.offlineMode, cmd: offlineModeCommand, hasSubmenu: true },
            SEPARATOR,
            ...(installs.length > 0 ? [...installs, SEPARATOR] : []),
            { title: TEXT.back, cmd: menuReturnCommand },
        ], { selectedCmd, onBack: leaveList });
    }

    // The Script Reader Prompt's Dialog, as the wheel dialog queue lays one out;
    // No thanks and Exit return to its line.
    function openScriptReaderDialog() {
        page = null;
        const { title, message, install, noThanks } = scriptReaderDialogText(scriptReaderOffer());
        getMenus().show(SCRIPT_READER_MENU_ID, [
            { title, cmd: -1 },
            { title: message, cmd: -1 },
            SEPARATOR,
            { title: install, cmd: scriptReaderInstallCommand },
            { title: noThanks, cmd: menuReturnCommand },
        ], { dialogStyle: true, onBack: () => openList(scriptReaderLineCommand) });
    }

    // Monitors are counted at each opening, since a screen can be plugged in or out.
    const clockPlacementLines = () => (getBackglassClockPlacement() && host.countMonitors() > 1
        ? [{ title: TEXT.backglassClockPlacement.line, cmd: clockPlacementCommand }]
        : []);

    // Begins the placement, under a Dialog that says what to do. onClose ends it
    // too, for a close that isn't onBack's: attract mode closes a Drawn Menu.
    function openClockPlacement() {
        page = null;
        const placement = getBackglassClockPlacement();
        if (!placement) return;
        const { title, instruction, done } = TEXT.backglassClockPlacement;
        placement.begin();
        getMenus().show(CLOCK_PLACEMENT_MENU_ID, [
            { title, cmd: -1 },
            { title: instruction, cmd: -1 },
            SEPARATOR,
            { title: done, cmd: menuReturnCommand },
        ], {
            dialogStyle: true,
            onBack: () => {
                placement.end();
                openCategory(groupOfAddOn.get(BACKGLASS_CLOCK_KEY), clockPlacementCommand);
            },
            onClose: placement.end,
        });
    }

    // A category's Add-ons, each On / Off as saved, under its heading.
    function openCategory(group, selectedCmd = null) {
        page = null;
        const saved = readSaved();
        const { addOns } = ADD_ON_GROUPS.find(entry => entry.group === group);
        getMenus().show(CATEGORY_MENU_ID, [
            { title: TEXT.groups[group], cmd: -1 },
            ...addOns.flatMap((key) => {
                const state = stateOf(saved.addOns[key]);
                const shownState = addOnDiffers(saved, key) ? TEXT.onRestart(state) : state;
                const line = { title: TEXT.addOnLine(TEXT.addOns[key].name, shownState), cmd: addOnCommands.get(key) };
                return key === BACKGLASS_CLOCK_KEY ? [line, ...clockPlacementLines()] : [line];
            }),
            SEPARATOR,
            { title: TEXT.back, cmd: menuReturnCommand },
        ], { selectedCmd, onBack: () => openList(groupCommands.get(group)) });
    }

    // The Offline Mode group's switches under its heading, as a category's Add-ons.
    function openOfflineMode(selectedCmd = null) {
        page = null;
        const saved = readSaved();
        getMenus().show(OFFLINE_MODE_MENU_ID, [
            { title: TEXT.offlineMode, cmd: -1 },
            ...choiceSettings.filter(setting => setting.offline).map(setting => choiceLineOf(saved, setting)),
            SEPARATOR,
            { title: TEXT.back, cmd: menuReturnCommand },
        ], { selectedCmd, onBack: () => openList(offlineModeCommand) });
    }

    // Where a setting's line is: the list or the Offline Mode group.
    const backToLine = setting => (setting.offline ? openOfflineMode : openList)(setting.lineCommand);

    const returnToOperatorMenu = () => host.doCommand(operatorMenuCommand);

    // Back or Exit on the list: at once when nothing saved differs from what
    // runs; otherwise Restart now or Later, Exit leaving as Later does.
    function leaveList() {
        const saved = readSaved();
        if (!choiceSettings.some(setting => choiceDiffers(saved, setting)) && ![...addOnCommands.keys()].some(key => addOnDiffers(saved, key))) {
            returnToOperatorMenu();
            return;
        }
        getMenus().show(RESTART_MENU_ID, [
            { title: TEXT.restartQuestion, cmd: -1 },
            SEPARATOR,
            { title: TEXT.restartNow, cmd: restartCommand },
            { title: TEXT.later, cmd: menuReturnCommand },
        ], { dialogStyle: true, onBack: returnToOperatorMenu });
    }

    // From Restart now until PinballY quits: the wheel dimmed as a drawn
    // screen's backdrop dims it, with the Loader turning over it.
    let restartVeil = null;
    const restartLoader = createLoader(host, { zIndex: RESTART_LOADER_Z_INDEX });

    function showRestartVeil() {
        restartVeil = host.createDrawingLayer(RESTART_VEIL_Z_INDEX);
        restartVeil.clear(DIMMED_WHEEL);
        restartLoader.show();
    }

    function hideRestartVeil() {
        restartLoader.hide();
        if (!restartVeil) return;
        host.removeDrawingLayer(restartVeil);
        restartVeil = null;
    }

    // Shown once the wheel is free: the failure comes up to 15 s after the
    // screens closed.
    const restartFailed = safeHandler(SCRIPT_NAME, error => {
        hideRestartVeil();
        logError(SCRIPT_NAME, `ERROR Restart not possible: ${error.message}`, host, error);
        getWheelDialogs().submit({
            id: RESTART_FAILED_MENU_ID, title: TEXT.restartFailedTitle, message: TEXT.restartFailed, buttons: [{ label: TEXT.ok }], priority: DIALOG_PRIORITY.RESTART_FAILED,
        });
    });

    function restart() {
        host.log(`[${SCRIPT_NAME}] Restart asked.`);
        showRestartVeil();
        try {
            host.restartPinballY({
                onQuitting: safeHandler(SCRIPT_NAME, () => host.log(`[${SCRIPT_NAME}] Restart helper ready, quitting.`)),
                onFailed: restartFailed,
            });
        } catch (error) {
            restartFailed(error);
        }
    }

    // Back, Exit, Cancel and Save all return to the category on the page's line.
    const backToCategory = key => openCategory(groupOfAddOn.get(key), addOnCommands.get(key));

    // Drawn with each label in bold, "When off" on a line of its own; the
    // plain title is what a native menu shows instead.
    const pageMessageRuns = (whenOn, whenOff) => [
        { text: `${TEXT.whenOnLabel} `, weight: BOLD_WEIGHT }, whenOn,
        { text: `\n${TEXT.whenOffLabel} `, weight: BOLD_WEIGHT }, whenOff,
    ];

    function showPage() {
        const { key, saved, value } = page;
        const { name, whenOn, whenOff } = TEXT.addOns[key];
        getMenus().show(PAGE_MENU_ID, [
            { title: `${TEXT.whenOnLabel} ${whenOn} ${TEXT.whenOffLabel} ${whenOff}`, runs: pageMessageRuns(whenOn, whenOff), cmd: -1 },
            SEPARATOR,
            // Stays open: the page is shown again over itself, the cursor kept.
            { title: TEXT.addOnLine(name, stateOf(value)), cmd: switchCommand, stayOpen: true },
            ...(value !== saved ? [{ title: TEXT.save, cmd: saveCommand }] : []),
            { title: TEXT.cancel, cmd: menuReturnCommand },
        ], { dialogStyle: true, onBack: () => backToCategory(key) });
    }

    function openPage(key) {
        const saved = readSaved().addOns[key];
        page = { key, saved, value: saved };
        showPage();
    }

    // Each choice by its name (a language in its own), the saved one marked;
    // choosing one saves it, through saveChoice.
    function openChoicePage(setting) {
        page = null;
        const saved = setting.normalize(setting.read(readSaved()));
        getMenus().show(setting.menuId, [
            ...[...setting.choiceCommands].map(([value, cmd]) => ({ title: setting.names[value], cmd, radio: value === saved })),
            SEPARATOR,
            { title: TEXT.cancel, cmd: menuReturnCommand },
        ], { selectedCmd: setting.choiceCommands.get(saved) ?? null, onBack: () => backToLine(setting) });
    }

    // A failed read or write is caught here, not by safeHandler, for the
    // owner to see it; reopen then shows the page on the choice saved before.
    function save(keyPath, value, { onSaved, reopen }) {
        try {
            saveEnvSetting(host, keyPath, value, SCRIPT_NAME);
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            getMenus().show(NOT_SAVED_MENU_ID, [
                { title: TEXT.notSaved, cmd: -1 },
                SEPARATOR,
                { title: TEXT.ok, cmd: menuReturnCommand },
            ], { dialogStyle: true, onBack: reopen });
            return;
        }
        onSaved();
    }

    function saveAddOn() {
        const { key, value } = page;
        save(`addOns.${key}`, value, { onSaved: () => backToCategory(key), reopen: () => openPage(key) });
    }

    // What Discord Rich Presence makes public, the cursor on Cancel so that
    // Select by habit saves nothing. Cancel and Exit run onBack.
    function openDiscordConsent(onTurnOn, onBack) {
        onConsent = onTurnOn;
        getMenus().show(DISCORD_CONSENT_MENU_ID, [
            { title: TEXT.addOns.discordRichPresence.name, cmd: -1 },
            { title: TEXT.discordConsentMessage, cmd: -1 },
            SEPARATOR,
            { title: TEXT.discordConsentTurnOn, cmd: discordConsentCommand },
            { title: TEXT.cancel, cmd: menuReturnCommand },
        ], { dialogStyle: true, selectedCmd: menuReturnCommand, onBack });
    }

    // The page offers Save only while its switch differs from the saved
    // choice: On here means saved off. Refused, the page shows the saved choice again.
    function savePage() {
        const { key, value } = page;
        if (key === "discordRichPresence" && value) openDiscordConsent(saveAddOn, () => openPage(key));
        else saveAddOn();
    }

    // Choosing On while saved on keeps it without asking again.
    function saveChoice({ setting, value }) {
        const saveValue = () => save(setting.keyPath, value, { onSaved: () => backToLine(setting), reopen: () => openChoicePage(setting) });
        const turnsOn = value === "true" && setting.normalize(setting.read(readSaved())) !== "true";
        if (setting.asksConsent && turnsOn) openDiscordConsent(saveValue, () => openChoicePage(setting));
        else saveValue();
    }

    // Fires when any menu opens, with a fresh item list each time, the
    // Operator Menu's included whether the Exit menu or the coin door's
    // service button opened it.
    host.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id !== OPERATOR_MENU_ID || !seesSetupEntries(profileStore)) return;
        ev.addMenuItem({ after: optionsCommand }, { title: TEXT.menuEntry, cmd: entryCommand });
    }));

    // Fires on every mapped button press: while PinballY gets ready to quit,
    // no button moves the wheel or launches a table.
    host.on("commandbuttondown", safeHandler(SCRIPT_NAME, ev => {
        if (restartVeil) ev.preventDefault();
    }));

    // Fires on every command: the entry opens the list, a line its page, the
    // switch flips, Save or a language writes.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === entryCommand) {
            openList();
            return;
        }
        if (groupOfCommand.has(ev.id)) openCategory(groupOfCommand.get(ev.id));
        else if (ev.id === offlineModeCommand) openOfflineMode();
        else if (addOnOfCommand.has(ev.id)) openPage(addOnOfCommand.get(ev.id));
        else if (choiceSettingOfLine.has(ev.id)) openChoicePage(choiceSettingOfLine.get(ev.id));
        else if (choiceOfCommand.has(ev.id)) saveChoice(choiceOfCommand.get(ev.id));
        else if (ev.id === switchCommand && page) {
            page.value = !page.value;
            showPage();
        } else if (ev.id === saveCommand && page) {
            savePage();
        } else if (ev.id === discordConsentCommand && onConsent) {
            onConsent();
        } else if (ev.id === restartCommand) {
            restart();
        } else if (ev.id === updateCommand) {
            const release = releaseToInstall();
            if (release) getPackUpdater().start(release);
        } else if (ev.id === scriptReaderLineCommand) {
            openScriptReaderDialog();
        } else if (ev.id === scriptReaderInstallCommand) {
            getScriptReaderInstaller().start();
        } else if (ev.id === clockPlacementCommand) {
            openClockPlacement();
        }
    }));
}

export function startExpansionPackSettings() {
    let menus = null;
    const getMenus = () => {
        if (!menus) {
            menus = getPackMenus();
            // With Drawn Menus off, a drawn instance of their own, which the
            // wheel dialogs know nothing of unless they wait for it too.
            if (menus !== getDrawnMenus()) getWheelDialogs().waitFor(menus);
        }
        return menus;
    };
    createExpansionPackSettings(createPinballYHost(), getProfileStore(), getMenus);
}
