// ============================================================
// The Add-on switch on the fake host, as a caller other than the eXpansion
// Pack Settings uses it: an Add-on saved off under the caller's own name,
// then "Restart now / Later"; a failed write shows "Setting not saved" and
// never reaches the restart question.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createAddOnSwitch } from "../../common/settings/add_on_switch.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";

// Menus that only record what they were asked to show.
function start() {
    const fake = createFakePinballYHost();
    const shown = [];
    const menus = { show: (id, items, options) => shown.push({ id, items, options }) };
    const addOnSwitch = createAddOnSwitch(fake, null, () => menus, { scriptName: "Caller", idPrefix: "caller" });
    const titles = () => shown[shown.length - 1].items.filter(item => item.title).map(item => item.title);
    const choose = title => fake.fire("command", { id: shown[shown.length - 1].items.find(item => item.title === title).cmd });
    return { fake, shown, addOnSwitch, titles, choose };
}

test("an Add-on saved off is written under the caller's name, then Restart now restarts PinballY", () => {
    const { fake, shown, addOnSwitch, titles, choose } = start();
    fake.addFile(ENV_LOCAL, "ADD_ON_CLOCK=true\r\n");
    let later = 0;

    addOnSwitch.saveAddOn("clock", false, {
        onSaved: () => addOnSwitch.askRestart(() => { later++; }),
        reopen: () => assert.fail("the save did not fail"),
    });

    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_CLOCK=false\r\n");
    assert.ok(fake.logLines().includes("[Caller] Saved ADD_ON_CLOCK=false in .env.local."));
    assert.equal(shown[shown.length - 1].id, "callerRestart");
    assert.deepEqual(titles(), ["The saved settings apply when PinballY restarts.", "Restart now", "Later"]);

    choose("Restart now");
    assert.equal(fake.restartsAsked(), 1);
    assert.ok(fake.logLines().includes("[Caller] Restart asked."));
    assert.equal(later, 0);
});

test("Later and Exit both run what the caller gave", () => {
    const { fake, shown, addOnSwitch } = start();
    let later = 0;

    addOnSwitch.askRestart(() => { later++; });
    shown[0].options.onBack();

    assert.equal(later, 1);
    assert.equal(fake.restartsAsked(), 0);
});

test("a write that fails shows \"Setting not saved\", then what the caller reopens, never the restart question", () => {
    const { fake, shown, addOnSwitch, titles } = start();
    fake.addFile(ENV_LOCAL, "ADD_ON_CLOCK=true\r\n");
    fake.lockFile(ENV_LOCAL);
    let reopened = 0;

    addOnSwitch.saveAddOn("clock", false, {
        onSaved: () => assert.fail("nothing was saved"),
        reopen: () => { reopened++; },
    });

    assert.equal(shown.length, 1);
    assert.equal(shown[0].id, "callerNotSaved");
    assert.deepEqual(titles(), ["Setting not saved", "OK"]);
    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_CLOCK=true\r\n");
    shown[0].options.onBack();
    assert.equal(reopened, 1);
});
