// ============================================================
// The eXpansion Pack Settings in French through main.js: "Réglages du pack"
// in the Operator Menu, the list's headings, Add-ons and states, the
// language line in the saved language's own name, the Offline Mode group,
// the restart question on leaving, an Add-on's page and the Language page.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, press, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";

test("the list speaks French", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });
    fake.addFile(ENV_LOCAL, "LANGUAGE=es\r\nADD_ON_PROFILE_PICKER=false\r\n");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    // Read on i18n's first load, so before main.js.
    config.language = "fr";
    await import("../../main.js");
    await settle();

    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Réglages du pack");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake).slice(0, 2), ["Joueurs et progression", "Écran de la roue"]);
    chooseEntry(fake, "Joueurs et progression");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(drawnMenuLines(fake).slice(0, 4), [
        "[JOUEURS ET PROGRESSION]", "Choix du joueur : Désactivé", "Écran d'accueil : Activé au redémarrage", "Succès : Activé au redémarrage",
    ]);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Langue : Español au redémarrage", "Next");
    assert.equal(highlightedEntry(fake), "Mode hors ligne", "the language line comes before the Offline Mode group");
    press(fake, "Select");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(drawnMenuLines(fake), [
        "[MODE HORS LIGNE]", "Recherche de mises à jour du pack : Activé", "Proposer vpxtool : Activé", "---", "Retour",
    ]);
    chooseEntry(fake, "Retour");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Mode hors ligne");
    press(fake, "Next");
    assert.equal(highlightedEntry(fake), "Retour", "then Retour");
    press(fake, "Select");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(readDrawnMenu(fake).message, "Les réglages enregistrés s'appliquent au redémarrage de PinballY.");
    assert.deepEqual(drawnMenuLines(fake), ["Redémarrer maintenant", "Plus tard"]);
    chooseEntry(fake, "Plus tard");
    assert.ok(drawnMenuLines(fake).includes("Réglages du pack"), "Plus tard goes back to the Operator Menu");

    chooseEntry(fake, "Réglages du pack");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Joueurs et progression");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Choix du joueur : Désactivé");
    fake.advanceTime(OPEN_OVER_MS);
    assert.ok(squeezed(readDrawnMenu(fake).message).startsWith(squeezed("Activé : « Changer de joueur » dans le menu principal")));
    assert.ok(readDrawnMenu(fake).message.includes("\nDésactivé : Tout le monde joue en Invité"));
    assert.deepEqual(readDrawnMenu(fake).messageBold, ["Activé :", "Désactivé :"]);
    press(fake, "Select");
    assert.deepEqual(drawnMenuLines(fake), ["Choix du joueur : Activé", "Enregistrer", "Annuler"]);
    chooseEntry(fake, "Enregistrer");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Choix du joueur : Activé au redémarrage");
    assert.equal(fake.readFile(ENV_LOCAL), "LANGUAGE=es\r\nADD_ON_PROFILE_PICKER=true\r\n");

    // The languages in their own names, Annuler in the running language.
    chooseEntry(fake, "Retour");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Langue : Español au redémarrage");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(drawnMenuLines(fake), ["English", "Français", "Deutsch", "Español", "Italiano", "Português", "---", "Annuler"]);
    chooseEntry(fake, "Français");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Langue : Français");
    assert.equal(fake.readFile(ENV_LOCAL), "LANGUAGE=fr\r\nADD_ON_PROFILE_PICKER=true\r\n");

    assertNoErrorLogged(fake);
});
