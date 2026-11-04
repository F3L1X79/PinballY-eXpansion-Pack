// ============================================================
// The Backglass Clock Placement's controls: the Backglass Clock Add-on, which
// owns the clock's window, registers them at init; the eXpansion Pack Settings
// ask for them. No side effects on import.
// - Answers null while the Add-on isn't running (off, or turned on but PinballY not restarted yet).
// ============================================================

let controls = null;

// controls: { begin(), end() }; end() may run twice for one placement.
export function registerBackglassClockPlacement(placementControls) {
    controls = placementControls;
}

export const getBackglassClockPlacement = () => controls;
