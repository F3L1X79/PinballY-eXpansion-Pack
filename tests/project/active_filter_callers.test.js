// ============================================================
// Checks that the Wheel Order owns the Active Filter: no script but
// common/tables/wheel_order.js changes it (setCurrentFilter, setCurFilter),
// so that by year a script's change shows the sorted copy too (spec #548).
// common/core/pinbally_host.js only passes it on. Reads the files only.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FOLDERS = ["", "addons/", "common/", "achievements/"];
// Only common/ is split into subfolders; the root is read flat so tests/ and
// the other folders stay out.
const RECURSIVE_FOLDERS = ["common/"];
const ALLOWED = ["common/tables/wheel_order.js", "common/core/pinbally_host.js"];
const FILTER_CHANGE_CALL = /\.(setCurrentFilter|setCurFilter)\s*\(/;

test("no script but the Wheel Order module changes the Active Filter", () => {
    const scripts = FOLDERS.flatMap(folder => readdirSync(ROOT + folder, { recursive: RECURSIVE_FOLDERS.includes(folder) })
        .map(name => name.replace(/\\/g, "/"))
        .filter(name => name.endsWith(".js"))
        .map(name => folder + name));
    const callers = scripts
        .filter(path => !ALLOWED.includes(path))
        .filter(path => FILTER_CHANGE_CALL.test(readFileSync(ROOT + path, "utf8")));
    assert.deepEqual(callers, []);
});
