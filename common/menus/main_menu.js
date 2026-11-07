// ============================================================
// Main menu module: owns the main menu's order. Add-ons add entries with a
// position; on each opening it sorts them and PinballY's items into fixed
// sections, sends the selections and groups to the Filter Picker, and runs
// the chosen entry's action. Listens to "menuopen" and "command".
// - main.js's order never decides where an entry lands.
// - PinballY's High Scores reads "Table Scores", and Rate Table names the Rating, in the main menu only.
// - A [Top] filter's condition is checked on each opening; a failing one is logged and kept.
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { createFilterPicker } from "./filter_picker.js";
import { SEPARATOR_CMD, isSeparator } from "./menu_separator.js";
import { ratingOf } from "../profiles/profile_ratings.js";

const SCRIPT_NAME = "MainMenu";

// The kinds of slot a section lists. Each matches the commands of the
// PinballY items it places (items sharing a slot keep PinballY's order);
// a pack entry's slot names its position and matches none.
const packEntry = name => ({ name, matches: () => false });
const builtIn = (...names) => ({ matches: (cmd, host) => names.some(name => host.getBuiltInCommand(name) === cmd) });
// Where an item no other slot matches goes.
const UNKNOWN = { matches: () => false };

// Sections from the top down, each listing its slots in menu order.
const SECTIONS = [
    [builtIn("PlayGame"), packEntry("RANDOM_GAME"), packEntry("TABLE_SETUP"), packEntry("PROFILE_PICKER"), packEntry("WELCOME_SCREEN")],
    [packEntry("PROFILE_STATS"), packEntry("ACHIEVEMENT_LIST")],
    [
        packEntry("HIGH_SCORE_BOARD"),
        builtIn("GameInfo"), builtIn("Flyer"), builtIn("Instructions"), builtIn("HighScores"),
        builtIn("RateGame"), builtIn("AddFavorite", "RemoveFavorite"),
        packEntry("FILTER_PICKER"),
    ],
    [UNKNOWN],
    // Alone, so it never reads as one of the filter's entries.
    [builtIn("MenuReturn")],
];

const SLOTS = SECTIONS.flatMap((slots, section) => slots.map((slot, order) => ({ slot, position: Object.freeze({ section, order }) })));

export const MAIN_MENU_POSITION = Object.freeze(Object.fromEntries(SLOTS
    .filter(({ slot }) => slot.name)
    .map(({ slot, position }) => [slot.name, position])));

const UNKNOWN_POSITION = SLOTS.find(({ slot }) => slot === UNKNOWN).position;

const comparePositions = (a, b) => a.section - b.section || a.order - b.order;

// Every filter's command: the [Top] filters, the only ones in the main menu.
const isFilterItem = (item, host) => item.cmd >= host.getBuiltInCommand("FilterFirst") && item.cmd <= host.getBuiltInCommand("FilterLast");

export function createMainMenu(host) {
    // Sorted by position.
    const entries = [];
    // One per conditioned filter: its item's command when it is left out this time.
    const leftOutFilterCmdReaders = [];
    // The entry the cursor goes to on the next main menu opening, or null.
    let entryToSelect = null;

    // label: a text, or a function returning it on each opening; shownWhen:
    // optional, the entry is left out of the menu when it returns false;
    // radioWhen: optional, the entry is marked radio when it returns true.
    // Each function is guarded on its own, so a failing one only touches
    // its own entry (a failing label leaves it out). hasSubmenu: the entry
    // opens a submenu (the arrow). Returns the entry's command.
    function add({ name, label, position, action, shownWhen = () => true, radioWhen = () => false, hasSubmenu = false }) {
        const entry = {
            name, position, action, hasSubmenu,
            label: typeof label === "function" ? safeHandler(SCRIPT_NAME, label) : () => label,
            shownWhen: safeHandler(SCRIPT_NAME, shownWhen),
            radioWhen: safeHandler(SCRIPT_NAME, radioWhen),
            cmd: host.allocateCommand(name),
        };
        const insertAt = entries.findIndex(other => comparePositions(other.position, position) > 0);
        if (insertAt === -1) entries.push(entry);
        else entries.splice(insertAt, 0, entry);
        return entry.cmd;
    }

    // The filter's command lasts only a session, so it is read at each opening.
    function showFilterWhen(filterId, shownWhen) {
        leftOutFilterCmdReaders.push(safeHandler(SCRIPT_NAME, () => (shownWhen() ? undefined : host.getFilterInfo(filterId).cmd)));
    }

    // Opens the main menu with the cursor on the named entry.
    function reopenOn(name) {
        entryToSelect = name;
        host.doCommand(host.getBuiltInCommand("ShowMainMenu"));
    }

    const filterPicker = createFilterPicker(host, {
        addMainMenuEntry: add,
        position: MAIN_MENU_POSITION.FILTER_PICKER,
        reopenMainMenuOn: reopenOn,
    });

    // The position of one of PinballY's items, by its command.
    function nativePositionOf(cmd) {
        const found = SLOTS.find(({ slot }) => slot.matches(cmd, host));
        return found ? found.position : UNKNOWN_POSITION;
    }

    // PinballY's High Scores reads "Table Scores" here only, over UI
    // Translation's title (registered first), so it never shares the High
    // Score Board's name; the pause menu keeps "High Scores". Rate Table
    // names the selected table's Rating (none when PinballY holds -1), read
    // again at each opening, after UI Translation's title; its note is the
    // Rating alone, which the Drawn Menu draws smaller.
    function withMainMenuTitle(item) {
        if (item.cmd === host.getBuiltInCommand("HighScores")) return { ...item, title: lang.customMenuLabels.tableScores };
        if (item.cmd === host.getBuiltInCommand("RateGame")) {
            const table = host.getCurrentTable();
            const rating = table ? ratingOf(table) : null;
            if (rating !== null) {
                const note = lang.customMenuLabels.currentRating(rating);
                return { ...item, title: `${item.title} ${note}`, note };
            }
        }
        return item;
    }

    // Fires when any menu opens, with a fresh item list each time: hands the
    // filters shown this time to the Filter Picker, which may take the
    // opening over, else sorts the entries shown and PinballY's other items
    // into their sections. Items removed by a listener registered earlier
    // (Menu Cleanup, before every Add-on using this module in main.js) stay
    // removed; one registered later (the High Scores) tidies the separators
    // its removals leave.
    host.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id !== "main") return;
        const leftOutCmds = leftOutFilterCmdReaders.map(readCmd => readCmd()).filter(cmd => cmd !== undefined);
        const selections = ev.items.filter(item => isFilterItem(item, host) && !leftOutCmds.includes(item.cmd));
        if (filterPicker.mainMenuOpened(ev, selections)) {
            entryToSelect = null;
            return;
        }
        const labeled = entries
            .filter(entry => entry.shownWhen())
            .map(entry => ({ entry, title: entry.label() }))
            .filter(({ title }) => title !== undefined);
        const selected = labeled.find(({ entry }) => entry.name === entryToSelect);
        entryToSelect = null;
        // Array sort is stable: items sharing a slot keep their order.
        const placed = [
            ...labeled.map(({ entry, title }) => {
                const item = { title, cmd: entry.cmd };
                if (entry.hasSubmenu) item.hasSubmenu = true;
                if (entry.radioWhen()) item.radio = true;
                return { item, position: entry.position };
            }),
            ...ev.items
                .filter(item => !isSeparator(item) && !isFilterItem(item, host) && !filterPicker.isGroupItem(item))
                .map(item => ({ item: withMainMenuTitle(item), position: nativePositionOf(item.cmd) })),
        ].sort((a, b) => comparePositions(a.position, b.position));
        const items = [];
        placed.forEach(({ item, position }, index) => {
            if (index > 0 && placed[index - 1].position.section !== position.section) items.push({ cmd: SEPARATOR_CMD });
            items.push(item);
        });
        if (selected) for (const item of items) item.selected = item.cmd === selected.entry.cmd;
        ev.items = items;
        // PinballY ignores edits to ev.items unless menuUpdated is set.
        ev.menuUpdated = true;
    }));

    // Fires on every command; async because an action may animate the
    // wheel, so its rejections are logged too.
    host.on("command", safeHandler(SCRIPT_NAME, async ev => {
        const entry = entries.find(item => item.cmd === ev.id);
        if (entry) await entry.action();
    }));

    // filterPicker: back() out of the Filter Picker, for a Drawn one's Exit;
    // entryCmd and activeFilterName(), for the Drawn main menu's footer.
    return { add, showFilterWhen, reopenOn, filterPicker };
}

let sharedMainMenu = null;

// One main menu for every Add-on, so their entries are ordered together.
export function getMainMenu() {
    if (!sharedMainMenu) sharedMainMenu = createMainMenu(createPinballYHost());
    return sharedMainMenu;
}
