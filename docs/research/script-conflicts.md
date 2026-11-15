# Research: other scripts that fight the pack over a PinballY screen or event

Question (roadmap `script-conflicts`, `docs/roadmap.html:330-352`): what PinballY lets a script see of the other scripts, which events and objects each of our Add-ons takes over, which third-party scripts are commonly shared and what they take, and whether a conflict can be seen at runtime. Origin: FD (VPForums) ran RichardL64's `LaunchVideo.js` next to the pack, and both took the launch overlay.

Date: 2026-11-15. Sources:
- The local help (`docs/pinbally/Help/*.html`, PinballY 1.1.0 Beta 10), cited as `Help/<file>:<line>`, and the digests `docs/pinbally/pinbally-help.md` and `docs/pinbally/pinbally-examples.md`.
- The earlier research `docs/research/system-scripts.md` (SystemClasses.js and C++ line numbers, read at upstream commits `a452891` / `d84763e`) and `docs/research/distribution-install-and-updates.md` (module loading, cabinet check #339).
- `SystemClasses.js` at `https://raw.githubusercontent.com/mjrgh/PinballY/a452891/scripts/system/SystemClasses.js`, read again on 2026-11-15 through WebFetch, which gives a summary and short quotes, not line numbers. Points read only this way are marked **(WebFetch)**.
- Third-party scripts: their raw GitHub files, read through WebFetch the same way. Line numbers there are approximate.
- Our code, cited as `<path>:<line>`.

**Fact** = read in a primary source. **Inference** = my reading, not checked at runtime. **To check on the cabinet** = can only be settled there.

**Not reachable from this sandbox:** `vpforums.org` and `vpuniverse.com` (WebFetch failed on both, with no output). The VPForums and VPUniverse threads below are known only from search-result summaries, so what they say is not verified. `api.github.com` code search was not tried (blocked in earlier research, `system-scripts.md`:12). So the third-party list covers the GitHub repositories the search found. It is not a census of the forums.

## Verdict

1. **PinballY has no script registry.** It loads one file, `Scripts\main.js`, and every other script runs only because some file `import`s it (`Help/Javascript.html:395`). The pack is itself one of those imports: the player's `Scripts\main.js` loads it with a dynamic `import("./ExpansionPack/main.js")` (`README.md:52-54`). No documented API lists the loaded modules or the listeners of an event.
2. **Listeners can still be enumerated, through an undocumented internal.** `EventTarget` keeps its listener table under a `Symbol` created inside a closure (WebFetch). `Object.getOwnPropertySymbols(mainWindow)` reaches it (Inference: standard ES2015, not tried in ChakraCore). Each entry holds the listener function, whose `name` or source text could identify a known script (Inference).
3. **Order: a script the player imports statically registers before the pack.** A static import is evaluated before the body of `Scripts\main.js`, and the pack's dynamic import only runs from that body (Inference: ECMAScript module semantics, not traced on the cabinet). Listeners run in registration order (`system-scripts.md` §1.3). So in FD's setup `LaunchVideo.js` ran first, and our Seamless Launch Overlay ran second and drew over its video (§4).
4. **An earlier listener's cancel is visible.** `ev.defaultPrevented` is documented (`Help/Event.html:60-61`), and we already read it in six places. Writable event fields (`ev.message`, `ev.hideWheelImage`, `ev.filename`, `ev.items`) also show what an earlier listener wrote. A later listener's effect is not visible, and neither is the content of `launchOverlay.bg` (no getter, `Help/DrawingLayer.html`).
5. **The `Scripts` folder can be read.** The pack already lists files and reads text through `Scripting.FileSystemObject` and `ADODB.Stream` (`common/core/pinbally_host.js:218-275`). A file in `Scripts` is not proof that it runs: RichardL64's own `Main.js` keeps `LaunchVideo.js` in the folder but comments its import out (§3.1).
6. **The launch overlay is the hot spot.** It is taken by the PinballY help's own examples, the official Add-ons repository, RichardL64's two launch scripts and timhobbs's `launchAnimations.js`. The backglass shown and hidden around a game comes next (the help's "Hide a Window During Play", timhobbs's `toggleWindows`), then a cancelled `prelaunch` (RichardL64's `Spin.js`).

## 1. What PinballY exposes about other scripts

### 1.1 How scripts are loaded

**Facts**
- "By default, PinballY only loads one file, Scripts\main.js" (`Help/Javascript.html:395`). Other files run only through `import` or dynamic `import()` (`Help/Javascript.html:392-430`).
- Before `main.js`, PinballY runs `Scripts\System\CParser.js`, then `SystemClasses.js`, as classic scripts. `main.js` is then loaded as a module (`system-scripts.md` §1.1, `PlayfieldView.cpp#L682-L707`, `#L1316`). The System scripts register no listener of their own (`system-scripts.md` §1.3).
- After loading `main.js`, PinballY runs pending tasks up to 100 times, "so that imported modules can receive events generated during startup" (`distribution-install-and-updates.md` §1, `PlayfieldView.cpp#L1318-L1332`).
- A relative specifier is resolved against the importing file's folder (`JavascriptEngine.cpp#L1875-L1907`, `distribution-install-and-updates.md` §1). RichardL64's bare `import "AutoOff.js"` therefore names `Scripts\AutoOff.js` (Inference from the same code).
- The pack lives in `Scripts\ExpansionPack\`, started by one line in the player's own `Scripts\main.js`: `import("./ExpansionPack/main.js").catch(…)` (`README.md:51-54`, `docs/guide/en/install.md:14-19`, ADR 0009/0019). Checked on the cabinet (#339): with the dynamic line, the player's code runs even when the pack is missing or throws (`distribution-install-and-updates.md` §1).
- The pack's own `main.js` imports every Add-on statically, but registers their listeners in a fixed order, through `module.default()` in the `SCRIPTS` loop (`main.js:100-147`, `:262-280`). `easterEggs.installFirstListeners()` and the Profile store come before that loop (`main.js:153-174`).

**Inference**
- Order between the player's scripts and ours: in a module, static imports are evaluated before the importing module's body. The dynamic `import()` call sits in that body and settles in a later job. So every listener registered at top level by a statically imported third-party script comes **before** all of ours. A third-party script loaded with its own dynamic `import()` may land before or after ours. **To check on the cabinet**, with `LOG_LAUNCH_EVENTS` and a test script that logs on `launchoverlayshow`.
- Some of our listeners are registered later than init, on first use: for example `drawn_screen_controls.js:74-79` (`listen()` on the first `open`). Those come after any third-party listener registered at load time.

### 1.2 Can a script list the loaded scripts or the listeners?

**Facts**
- No documented API lists the modules or the listeners. The help documents `on`, `one`, `off`, `addEventListener`, `removeEventListener` and `dispatchEvent` (`pinbally-help.md`:245). `Help/EventTarget.html` has no listing method.
- In `SystemClasses.js`, `EventTarget` stores the listeners in `this[_listeners]`, where `_listeners = Symbol("_listeners")` is created inside the module's closure. Each type maps to an array of `{ namespaces, listener, options }` (WebFetch). `dispatchEvent` reads `this[_listeners][event.type]` and calls each `listener` with `this` set to the target (WebFetch; `system-scripts.md` §1.3, `#L504-L521`).
- `mainWindow` is `new MediaWindow("playfield")`, and `MediaWindow` extends `EventTarget` (WebFetch). `on`, `one`, `off`, `addEventListener`, `removeEventListener` and `dispatchEvent` are class methods, so they live on `EventTarget.prototype`. `on()` and `one()` call a module-internal helper, not `this.on` (WebFetch).

**Inference** (not tried in ChakraCore)
- `Object.getOwnPropertySymbols(mainWindow)` returns that symbol, so `mainWindow[symbol]["launchoverlayshow"]` lists every listener registered so far, in order, ours included. This is an internal detail: it can change with a PinballY version, and the System scripts must already match the exe (`system-scripts.md` §3.6).
- A listener's `name` (`myOverlayShow` in `LaunchVideo.js`) or its source text, from `Function.prototype.toString`, could identify a known script. Arrow functions have no useful name (timhobbs's `launchAnimations.js` uses them). Nothing gives the file a listener came from.
- Wrapping `EventTarget.prototype.on` from the pack would only see the registrations made after the pack loads. Per §1.1, those exclude every statically imported script.
- Whether the C++ calls `dispatchEvent` through a property lookup, so that wrapping it would see each native event, was not checked (`JavascriptEngine.h#L979-L1003` is cited in `system-scripts.md` only for the exception path).

### 1.3 Reading the `Scripts` folder

**Facts**
- `createAutomationObject(progId)` is the equivalent of `CreateObject`. `Scripting.FileSystemObject` gives file access (`pinbally-help.md`:226, `Help/OLEAutomation.html`).
- The pack already has `listFiles`, `listFolders`, `fileExists` and `readText` (UTF-8 through `ADODB.Stream`) in its host (`common/core/pinbally_host.js:218-275`), plus `getProgramFolder()` from `systemInfo.programDir` (`common/core/pinbally_host.js:667`). `Scripts\` is `<programDir>\Scripts` (`system-scripts.md` §6).
- Community scripts use the same object: FlexDMD for `FileExists` (`pinbally-examples.md`:51) and PinMAME_functions for `OpenTextFile` (`pinbally-examples.md`:88).
- Files are read in the ANSI code page unless they start with a BOM (`system-scripts.md` §1.1). That only matters for non-ASCII text in a script read as data.

**Inference**
- A file present in `Scripts` may not run: `Main.js` may leave its import commented out (RichardL64, §3.1; timhobbs, §3.3). Only following the imports from `Scripts\main.js`, our own line skipped, tells which files run. Dynamic imports with computed paths cannot be followed (wheel-actions does `import(path)`, `pinbally-examples.md`:129).
- A text search for `launchoverlayshow` plus `preventDefault` would also match a script that only listens without harm, and code inside comments.

### 1.4 Two listeners on the same event

**Facts**
- Listeners run synchronously, in registration order, on a copy of the list (`system-scripts.md` §1.3, `SystemClasses.js#L504-L521`).
- `preventDefault()` only sets a flag, and only if the event is cancelable (WebFetch; `Help/Event.html:78-80`). Calling it twice changes nothing. It does **not** stop the later listeners: they still run (`Help/Event.html:78-95`; seen on the cabinet for `filterselect`, #515, `pinbally-help.md`:276).
- `stopPropagation()` does nothing, because nothing bubbles. `stopImmediatePropagation()` skips the later listeners on the same target (`Help/Event.html:82-98`).
- `dispatchEvent` returns `!(cancelable && defaultPrevented)`. The C++ skips the default action if any listener prevented it (`system-scripts.md` §1.3, `#L545`).
- A listener that throws skips the later listeners, and the C++ then runs the default action even after `preventDefault()` (`system-scripts.md` §3.2, §4.2). Every listener of ours is wrapped in `safeHandler` (`system-scripts.md` §3.2). Third-party scripts are not: none of the ones read in §3 has a `try/catch` (WebFetch, `LaunchVideo.js`).
- Side effects are not events: two scripts that both call `launchOverlay.bg.clear()` / `loadVideo()`, `showWheel()` or `showWindow()` simply act in turn. `clear(argb)` "Clears any video or graphics displayed in the layer" (`Help/DrawingLayer.html:296-300`).

**Inference**
- For the launch overlay, the last listener to touch `launchOverlay.bg` sets what the player sees, until a later event (`gamestarted`, `"gameover"`) changes it again.

## 2. What our Add-ons take over

Only the takeovers another script could fight over are listed: a `preventDefault`, a shared PinballY object written, or a window shown or hidden. Listeners that only read are left out.

| Add-on (or module) | Event / object | What it does | Where |
|---|---|---|---|
| Seamless Launch Overlay | `launchoverlayshow` (cancelled) | `showWheel(false)`, `setUnderlay("")`, `launchOverlay.bg.clear(0x20FF00FF)`, `preventDefault()`, then the Loader at z 5999 on the main window and the backglass | `addons/seamless_launch_overlay.js:33-40` |
| Seamless Launch Overlay | `launchoverlaymessage` (cancelled) | `preventDefault()` on every message; shows or hides the Loader by `ev.id` | `addons/seamless_launch_overlay.js:50-64` |
| Seamless Launch Overlay | `launchoverlayhide` | `showWheel(true)`, Loaders hidden | `addons/seamless_launch_overlay.js:66-70` |
| UI Translation | `launchoverlaymessage` | Writes `ev.message` from the translation keyed by `ev.id` | `addons/ui_translation.js:55-59` |
| UI Translation | `menuopen` | Translates every `ev.items` title in place, `menuUpdated = true`; logs untranslated titles when `logUntranslatedMenuTitles` is on, so a third-party entry is logged too | `addons/ui_translation.js:24-51` |
| Drawn Menus | `menuopen` (cancelled) | Draws every menu, other scripts' menus included, and cancels the native one with `menuUpdated = false` | `addons/drawn_menus.js:45-101` |
| High Scores | `menuopen`, `command` (cancelled) | Removes PinballY's High Scores entry; cancels `HighScores` unless already prevented | `addons/high_scores.js:96-115` |
| Menu Cleanup, Custom Menu Commands, main menu module | `menuopen` | Remove entries and add "Table Setup", "Manage profiles" and the pack's main-menu entries | `addons/menu_cleanup.js:43-59`, `addons/custom_menu_commands.js:49-63`, `common/menus/main_menu.js:144`, `:183` |
| Force Backglass | `backglassWindow.showWindow` | Forced shown at startup (deferred), hidden on `gamestarted`, shown on `gameover`; rewrites `BackglassWindow.Visible` | `addons/force_backglass.js:20-41` |
| Backglass Clock | own borderless window | Shown on `prelaunch`, hidden on `gameover` / failed `postlaunch` | `addons/backglass_clock.js:145-188` |
| Wheel Arc | underlay | `setUnderlay()` at startup; rewrites `ev.filename` on `underlaychange` when it is PinballY's default | `addons/wheel_arc.js:26-36` |
| Status Line Info | `statusLines.upper` / `.lower` | Adds fixed slots after the player's own messages | `addons/status_line_info.js:80-82` |
| Wheel Order module | `gameList` `filterselect` (cancelled) | By year, cancels a filter choice and shows its sorted copy | `common/tables/wheel_order.js:266-275` |
| Attract Order | `attractmodestart`, `AttractMode.SwitchTime` | Takes over the attract switches unless prevented; writes the option | `common/tables/attract_order.js:24`, `:75`, `:88`, `:145-157` |
| Drawn Screen controls | `commandbuttondown` (cancelled), `attractmodestart` (cancelled + `stopImmediatePropagation`) | Swallows every button while a Drawn Screen is open; may hold off attract mode | `common/core/drawn_screen_controls.js:34-79` |
| Drawn Menu module, Profile picker, Settings, startup veil, blocking wait | `commandbuttondown` (cancelled) | Swallow buttons while shown | `common/drawn_menu/drawn_menu.js:713-717`, `addons/profile_picker.js:772-776`, `common/settings/expansion_pack_settings.js:410-411`, `common/drawing/startup_veil.js:74-75`, `common/drawing/blocking_wait.js:30-31` |
| Rocket (Easter Egg) | `prelaunch` (cancelled + `stopImmediatePropagation`) | Cancels a wheel launch; must be the pack's first `prelaunch` listener | `common/easter_eggs/rocket.js:24-33`, `main.js:151-157` |
| Launch-bound listeners | `prelaunch` … `postlaunch` | High Scores reads the board, nvram watch and vpxtool runner prepare, Backglass Clock shows; they expect the matching `postlaunch` | `addons/high_scores.js:418`, `:585`, `common/vpxtool/nvram_watch.js:49`, `:69`, `common/vpxtool/vpxtool_runner.js:93-104` |
| Quiet wheel | selected table's `audioVolume` | Lowers it while a screen dims the wheel; gives way on `launchoverlayshow` | `common/core/quiet_wheel.js:1-9`, `:165-171` |
| Clock, Status Icons, Profile badge, Challenge Card | main-window layers at z 4500 | Hidden on `gamestarted`, back on `wheelmode` | `common/clock/wheel_clock_layout.js:15`, `addons/profile_picker.js:51`, `common/challenges/challenge_card.js:19` |
| Play Launch Sound | `WMPlayer.OCX` | Plays a sound on `gamestarted`, stops it on `gameover` | `addons/play_launch_sound.js:49-60` |

**Facts about how we already react to an earlier listener:** we read `ev.defaultPrevented` in `addons/high_scores.js:110`, `addons/profile_picker.js:774`, `common/core/attract_mode.js:15`, `common/core/drawn_screen_controls.js:38`, `common/drawn_menu/drawn_menu.js:715` and `common/tables/attract_order.js:147`. None of the launch-overlay or `prelaunch` listeners reads it (grep of `addons/` and `common/`).

## 3. Commonly shared third-party scripts

### 3.1 RichardL64 (Richard Lincoln), `Visual-Pinball/PinballY`

Repository: https://github.com/RichardL64/Visual-Pinball/tree/main/PinballY. Files: `AttractFade.js`, `AutoOff.js`, `DMDImage.js`, `Filter.js`, `FilterTop.js`, `FlexDMD.js`, `LaunchFade.js`, `LaunchVideo.js`, `Main.js`, `Spin.js`, `Startup.js` (GitHub listing, possibly truncated). The repository README says `LaunchVideo.js` "does not co-exist with LaunchFade" (search summary).

`Main.js` (https://raw.githubusercontent.com/RichardL64/Visual-Pinball/main/PinballY/Main.js) imports `AutoOff.js`, `Filter.js`, `Spin.js`, `LaunchFade.js`, `FlexDMD.js`, `AttractFade.js` and `FilterTop.js` statically, and comments out `//import "LaunchVideo.js";` and `//import "Startup.js"`. These are classic top-level scripts: no export, listeners registered at load.

| Script | Events / objects (WebFetch of the raw file) |
|---|---|
| `LaunchVideo.js` (April 2022, ~60 lines) | `launchoverlayshow` → `launchOverlay.bg.loadVideo(...)` of `resolveMedia("Launch Videos", game.mediaName, "Video")`, falling back to `"Launch"`, then `preventDefault()`. `launchoverlaymessage` → `ev.hideWheelImage = true; ev.message = "";` (no `preventDefault`). `gamestarted` → `launchOverlay.bg.clear(0xff000000)`. No `showWheel`, no `setUnderlay`, no `try/catch`. |
| `LaunchFade.js` (~41 lines) | `launchoverlayshow` → `launchOverlay.bg.clear(0xcc000000)`, `showWheel(false)`, `preventDefault()`. `launchoverlaymessage` → `ev.hideWheelImage = true`. `gameover` and `launcherror` → `showWheel(true)`. |
| `Spin.js` (~95 lines) | `joystickaxischange` (plunger) → `doButtonCommand("Next", …)` in a `setTimeout` loop; `prelaunch` → `preventDefault()` when the launch comes within a delay after the plunger release. |
| `AttractFade.js` (~45 lines) | `attractmodestart` / `attractmodeend` → layers at z 1000 on `mainWindow`, `dmdWindow` and `backglassWindow`, cleared to `0xcc000000` and back to transparent. |
| `AutoOff.js` (~55 lines) | `attractmodestart` / `attractmodeend`; `statusLines.attract.setText(0, …)`; `setInterval`; `doCommand(command.PowerOffConfirm)`. |
| `Filter.js` (~60 lines) | `keyup` (left/right Ctrl) → `gameList.setCurFilter(...)` and `gameList.dispatchEvent(new FilterSelectEvent())`, also once at load. |
| `FilterTop.js` (~143 lines) | `createFilter({ group: "[Top]" … })` twice; `gameList.on("filterselect")` to remember the last filter. |
| `FlexDMD.js` (~600 lines, credited to vbousquet, adjusted by R.Lincoln and GSadventure) | `gameselect`, `highscoresready`, `prelaunch`, `postlaunch`, `attractmodestart`, `attractmodeend`; `dmdWindow.createDrawingLayer(1000)`; COM `FlexDMD.FlexDMD` and `Scripting.FileSystemObject`. No `launchOverlay`, no `preventDefault`. |
| `Startup.js` (~48 lines) | Plays a random game of `Category.Startup` with `mainWindow.playGame` after `setTimeout(…, 100)`; `launchoverlaymessage` → `ev.message = "Loading startup game..."`. |

`DMDImage.js` was not read.

### 3.2 The official repository, `PinballY/PinballY-Addons-and-Examples`

Read in detail in `docs/pinbally/pinbally-examples.md` (shallow clone of 2026-09-23). The folder list was confirmed again on 2026-11-15 (https://github.com/PinballY/PinballY-Addons-and-Examples). Takeovers only:

| Example | Events / objects |
|---|---|
| `seamless-launch` | `launchoverlayshow` → `showWheel(false)`, `setUnderlay("")`, `bg.clear(0x20FF00FF)`, `preventDefault()`; `launchoverlayhide` → `showWheel(true)` (`pinbally-examples.md`:92-97). The same code as our Add-on's first four calls. |
| `seamless-launch-spinner` | `launchoverlayshow` → `bg.loadVideo(resolveMedia("Videos", "Loading", "video"))` (`pinbally-examples.md`:99-100). |
| `FlexDMD` (official copy) | `launchoverlayshow` → `bg.loadImage(...)` + `preventDefault()`, `gamestarted` → `bg.clear(0xff404040)`; `command.PlayGame` cancelled to replace the launch (FX3); `menuopen` edits; `prelaunch`/`postlaunch` (`pinbally-examples.md`:50-62). |
| `command_example` | `menuopen` "main" → `addMenuItem({after: command.PlayGame}, {title: "Table setup", …})` (`pinbally-examples.md`:42-48). Our Custom Menu Commands adds "Table Setup" too (`addons/custom_menu_commands.js:1-4`). |
| `CategoryButtons` | `keydown` (Ctrl) → `preventDefault()`, `setCurFilter("Category.…")` (`pinbally-examples.md`:36-40). |
| `auto_shutdown` | `attractmodestart` / `attractmodeend`, `statusLines.attract.setText(0, …)`, `PowerOffConfirm` (`pinbally-examples.md`:22-25). |
| `show_instruction_card` | `keydown` while playing → `instCardWindow.showWindow(...)` and a new layer per press (`pinbally-examples.md`:102-105). |
| `two-tables-one-wheel` | `menuopen` after `PlayGame`, `playGame()` + `preventDefault()`, a metafilter (`pinbally-examples.md`:119-122). |
| `wheel-actions` | `menuopen` → `preventDefault()` + `stopImmediatePropagation()` for its fake games (`pinbally-examples.md`:124-131). |
| `start_random_table`, `sleep_computer`, `BatchCategoryTagging`, `MissingMediaFilter`, `meta_filters`, `additional_filters`, `menu_submenu_batch_file`, `PinMAME_functions` | Menu entries, filters and commands only (`pinbally-examples.md` §1). |

### 3.3 timhobbs, `PinballY-Scripts`

Repository: https://github.com/timhobbs/PinballY-Scripts. Its `main.js` imports `launchAnimations.js`, `tableEdit.js`, `forceCapture.js`, `showApronCard.js`, `vpcHighScores.js`, `submitScore.js` and `mediaCapture.js`, and comments out `gameEvents.js`, `randomLoadingAnimation.js` and `launchLoadingVideo.js` (raw `main.js`, WebFetch).

| Script | Events / objects (WebFetch of the raw file) |
|---|---|
| `launchAnimations.js` (~126 lines) | `launchoverlayshow` → `bg.loadVideo(animation)` + `preventDefault()` (~L74-L77); `gamestarted` → `bg.clear(0xff000000)` after `setTimeout(…, 5000)` (~L89-L90); `launchoverlaymessage` → `ev.hideWheelImage`, `ev.message = ''` when its option is on (~L98-L106); `command` to remember the last one. Throws if `launchoverlayshow` comes before any `command` (`currentCommand.startsWith` on `undefined`, ~L49), which would skip the later listeners, ours included (§1.4). |
| `gameEvents.js` + `helpers.js` `toggleWindows` (import commented out by default) | `gamestarted` → after 10 s, `showWindow(false)` on `dmdWindow`, `topperWindow` and `backglassWindow` (hidden 5 s later still); `gameover` → `showWindow(true)` on all three. |
| `forceCapture.js` | `menuopen` "main" → entry after `PlayGame`; `command` → `toggleWindows(false)` and capture commands; `mediasyncbegin` → `toggleWindows(true)`. |
| `tableEdit.js` | `menuopen` "main" → "Camera Edit" after `PlayGame`; `command`; `keydown` → `preventDefault()` on Escape or "1" while its overlay shows. |
| `showApronCard.js`, `vpcHighScores.js` | Own media windows (`createMediaWindow`), `mediasyncload` on those windows only. |

`launchLoadingVideo.js`, `randomLoadingAnimation.js`, `submitScore.js` and `mediaCapture.js` were not read.

### 3.4 The PinballY help's own snippets

Owners copy these into `main.js` as they are:
- `launchoverlayshow` → `showWheel(false)`, `setUnderlay("")`, `preventDefault()`; `launchoverlayhide` → `showWheel(true)` (`Help/LaunchBackgrounds.html:68-75`, `Help/SeamlessLoadingExample.html:68-95`).
- `launchoverlayshow` → `bg.loadImage(...)` or `bg.loadVideo(...)` + `preventDefault()`; `gamestarted` → `bg.clear(0xff404040)` (`Help/SeamlessLoadingExample.html:276-320`, `Help/CustomLaunchVideoExample.html:34-37`, `:102-128`).
- `launchoverlaymessage` → text drawn on a DMD layer + `preventDefault()` (`Help/SeamlessLoadingExample.html:220-224`).
- `gamestarted` → `backglassWindow.showWindow(false)`; `gameover` → `showWindow(true)` (`Help/HideWindowExample.html:87`, `:99`).

### 3.5 Forums (not verified: sites unreachable)

From search-result summaries only:
- VPForums, "PinballY script question" (https://www.vpforums.org/index.php?showtopic=44471): a script that hides the wheel, clears the background and loads `launch.gif` on `launchoverlayshow`, and draws `launchoverlaymessage` text on a DMD layer.
- VPUniverse, "Loading Videos in PinballY" (https://vpuniverse.com/forums/topic/5789-loading-videos-in-pinbally/): points to RichardL64's `LaunchVideo.js`. The copy posted there clears `bg` to black before loading `Launch.mp4`, so it may differ from the GitHub file.
- A VPUniverse summary also mentions owners pasting the help's `gamestarted`/`gameover` `showWindow` lines for `backglassWindow`, `topperWindow` and `dmdWindow`.
- Older public repositories of this project, `F3L1X79/PinballY-Arcade-Addons` and `F3L1X79/My-custom-PinballY-Addons-and-Plugins`, carry earlier copies of `seamless_launch_overlay.js` and `force_backglass.js`, with a `main.js` that **replaces** the player's (search summary). An owner who once installed them and then the pack could run both copies.

## 4. Is the conflict visible at runtime?

**Facts**
- `ev.defaultPrevented` is true once any earlier listener called `preventDefault()` on a cancelable event (`Help/Event.html:60-61`; getter on a private flag, WebFetch). `launchoverlayshow` and `launchoverlaymessage` are cancelable; `launchoverlayhide` is not (`pinbally-help.md`:269-271).
- Writable fields keep what an earlier listener wrote: `ev.message` and `ev.hideWheelImage` on `launchoverlaymessage` (`pinbally-help.md`:270), `ev.filename` on `underlaychange` (`addons/wheel_arc.js:26-28`), `ev.items` and `menuUpdated` on `menuopen` (`pinbally-help.md`:327-334).
- `launchOverlay` is a read-only data property holding a fixed object (WebFetch). `DrawingLayer` has no getter for its content: only `alpha`, `mute` and `volume` read back (`Help/DrawingLayer.html:285-294`, `:541-547`, `:655-661`). `mute` "always reads as false" and `volume` "always reads as 100" when no video is loaded (same lines).
- No getter for the wheel's visibility (`Help/MainWindowObject.html:759-766`, `showWheel` only), nor for a window's visibility. Force Backglass reads the `BackglassWindow.Visible` setting instead (`addons/force_backglass.js:20-24`).
- Nothing in the help talks about detecting other scripts.

**Inference**
- From our own `launchoverlayshow` listener, `ev.defaultPrevented === true` means a script registered before ours took the overlay. None of our listeners on that event cancels it before Seamless Launch Overlay: the trace only logs, and the startup veil and the quiet wheel only give way (`addons/launch_events_trace.js:16`, `common/drawing/startup_veil.js:69`, `common/core/quiet_wheel.js:165-171`). That would be FD's case, given the order in §1.1. **To check on the cabinet.**
- On `launchoverlaymessage`, an earlier `ev.message === ""` or `ev.hideWheelImage === true` points to a launch-video script (LaunchVideo, LaunchFade, launchAnimations). Our UI Translation writes `ev.message` too, so the check has to run before it, or know its value (`addons/ui_translation.js:55-59`).
- `prelaunch` with `ev.defaultPrevented` means another script cancelled the launch (RichardL64's `Spin.js`). Our `prelaunch` listeners still run, and the matching `postlaunch` never comes (`common/easter_eggs/rocket.js:6`; `pinbally-help.md`:299, "If the launch thread cannot even be created, only prelaunch …" applies to a cancel too: inference).
- A listener registered **after** ours leaves no trace for us to read. Its effect comes after ours.
- `launchOverlay.bg.volume` could act as a probe. Set to some value other than 100 and read back, it would read 100 again if no video is loaded, and keep the value if one is. Not tried. It would also change the volume of another script's video.
- The listener table of §1.2 shows all registrations, before and after ours, but only once they exist. Reading it at the first `launchoverlayshow` would see them all.

**What FD's setup does (Inference from §2 and §3.1, order of §1.1; to check on the cabinet):**
1. `launchoverlayshow`: `LaunchVideo.js` loads the launch video into `bg` and cancels. Then Seamless Launch Overlay hides the wheel and the underlay and runs `bg.clear(0x20FF00FF)`, which clears that video (`Help/DrawingLayer.html:296-300`). The player sees our Loader over the playfield, not the video.
2. `launchoverlaymessage`: `LaunchVideo.js` blanks `ev.message`. UI Translation writes it back from the language file, and Seamless Launch Overlay cancels the text anyway.
3. `gamestarted`: `LaunchVideo.js` clears `bg` to opaque black, and the overlay stays up while the game runs (`addons/seamless_launch_overlay.js:42-49`).
4. `"terminating"` / `"gameover"`: our closing Loader shows at z 5999, under the overlay (`addons/seamless_launch_overlay.js:18-22`, `:56-59`), which is now opaque black. So the closing Loader is hidden on the playfield. Only the backglass comet shows.

With Seamless Launch Overlay turned off (`ADD_ON_SEAMLESS_LAUNCH_OVERLAY=false`), only UI Translation would still touch the launch overlay. It would put back the text that `LaunchVideo.js` blanked, unless `lang.launchOverlayMessages` has no entry for that id (`addons/ui_translation.js:56`).

## 5. Not determined (to check on the cabinet)

- The registration order between a statically imported third-party script and the pack's dynamic import (§1.1). Also the order with a third-party script loaded by its own dynamic `import()`.
- Whether `Object.getOwnPropertySymbols(mainWindow)` returns the listener symbol under ChakraCore, and what `Function.prototype.toString` gives for a listener.
- Whether `ev.defaultPrevented` is already true in our `launchoverlayshow` listener with `LaunchVideo.js` installed.
- What FD actually saw (§4 walk-through), and what `LaunchFade.js` does at closing: its `showWheel(true)` on `gameover` comes while the overlay is still up.
- Whether `bg.volume` read back tells a loaded video (§4).
- The forum threads of §3.5, unreachable here.

## Overlap table

Our Add-on × known third-party script × what they share. "Help" = the PinballY help snippets owners copy; "Official" = `PinballY-Addons-and-Examples`.

| Our Add-on | Third-party script | Shared event / object |
|---|---|---|
| Seamless Launch Overlay | RichardL64 `LaunchVideo.js` | `launchoverlayshow` + `preventDefault`, `launchOverlay.bg` (their `loadVideo` vs our `clear`); `launchoverlaymessage`; their `gamestarted` `bg.clear(0xff000000)` hides our closing Loader |
| Seamless Launch Overlay | RichardL64 `LaunchFade.js` | `launchoverlayshow` + `preventDefault`, `launchOverlay.bg`, `showWheel` (their `true` on `gameover`, ours on `launchoverlayhide`) |
| Seamless Launch Overlay | timhobbs `launchAnimations.js` | `launchoverlayshow` + `preventDefault`, `launchOverlay.bg`, `launchoverlaymessage`, `gamestarted` `bg.clear` |
| Seamless Launch Overlay | Official `seamless-launch`, `seamless-launch-spinner`, `FlexDMD` (official); Help "Seamless Loading", "Launch Backgrounds", "Custom Launch Videos" | `launchoverlayshow` + `preventDefault`, `launchOverlay.bg`, `showWheel`, `setUnderlay` |
| UI Translation | `LaunchVideo.js`, `launchAnimations.js`, `Startup.js` | `launchoverlaymessage` `ev.message` (they blank or set it, we rewrite it by id) |
| Force Backglass | Help "Hide a Window During Play"; timhobbs `gameEvents.js` / `forceCapture.js` (`toggleWindows`) | `backglassWindow.showWindow` on `gamestarted` / `gameover` |
| Rocket, High Scores, Backglass Clock, vpxtool / nvram watch | RichardL64 `Spin.js` | `prelaunch` cancelled by them: our `prelaunch` listeners run, no `postlaunch` follows |
| Seamless Launch Overlay (launch start) | Official `FlexDMD`, `two-tables-one-wheel` | `command.PlayGame` cancelled and replaced by their own `playGame()`: no conflict on the overlay itself, but the launch is theirs |
| Custom Menu Commands | Official `command_example` | "Table Setup" entry added twice to the main menu |
| Drawn Menus, UI Translation | Any script adding menu entries (`tableEdit.js`, `forceCapture.js`, official examples) | `menuopen`: their entries are drawn in our style and, with `logUntranslatedMenuTitles`, logged as untranslated |
| Drawn Menus | Official `wheel-actions` | `menuopen` `preventDefault` + `stopImmediatePropagation`: if registered before ours, our menu listeners never run for its fake games |
| Wheel Order (by year) | RichardL64 `Filter.js`, `FilterTop.js`; official `CategoryButtons` | `filterselect` (`Filter.js` dispatches its own `FilterSelectEvent`), `setCurFilter` |
| Attract Order, Drawn Screen controls | RichardL64 `AttractFade.js`, `AutoOff.js`; official `auto_shutdown` | `attractmodestart` / `attractmodeend` (theirs only listen: no cancel); `AttractFade` layers at z 1000, under our z 4500 wheel layers |
