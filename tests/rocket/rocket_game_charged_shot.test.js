// ============================================================
// The Rocket Game's charged shot through main.js: Launch held 3 s fires a
// beam up the ship's lane that breaks every asteroid shown in it, 5 points
// each; let go sooner, there is no beam.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketGame, chooseRocketGame, gameScore, shownShots, shownBeams, shownAsteroids, scoreScreenLayerCount, INTRO_MS,
} from "./rocket_game_scenario.js";

const CHARGE_MS = 3000;
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
    const isOpen = target => target >= 0 && target < LANES && !hasAsteroid(target, y, y + dangerSpan);
    const isTarget = target => isOpen(target) && hasAsteroid(target, y + dangerSpan, 0.5);
    const ways = [1, -1];
    let way;
    if (!isOpen(lane)) way = ways.find(direction => isTarget(lane + direction)) ?? ways.find(direction => isOpen(lane + direction));
    else if (isAiming && !isTarget(lane)) way = ways.find(direction => isTarget(lane + direction));
    if (way !== undefined) press(fake, way === 1 ? "Next" : "Prev");
}

test("Launch held 3 s breaks every asteroid shown up the ship's lane; let go sooner, no beam", async () => {
    const { fake, lang } = await startRocketGame();
    await chooseRocketGame(fake, lang);
    fake.advanceTime(INTRO_MS + 16);

    press(fake, "Launch");
    fake.advanceTime(16);
    const laneSpan = shownShots(fake)[0].scale().xSpan / SHOT_WIDTH_SHARE;
    for (let heldMs = 16; heldMs < CHARGE_MS - 200; heldMs += 16) {
        steer(fake, laneSpan, false);
        fake.advanceTime(16);
    }
    release(fake, "Launch");
    fake.advanceTime(400);
    assert.deepEqual(shownBeams(fake), [], "let go before 3 s, no beam");

    let broken = 0;
    while (broken === 0 && scoreScreenLayerCount(fake) === 0) {
        press(fake, "Launch");
        let before = shownAsteroids(fake);
        let scoreBefore = gameScore(fake, lang);
        for (let heldMs = 0; shownBeams(fake).length === 0 && heldMs < CHARGE_MS + 100 && scoreScreenLayerCount(fake) === 0; heldMs += 16) {
            before = shownAsteroids(fake);
            scoreBefore = gameScore(fake, lang);
            // Aims just before the beam, while an asteroid far above is still there.
            steer(fake, laneSpan, heldMs >= CHARGE_MS - 300);
            fake.advanceTime(16);
        }
        const [beam] = shownBeams(fake);
        // Crashed while charging.
        if (!beam) break;
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
