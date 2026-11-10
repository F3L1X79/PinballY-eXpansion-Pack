// ============================================================
// The Rocket: an Easter Egg drawn at "prelaunch", for a launch from the wheel
// (PlayGame, not started by the pack). The launch is cancelled, and a game of
// dodging asteroids on the flippers plays instead until the crash, then the
// score for 2 s and the wheel. The table is silent until just before it goes.
// Its music (config's rocketMusicFile) loops from the opening word to the crash.
// - Its "prelaunch" listener must be the pack's first: a cancelled launch never fires "postlaunch".
// - Buttons and attract mode go through the Drawn Screen controls; Exit does nothing.
// - Won at the start; its Achievement waits for the end, so that the toast shows on the wheel.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS } from "../drawing/steamball_palette.js";
import { EASTER_EGG } from "./easter_egg_rules.js";
import { LANES, paceAt, createPatterns } from "./rocket_patterns.js";

const SCRIPT_NAME = "Rocket";

const IMAGE_FOLDER = "assets\\images\\easter_eggs";
const SHIP_FILE = "rocket_ship.png";
const SPLASH_FILE = "rocket_splash.png";
const FLAME_FILES = [1, 2, 3, 4, 5].map(index => `rocket_flame_${index}.png`);
// The first is the whole asteroid, the others its break-up.
const BREAK_FILES = [1, 2, 3, 4, 5].map(index => `rocket_break_${index}.png`);
const EXPLOSION_FILES = [1, 2, 3, 4].map(index => `rocket_explosion_${index}.png`);
const ALL_FILES = [SHIP_FILE, SPLASH_FILE, ...FLAME_FILES, ...BREAK_FILES, ...EXPLOSION_FILES];

// The images' own sizes, and the drawn part of some, in canvas pixels.
const SPLASH_CANVAS = { width: 720, height: 1152 };
const SHIP_CANVAS = { width: 180, height: 185 };
const FLAME_CANVAS_WIDTH = 110;
const FLAME_CANVAS_HEIGHTS = [69, 122, 202, 266, 321];
const BREAK_CANVAS = 300;
const EXPLOSION_CANVAS = 340;
const SHIP_DRAWN_WIDTH = 157;
const ASTEROID_DRAWN_WIDTH = 207;
// How far the flame's canvas tucks under the ship's, in ship canvas pixels.
const FLAME_TUCK = 18;

const TRANSPARENT = COLORS.transparent;
const SPACE_COLOR = 0xFF070A12;
const LANE_LINE_COLOR = 0xFF2E3848;
const SCORE_PANEL_COLOR = 0xE8171D27;
// Over the wheel, the Drawn Menu (6200), the toasts (6500), the Confetti Shower (7000) and the Fireworks (7100).
const BACKDROP_Z_INDEX = 7500;
const SCROLL_Z_INDEX = 7501;
const ASTEROID_Z_INDEX = 7510;
const BREAK_Z_INDEX = 7540;
const FLAME_Z_INDEX = 7550;
const SHIP_Z_INDEX = 7560;
const EXPLOSION_Z_INDEX = 7570;
const TEXT_Z_INDEX = 7580;
const SPLASH_Z_INDEX = 7590;
const SPLASH_WORD_Z_INDEX = 7591;

// On a window wider than this, the lanes keep a portrait column in its middle.
const COLUMN_RATIO = 0.64;
const SHIP_SHARE = 0.78;
const ASTEROID_SHARE = 0.82;
const SHIP_CENTRE_Y = 0.70;
const EXPLOSION_SCALE = 1.1;
// Shares of the drawn radii that count for a hit: forgiving corners.
const SHIP_HIT_SHARE = 0.55;
const ASTEROID_HIT_SHARE = 0.85;
const ASTEROID_POOL = 28;
// The lane lines start dim and are gone once the game has sped up this far.
const LINE_START_ALPHA = 0.75;
const LINES_GONE_PROGRESS = 0.55;
const LINE_SHARE_OF_WIDTH = 0.002;
// How far an asteroid may sit off its lane's centre, in lanes: the next lane's centre stays safe.
const JITTER_LANES = 0.28;
// One full side-to-side swing of a weaving asteroid.
const SWAY_MS = 1100;
const POINTS_PER_ROW = 10;

const FRAME_MS = 16;
// A long stutter must not teleport the asteroids through the ship.
const LONGEST_STEP_MS = 100;
// Lets PinballY paint the backdrop before the rest blocks for a moment.
const BACKDROP_PAINT_MS = 50;
const LANE_CHANGE_MS = 70;
// The opening word: thrown at the screen, shaken, held, then a hard cut.
const SPLASH_MS = 1900;
const SLAM_MS = 170;
const SLAM_SCALE = 3;
const SHAKE_MS = 320;
const SHAKE_SHARE = 0.02;
const SPLASH_WORD_CANVAS = { width: 1000, height: 320 };
const SPLASH_WORD_SIZE = 160;
const SPLASH_WORD_MARGIN = 30;
const SPLASH_WORD_Y = 0.42;
// PinballY's text has no outline: the word is drawn in dark all around itself first.
const OUTLINE_STEPS = 16;
const OUTLINE_RADIUS = 9;
const FLAME_FLICKER_MS = 70;
const BREAK_FRAME_MS = 70;
const EXPLOSION_FRAME_MS = 90;
const CRASH_MS = 650;
const SCORE_MS = 2000;
// The table's sound comes back under the backdrop, which goes this much later.
const LEAVING_MS = 120;

// Low resolution, stretched: these layers are as wide as the window.
const SCROLL_CANVAS_WIDTH = 540;
const STARS_PER_LAYER = 110;
const STAR_LAYERS = [{ color: 0xC0FFFFFF, size: 3, speed: 0.35 }, { color: 0x70FFFFFF, size: 2, speed: 0.15 }];

const lerp = (from, to, share) => from + (to - from) * share;

// controls: the Drawn Screen controls; rules() and quietWheel(): read at the
// launch, since the Rocket listens before main.js loads anything; texts():
// { dodge, score }, as shown; musicFile(): the music's full path, "" for none.
export function createRocket(host, { controls, rules, quietWheel, texts, musicFile }) {
    const screen = controls.register(SCRIPT_NAME);
    const pathOf = file => `${host.getProjectFolder()}\\${IMAGE_FOLDER}\\${file}`;
    const nowMs = () => host.now().getTime();
    const random = () => host.random();
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const patterns = createPatterns(random);
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);

    // The game under way, null otherwise.
    let running = null;
    // The music's player: undefined until the first game, null when there is none.
    let music;

    // Loaded at the first game, behind the backdrop; a music that cannot load is logged once.
    function musicOfSession() {
        if (music !== undefined) return music;
        music = null;
        const path = musicFile();
        if (path === "") return null;
        try {
            music = host.createLoopingSound(path);
        } catch (error) {
            log(`Its music cannot be loaded, it plays silently: ${error.message}`);
        }
        return music;
    }

    function stopMusic(run) {
        if (!run.music) return;
        run.music.stop();
        run.music = null;
    }

    function canPlay() {
        const missing = ALL_FILES.map(pathOf).filter(path => !host.files.isImageReadable(path));
        if (missing.length > 0) log(`Missing or unreadable, no game: ${missing.join(", ")}`);
        return missing.length === 0;
    }

    function drawCentredText(dc, text, size, color, box) {
        const styled = host.createStyledText({ textAlign: "center", textStyle: { font: FONTS.display, size, weight: 700, color } });
        styled.add(text);
        styled.draw(dc, box);
    }

    function newLayer(run, zIndex) {
        const layer = run.placed.create(zIndex);
        layer.clear(TRANSPARENT);
        run.layers.push(layer);
        return layer;
    }

    // A layer shown at w x h window pixels; stretched: its canvas fills that box.
    const spriteOf = (layer, w, h, stretched = false) => ({ layer, w, h, stretched });

    function imageSprite(run, zIndex, file, canvasWidth, canvasHeight, boxWidth, boxHeight) {
        const layer = newLayer(run, zIndex);
        layer.draw(dc => dc.drawImage(pathOf(file), 0, 0, canvasWidth, canvasHeight), canvasWidth, canvasHeight);
        return spriteOf(layer, boxWidth, boxHeight);
    }

    function textSprite(run, zIndex, canvasWidth, canvasHeight, boxWidth, paint) {
        const layer = newLayer(run, zIndex);
        layer.draw(paint, canvasWidth, canvasHeight);
        return spriteOf(layer, boxWidth, boxWidth * canvasHeight / canvasWidth);
    }

    function place(run, sprite, centreX, centreY) {
        run.placed.place(sprite.layer, { x: centreX - sprite.w / 2, y: centreY - sprite.h / 2, w: sprite.w, h: sprite.h }, { stretched: sprite.stretched });
    }

    function show(run, sprite, centreX, centreY) {
        place(run, sprite, centreX, centreY);
        run.placed.show(sprite.layer);
        sprite.layer.alpha = 1;
    }

    const hide = (run, sprite) => run.placed.hide(sprite.layer);
    const laneX = (run, lane) => run.columnLeft + (lane + 0.5) * run.laneWidth;

    // One thin layer per line, so that the lines fade without a full-window layer.
    function addLaneLines(run) {
        const lineWidth = Math.max(2, run.width * LINE_SHARE_OF_WIDTH);
        for (let line = 0; line <= LANES; line++) {
            const layer = newLayer(run, SCROLL_Z_INDEX);
            layer.draw(dc => dc.fillRect(0, 0, 4, 4, LANE_LINE_COLOR), 4, 4);
            const sprite = spriteOf(layer, lineWidth, run.height, true);
            show(run, sprite, run.columnLeft + line * run.laneWidth, run.height / 2);
            layer.alpha = LINE_START_ALPHA;
            run.laneLines.push(sprite);
        }
    }

    function fadeLaneLines(run, progress) {
        if (run.laneLines.length === 0) return;
        const alpha = LINE_START_ALPHA * (1 - progress / LINES_GONE_PROGRESS);
        if (alpha <= 0) {
            for (const sprite of run.laneLines) hide(run, sprite);
            run.laneLines = [];
            return;
        }
        for (const sprite of run.laneLines) sprite.layer.alpha = alpha;
    }

    // The same stars in both halves, hence a seed instead of the host's random.
    function paintStars(dc, top, height, starLayer, seed) {
        let state = seed;
        const next = limit => {
            state = (Math.imul(state, 1597334677) + 12345) >>> 0;
            return (state >>> 8) % limit;
        };
        for (let index = 0; index < STARS_PER_LAYER; index++) {
            dc.fillRect(next(SCROLL_CANVAS_WIDTH - starLayer.size), top + next(height - starLayer.size), starLayer.size, starLayer.size, starLayer.color);
        }
    }

    // Twice the window's height, its two halves alike, so moving it down by one window loops.
    function addStars(run, starLayer, seed) {
        const canvasHeight = Math.round(SCROLL_CANVAS_WIDTH * run.height / run.width) * 2;
        const layer = newLayer(run, SCROLL_Z_INDEX);
        layer.draw(dc => {
            paintStars(dc, 0, canvasHeight / 2, starLayer, seed);
            paintStars(dc, canvasHeight / 2, canvasHeight / 2, starLayer, seed);
        }, SCROLL_CANVAS_WIDTH, canvasHeight);
        const scrolling = { sprite: spriteOf(layer, run.width, run.height * 2, true), speed: starLayer.speed, offset: 0 };
        show(run, scrolling.sprite, run.width / 2, 0);
        run.scrolling.push(scrolling);
    }

    function scrollStars(run, pixels) {
        for (const scrolling of run.scrolling) {
            scrolling.offset = (scrolling.offset + pixels * scrolling.speed) % run.height;
            place(run, scrolling.sprite, run.width / 2, scrolling.offset);
        }
    }

    function drawScore(run) {
        run.scoreSprite.layer.draw(dc => drawCentredText(dc, `${run.texts.score}  ${run.score}`, 44, COLORS.gold, { x: 0, y: 8, width: 900, height: 80 }), 900, 90);
    }

    // A word wider than its canvas spills out and is cut: its size follows its measured width.
    function paintSplashWord(run, dc) {
        const { width, height } = SPLASH_WORD_CANVAS;
        const word = run.texts.dodge;
        const measured = host.createStyledText({ textStyle: { font: FONTS.display, size: SPLASH_WORD_SIZE, weight: 700 } });
        measured.add(word);
        const metrics = measured.measure(width * 10);
        const fit = metrics.width > 0 ? Math.min(1, (width - OUTLINE_RADIUS * 2 - SPLASH_WORD_MARGIN) / metrics.width) : 1;
        const top = (height - metrics.height * fit) / 2;
        const drawAt = (color, x, y) => drawCentredText(dc, word, SPLASH_WORD_SIZE * fit, color, { x, y: top + y, width, height: height - top });
        for (let step = 0; step < OUTLINE_STEPS; step++) {
            const angle = step / OUTLINE_STEPS * 2 * Math.PI;
            drawAt(SPACE_COLOR, Math.cos(angle) * OUTLINE_RADIUS, Math.sin(angle) * OUTLINE_RADIUS);
        }
        drawAt(COLORS.gold, 0, 0);
    }

    function prepareShip(run) {
        const shipScale = run.laneWidth * SHIP_SHARE / SHIP_CANVAS.width;
        run.shipCentreY = run.height * SHIP_CENTRE_Y;
        run.ship = imageSprite(run, SHIP_Z_INDEX, SHIP_FILE, SHIP_CANVAS.width, SHIP_CANVAS.height, SHIP_CANVAS.width * shipScale, SHIP_CANVAS.height * shipScale);
        run.flames = FLAME_FILES.map((file, index) => imageSprite(run, FLAME_Z_INDEX + index, file, FLAME_CANVAS_WIDTH, FLAME_CANVAS_HEIGHTS[index], FLAME_CANVAS_WIDTH * shipScale, FLAME_CANVAS_HEIGHTS[index] * shipScale));
        run.flameTop = run.shipCentreY + run.ship.h / 2 - FLAME_TUCK * shipScale;
        const explosionBox = EXPLOSION_CANVAS * shipScale * EXPLOSION_SCALE;
        run.explosionFrames = EXPLOSION_FILES.map((file, index) => imageSprite(run, EXPLOSION_Z_INDEX + index, file, EXPLOSION_CANVAS, EXPLOSION_CANVAS, explosionBox, explosionBox));
        run.hitDistance = run.laneWidth * ASTEROID_SHARE / 2 * ASTEROID_HIT_SHARE + SHIP_DRAWN_WIDTH * shipScale / 2 * SHIP_HIT_SHARE;
    }

    function prepareAsteroids(run) {
        const asteroidBox = BREAK_CANVAS * run.laneWidth * ASTEROID_SHARE / ASTEROID_DRAWN_WIDTH;
        run.asteroidBox = asteroidBox;
        for (let index = 0; index < ASTEROID_POOL; index++) {
            run.freeAsteroids.push(imageSprite(run, ASTEROID_Z_INDEX + index, BREAK_FILES[0], BREAK_CANVAS, BREAK_CANVAS, asteroidBox, asteroidBox));
        }
        run.breakFrames = BREAK_FILES.slice(1).map((file, index) => imageSprite(run, BREAK_Z_INDEX + index, file, BREAK_CANVAS, BREAK_CANVAS, asteroidBox, asteroidBox));
    }

    // Every layer drawn at once behind the opaque backdrop, which hides the table's
    // update() flashing the wheel too.
    function prepare(run) {
        quietWheel().hold(SCRIPT_NAME, { ceiling: 0 });
        navigationSound.load();
        STAR_LAYERS.forEach((starLayer, index) => addStars(run, starLayer, 7 + index));
        addLaneLines(run);
        prepareShip(run);
        prepareAsteroids(run);

        const splash = imageSprite(run, SPLASH_Z_INDEX, SPLASH_FILE, SPLASH_CANVAS.width, SPLASH_CANVAS.height, run.width, run.height);
        run.splash = { ...splash, stretched: true };
        run.splashWord = textSprite(run, SPLASH_WORD_Z_INDEX, SPLASH_WORD_CANVAS.width, SPLASH_WORD_CANVAS.height, run.columnWidth * 0.96, dc => paintSplashWord(run, dc));
        const scoreWidth = run.columnWidth * 0.82;
        run.scoreSprite = spriteOf(newLayer(run, TEXT_Z_INDEX), scoreWidth, scoreWidth * 90 / 900);
        drawScore(run);

        run.lane = Math.floor(LANES / 2);
        run.patternState = { lane: run.lane, safeLane: run.lane, lastPattern: null };
        run.shipX = laneX(run, run.lane);
        run.glideFromX = run.shipX;
        run.glideToX = run.shipX;
        show(run, run.ship, run.shipX, run.shipCentreY);
        showFlame(run, 0);
        show(run, run.scoreSprite, run.width / 2, run.height * 0.04);
        show(run, run.splash, run.width / 2, run.height / 2);
        show(run, run.splashWord, run.width / 2, run.height * SPLASH_WORD_Y);

        enterPhase(run, "splash");
        run.music = musicOfSession();
        if (run.music) run.music.play();
        run.frameTimer = host.setInterval(guarded(run, () => frame(run)), FRAME_MS);
    }

    function enterPhase(run, phase) {
        run.phase = phase;
        run.phaseStartMs = nowMs();
        run.lastFrameMs = run.phaseStartMs;
    }

    function splashStep(run, elapsed) {
        const word = run.splashWord;
        const slam = Math.min(1, elapsed / SLAM_MS);
        const scale = lerp(SLAM_SCALE, 1, 1 - (1 - slam) * (1 - slam));
        const shaken = elapsed - SLAM_MS;
        const shake = shaken > 0 && shaken < SHAKE_MS ? (1 - shaken / SHAKE_MS) * run.width * SHAKE_SHARE : 0;
        const scaled = { ...word, w: word.w * scale, h: word.h * scale };
        place(run, scaled, run.width / 2 + (random() - 0.5) * 2 * shake, run.height * SPLASH_WORD_Y + (random() - 0.5) * 2 * shake);
        if (elapsed < SPLASH_MS) return;
        hide(run, run.splash);
        hide(run, word);
        enterPhase(run, "playing");
    }

    function showFlame(run, index) {
        const flame = run.flames[index];
        const centreY = run.flameTop + flame.h / 2;
        if (run.flameShown !== flame) {
            if (run.flameShown) hide(run, run.flameShown);
            show(run, flame, run.shipX, centreY);
            run.flameShown = flame;
        } else {
            place(run, flame, run.shipX, centreY);
        }
    }

    function updateFlame(run, progress, now) {
        const stage = Math.min(FLAME_FILES.length - 1, Math.floor(progress * FLAME_FILES.length));
        // Between its stage and the one below, so the flame lives.
        const flicker = Math.floor(now / FLAME_FLICKER_MS) % 2;
        showFlame(run, Math.max(0, stage - flicker));
    }

    function spawnRow(run, event, pace) {
        const lanes = event.aimed ? [run.lane] : event.lanes;
        const row = { y: -run.asteroidBox / 2, passed: false, speed: event.speed || 1, asteroids: [], trailPx: 0 };
        for (let index = 0; index < lanes.length; index++) {
            const sprite = run.freeAsteroids.pop();
            // Never seen with the pool's size; the row just comes thinner.
            if (!sprite) break;
            const x = laneX(run, lanes[index]) + (event.jitter ? (random() * 2 - 1) * JITTER_LANES * run.laneWidth : 0);
            const trailPx = (event.trailsMs ? event.trailsMs[index] : 0) / pace.fallMs * run.height;
            row.trailPx = Math.max(row.trailPx, trailPx);
            show(run, sprite, x, row.y - trailPx);
            row.asteroids.push({ sprite, x, baseX: x, trailPx, swayPx: (event.swayLanes || 0) * run.laneWidth, phase: random() * 2 * Math.PI, bornMs: run.playMs });
        }
        if (row.asteroids.length > 0) run.rows.push(row);
    }

    function runPatterns(run, pace, stepMs) {
        run.nextEventInMs -= stepMs;
        while (run.nextEventInMs <= 0) {
            if (run.queue.length === 0) {
                run.patternState.lane = run.lane;
                run.queue = patterns.next(run.patternState, pace);
            }
            const event = run.queue.shift();
            spawnRow(run, event, pace);
            run.nextEventInMs += event.thenMs;
        }
    }

    function moveAsteroid(run, row, asteroid) {
        if (asteroid.swayPx !== 0) asteroid.x = asteroid.baseX + asteroid.swayPx * Math.sin(asteroid.phase + (run.playMs - asteroid.bornMs) / SWAY_MS * 2 * Math.PI);
        place(run, asteroid.sprite, asteroid.x, row.y - asteroid.trailPx);
    }

    // Ease-out over the lane change.
    function moveShip(run, now) {
        const share = Math.min(1, (now - run.glideStartMs) / LANE_CHANGE_MS);
        run.shipX = lerp(run.glideFromX, run.glideToX, 1 - (1 - share) * (1 - share));
        place(run, run.ship, run.shipX, run.shipCentreY);
    }

    function findHit(run) {
        for (const row of run.rows) {
            for (const asteroid of row.asteroids) {
                const dx = asteroid.x - run.shipX;
                const dy = row.y - asteroid.trailPx - run.shipCentreY;
                if (dx * dx + dy * dy < run.hitDistance * run.hitDistance) return { row, asteroid };
            }
        }
        return null;
    }

    function recycleGoneRows(run) {
        const isGone = row => row.y - row.trailPx > run.height + run.asteroidBox / 2;
        for (const row of run.rows.filter(isGone)) {
            for (const asteroid of row.asteroids) {
                hide(run, asteroid.sprite);
                run.freeAsteroids.push(asteroid.sprite);
            }
        }
        run.rows = run.rows.filter(row => !isGone(row));
    }

    function play(run, stepMs, now) {
        run.playMs += stepMs;
        const pace = paceAt(run.playMs);
        const pixels = run.height / pace.fallMs * stepMs;
        scrollStars(run, pixels);
        moveShip(run, now);
        updateFlame(run, pace.progress, now);
        fadeLaneLines(run, pace.progress);
        runPatterns(run, pace, stepMs);
        for (const row of run.rows) {
            row.y += pixels * row.speed;
            for (const asteroid of row.asteroids) moveAsteroid(run, row, asteroid);
            if (!row.passed && row.y - row.trailPx > run.shipCentreY + run.hitDistance) {
                row.passed = true;
                run.score += POINTS_PER_ROW;
                drawScore(run);
            }
        }
        const hit = findHit(run);
        if (hit) crash(run, hit);
        else recycleGoneRows(run);
    }

    function crash(run, { row, asteroid }) {
        stopMusic(run);
        hide(run, asteroid.sprite);
        hide(run, run.ship);
        if (run.flameShown) hide(run, run.flameShown);
        run.flameShown = null;
        run.crashAt = { x: asteroid.x, y: row.y - asteroid.trailPx };
        run.breakShown = -1;
        run.explosionShown = -1;
        enterPhase(run, "crash");
    }

    // Moves from one frame of a sequence to the next; past the last, none shows.
    function advance(run, frames, shown, wanted, x, y) {
        if (shown === wanted) return wanted;
        if (shown >= 0) hide(run, frames[shown]);
        if (wanted < frames.length) show(run, frames[wanted], x, y);
        return wanted;
    }

    function crashStep(run, elapsed) {
        run.breakShown = advance(run, run.breakFrames, run.breakShown, Math.min(run.breakFrames.length, Math.floor(elapsed / BREAK_FRAME_MS)), run.crashAt.x, run.crashAt.y);
        run.explosionShown = advance(run, run.explosionFrames, run.explosionShown, Math.min(run.explosionFrames.length, Math.floor(elapsed / EXPLOSION_FRAME_MS)), run.shipX, run.shipCentreY);
        if (elapsed < CRASH_MS) return;
        const panel = textSprite(run, TEXT_Z_INDEX, 900, 420, run.columnWidth * 0.8, dc => {
            dc.fillRect(0, 0, 900, 420, SCORE_PANEL_COLOR);
            drawCentredText(dc, run.texts.score, 70, COLORS.description, { x: 0, y: 60, width: 900, height: 120 });
            drawCentredText(dc, String(run.score), 150, COLORS.gold, { x: 0, y: 170, width: 900, height: 230 });
        });
        show(run, panel, run.width / 2, run.height * 0.42);
        enterPhase(run, "score");
    }

    function frame(run) {
        const now = nowMs();
        const gap = now - run.lastFrameMs;
        run.lastFrameMs = now;
        const elapsed = now - run.phaseStartMs;
        if (run.phase === "splash") splashStep(run, elapsed);
        else if (run.phase === "playing") play(run, Math.min(gap, LONGEST_STEP_MS), now);
        else if (run.phase === "crash") crashStep(run, elapsed);
        else if (run.phase === "score" && elapsed >= SCORE_MS) leave(run);
    }

    // The table's update() flashes the wheel, so its sound comes back under
    // the backdrop, which goes a moment later with the buttons.
    function leave(run) {
        if (run.phase === "leaving") return;
        run.phase = "leaving";
        // Already stopped by the crash, unless a failure ends the game.
        stopMusic(run);
        if (run.frameTimer !== null) host.clearInterval(run.frameTimer);
        run.frameTimer = null;
        host.clearTimeout(run.prepareTimer);
        quietWheel().release(SCRIPT_NAME, { atOnce: true });
        host.setTimeout(safeHandler(SCRIPT_NAME, () => run.opening.close()), LEAVING_MS);
    }

    // Through the opening's close(): the layers go, the buttons are the wheel's again.
    function finish(run) {
        if (running !== run) return;
        running = null;
        stopMusic(run);
        // First: a layer that cannot be removed must not keep its toast away.
        rules().finish(EASTER_EGG.ROCKET);
        for (const layer of run.layers) run.placed.remove(layer);
    }

    // A failure is logged once, and gives the wheel back.
    function guarded(run, step) {
        return safeHandler(SCRIPT_NAME, () => {
            if (running !== run || run.phase === "leaving") return;
            try {
                step();
            } catch (error) {
                leave(run);
                throw error;
            }
        });
    }

    function showBackdrop(run) {
        const size = run.placed.measureWindow(BACKDROP_Z_INDEX);
        run.width = size.width;
        run.height = size.height;
        run.columnWidth = Math.min(run.width, run.height * COLUMN_RATIO);
        run.columnLeft = (run.width - run.columnWidth) / 2;
        run.laneWidth = run.columnWidth / LANES;
        // Never placed: shows at the window's size.
        const backdrop = run.placed.create(BACKDROP_Z_INDEX);
        run.layers.push(backdrop);
        backdrop.clear(SPACE_COLOR);
        run.placed.show(backdrop);
        backdrop.alpha = 1;
        run.prepareTimer = host.setTimeout(guarded(run, () => prepare(run)), BACKDROP_PAINT_MS);
    }

    // Only a flipper acts, once per press (the fair patterns assume one press
    // per lane), during the game itself.
    function onMove(run, direction, isRepeat) {
        if (isRepeat || run.phase !== "playing") return;
        const lane = run.lane + direction;
        if (lane < 0 || lane >= LANES) return;
        run.lane = lane;
        run.glideFromX = run.shipX;
        run.glideToX = laneX(run, lane);
        run.glideStartMs = nowMs();
        navigationSound.play();
    }

    function start() {
        const run = {
            placed: createPlacedLayers(host), texts: texts(), phase: "preparing", opening: null, frameTimer: null, prepareTimer: null, music: null,
            layers: [], scrolling: [], laneLines: [], freeAsteroids: [], rows: [], queue: [], flameShown: null,
            width: 0, height: 0, score: 0, playMs: 0, nextEventInMs: 0, phaseStartMs: 0, lastFrameMs: 0, glideStartMs: 0,
        };
        running = run;
        const ignore = () => {};
        run.opening = screen.open(
            { onMove: (direction, isRepeat) => onMove(run, direction, isRepeat), onChoose: ignore, onExit: ignore, close: () => finish(run) },
            { holdsAttractMode: true },
        );
        run.opening.ready();
        // After the cancelled launch's call.
        host.setTimeout(guarded(run, () => showBackdrop(run)), 0);
    }

    // Fires at every launch, before any other listener of the pack.
    function onPrelaunch(ev) {
        if (running || ev.command !== host.getBuiltInCommand("PlayGame") || host.isLaunchStartedByPack()) return;
        if (!rules().tryWin(EASTER_EGG.ROCKET, { canPlay })) return;
        ev.preventDefault();
        // Backglass Clock, High Scores, the NVRAM watch and the vpxtool runner
        // would wait for a "postlaunch" that a cancelled launch never fires.
        ev.stopImmediatePropagation();
        log(`The launch of "${ev.game ? ev.game.title : "?"}" turns into the Rocket.`);
        start();
    }

    host.on("prelaunch", safeHandler(SCRIPT_NAME, onPrelaunch));

    // For the wheel dialog queue: nothing shows over the game.
    return { screen };
}
