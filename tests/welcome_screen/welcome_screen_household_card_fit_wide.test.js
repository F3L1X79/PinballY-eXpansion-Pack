// ============================================================
// The four-card Welcome Screen fits a wide window 1920 px high, its lines
// included.
// ============================================================

import { test } from "node:test";
import { assertGridFits } from "./grid_fit_scenario.js";

test("the 2 x 2 grid fits a wide window, its lines included", async () => {
    await assertGridFits({ width: 3413, height: 1920 });
});
