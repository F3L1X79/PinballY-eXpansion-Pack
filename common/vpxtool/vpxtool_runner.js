// ============================================================
// Shared vpxtool runner: runs tools\vpxtool.exe hidden for any Add-on (used
// by the Table ROMs script reads), one run at a time in the order
// submitted, polling for the answer so PinballY never waits.
// - No run starts from "prelaunch" until back on the wheel, nor while a Script Reader install holds it.
// - A run that cannot even start is logged once and stops the runs until a Script Reader install ends.
// ============================================================

import { safeHandler, logHandlerError } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { getScriptReaderInstaller } from "../table_roms/script_reader_install.js";

export const VPXTOOL_RUN_TIMEOUT_MS = 60 * 1000;
const POLL_MS = 500;
// Names the errors of the runner's own event handlers.
const RUNNER_NAME = "VpxtoolRunner";

// isHeld: true while no run may start (a Script Reader install swapping vpxtool).
export function createVpxtoolRunner(host, { isHeld = () => false } = {}) {
    const vpxtoolPath = `${host.getProjectFolder()}\\tools\\vpxtool.exe`;
    // Each run: { scriptName (logs its errors), args, apply({ exitCode,
    // output }), fail(reason) when no answer comes in time }.
    const pending = [];
    // True from a table's launch until PinballY is back on the wheel.
    let gameUnderWay = false;
    // The run in progress: { startMs }, its time limit counted from startMs.
    let currentRun = null;
    // True once vpxtool could not even start: every run would fail alike.
    let stopped = false;

    // Calls a submitter's handler: its error is logged under its name and
    // never stops the runs after it.
    function callJob(job, handler, value) {
        try {
            handler(value);
        } catch (error) {
            logHandlerError(job.scriptName, error);
        }
    }

    function runNext() {
        currentRun = null;
        if (stopped || gameUnderWay || isHeld()) return;
        const job = pending.shift();
        if (!job) return;
        let run;
        try {
            run = host.runHiddenProgram(vpxtoolPath, job.args);
        } catch (error) {
            stopped = true;
            pending.unshift(job);
            logError(job.scriptName, `ERROR vpxtool could not start: ${error.message}; no vpxtool run until a Script Reader install or the next startup.`, host, error);
            return;
        }
        const thisRun = { startMs: host.now().getTime() };
        currentRun = thisRun;

        // Fires every POLL_MS until vpxtool answers or the time is up, which
        // never comes during a game. A vpxtool that never answers is left
        // running: the next run starts.
        const poll = safeHandler(job.scriptName, () => {
            try {
                const result = run.result();
                if (result === null && (gameUnderWay || host.now().getTime() - thisRun.startMs < VPXTOOL_RUN_TIMEOUT_MS)) {
                    host.setTimeout(poll, POLL_MS);
                    return;
                }
                if (result === null) callJob(job, job.fail, `no answer from vpxtool within ${VPXTOOL_RUN_TIMEOUT_MS / 1000} s`);
                else callJob(job, job.apply, result);
            } catch (error) {
                // A failing result() must still let the next run start.
                logHandlerError(job.scriptName, error);
            }
            runNext();
        });
        host.setTimeout(poll, POLL_MS);
    }

    // Goes on with the runs left, unless one is in progress.
    function resume() {
        if (currentRun === null) runNext();
    }

    function endGame() {
        if (!gameUnderWay) return;
        gameUnderWay = false;
        // The game slowed the run in progress: it gets its full time again.
        if (currentRun) currentRun.startMs = host.now().getTime();
        resume();
    }

    host.on("prelaunch", safeHandler(RUNNER_NAME, () => {
        gameUnderWay = true;
        // A tick later, a launch another script cancelled shows no runMode:
        // PinballY stayed on the wheel and fires no other launch event.
        host.setTimeout(safeHandler(RUNNER_NAME, () => {
            if (host.getFullUIMode().runMode === undefined) endGame();
        }), 0);
    }));
    // Pauses again should PinballY report the launch only after that tick.
    host.on("gamestarted", safeHandler(RUNNER_NAME, () => { gameUnderWay = true; }));
    // A failed launch fires "launcherror" instead of the game's events.
    for (const eventName of ["postlaunch", "launcherror"]) host.on(eventName, safeHandler(RUNNER_NAME, endGame));
    // Fires on every return to the wheel, also after a menu opened during a game.
    host.on("wheelmode", safeHandler(RUNNER_NAME, () => {
        if (host.getFullUIMode().runMode === undefined) endGame();
    }));

    return {
        vpxtoolPath,
        hasVpxtool: () => host.files.fileExists(vpxtoolPath),
        // Starts the run at once when nothing holds it, else after the others.
        submit: (job) => {
            pending.push(job);
            resume();
        },
        // Goes on with the runs left once a Script Reader install has ended,
        // trying again a vpxtool that could not start.
        resume: () => {
            stopped = false;
            resume();
        },
        // True while a vpxtool run waits for its answer.
        isBusy: () => currentRun !== null,
    };
}

let sharedRunner = null;

// The one runner of the pack, which a Script Reader install waits for and holds.
export function getVpxtoolRunner() {
    if (!sharedRunner) {
        const installer = getScriptReaderInstaller();
        sharedRunner = createVpxtoolRunner(createPinballYHost(), { isHeld: installer.isRunning });
        installer.waitWhile(sharedRunner.isBusy);
        installer.onFinished(sharedRunner.resume);
    }
    return sharedRunner;
}
