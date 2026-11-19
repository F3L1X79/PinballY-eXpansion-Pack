// ============================================================
// The Add-on catalogue: every key of config.addOns in its group, grouped and
// ordered as in .env.example. Each group's heading is
// lang.expansionPackSettings.groups[group], each Add-on's name
// lang.expansionPackSettings.addOns[key].name. No side effects.
// - A new Add-on goes here too: tests/settings/add_on_catalogue.test.js fails until it does.
// - Launch events trace is left out on purpose: a .env.local setting only, never on the menu.
// ============================================================

export const ADD_ON_GROUPS = Object.freeze([
    {
        group: "playersAndProgress",
        addOns: ["profilePicker", "profileRatings", "startupChoicePrompt", "achievements", "sessionStatsTracker", "challenges", "tableMastery", "highScores"],
    },
    { group: "wheel", addOns: ["statusLineInfo", "clock", "statusIcons", "wheelArc", "wheelGuides", "wheelOrder"] },
    { group: "menus", addOns: ["uiTranslation", "drawnMenus", "menuCleanup", "customMenuCommands", "randomGame", "rocketGame"] },
    { group: "filters", addOns: ["hallOfFame", "tablesToDiscover", "hiddenTables", "customFilter"] },
    { group: "launchingAndPlaying", addOns: ["forceBackglass", "backglassClock", "discordRichPresence", "seamlessLaunchOverlay", "playLaunchSound", "ratingPrompt", "tableRoms"] },
]);
