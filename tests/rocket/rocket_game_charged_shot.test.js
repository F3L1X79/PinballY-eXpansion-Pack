// ============================================================
// The Rocket Game's charged shot through main.js: an orb grows at the ship's
// nose while Launch is held, and at 2 s turns into a
// beam up the ship's lane that breaks every asteroid shown in it, 5 points
// each; a second press with no release between does not restart the
// charge; let go sooner, there is no beam.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketGame, chooseRocketGame, gameScore, shownShots, shownBeams, shownAsteroids, scoreScreenLayerCount, INTRO_MS,
} from "./rocket_game_scenario.js";

const CHARGE_MS = 2000;
const ORB_Z_INDEX = 7565;
const shownOrbs = fake => fake.drawingLayers().filter(layer => layer.zIndex === ORB_Z_INDEX && layer.alpha > 0);
const release = (fake, command) => fake.fire("commandbuttonup", { command, repeat: false });

// The asteroids whose centre shows inside the beam, in PinballY's window units (y up).
function asteroidsInBeam(fake, beam) {
    const { x, y } = beam.position();
    const { xSpan, ySpan } = beam.scale();
    return shownAsteroids(fake).filter(layer => {
        const centre = layer.position();
        return Math.abs(centre.x - x) < xSpan / 2 && centre.y > y - ySpan / 2 && centre.y <= 0.5;
    });
}

const SHIP_Z_INDEX = 7560;
const LANES = 5;
// The shot is this share of a lane wide.
const SHOT_WIDTH_SHARE = 0.07;
// How far above the ship, in window heights, an asteroid in its lane makes it move.
const DANGER_SPAN = 0.3;
const AIM_DANGER_SPAN = 0.15;
const ALONGSIDE_SPAN = 0.12;

// The flippers keep the ship out of an asteroid's way, Launch still held;
// aiming, they also take it under an asteroid still far above.
function steer(fake, laneSpan, isAiming) {
    const ship = fake.drawingLayers().find(layer => layer.zIndex === SHIP_Z_INDEX && layer.alpha > 0);
    if (!ship) return;
    const { x, y } = ship.position();
    const lane = Math.round(x / laneSpan) + Math.floor(LANES / 2);
    const hasAsteroid = (target, from, to) => shownAsteroids(fake).some(layer => {
        const centre = layer.position();
        const targetX = (target - Math.floor(LANES / 2)) * laneSpan;
        return Math.abs(centre.x - targetX) < laneSpan * 0.75 && centre.y > from && centre.y < to;
    });
    // Aiming, the beam breaks whatever is above: only an asteroid about to hit is a danger.
    const dangerSpan = isAiming ? AIM_DANGER_SPAN : DANGER_SPAN;
    // An asteroid alongside the ship counts too: a lane change would run into it.
    const isOpen = target => target >= 0 && target < LANES && !hasAsteroid(target, y - ALONGSIDE_SPAN, y + dangerSpan);
    const isTarget = target => isOpen(target) && hasAsteroid(target, y + dangerSpan, 0.5);
    const ways = [1, -1];
    const centre = Math.floor(LANES / 2);
    // One lane toward goal, when that lane is open.
    const toward = goal => {
        const direction = Math.sign(goal - lane);
        return direction !== 0 && isOpen(lane + direction) ? direction : undefined;
    };
    let way;
    if (!isOpen(lane)) {
        way = ways.find(direction => isTarget(lane + direction)) ?? ways.find(direction => isOpen(lane + direction));
    } else if (isAiming && !isTarget(lane)) {
        const targets = [...Array(LANES).keys()].filter(isTarget).sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
        if (targets.length > 0) way = toward(targets[0]);
    } else if (!isAiming) {
        way = toward(centre);
    }
    if (way !== undefined) press(fake, way === 1 ? "Next" : "Prev");
}

test("Launch held 2 s, a growing charge, breaks every asteroid shown up the ship's lane; let go sooner, no beam", async () => {
    const { fake, lang } = await startRocketGame();
    await chooseRocketGame(fake, lang);
    fake.advanceTime(INTRO_MS + 16);

    press(fake, "Launch");
    fake.advanceTime(16);
    const laneSpan = shownShots(fake)[0].scale().xSpan / SHOT_WIDTH_SHARE;
    assert.deepEqual(shownOrbs(fake), [], "a tap shows no charge");
    const orbSizes = [];
    for (let heldMs = 16; heldMs < CHARGE_MS - 200; heldMs += 16) {
        steer(fake, laneSpan, false);
        fake.advanceTime(16);
        if (heldMs % 400 === 0) orbSizes.push(shownOrbs(fake).map(orb => orb.scale().ySpan)[0]);
    }
    assert.ok(orbSizes.every(size => size !== undefined), "held, the charge shows");
    assert.ok(orbSizes.every((size, index) => index === 0 || size > orbSizes[index - 1]), `the charge grows: ${orbSizes.join(", ")}`);
    release(fake, "Launch");
    fake.advanceTime(400);
    assert.deepEqual(shownBeams(fake), [], "let go before 2 s, no beam");
    assert.deepEqual(shownOrbs(fake), [], "let go, the charge is gone");

    let broken = 0;
    while (broken === 0 && scoreScreenLayerCount(fake) === 0) {
        press(fake, "Launch");
        let before = shownAsteroids(fake);
        let scoreBefore = gameScore(fake, lang);
        for (let heldMs = 0; shownBeams(fake).length === 0 && heldMs < CHARGE_MS + 100 && scoreScreenLayerCount(fake) === 0; heldMs += 16) {
            before = shownAsteroids(fake);
            scoreBefore = gameScore(fake, lang);
            // Aims just before the beam, while an asteroid far above is still there.
            steer(fake, laneSpan, heldMs >= CHARGE_MS - 500);
            // An auto-repeat not flagged as one, with no release between: still the same hold.
            if (heldMs === 1008) press(fake, "Launch");
            fake.advanceTime(16);
        }
        const [beam] = shownBeams(fake);        if (beam) assert.deepEqual(shownOrbs(fake), [], "the charge turns into the beam");
        if (!beam) {
            assert.ok(scoreScreenLayerCount(fake) > 0 || fake.drawingLayers().every(layer => layer.zIndex !== SHIP_Z_INDEX || layer.alpha === 0),
                "held 2 s, the beam fires unless the ship crashed");
            break;
        }
        assert.deepEqual(asteroidsInBeam(fake, beam), [], "nothing left shown in the beam");
        // Not those gone off the bottom in the same frame.
        const beamBottom = beam.position().y - beam.scale().ySpan / 2;
        const gone = before.filter(layer => !shownAsteroids(fake).includes(layer) && layer.position().y > beamBottom);
        broken = gone.length;
        if (broken > 0) assert.ok(gameScore(fake, lang) >= scoreBefore + 5 * broken, `5 points for each of ${broken} broken`);
        release(fake, "Launch");
        fake.advanceTime(400);
        assert.deepEqual(shownBeams(fake), [], "the beam fades");
    }
    assert.ok(broken > 0, "a beam broke asteroids before the crash");
    assertNoErrorLogged(fake);
});
