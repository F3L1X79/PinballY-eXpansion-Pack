// ============================================================
// Easter Egg scenarios' draw: the named Easter Egg wins each draw, the
// others never, and every other random of the pack stays the fake host's.
// Never loaded by PinballY.
// ============================================================

// name: the Easter Egg that wins, "" for none. Imported after the scenario
// sets the language: the rules load modules that read it.
export async function winTheDrawOf(name) {
    const { setEasterEggDraw } = await import("../../common/easter_eggs/easter_egg_rules.js");
    setEasterEggDraw(drawn => (drawn === name ? 0 : 0.99));
}
