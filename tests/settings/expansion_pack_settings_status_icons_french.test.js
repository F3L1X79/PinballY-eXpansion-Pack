// ============================================================
// The Status Icons' line and page in the eXpansion Pack Settings, in French,
// through main.js: in the wheel screen group right after the clock, saying
// what they show and that nothing else is lost without them.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Status Icons' page speaks French", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 1, 20, 0, 0) });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus" || key === "statusIcons";
    // Read on i18n's first load, so before main.js.
    config.language = "fr";
    await import("../../main.js");
    await settle();

    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Réglages du pack");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Écran de la roue");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(drawnMenuLines(fake).slice(0, 5), [
        "[ÉCRAN DE LA ROUE]", "Ligne d'état : Activé au redémarrage", "Horloge : Activé au redémarrage", "Icônes d'état : Activé",
        "Arc de la roue : Activé au redémarrage",
    ]);

    chooseEntry(fake, "Icônes d'état : Activé");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(
        "Activé : À côté de l'horloge, le symbole de Discord quand la borne est publique sur Discord, une flèche dorée quand une mise à jour du pack attend, une flèche barrée quand la recherche de mises à jour est désactivée."
        + "\nDésactivé : Rien d'autre ne change."));
    assert.deepEqual(drawnMenuLines(fake), ["Icônes d'état : Activé", "Annuler"]);
    assertNoErrorLogged(fake);
});
