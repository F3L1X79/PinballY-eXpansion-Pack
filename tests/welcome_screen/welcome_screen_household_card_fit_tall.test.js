// ============================================================
// The four-card Welcome Screen fits a portrait window, its lines included.
// ============================================================

import { test } from "node:test";
import { assertGridFits } from "./grid_fit_scenario.js";

test("the 2 x 2 grid fits a portrait window, its lines included", async () => {
    await assertGridFits({ width: 1080, height: 1920 });
});
