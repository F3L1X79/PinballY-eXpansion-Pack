// ============================================================
// Import order check through main.js on the fake host: a commented-out
// import( after the pack's line (// or /* */), and static imports anywhere, never raise
// the Conflict Notice.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startWithOwnerMain, shownDialog, importOrderLines, notCheckedLines, PACK_LINE } from "./import_order_scenario.js";

test("commented-out (// or /* */) and static imports raise no Conflict Notice", async () => {
    const { fake } = await startWithOwnerMain([
        "import \"./Startup.js\";",
        PACK_LINE,
        "   // import(\"./LaunchVideo.js\");",
        "import { fade } from \"./LaunchFade.js\";",
        "/* Off for now:",
        "import(\"./FlexDMD.js\");",
        "*/",
    ]);

    assert.equal(shownDialog(fake), null);
    assert.deepEqual(importOrderLines(fake), []);
    assert.deepEqual(notCheckedLines(fake), []);
    assertNoErrorLogged(fake);
});
