// ============================================================
// Filter Picker: the submenu that takes the wheel selections and filter
// groups out of the main menu, with Add-ons' entries before Back, run at once
// or opening a page of their own. Created by the main menu module; its entry
// names the chosen filter. Listens to
// "menuopen", "menuclose", "command", "attractmodestart" and "filterselect".
// - Shown by turning a main menu opening into it, not with showMenu (no "menuopen").
// - Back and Exit go up one level at a time (see docs/adr/0013).
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import lang from "../core/i18n.js";
import { SEPARATOR_CMD } from "./menu_separator.js";
import { translateMenuTitle } from "./menu_title_translation.js";
import { createNativeMenus } from "../drawn_menu/drawn_menu.js";

const SCRIPT_NAME = "FilterPicker";

export const FILTER_PICKER_MENU_ID = "filter picker";
const FILTER_PICKER_ENTRY = "filterPicker";

// PinballY's filter groups: the main menu command opening each group's
// menu, and that menu's id.
export const FILTER_GROUPS = Object.freeze([
    { command: "FilterByEra", menuId: "filter by era" },
    { command: "FilterByManufacturer", menuId: "filter by manuf" },
    { command: "FilterBySystem", menuId: "filter by system" },
    { command: "FilterByCategory", menuId: "filter by category" },
    { command: "FilterByRating", menuId: "filter by rating" },
    { command: "FilterByRecency", menuId: "filter by when played" },
    { command: "FilterByAdded", menuId: "filter by when added" },
]);

// The main menu module's: addMainMenuEntry adds the entry at position and
// returns its command;
// reopenMainMenuOn(name) opens the main menu with the cursor on an entry;
// chosenFilter() is the Wheel Order module's getChosenFilter.
// getMenus() returns what shows an entry's page (the Drawn Menu module's).
export function createFilterPicker(host, { addMainMenuEntry, position, reopenMainMenuOn, chosenFilter, getMenus = null }) {
    const groupCmds = FILTER_GROUPS.map(group => host.getBuiltInCommand(group.command));
    const groupCmdOfMenu = id => {
        const index = FILTER_GROUPS.findIndex(group => group.menuId === id);
        return index === -1 ? null : groupCmds[index];
    };
    const isGroupItem = item => groupCmds.includes(item.cmd);
    const backCmd = host.allocateCommand("filterPickerBack");
    const menuReturnCmd = host.getBuiltInCommand("MenuReturn");
    // The Add-ons' entries just before Back, in the order added:
    // { label(), cmd, action, page }.
    const extraEntries = [];
    // The choices of the pages, each with its command: { cmd, isCurrent(), action }.
    const pageChoices = [];
    // What shows the pages, resolved on the first one shown: the Drawn Menus
    // are created after the main menu (common/drawn_menu/drawn_menu.js).
    let pageMenus = null;
    const menusForPages = () => {
        if (!pageMenus) pageMenus = getMenus ? getMenus() : createNativeMenus(host);
        return pageMenus;
    };
    // Set when the next main menu opening shows the Filter Picker instead:
    // { selectedCmd }, the item the cursor goes to (null for the first).
    let opening = null;
    // The group whose menu was opened from the Filter Picker, while it
    // shows: a Drawn group menu goes back by opening the main menu again,
    // which then shows the Filter Picker on that group.
    let openedGroupCmd = null;
    // Whether the last main menu opening had a selection or a group to list.
    let hasItems = false;
    // The level shown as a native menu: { id, up, chosen }. up goes one
    // level up; chosen is set once an entry other than MenuReturn is
    // picked, for the menu then closes on its own (a filter applied).
    let shownLevel = null;

    // Opens the Filter Picker with the cursor on this item (null: the first).
    function open(selectedCmd) {
        opening = { selectedCmd };
        host.doCommand(host.getBuiltInCommand("ShowMainMenu"));
    }

    // Back out of the Filter Picker, to the main menu on its entry.
    function back() {
        reopenMainMenuOn(FILTER_PICKER_ENTRY);
    }

    // The chosen filter as the menus show it: PinballY's English titles
    // through the pack's menu translation, a pack filter's as it is.
    function chosenFilterName() {
        const { title } = chosenFilter();
        return translateMenuTitle(title) ?? title;
    }

    // Turns this main menu opening into the Filter Picker. The group holding
    // the chosen filter is marked, set on each group so a mark PinballY may
    // put on them itself is never doubled; the selections keep PinballY's,
    // except while the Wheel Order's copy stands in: PinballY then marks none.
    function show(ev, selections, groups, selectedCmd) {
        const chosen = chosenFilter();
        const markedSelections = chosen.isStandIn
            ? selections.map(item => Object.assign({}, item, { radio: item.cmd === chosen.cmd }))
            : selections;
        const sections = [
            markedSelections,
            groups.map(item => Object.assign({}, item, { radio: item.cmd === chosen.groupCmd })),
        ].filter(items => items.length > 0);
        const extraItems = extraEntries
            .map(entry => Object.assign({ title: entry.label(), cmd: entry.cmd }, entry.page ? { hasSubmenu: true } : {}))
            .filter(item => item.title !== undefined);
        ev.id = FILTER_PICKER_MENU_ID;
        ev.items = [
            ...sections.flatMap(items => [...items, { cmd: SEPARATOR_CMD }]),
            ...extraItems,
            { title: lang.customMenuLabels.filterPickerBack, cmd: backCmd },
        ].map(item => (item.cmd === SEPARATOR_CMD ? item : Object.assign({}, item, { selected: item.cmd === selectedCmd })));
        ev.menuUpdated = true;
        shownLevel = { id: FILTER_PICKER_MENU_ID, up: back, chosen: false };
    }

    // Called by the main menu module on each main menu opening, with the
    // selections it shows this time: turns it into the Filter Picker when
    // one was asked for, and returns whether it did.
    function mainMenuOpened(ev, selections) {
        const groups = ev.items.filter(isGroupItem);
        const selectedCmd = opening ? opening.selectedCmd : openedGroupCmd;
        hasItems = selections.length > 0 || groups.length > 0;
        const takesOver = (opening !== null || openedGroupCmd !== null) && hasItems;
        opening = null;
        openedGroupCmd = null;
        shownLevel = null;
        if (takesOver) show(ev, selections, groups, selectedCmd);
        return takesOver;
    }

    // Fires when any menu opens; the main menu's openings come through
    // mainMenuOpened instead.
    host.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === "main" || ev.id === FILTER_PICKER_MENU_ID) return;
        const groupCmd = groupCmdOfMenu(ev.id);
        const fromFilterPicker = groupCmd !== null && groupCmd === openedGroupCmd;
        shownLevel = fromFilterPicker ? { id: ev.id, up: () => open(groupCmd), chosen: false } : null;
        if (groupCmd === null) openedGroupCmd = null;
    }));

    const entryCmd = addMainMenuEntry({
        name: FILTER_PICKER_ENTRY,
        label: () => lang.customMenuLabels.activeFilter(chosenFilterName()),
        position,
        action: () => open(null),
        shownWhen: () => hasItems,
        hasSubmenu: true,
    });

    // Fires on every command; a group command comes from the Filter Picker,
    // the only menu listing the groups.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (shownLevel && ev.id !== menuReturnCmd) shownLevel.chosen = true;
        const extraEntry = extraEntries.find(entry => entry.cmd === ev.id);
        const pageChoice = pageChoices.find(choice => choice.cmd === ev.id);
        if (ev.id === backCmd) back();
        else if (groupCmds.includes(ev.id)) openedGroupCmd = ev.id;
        else if (extraEntry && extraEntry.page) showPage(extraEntry);
        else if (extraEntry) extraEntry.action();
        else if (pageChoice && !pageChoice.isCurrent()) pageChoice.action();
    }));

    // An entry's page, the cursor on its current choice. A native one goes
    // up through its "menuclose" (shownLevel), a Drawn one through onBack;
    // shownLevel is set before the Filter Picker's own "menuclose" follows.
    function showPage(entry) {
        const { id, title, choices } = entry.page;
        const up = () => open(entry.cmd);
        const choiceItems = choices.map(choice => {
            const current = choice.isCurrent();
            return { title: choice.label, cmd: choice.cmd, radio: current, selected: current };
        });
        shownLevel = { id, up, chosen: false };
        menusForPages().show(id, [
            { title, cmd: SEPARATOR_CMD },
            { cmd: SEPARATOR_CMD },
            ...choiceItems,
            { cmd: SEPARATOR_CMD },
            { title: lang.customMenuLabels.filterPickerBack, cmd: menuReturnCmd },
        ], { onBack: up });
    }

    // An Add-on's entry, just before Back; label: a function returning its
    // text on each opening (undefined leaves it out), action: run when
    // chosen, the menus then closing as for a filter. Or, with page, the
    // entry opens a page of its own: { title, choices: [{ name, label,
    // isCurrent(), action }] }, a choice's action run only when it is not
    // the current one, the menus then closing as for a filter.
    function addEntry({ name, label, action = null, page = null }) {
        const cmd = host.allocateCommand(name);
        const shownPage = page && {
            id: `${FILTER_PICKER_MENU_ID} ${name}`,
            title: page.title,
            choices: page.choices.map(choice => {
                const pageChoice = {
                    label: choice.label,
                    cmd: host.allocateCommand(choice.name),
                    isCurrent: safeHandler(SCRIPT_NAME, choice.isCurrent),
                    action: choice.action,
                };
                pageChoices.push(pageChoice);
                return pageChoice;
            }),
        };
        extraEntries.push({ label: safeHandler(SCRIPT_NAME, label), cmd, action, page: shownPage });
    }

    // Fires when any menu closes, after the "menuopen" of a menu shown in
    // its place. A native level closed with nothing chosen and no menu in
    // its place was left by Exit or MenuReturn, which in PinballY only
    // close it (PinballY's group menus end with a MenuReturn entry): go
    // one level up instead. Attract mode closes the menus too.
    host.on("menuclose", safeHandler(SCRIPT_NAME, ev => {
        if (groupCmdOfMenu(ev.id) !== null) openedGroupCmd = null;
        if (!shownLevel || shownLevel.id !== ev.id) return;
        const { up, chosen } = shownLevel;
        shownLevel = null;
        if (!chosen && host.getUIMode() !== "attract") up();
    }));

    // Fires when the cabinet sits idle, closing any menu.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, () => {
        opening = null;
        openedGroupCmd = null;
        shownLevel = null;
    }));

    // Fires when the player picks a filter, which closes the menus (a Drawn
    // group menu has no "menuclose" to say so).
    host.onGameListEvent("filterselect", safeHandler(SCRIPT_NAME, () => {
        openedGroupCmd = null;
    }));

    return { isGroupItem, mainMenuOpened, back, entryCmd, chosenFilterName, addEntry };
}
