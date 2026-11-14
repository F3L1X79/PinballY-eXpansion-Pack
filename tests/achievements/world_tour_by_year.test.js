// ============================================================
// World Tour Achievement by year, through main.js: with the Wheel Order
// saved as by year, the sorted copy stands in for All Tables, and selecting
// every table in one go still unlocks the World Tour.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const table = (title, year) => ({ id: title, configId: title, title, year, manufacturer: "", categories: [], isHidden: false });
const TABLES = [table("Addams Family", 1992), table("Black Knight", 1980), table("Cyclone", 1988), table("Dracula", 1993)];

test("by year on All Tables, selecting every table unlocks the World Tour", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "guest", wheelOrder: "byYear" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["achievements", "wheelOrder"].includes(key);
    config.language = "en";
    await import("../../main.js");
    await settle();
    // profile.json is only written once something is saved for the Profile.
    const worldTour = () => {
        const profile = fake.readFile(`${PROFILES}\\guest\\profile.json`);
        return profile === undefined ? undefined : JSON.parse(profile).worldTour;
    };

    assert.equal(fake.currentFilterId(), "User.project.WheelOrder");
    fake.moveWheel(1);
    fake.moveWheel(1);
    assert.notEqual(worldTour(), true, "Black Knight is still missing");

    fake.moveWheel(1);
    assert.equal(worldTour(), true);
    assertNoErrorLogged(fake);
});
