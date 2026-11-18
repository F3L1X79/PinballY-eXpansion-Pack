---
status: accepted
---

# The import line is a dynamic import with a catch

The README tells the player to add a dynamic import with a `.catch`, `import("./ExpansionPack/main.js").catch(e => logfile.log(…));`, to `Scripts\main.js`, not the static `import "./ExpansionPack/main.js";` of ADR 0009 and of PinballY's own examples. With the static line, a missing pack folder stops the whole of `Scripts\main.js`, so the player's own scripts never run. The dynamic line keeps them running, and the pack still loads in time for every startup screen.

Checked on the cabinet (PinballY 1.1.0 Beta 10, #339):

- **Static line, folder missing**: no script runs; PinballY logs `Error loading <path>`.
- **Dynamic line, folder present**: the pack loads before the Startup Screen, the Profile picker and the Welcome Screen, as with the static line.
- **Dynamic line, folder missing**: the player's line runs; PinballY logs `Error loading <path>`, and the `.catch` logs nothing (the promise never settles).
- **Dynamic line, the pack throws while loading**: the player's line runs; PinballY logs nothing, only the `.catch` logs `ExpansionPack: <message>`.
- **Dynamic line, a broken External Add-on imported before it** (#545, `Scripts\LaunchVideo.js` saved as GitHub's HTML page): that script fails with `Unexpected token '<'`, and the pack's import fails right after it, even as a separate dynamic import. PinballY logs only `[Script] ExpansionPack: fetch import module failed`; no pack code runs, so nothing reaches the Info Log.

So the dynamic line keeps the player's scripts running when the pack is missing, but it does not keep a broken External Add-on from stopping the pack. The `.catch` is then the only code that runs, so the line now says where to look: `import("./ExpansionPack/main.js").catch(e => logfile.log("ExpansionPack not loaded (" + e.message + "): look for a script error just above in this log"));`. The guide page "With your External Add-ons" tells the owner to read `PinballY.log` and to download scripts with GitHub's Raw button.

## Considered Options

- **Keep the static line.** Rejected: an update cut halfway, a badly extracted zip or a bug at load time would silently take the player's own scripts down with the pack.
- **The dynamic line without `.catch`.** Rejected: a pack that throws while loading would leave no trace at all in `PinballY.log`.

## Consequences

- The player's own code in `Scripts\main.js` now runs before the pack, not after it.
- Cabinets installed with the static line, or with the earlier `.catch` that logs `ExpansionPack: <message>`, keep working; nothing migrates them, and a Pack Update never touches `Scripts\main.js`. The import order check finds both dynamic lines; with the static one, it logs that it could not check.
