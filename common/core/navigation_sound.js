// ============================================================
// Navigation sound: PinballY's Prev.wav and Next.wav, played on each move
// through a drawn list or carousel, and its other button sounds through
// createButtonSound(), following PinballY's own button sound settings.
// - The owner's sound in Media\Button Sounds (a silence, say) wins over PinballY's.
// - Buttons.Mute, MuteAutoRepeat and Volume are read at each press: the menus change them live.
// - load() reads the file ahead of the first press, which it would slow down.
// - A missing or unplayable file is logged once, then stays silent.
// ============================================================

const BUTTON_SOUNDS_FOLDER = "Button Sounds";
// Enough for a held button: a player is still playing when asked again.
const NAVIGATION_SOUND_PLAYERS = 3;
const FULL_VOLUME = 100;

// direction: 1 for Next, -1 for Prev; isRepeat: a held button's auto-repeat.
export function createNavigationSound(host, scriptName) {
    const next = createButtonSound(host, scriptName, "Next", NAVIGATION_SOUND_PLAYERS);
    const prev = createButtonSound(host, scriptName, "Prev", NAVIGATION_SOUND_PLAYERS);
    return {
        isLoaded: () => next.isLoaded() && prev.isLoaded(),
        load() {
            next.load();
            prev.load();
        },
        play(direction, isRepeat = false) {
            (direction < 0 ? prev : next).play(isRepeat);
        },
    };
}

// soundName: the file name in PinballY's button sounds, without ".wav";
// playerCount: 1 for a sound never played twice in quick succession.
export function createButtonSound(host, scriptName, soundName, playerCount) {
    // Null until loaded; false once it failed, so it is logged only once.
    let rotation = null;

    function disable(error) {
        rotation = false;
        host.log(`[${scriptName}] ${soundName} sound disabled: ${error.message}`);
    }

    // PinballY's own copy, in its program folder, when the search finds none.
    const filePath = () => host.resolveGlobalSound(BUTTON_SOUNDS_FOLDER, soundName)
        ?? `${host.getProgramFolder().replace(/\\+$/, "")}\\Assets\\${BUTTON_SOUNDS_FOLDER}\\${soundName}.wav`;

    function isMuted(isRepeat) {
        if (host.settings.getBool("Buttons.Mute", false)) return true;
        return isRepeat && host.settings.getBool("Buttons.MuteAutoRepeat", false);
    }

    function volume() {
        const percent = host.settings.getInt("Buttons.Volume", FULL_VOLUME);
        return Number.isFinite(percent) ? Math.max(0, Math.min(FULL_VOLUME, percent)) : FULL_VOLUME;
    }

    return {
        // True once load() ran, whether the sound plays or was disabled.
        isLoaded: () => rotation !== null,
        load() {
            if (rotation !== null) return;
            try {
                rotation = host.createSoundRotation(filePath(), playerCount);
            } catch (error) {
                disable(error);
            }
        },
        play(isRepeat = false) {
            if (!rotation) return;
            try {
                if (isMuted(isRepeat)) return;
                rotation.play(volume());
            } catch (error) {
                disable(error);
            }
        },
    };
}
