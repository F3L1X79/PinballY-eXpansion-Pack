// ============================================================
// World Tour on a wheel showing an unconfigured table, through main.js: the
// table is never required, stays selectable and neither counts nor starts the
// tour over. Each case tours with its own Profile, the flag being for good.
// - The fake's own wheel leaves such tables out: setWheelTables() puts them on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 9, 1, 20, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

const table = (id, title, extra = {}) => ({ id, configId: title, title, manufacturer: "", year: 0, categories: [], isHidden: false, isConfigured: true, ...extra });
const ADDAMS = "Addams Family";
const BLACK_KNIGHT = "Black Knight";
const CYCLONE = "Cyclone";
const BACKUP = "Backup Table";
const TABLES = [table(1, ADDAMS), table(2, BLACK_KNIGHT), table(3, CYCLONE), table(4, BACKUP, { isConfigured: false })];

test("the World Tour counts only the configured tables of a wheel that shows an unconfigured one", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    for (const name of ["Alice", "Bob", "Carol"]) fake.addFolder(`${PROFILES}\\${name}`);
    fake.setWheelTables([ADDAMS, BLACK_KNIGHT, CYCLONE, BACKUP], { filterId: "All" });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["achievements"].includes(key);
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    const store = getProfileStore();
    const worldTourToasts = () => toastDrawings(fake).filter(drawing => drawing.texts.includes(lang.achievements.worldTourTitle()));
    const worldTourOf = profile => JSON.parse(fake.readFile(`${PROFILES}\\${profile}\\profile.json`) ?? "{}").worldTour;
    // The player moves the wheel straight to this table.
    const select = title => fake.moveWheel(fake.getWheelTables().findIndex(game => game.title === title));
    const switchWithWheel = (profile, wheel) => {
        fake.setWheelTables(wheel);
        store.switchTo(profile);
    };

    // From Addams Family, the unconfigured table never selected.
    select(BLACK_KNIGHT);
    assert.equal(worldTourToasts().length, 0, "Cyclone is still missing");
    select(CYCLONE);
    assert.equal(worldTourToasts().length, 1, "the unconfigured table is not required");
    assert.equal(worldTourOf("guest"), true);

    // From the unconfigured table, which stays selectable halfway.
    switchWithWheel("Alice", [BACKUP, ADDAMS, BLACK_KNIGHT, CYCLONE]);
    select(BLACK_KNIGHT);
    select(CYCLONE);
    select(BACKUP);
    assert.equal(worldTourOf("Alice"), undefined, "Addams Family is still missing: the start and the unconfigured table add nothing");
    select(ADDAMS);
    assert.equal(worldTourOf("Alice"), true, "selecting the unconfigured table kept the tables already seen");

    // One configured table and one unconfigured: a single table is no tour.
    switchWithWheel("Bob", [BACKUP, ADDAMS]);
    select(ADDAMS);
    select(BACKUP);
    select(ADDAMS);
    assert.equal(worldTourOf("Bob"), undefined, "a wheel of one configured table is no tour");

    // Cyclone stops being configured halfway, staying on the wheel: as for
    // any change of the wheel's contents, the tour starts over at the next
    // selection, on the tables still to be seen.
    switchWithWheel("Carol", [ADDAMS, BLACK_KNIGHT, CYCLONE, BACKUP]);
    select(BLACK_KNIGHT);
    fake.setTables(TABLES.map(game => (game.title === CYCLONE ? { ...game, isConfigured: false } : game)));
    fake.setWheelTables([BLACK_KNIGHT, CYCLONE, BACKUP, ADDAMS]);
    select(ADDAMS);
    assert.equal(worldTourOf("Carol"), undefined, "the tables seen before the change no longer count");
    select(BLACK_KNIGHT);
    assert.equal(worldTourOf("Carol"), true, "Cyclone no longer has to be seen");

    assertNoErrorLogged(fake);
});
