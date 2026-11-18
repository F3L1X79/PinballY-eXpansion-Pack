// ============================================================
// My High Scores: a ranked Pack Filter under the Hall of Fame putting on the
// wheel the tables where the active Profile holds a place, best place first.
// Runs again on a credited Play, a Profile switch and a Profile Reset.
// - Its entry shows only while there are some, checked at each opening.
// ============================================================

import lang from "../core/i18n.js";
import { createPackFilter } from "../tables/pack_filter.js";
import { safeHandler } from "../core/safe_handler.js";
import { tablesVisibleTo } from "../tables/visible_tables.js";
import { SCRIPT_NAME } from "./high_score_store.js";

// The Hall of Fame has sort key "6000" and PinballY's
// "Favorites" filter "7000" in the [Top] group.
const UNDER_HALL_OF_FAME_SORT_KEY = "6500";

export function createMyHighScores(host, { highScores, profileStore, mainMenu }) {
    const selectConfigIds = () => {
        const visible = new Map(tablesVisibleTo(host.getVisibleTables(), profileStore).map(game => [game.configId, game]));
        return highScores.placesHeldBy(profileStore.getActiveProfile().name)
            .filter(({ configId }) => visible.has(configId))
            .sort((a, b) => a.bestPlace - b.bestPlace
                || visible.get(a.configId).title.localeCompare(visible.get(b.configId).title))
            .map(({ configId }) => configId);
    };
    // Fires after any change of a Profile's data. The spec asks for the
    // check after a reset of the active Profile, like the Hall of Fame's;
    // its places stay its own (see the store), so it moves nothing today.
    const onActiveProfileReset = listener => profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (isReset && profileName === profileStore.getActiveProfile().name) listener();
    }));
    const { filterId } = createPackFilter(host, {
        scriptName: SCRIPT_NAME,
        id: "project.MyHighScores",
        title: lang.customMenuLabels.myHighScoresFilter,
        group: "[Top]",
        sortKey: UNDER_HALL_OF_FAME_SORT_KEY,
        ranked: true,
        selectConfigIds,
        runAgainOn: [highScores.onCredited, profileStore.onSwitch, onActiveProfileReset],
    });
    mainMenu.showFilterWhen(filterId, () => selectConfigIds().length > 0);
}
