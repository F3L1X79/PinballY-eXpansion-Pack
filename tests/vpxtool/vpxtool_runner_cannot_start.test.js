// ============================================================
// Shared vpxtool runner when vpxtool cannot even start, through main.js on
// the fake PinballY globals with Table ROMs off: one error under the
// submitting Add-on's name, no run until a Script Reader install ends,
// then the runs left go on in order.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, VPXTOOL } from "../table_roms/table_roms_scenario.js";
import { errorLines } from "../support/error_log.js";
import { getVpxtoolRunner } from "../../common/vpxtool/vpxtool_runner.js";

test("a vpxtool that cannot start is logged once and the runs wait for the next try", async () => {
    const { fake } = await startTableRoms({ tables: [table("Attack from Mars (Bally 1995)")], enabled: false });
    fake.addProgram(VPXTOOL, args => ({ output: args[0] }));
    const runner = getVpxtoolRunner();
    const answers = [];
    const submit = name => runner.submit({
        scriptName: "OtherAddOn", args: [name], apply: result => answers.push(result.output), fail: reason => answers.push(`failed: ${reason}`),
    });

    // The temporary folder of the first run cannot be made.
    fake.failNextFolderCreation();
    submit("first");
    submit("second");
    fake.advanceTime(60 * 1000);

    assert.deepEqual(fake.programRuns(), []);
    assert.deepEqual(answers, []);
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /^\[OtherAddOn\] ERROR vpxtool could not start: /);

    // As a Script Reader install's end does.
    runner.resume();
    fake.advanceTime(60 * 1000);

    assert.deepEqual(answers, ["first", "second"]);
    assert.equal(errorLines(fake).length, 1);
});
