// ============================================================
// Random Game and Untracked Tables, through the module's interface with the
// fake host: an Untracked Table is never launched, never the suspense stop,
// and the wheel offsets stay those of the whole wheel. "Never" rules are
// checked over many launches.
// ============================================================

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createRandomGame } from "../../common/tables/random_game.js";
import { setUntrackedTables } from "../../common/core/untracked_tables.js";

const LAUNCH_COUNT = 300;

const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" };
const PLAYER = { id: 2, configId: "Media Player", title: "Media Player" };
const MARS = { id: 3, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars" };
const THEATRE = { id: 4, configId: "Theatre of Magic (Bally 1995)", title: "Theatre of Magic" };

// Records where the wheel was sent: the index into the whole wheel it must stop at.
function start({ wheel, skipAnimation = false }) {
    const fake = createFakePinballYHost({ tables: wheel });
    fake.setWheelTables(wheel.map(table => table.configId));
    const landings = [];
    const animateTo = async (tables, index) => { landings.push(tables[index].configId); };
    const randomGame = createRandomGame(fake, createProfileStore(fake), { animateTo, skipAnimation });
    return { fake, randomGame, landings };
}

async function launchMany(randomGame) {
    for (let launch = 0; launch < LAUNCH_COUNT; launch++) await randomGame.launch();
}

afterEach(() => setUntrackedTables(""));

test("an Untracked Table is neither launched nor stopped on", async () => {
    setUntrackedTables("Media Player");
    const { fake, randomGame, landings } = start({ wheel: [MEDIEVAL, MARS, PLAYER, THEATRE] });

    await launchMany(randomGame);

    const launched = new Set(fake.launches().map(game => game.configId));
    assert.equal(fake.launches().length, LAUNCH_COUNT);
    assert.ok(!launched.has(PLAYER.configId), [...launched].join(", "));
    assert.ok(!landings.includes(PLAYER.configId), "the wheel never stops on it");
});

test("without the animation, an Untracked Table is never launched", async () => {
    setUntrackedTables("Media Player");
    const { fake, randomGame } = start({ wheel: [PLAYER, MARS, THEATRE], skipAnimation: true });

    await launchMany(randomGame);

    assert.ok(fake.launches().every(game => game.configId !== PLAYER.configId));
    assert.equal(fake.launches().length, LAUNCH_COUNT);
});

test("the only table being untracked, nothing is launched and a later launch still works", async () => {
    setUntrackedTables("Media Player");
    const { fake, randomGame, landings } = start({ wheel: [PLAYER] });

    await randomGame.launch();

    assert.deepEqual(fake.launches(), []);
    assert.deepEqual(landings, []);

    setUntrackedTables("");
    await randomGame.launch();
    assert.equal(fake.launches().length, 1);
});
