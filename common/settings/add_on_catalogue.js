// ============================================================
// The Add-on catalogue: every key of config.addOns in its group, grouped and
// ordered as in .env.example. Each group's heading is
// lang.expansionPackSettings.groups[group], each Add-on's name
// lang.expansionPackSettings.addOns[key].name. No side effects.
// - A new Add-on goes here too: tests/settings/add_on_catalogue.test.js fails until it does.
// ============================================================

export const ADD_ON_GROUPS = Object.freeze([
    {
        group: "playersAndProgress",
        addOns: ["profilePicker", "profileRatings", "startupChoicePrompt", "achievements", "sessionStatsTracker", "challenges", "tableMastery", "highScores"],
    },
    { group: "wheelScreen", addOns: ["statusLineInfo", "clock", "statusIcons", "wheelArc"] },
    {
        group: "menusAndFilters",
        addOns: ["uiTranslation", "drawnMenus", "customMenuCommands", "randomGame", "rocketGame", "hallOfFame", "tablesToDiscover", "hiddenTables", "customFilter", "wheelOrder", "menuCleanup"],
    },
    { group: "launchingAndPlaying", addOns: ["forceBackglass", "backglassClock", "discordRichPresence", "seamlessLaunchOverlay", "playLaunchSound", "ratingPrompt", "tableRoms"] },
    { group: "debugging", addOns: ["launchEventsTrace"] },
]);
