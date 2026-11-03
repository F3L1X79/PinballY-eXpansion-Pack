// ============================================================
// The consent Dialog of Discord Rich Presence in French, through main.js.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, press, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const fake = createFakePinballYHost({ now: new Date(2026, 10, 3, 20, 0, 0) });

function choose(line) {
    chooseEntry(fake, line);
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "fr";
    await import("../../main.js");
    await settle();
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("Réglages du pack");
    choose("Lancer et jouer une table");
});

test("the Dialog speaks French, the cursor on Annuler", () => {
    choose("Discord Rich Presence : Désactivé");
    press(fake, "Select");
    choose("Enregistrer");

    const { title, message } = readDrawnMenu(fake);
    assert.equal(title, "Discord Rich Presence");
    assert.equal(squeezed(message), squeezed("Votre compte Discord ouvert sur ce PC montrera publiquement la table jouée, depuis combien de temps, et quand la roue est ouverte. Aucun nom de profil ni aucune autre donnée personnelle de ce PC n'est envoyé par le PinballY Expansion Pack."));
    assert.deepEqual(drawnMenuLines(fake), ["Activer", "Annuler"]);
    assert.equal(highlightedEntry(fake), "Annuler");
    assertNoErrorLogged(fake);
});
