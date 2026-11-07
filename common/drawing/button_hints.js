// ============================================================
// The words of the drawn screens' Exit Button and Button Hints (see
// GLOSSARY.md), from the shared texts (lang.buttonHints): the Exit Button's
// look by where Exit leads, its tooltip word, and the footer's groups of
// key caps and words for steamball_drawing.js's drawButtonHints(). Only
// texts: no drawing, no event, no side effect.
// ============================================================

import lang from "../core/i18n.js";
import { EXIT_BUTTON_LOOK } from "./steamball_drawing.js";

// What the flippers do on a screen: browse its choices, or scroll it.
export const FLIPPER_HINT = Object.freeze({ BROWSE: "browse", SCROLL: "scroll" });

// The look follows where Exit leads, never which screen it is: the back
// arrow when Exit brings back a screen or a menu (hasReturn), the cross
// when it leaves the bare wheel.
export const exitButtonLookOf = hasReturn => (hasReturn ? EXIT_BUTTON_LOOK.BACK : EXIT_BUTTON_LOOK.CLOSE);

// The Exit Button's tooltip, "Back" or "Close", also Exit's word in the footer.
export const exitButtonWordOf = look => (look === EXIT_BUTTON_LOOK.BACK ? lang.buttonHints.back : lang.buttonHints.close);

// The footer's groups, in capitals, left out for a button that does
// nothing there: flippers (a FLIPPER_HINT, or null), select (whether
// Select chooses, or its word when it does something else), exitLook
// (the Exit Button's look, which Exit's word follows).
export function buttonHintGroupsOf({ flippers = null, select = false, exitLook }) {
    const TEXT = lang.buttonHints;
    const upper = text => text.toLocaleUpperCase();
    const groups = [];
    if (flippers) groups.push({ keys: [upper(TEXT.keyCaps.prev), upper(TEXT.keyCaps.next)], label: upper(TEXT[flippers]) });
    if (select) groups.push({ keys: [upper(TEXT.keyCaps.select)], label: upper(typeof select === "string" ? select : TEXT.choose) });
    groups.push({ keys: [upper(TEXT.keyCaps.exit)], label: upper(exitButtonWordOf(exitLook)) });
    return groups;
}
