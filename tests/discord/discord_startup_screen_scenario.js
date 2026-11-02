// ============================================================
// Discord Rich Presence tests' start on the Startup Screen, without Discord:
// main.js with the Profile picker and the Welcome Screen, a pick after the
// time the test gives, and readers of the Warning Toasts drawn. Never loaded
// by PinballY.
// ============================================================

import { startOnProfilePicker, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { press, WELCOME_SCREEN_FADE_IN_MS } from "../welcome_screen/welcome_screen_reader.js";
import { toastCardsDrawn } from "./discord_scenario.js";

// The carousel draws at the toasts' z-index too.
export const warningCardsDrawn = fake => toastCardsDrawn(fake).filter(card => card.startsWith("WARNING | "));

// The Profile picker open for pickAfterMs, then the pick: the Welcome Screen
// is open when it returns.
export async function reachWelcomeScreen(pickAfterMs) {
    const { fake, settle } = await startOnProfilePicker({ addOns: ["startupChoicePrompt", "profilePicker", "discordRichPresence"] });
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS + pickAfterMs);
    await settle();
    press(fake, "Select");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_FADE_IN_MS * 2);
    return { fake, settle };
}

export function closeWelcomeScreen(fake) {
    press(fake, "Exit");
}
