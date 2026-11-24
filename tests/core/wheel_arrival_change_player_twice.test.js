// ============================================================
// Change Player taken twice in a row from the startup chain: a single Wheel
// Arrival, at the last Welcome Screen's Stay; none afterwards for a Welcome
// Screen reopened from the main menu or after a switch by Change Player.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { choose, isWelcomeScreenOpen, openFromMainMenu, press, pickProfileBeside } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalScenario, chooseChangePlayer, TABLE } from "./wheel_arrival_scenario.js";

test("Change Player twice at startup makes a single Wheel Arrival, at the end", async () => {
    const { fake, lang, store, arrivals } = await startWheelArrivalScenario();
    await chooseChangePlayer(fake, lang);
    await pickProfileBeside(fake, "Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    await chooseChangePlayer(fake, lang);
    assert.equal(arrivals(), 0);

    await pickProfileBeside(fake, "Next");
    assert.equal(store.getActiveProfile().name, "Bob");
    assert.equal(arrivals(), 0);
    choose(fake, lang.welcomeScreen.stayOn(TABLE.title));
    await settle();
    assert.equal(arrivals(), 1);

    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    press(fake, "Exit");
    await settle();
    assert.equal(arrivals(), 1, "a Welcome Screen reopened from the main menu is no arrival");

    await openFromMainMenu(fake, lang.profiles.menuEntry);
    await pickProfileBeside(fake, "Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(isWelcomeScreenOpen(fake), true);
    press(fake, "Exit");
    await settle();
    assert.equal(arrivals(), 1, "nor one welcoming a switch outside the startup chain");
    assertNoErrorLogged(fake);
});
