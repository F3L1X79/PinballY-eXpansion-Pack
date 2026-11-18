// ============================================================
// The Pack Filter over the fake host, with its own Wheel Order: an unranked
// selection follows the Wheel Order and pages with it, a ranked one keeps its
// ranking; it runs again only when its tables changed, and an empty one gives
// way to All Tables through the Wheel Order unless always in the menu. packFilterSortOf tells its paging.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createWheelOrder } from "../../common/tables/wheel_order.js";
import { createPackFilter, packFilterSortOf, PACK_FILTER_PAGINGS } from "../../common/tables/pack_filter.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const table = (title, year) => ({ id: title, configId: title, title, year, manufacturer: "Williams", isConfigured: true });
const TABLES = [
    table("Medieval Madness", 1997),
    table("Space Trip", undefined),
    table("Black Knight", 1980),
    table("Attack from Mars", 1995),
    table("Eight Ball", 1977),
    table("Godzilla", 2021),
];
const FILTER_ID = "User.project.TestSelection";

// selected: the config ids the selection gives, read at each run.
function setUp({ ranked = false, selected = TABLES.map(game => game.configId), ...options } = {}) {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 18, 20, 0, 0), tables: TABLES });
    // No table selected yet: the filter then shows its tables from its first one.
    fake.setWheelTables([], { filterId: "Favorites" });
    const wheelOrder = createWheelOrder(fake, createProfileStore(fake), { isEnabled: true });
    const selection = { configIds: selected, reads: 0 };
    const reruns = [];
    const packFilter = createPackFilter(fake, {
        scriptName: "Test",
        wheelOrder,
        id: "project.TestSelection",
        title: "Test Selection",
        group: "[Top]",
        sortKey: "5000",
        ranked,
        ...options,
        selectConfigIds: () => {
            selection.reads += 1;
            return selection.configIds;
        },
        runAgainOn: [listener => { reruns.push(listener); }],
    });
    return { fake, wheelOrder, selection, packFilter, runAgain: () => reruns.forEach(listener => listener()) };
}

const wheelTitles = fake => fake.getWheelTables().map(game => game.title);
const pressNextPage = (fake, times) => {
    const reached = [];
    for (let press = 0; press < times; press += 1) {
        fake.pressPageButton("NextPage");
        reached.push(fake.getCurrentTable().title);
    }
    return reached;
};

test("an unranked selection follows the Wheel Order: alphabetical, then by year paged by decade", () => {
    const { fake, wheelOrder, packFilter } = setUp({
        selected: ["Medieval Madness", "Space Trip", "Black Knight", "Attack from Mars", "Eight Ball"],
    });

    fake.setCurrentFilter(packFilter.filterId);
    assert.deepEqual(wheelTitles(fake), ["Attack from Mars", "Black Knight", "Eight Ball", "Medieval Madness", "Space Trip"]);

    wheelOrder.toggle();
    // From Attack from Mars, still selected: Eight Ball (1977) first, Space Trip (no year) last.
    assert.deepEqual(wheelTitles(fake), ["Attack from Mars", "Medieval Madness", "Space Trip", "Eight Ball", "Black Knight"]);
    // Medieval Madness (1997) shares the 1990s with Attack from Mars (1995): no stop of its own.
    assert.deepEqual(pressNextPage(fake, 4), ["Space Trip", "Eight Ball", "Black Knight", "Attack from Mars"]);
    assert.equal(packFilterSortOf(FILTER_ID).paging, PACK_FILTER_PAGINGS.WHEEL_ORDER);
    assertNoErrorLogged(fake);
});

test("a ranked selection keeps its ranking whatever the Wheel Order, one page stop per table", () => {
    const ranking = ["Space Trip", "Godzilla", "Attack from Mars"];
    const { fake, wheelOrder, packFilter } = setUp({ ranked: true, selected: ranking });

    fake.setCurrentFilter(packFilter.filterId);
    assert.deepEqual(wheelTitles(fake), ranking);

    wheelOrder.toggle();
    assert.deepEqual(wheelTitles(fake), ranking, "by year too");
    assert.deepEqual(pressNextPage(fake, 3), ["Godzilla", "Attack from Mars", "Space Trip"]);
    assert.equal(packFilterSortOf(FILTER_ID).paging, PACK_FILTER_PAGINGS.RANKED);
    assert.equal(packFilterSortOf("All"), null, "not a pack filter");
    assertNoErrorLogged(fake);
});

test("it runs again only when its tables changed, on a return to the wheel or a runAgainOn event", () => {
    const { fake, selection, packFilter, runAgain } = setUp({ selected: ["Godzilla", "Eight Ball", "Black Knight"] });
    fake.setCurrentFilter(packFilter.filterId);
    fake.moveWheel(1);

    fake.fire("wheelmode");
    runAgain();
    assert.equal(fake.getCurrentTable().title, "Eight Ball", "the same tables: the wheel stays where it was");

    selection.configIds = ["Godzilla", "Eight Ball"];
    runAgain();
    assert.deepEqual(wheelTitles(fake), ["Eight Ball", "Godzilla"]);

    selection.configIds = ["Godzilla"];
    fake.fire("wheelmode");
    assert.deepEqual(wheelTitles(fake), ["Godzilla"]);
    assertNoErrorLogged(fake);
});

test("emptied, it gives way to All Tables through the Wheel Order: its sorted copy while by year", () => {
    const { fake, wheelOrder, selection, packFilter } = setUp({ selected: ["Godzilla"] });
    wheelOrder.start({ copyTitle: "By year" });
    wheelOrder.toggle();
    fake.setCurrentFilter(packFilter.filterId);

    selection.configIds = [];
    fake.fire("wheelmode");

    assert.equal(fake.currentFilterId(), "User.project.WheelOrder");
    assert.equal(wheelOrder.getChosenFilterId(), "All");
    assertNoErrorLogged(fake);
});

test("always in the menu, it waits for a runAgainOn event, not a return to the wheel, and stays empty", () => {
    const { fake, packFilter, selection, runAgain } = setUp({ selected: ["Godzilla", "Eight Ball"], alwaysInMenu: true });
    fake.setCurrentFilter(packFilter.filterId);

    selection.configIds = ["Godzilla"];
    fake.fire("wheelmode");
    assert.deepEqual(wheelTitles(fake), ["Eight Ball", "Godzilla"], "unchanged on the return to the wheel");

    runAgain();
    assert.deepEqual(wheelTitles(fake), ["Godzilla"]);

    selection.configIds = [];
    runAgain();
    assert.equal(fake.currentFilterId(), FILTER_ID);
    assert.deepEqual(wheelTitles(fake), []);
    assertNoErrorLogged(fake);
});

test("another filter shown is left alone", () => {
    const { fake, selection, runAgain } = setUp({ selected: ["Godzilla"] });
    selection.configIds = [];

    runAgain();
    fake.fire("wheelmode");

    assert.equal(fake.currentFilterId(), "Favorites");
    assert.equal(selection.reads, 0);
});
