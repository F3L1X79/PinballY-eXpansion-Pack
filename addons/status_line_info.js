// ============================================================
// Fills PinballY's two status lines after the player's own messages: a
// welcome on the upper line, rotating info on the selected table on the
// lower one, with its Household Rating while Profile Ratings is on. Refreshes
// on "gameselect", "filterselect", "wheelmode", a Profile switch and a rating.
// - The slot count is fixed at startup: adding or removing messages later made PinballY unstable.
// - No slot is ever empty: PinballY shows an empty message as a blank line (#469).
// - "Table n/total" comes from the shared Wheel places; left out while the Wheel Position shows it.
// ============================================================

import lang from "../common/core/i18n.js";
import config from "../common/core/config.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { displayNameOf } from "../common/profiles/profile_name.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { createHouseholdRatings } from "../common/profiles/household_ratings.js";
import { ratingOf, onRatingDialogClosed } from "../common/profiles/profile_ratings.js";
import { getWheelPlaces } from "../common/tables/wheel_places.js";
import { isWheelPositionOn } from "../common/wheel_guides/wheel_position.js";

const SCRIPT_NAME = "StatusLineInfo";
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

// Each lower status line message as (position, ...values), without its
// position while the Wheel Position shows it.
function lowerStatusLineTexts() {
    if (!isWheelPositionOn(config)) return lang.tableInfoStatusLines;
    return Object.fromEntries(Object.entries(lang.tableInfoStatusLinesNoPosition)
        .map(([key, message]) => [key, (_position, ...values) => message(...values)]));
}

export default function init() {
    const LOWER_STATUS_LINE_TEXT = lowerStatusLineTexts();
    const UPPER_STATUS_LINE_TEXT = lang.upperStatusLines;
    const COMMUNITY_MANUFACTURER_NAME = config.communityTablesManufacturer;
    const profileStore = getProfileStore();
    const host = createPinballYHost();
    const wheelPlaces = getWheelPlaces();
    // PinballY's ratings are the active Profile's only while Profile Ratings is on.
    const householdRatings = config.addOns.profileRatings !== false
        ? createHouseholdRatings(host, { profileStore })
        : null;

    function householdRatingText(position, game) {
        const household = game ? householdRatings.of(game) : null;
        if (household) return LOWER_STATUS_LINE_TEXT.householdRating(position, household.average, household.count);
        const ownRating = game ? ratingOf(game) : null;
        return ownRating !== null
            ? LOWER_STATUS_LINE_TEXT.yourRating(position, ownRating)
            : LOWER_STATUS_LINE_TEXT.noRating(position);
    }

    // PinballY's [Game.PlayCount] and [Game.PlayTime] would show its own
    // figures, shared by every Profile: the active Profile's are written out.
    const LOWER_STATUS_LINE_BUILDERS = [
        position => LOWER_STATUS_LINE_TEXT.year(position),
        (position, game) => game && game.manufacturer === COMMUNITY_MANUFACTURER_NAME
            ? LOWER_STATUS_LINE_TEXT.manufacturerFictional(position)
            : LOWER_STATUS_LINE_TEXT.manufacturer(position),
        (position, _game, play) => LOWER_STATUS_LINE_TEXT.playCount(position, play.count),
        (position, _game, play) => {
            const totalMinutes = Math.floor(play.seconds / SECONDS_PER_MINUTE);
            return LOWER_STATUS_LINE_TEXT.playTime(position,
                Math.floor(totalMinutes / MINUTES_PER_HOUR), totalMinutes % MINUTES_PER_HOUR);
        },
        ...(householdRatings ? [householdRatingText] : []),
    ];

    // Only the welcome depends on the active Profile.
    const buildUpperStatusLineTexts = profile => [
        UPPER_STATUS_LINE_TEXT.welcome(displayNameOf(profile)),
        UPPER_STATUS_LINE_TEXT.tablesAvailable,
        UPPER_STATUS_LINE_TEXT.launchHint,
        UPPER_STATUS_LINE_TEXT.browseHint,
        UPPER_STATUS_LINE_TEXT.signOff,
    ];

    const upperSlots = createSlots(mainWindow.statusLines.upper,
        buildUpperStatusLineTexts(profileStore.getActiveProfile()).length);
    const lowerSlots = createSlots(mainWindow.statusLines.lower, LOWER_STATUS_LINE_BUILDERS.length);

    function refreshLowerStatusLine() {
        const currentGame = gameList.getWheelGame(0);
        const position = wheelPlaces.placeOf(currentGame);
        const play = profileStore.getPlay(currentGame ? currentGame.configId : "");

        lowerSlots.setTexts(LOWER_STATUS_LINE_BUILDERS.map(buildText => buildText(position, currentGame, play)));
    }

    function refreshUpperStatusLine() {
        upperSlots.setTexts(buildUpperStatusLineTexts(profileStore.getActiveProfile()));
    }

    // A filter change (category, manufacturer, era, etc.) swaps out the entire
    // set of games the wheel shows. The filterselect event fires slightly
    // BEFORE PinballY's internal wheel data actually reflects the new filter,
    // so querying gameList synchronously here would still see the old list —
    // deferring by one tick lets the switch complete first.
    // The deferred callback runs outside the listener's call stack, so it is
    // guarded separately from the listener itself.
    function rebuildLowerStatusLineNextTick() {
        setTimeout(safeHandler(SCRIPT_NAME, () => {
            wheelPlaces.markChanged();
            refreshLowerStatusLine();
        }), 0);
    }

    gameList.on("filterselect", safeHandler(SCRIPT_NAME, rebuildLowerStatusLineNextTick));

    gameList.on("gameselect", safeHandler(SCRIPT_NAME, refreshLowerStatusLine));
    // Back on the wheel after a game, whose play the Profile store recorded on "gameover".
    mainWindow.on("wheelmode", safeHandler(SCRIPT_NAME, refreshLowerStatusLine));
    // The welcome follows a switch at once. The table info is deferred and
    // rebuilt like a filter change: a switch can re-run the Hall of Fame
    // filter, which then shows other tables.
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => {
        refreshUpperStatusLine();
        rebuildLowerStatusLineNextTick();
    }));
    // Next tick, in case the column takes the new value only after.
    onRatingDialogClosed(host, safeHandler(SCRIPT_NAME, rebuildLowerStatusLineNextTick));

    refreshUpperStatusLine();
    // Next tick with the Household Rating: the Profile Ratings Add-on starts
    // later, and its first run gives every Profile its Ratings.
    if (householdRatings) rebuildLowerStatusLineNextTick();
    else refreshLowerStatusLine();
}

// The Add-on's slots on one status line, after the player's own messages: the
// non-temporary entries already on the line at start-up. PinballY's show()
// inserts a temporary entry just after the current one and removes it once
// shown, which shifts the indexes: the slots are counted among the
// non-temporary entries only, at each write.
function createSlots(statusLine, slotCount) {
    const firstSlot = statusLine.getText().filter(entry => !entry.isTemp).length;
    for (let i = 0; i < slotCount; i++) {
        statusLine.add("");
    }

    function findSlotIndexes() {
        return statusLine.getText()
            .map((entry, index) => (entry.isTemp ? -1 : index))
            .filter(index => index >= 0)
            .slice(firstSlot, firstSlot + slotCount);
    }

    return {
        setTexts(texts) {
            const slotIndexes = findSlotIndexes();
            texts.forEach((text, i) => statusLine.setText(slotIndexes[i], text));
        },
    };
}