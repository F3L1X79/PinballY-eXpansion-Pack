---
status: accepted
---

# The quiet wheel lowers the table's own audioVolume for a while

While the Profile picker or the Welcome Screen dims the wheel, the selected table's video sound drops to half the recorded level: its `audioVolume` is capped at 50, and a table already set at or below 50 is left alone, with no `update()`. PinballY gives scripts no global volume, so the pack lowers that table's own `audioVolume` with `GameInfo.update()` and puts the original value back when the last screen closes. The value is per table and persisted by PinballY (`GameStats.csv`, at PinballY's own saves, not at `update()`), so the original waits in a pending file of the pack and is put back at the next startup if PinballY quit while it was lowered. The prototype on the cabinet (branch `prototype/quiet-wheel`) showed that `update()` changes the volume of the video already playing at once.

## Considered Options

- **`MuteVideos` / `MuteTableAudio` commands.** Rejected: they silence the table instead of lowering it, and they are toggles PinballY saves.
- **The Windows mixer volume, through `dllImport`.** Rejected: it would lower the pack's own sounds too (Profile picker sound, Profile Greeting).
- **The "Video/table audio volume" option.** Rejected: no documented way to change it while PinballY runs.
- **A fade on the drop or the rise.** Rejected: every `update()` makes the wheel flash, even under the dimmed veil, so a fade flashes once per step; the drop and the return are a single `update()` each, apart from the climb described below.

## Consequences

- When the last screen closes, the return waits a short hand-over (150 ms), so a screen that follows holds the wheel again with no rise in between. A screen that closes with nothing to follow (a launch from the Welcome Screen, the startup veil giving way to a launch, a menu or attract mode) brings the volume back at once, before the wheel moves or the table launches. A launch, a native menu or attract mode starting during the hand-over ends it at once too.
- The Welcome Screen holds the wheel from its turn in the wheel dialog queue, where it is drawn at once, so the Profile picker that it follows never lets the volume rise.
- The quiet volume is never left behind: the startup restore runs before any screen lowers it again.
- A hold can give its own ceiling, 0 silencing the table. A stricter hold takes a table already lowered further down, and it comes back up only when the last hold ends.
- **A deliberate exception to "one `update()` each way, never a fade": the climb.** A release can ask to come back in equal time steps along a curve, one `update()` per step. It exists for the Easter Eggs' Menu Glitch, where the flashes are part of the effect. The screens that only dim the wheel keep their single `update()`. The pending file stays until the last step, so a crash during the climb restores the table at the next start. A hold, a launch or attract mode ends the climb at once with the original volume written; a menu opening does not.
- An operator who changes the table's volume with Adjust Audio Volume cannot do so while the volume is lowered, since the screens hold the wheel; the restore puts back the value read at the drop.
