// ============================================================
// Makes every text drawn through PinballY's StyledText throw while run()
// runs, as DirectWrite failing would: a screen drawing then fails part
// way, its error logged with "ERROR" (read with errorLines(fake)).
// Restores StyledText afterwards, even when run() throws; once its promise
// settles when it returns one (a settle() for zero-delay timers). Never loaded by PinballY.
// ============================================================

export const FAILING_DRAW_MESSAGE = "DirectWrite is gone";

export function whileDrawsFail(run) {
    const RealStyledText = globalThis.StyledText;
    const restore = () => { globalThis.StyledText = RealStyledText; };
    globalThis.StyledText = class {
        constructor() { throw new Error(FAILING_DRAW_MESSAGE); }
    };
    let result;
    try {
        result = run();
    } catch (error) {
        restore();
        throw error;
    }
    if (result && typeof result.then === "function") return result.finally(restore);
    restore();
    return result;
}
