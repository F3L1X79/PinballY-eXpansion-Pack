# PinballY scripting reference (from the local Help)

Source: `docs/pinbally/Help/*.html` (copy of `C:\vPinball\PinballY\Help\`) (PinballY 1.1.0 Beta 10, build 10086). Every section cites the help page. Where the help is wrong or silent, the note says so and names what was checked instead: `Scripts/System/SystemClasses.js` (shipped with PinballY, read-only) or `PinballY.exe`.

---

## 1. Scripting model

**Engine** (Javascript.html). ChakraCore, "standards-compliant". The help promises ES6: `let`, `class`, `for..of`, destructuring, arrow functions, template literals, Promises, spread, typed arrays. This build also accepts `async/await`, `??` and object spread, because our modules use them and load without errors. There is no browser environment: no `window`, `document`, DOM or `onclick`, and jQuery and similar frameworks don't work.

**Loading** (Javascript.html, LogFileOptions.html).
- At startup PinballY looks for `Scripts\main.js`. It first loads the system scripts from `Scripts\System\` (`CParser.js`, `SystemClasses.js`), then runs `main.js` as an ES module. Other files are pulled in with standard `import` (static, or dynamic `import()`). Nothing needs to be enabled.
- Top-level code runs once at load. Its main job is to register event listeners. Listeners can also be added and removed at any time later (Events.html).
- Scripts are **not reloaded**. The only way to pick up a change is to restart PinballY. A settings reload (`settingsreload`) does not re-run scripts.
- `main.js` runs early, **before startup videos play**. `createMediaWindow({startupVideo})` must therefore be called during initial loading (MainWindowObject.html).
- Don't edit `Scripts\System\*.js`. It is discouraged and breaks upgrades (Javascript.html).
- Script errors, including syntax and runtime errors with file locations, go to `PinballY.log` when the **Log File > Javascript** option is enabled (JsDebug.html, LogFileOptions.html). Errors are not shown in the UI.

**Threading, blocking and the event loop** (Javascript.html, SystemFunctions.html, JsDebug.html, HttpRequest.html). These are the only statements in the help on the topic:
- Javascript.html, "Performance tip: avoid long-running operations": *"Javascript runs as part of the main user interface thread, so any lengthy operation in Javascript can make the UI appear to be frozen for as long as the operation takes to complete. This can cause the video to momentarily freeze or stutter, and can also delay the processing of button inputs…"* "Long" means more than about **30–50 ms**. The advice is to use timeouts or intervals instead of loops or waits, to split CPU work into pieces with intervals, and to use Promises or async for external waits.
- SystemFunctions.html: *"Like Javascript in a browser, PinballY's Javascript is single-threaded, so timer events can't 'interrupt' other scripts. If the timeout period elapses while another script is running, the function will be invoked when the current script finishes."*
- JsDebug.html: pausing in a debugger freezes the whole PinballY UI, because script code is part of the UI code.
- HttpRequest.html: a synchronous `open(…, false)` freezes the UI. Always pass `true`.
- **Nothing in the help** says that `showWindow()` or any other window call blocks, or that it needs `setTimeout(…, 0)`. `setTimeout(fn, 0)` does not move work off the UI thread. It only defers `fn` until the current script, such as `main.js` top-level code or the current event dispatch, has returned.

**Timers** (SystemFunctions.html):
- `setTimeout(fn, ms) → id` and `clearTimeout(id)`.
- `setInterval(fn, ms) → id` and `clearInterval(id)`. The interval is approximate and re-arms after each call.
- Clearing an unknown or already-cleared id is harmless.

**Other global functions** (SystemFunctions.html):
- `alert(msg)` shows a modal Windows message box and pauses the script. Use it for debugging only.
- `message(msg, style)` is an alias of `mainWindow.message`.
- `createAutomationObject(progId)`: see §2.9.

**Debugging** (JsDebug.html, CommandLine.html):
- Start with `PinballY.exe /jsdebug[:port=9228,break=user|system|none,wait=yes|no]`.
- VS Code: `launch.json` type "node", `runtimeExecutable` `${workspaceFolder}/../PinballY.exe`, `runtimeArgs ["/jsdebug:port=9228"]`, `port` 9228, `stopOnEntry` true.
- Chrome: `chrome://inspect`, then add `localhost:9228`.

---

## 2. Global objects

Globals documented by the help (SystemObjects.html, SystemClasses.html, SystemFunctions.html):
- **Objects:** `mainWindow`, `backglassWindow`, `dmdWindow`, `topperWindow`, `instCardWindow`, `gameList`, `optionSettings`, `logfile`, `console`, `command`, `systemInfo`, `dllImport`.
- **Classes:** `HttpRequest`, `Variant`, `Int64`/`Uint64`, `HWND`/`HANDLE`, `NativeObject`, `NativePointer`, `COMPointer`, `HtmlLayout`, `StyledText`, plus the Event classes.
- **Constants** (defined in SystemClasses.js): `SW_HIDE` = 0, `SW_SHOWMINIMIZED` = 2, `SW_SHOW` = 5, and the `SWP_*` flags.
- **Not documented:** there is **no `OS` global** in the help or in SystemClasses.js.

### 2.1 Common window API (WindowObjects.html)
Applies to every window object:
- `borderlessMode` (get/set bool) and `fullScreenMode` (get/set bool).
- `createDrawingLayer(zIndex) → DrawingLayer` and `removeDrawingLayer(layer)`.
- `hwndFrame` and `hwndView`: read-only HWND values. Don't move or resize the window through Win32 calls, because PinballY isn't notified. `hwnd.getWindowPos()` (HWNDObject.html) returns `{ clientRect, windowRect, isMaximized, isMinimized }`; `clientRect` is `{ left, top, right, bottom }` relative to the window itself (left and top always 0), so its size is `right - left` by `bottom - top`. The pack reads `mainWindow.hwndView`'s to notice the window's size changing (PinballY fires no event for it). Seen on the cabinet (not in the help, spec #357 and its log of 2026-10-29): PinballY gives the window its final size only after the scripts' init, the view and the layers' window still 845x461 at the first tick, then 2560x1600 together, at once.
- `name`: "playfield", "backglass", "dmd", "instCard" or "topper". Compare against the objects themselves, not this string.
- `setWindowState("min"|"max"|"restore")`.
- `setWindowPos(afterHwnd, x, y, w, h, flags)`:
  - `afterHwnd` can be `HWND.TOP`, `HWND.BOTTOM`, `HWND.TOPMOST` or `HWND.NOTOPMOST`.
  - flags: `SWP_NOSIZE` 1, `SWP_NOMOVE` 2, `SWP_NOZORDER` 4, `SWP_NOACTIVATE` 0x10, `SWP_NOOWNERZORDER` 0x200.
  - The call leaves full-screen mode first.
- `showWindow(bool)`: shows or hides the window. The on/off state is saved in Settings.txt as `BackglassWindow.Visible`, `DMDWindow.Visible` and so on. The help doesn't say that the call itself writes the setting.

**Secondary windows** (SecondaryWindow.html) are `backglassWindow`, `dmdWindow`, `topperWindow`, `instCardWindow` and custom windows. Extra members:
- `backgroundScalingMode`: "stretch" (default) or "zoom".
- `pagedImageIndex` (get/set, wraps around). Works only on image types such as flyers and instruction cards.

The backglass, DMD, topper and instruction-card windows add nothing else (BackglassWindow.html, DMDWindow.html, TopperWindow.html, InstCardWindow.html). Their only events are the `mediasync*` events (§3).

**Custom windows** (CustomWindow.html, MainWindowObject.html):
- Create with `mainWindow.createMediaWindow({title, configVarPrefix, parent, backgroundImageMediaType, backgroundVideoMediaType, defaultBackgroundImage, defaultBackgroundVideo, startupVideo, isMediaCapturable, showMediaWhenRunningKey})`. Never use `new CustomWindow()`.
- Position and size are restored from settings under `configVarPrefix`.
- `showMediaWhenRunningFlag`: true, false or undefined (undefined means use the key).
- Seen on the cabinet (not in the help, Backglass Clock prototype, branch `prototype/backglass-clock`, 2026-10-29, VPX with a B2S on the backglass screen):
  - A new custom window opens on the playfield screen, cascaded (26,26, then 52,52 for the next one), 810x1375, with a Windows title bar: set `borderlessMode = true` and place it on the backglass screen yourself, from `backglassWindow.hwndFrame.getWindowPos().windowRect` read on `prelaunch` (Force Backglass hides the backglass on `gamestarted`).
  - PinballY saves a place the owner moved it to, under `configVarPrefix`, and restores it at the next start. `fullScreenMode` stayed false throughout.
  - With `showMediaWhenRunningFlag = true`, its drawing layer is drawn and redrawn during a game.
  - Raised with `setWindowPos(HWND.TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)` at `gamestarted`, then 2, 5, 10, 20 and 40 s later and each minute, it stayed in front of the B2S for a whole game, whether owned by the playfield (the default `parent`) or top-level (`parent: null`). The flippers kept reaching VPX. The B2S had `FormToFront` = 0, the setting this cabinet needs to show the DMD over the backglass; not checked with `FormToFront` = 1, nor whether one raise alone would do.
  - During that game, `logfile.log` got one Drawn Menu line per flipper press, each a `commandbuttonbgdown` heard while the Drawn Menu held the `pause game` menu open, until `postlaunch` (#372). Likely cause: PinballY opens the pause menu on any activation of its window during a game (ADR 0013), and VPX can take the foreground back with it open (`prototype/pause-menu`, `6d07a1f`). Confirmed on the cabinet on 2026-10-30 (below, #386): the custom window's `showWindow(true)` at `gamestarted` opened it.
  - Sizes don't add up: asked 320x110, `getWindowPos()` then reports 480x300 (x1.5, like a 150 % Windows scaling), while the screenshot shows about 320x200. A drawing sized from `clientRect` came out clipped at the bottom. To check before sizing text from the window.
- Seen on the cabinet (not in the help, Backglass Clock diamond prototype, branch `prototype/backglass-clock-diamond`, 2026-10-30, four runs with VPX):
  - A borderless custom window is never less than 200 px tall: asked 320x128, both `getWindowPos()` and User32 `GetWindowRect` then report 320x200; widths are kept (512x256 and 323x200 were too). No x1.5 mismatch in those runs: both readings agreed.
  - `SetWindowRgn` on `hwndFrame` (`dllImport`, polygon from GDI32 `CreatePolygonRgn`) cuts the window and never activated PinballY during a game: no `menuopen`, foreground window unchanged. The region held through `setWindowPos` raises and redraws in a game without clicks.
  - PinballY does not keep it: a click and a drag on the window during a game dropped the region (`GetWindowRgn` = ERROR), once with no known cause; in the last run the window had its Windows title bar again and an empty region no longer hid it in the wheel. Verdict: window regions aren't a reliable way to shape a custom window.
  - A click on a custom window during a game activates PinballY, which opens the `pause game` menu; the owner can still drag it then (the place moved and stuck).
  - On 2026-11-08 the owner reported a place dragged during a game coming back after a restart, `BackglassClock.Position` in `Settings.txt` still holding the older place; `getWindowPos()` read the dragged place correctly at `gameover`, and a click sent the window behind the B2S until the next raise. Scripts keep such a place in their own setting.
- Seen on the cabinet (not in the help, #386, log of 2026-10-30, X-Men Wolverine LE on VPX): showing a custom window during a game activates PinballY, which opens the `pause game` menu. `showWindow(true)` called at `gamestarted` (`getUIMode().mode` "running") was followed 10 ms later by `menuopen "pause game"` (`runMode` "running"), and the mode read just after the call was "menu". The pause menu stayed in front until the player pressed Start. Show a custom window for a game on `prelaunch`, when `getUIMode()` has no `runMode` yet; raising it with `SWP_NOACTIVATE` during the game never opened the menu.

### 2.2 mainWindow (MainWindowObject.html)
- `doCommand(id)` runs a menu-level command (§4.3). It does **not** fire the `command` event (`JsDoCommand` calls `OnCommandImpl`, past `FireCommandEvent`): a command allocated by a script does nothing through it. To run a command as a menu entry would, call `mainWindow.dispatchEvent(new CommandEvent(id))` first, then `doCommand(id)` if it returned true.
- `doButtonCommand(name, down, repeatCount)` simulates a mapped button ("Next", "Prev", "NextPage", "Select", "Exit" and so on, from the CommandButtonEvent list). It does **not** fire key or commandbutton JS events.
- `playGame(game, {command, system, overrides})` launches a game. `overrides` takes the prelaunch override properties (§3).
- `showMenu(id, items, options)`: see §4. It does **not** fire `menuopen`.
- `showPopup(desc)`: see §4.4.
- `message(text, "info"|"warning"|"error")`: a non-blocking popup, queued.
- `getUIMode()` returns `{mode: "wheel"|"menu"|"popup"|"running"|"attract", game, menuID?, popupID?, runMode?: "starting"|"running"|"exiting", capture?: "single"|"batch"}`. A game is running if and only if `runMode` is present.
- `getActiveWindow()` returns the active window object, or null when PinballY is in the background.
- `showWheel(bool)`.
- `setUnderlay(file, {height, maxWidth, yOffset})`. Pass "" to remove the underlay.
- `startAttractMode()` / `endAttractMode()`. These do **not** fire the attractmode events.
- `setWheelAutoRepeatRate(ms)`.
- `getKeyCommand({type:"key", vkey|code} | {type:"joystick", unit, button})` returns an array of command names.
- `getJoystickInfo([unit|guid])` and `enableJoystickAxisEvents({unit, axis?, enable?, background?})`. Axis events are off by default.
- `DOFPulse(name)` and `DOFSet(name, 0..255)`. In the Config Tool, the name is `$name`.
- `launchOverlay.fg` and `launchOverlay.bg`: DrawingLayers that exist only during a launch. They can't be removed, moved or resized.
- `statusLines.upper`, `.lower` and `.attract`: StatusLine objects (§2.8).
- `createMediaWindow(desc)`: see §2.1.

**Main-window layer Z-order**, back to front:

| Layer | Custom Z range right after it |
|---|---|
| background | 0–999 |
| underlay | 1000–1999 |
| status line | 2000–2999 |
| wheel | 3000–3999 |
| info box | 4000–4999 |
| video overlays and popups | 5000–5999 |
| menus and coin messages | 6000+ |
| drag-and-drop feedback | (topmost) |

The launch overlay layers are drawn above everything.

### 2.3 gameList (GameList.html)
Reading games:
- `getAllGames()` returns a snapshot array of all loaded games in wheel order.
- `getGame(n)` and `getGameCount()`: the live list.
- `getGameInfo(id)` takes a numeric id or a **config ID string** and returns null if the game isn't found.
- `getWheelGame(offset)` (0 is the current game), `getWheelCount()`, and `getAllWheelGames()` (element [0] is the current game, then the games to its right).

Changing the wheel and filters:
- `setWheelGame(offset, {animate, fast})` does **not fire `gameselect`**, and has no sound or DOF effects.
- `setCurFilter(id | filterCmd)` does **not fire `filterselect`**. It does fire `gameselect` if the selection has to change.
- `getCurFilter()`, `getFilterInfo(id)`, `getAllFilters()`, `refreshFilter()`.
- `createFilter(desc) → cmd` (§2.5).
- `createMetaFilter({select(game, included), before, after, priority, includeExcluded}) → id` and `removeMetaFilter(id)` (MetaFilters.html). Metafilters are called in ascending priority, so the last one called decides.

Categories and media:
- `createCategory(name)`, `deleteCategory(name)`, `renameCategory(old, new)`, `getAllCategories()`.
- `createMediaType(desc)` (MediaTypes.html: `id`, `configId`, `name`, `folder`, `format`, `extensions`, `perSystem`, `isIndexed`, `pageFolders`…).
- `resolveMedia(subfolder, baseName, "audio"|"image"|"video"|"wave") → path | undefined`.
- `getMediaDir()`.

### 2.4 GameInfo (GameInfo.html)
**Properties** are read-only getters. Assigning to them does nothing, so use `update()`.
- Identity: `id` (session-only integer, compare with `a.id === b.id`), **`configId`** (stable ID).
  - The help spells it `configID`, but the native getter in PinballY.exe is `configId`, and `configID` returns undefined. Our code is right to use `configId`.
  - The config ID is built from title, manufacturer, year and system, so it changes if any of those change.
- Metadata: `title`, `displayName`, `manufacturer`, `year`, `tableType` ("SS"|"EM"|"ME"), `ipdbId`, `rom`, `system` (GameSysInfo), `categories[]`.
- Flags and stats: `rating` (0–5 in 0.5 steps; −1 means unrated), `isFavorite`, `isHidden`, `isConfigured`, `isMarkedForCapture`, `playCount`, `playTime` (seconds).
- Dates and files: `lastPlayed` (Date or undefined), `dateAdded`, `filename`, `path`, `dbFile`, `mediaName`.
- Other: `audioVolume`, `highScoreStyle`, `gridPos`.

**Methods:**
- `update(desc, {renameMedia=true}) → {renamedMediaFiles?, mediaRenameErrors?}`. One call batches the XML write and the wheel refresh. Updatable fields: audioVolume, categories, dateAdded, gridPos, highScoreStyle, ipdbId, isFavorite, isHidden, isMarkedForCapture, lastPlayed, manufacturer, mediaName, playCount, playTime, rating, rom, system, tableType, title, year.
- `renameMediaFiles(list)`, `erase()`.
- `resolveGameFile() → {exists, filename, folder, path}`.
- `resolveMedia(type, mustExist) → string[]`.
- `resolveROM() → {dofRom, vpmRom, vpmRomFile, nvramPath}`.
- `getHighScores() → Promise<string[]>` (the array also has `.source`) and `setHighScores(lines|null)`.
  - `setHighScores(lines)` only fills PinballY's in-memory copy, which the DMD and the info box show; nothing is written to the NVRAM or any file. Lines are free text, one display line each.
  - `setHighScores(null)` forgets that copy, so PinballY reads the board again the next time the table is selected on the wheel. PinballY forgets it by itself at every launch: a board handed by a script has to be handed again after each Play.

**Lifetime.** A settings reload reloads the game list. Held GameInfo objects then throw when used, and ids become invalid. Don't cache GameInfo objects or ids; re-read them, for example with `gameList.getWheelGame(0)`. The help tells you to clear caches on "settingschange", but that event doesn't exist; the real one is `settingsreload` (SettingsEvent.html).

**GameSysInfo** (GameSysInfo.html): `displayName`, `exe`, `params`, `tablePath`, `defExt`, `mediaDir`, `databaseDir`, `dbFiles`, `processName`, `runBefore*` and `runAfter*`, `swShow`, `terminateBy`, `workingPath`, `envVars`, `expand(str, game)`, and more.

### 2.5 Filters (FilterInfo.html)
- FilterInfo members: `id` (permanent), `cmd` (session-only), `title` (localized, so don't match on it), `group`, `groupCmd`, `getGames()`, `testGame(game)`.
- System filter IDs: `All`, `Favorites`, `Hidden`, `Unconfigured`, `NeverPlayed`, `Uncategorized`, `Category.x`, `Manuf.x`, `YearRange.a.b`, `Rating.N` (N = −1..5), `PlayedWithin.N`, `NotPlayedWithin.N`, `AddedWithin.N`, `AddedBefore.N`, `User.id`.
- `createFilter({id, title, menuTitle, select(game), before, after, group, sortKey, includeHidden, includeUnconfig, compareForSort(a,b), pageGroup(game)})`:
  - The ID may use letters, digits, `_` and `.`. The system adds the `User.` prefix.
  - `group` is either a new submenu title or a system group: `[Era]`, `[Manuf]`, `[Sys]`, `[Rating]`, `[Cat]`, `[Played]`, `[!Played]`, `[!!Played]`, `[Added]`, `[!Added]`, `[Top]` or `[Op]`.

### 2.6 optionSettings (OptionSettingsObject.html, SettingsEvent.html)
- Reads the in-memory copy of `Settings.txt`. **Values are always strings.**
- Methods:
  - `get(name, def)` returns a **string** (or `def`).
  - `getBool`, `getInt`, `getFloat`, `getRect(name, def)` convert the value.
  - `set(name, value)` writes into memory: undefined or null erases the variable, a boolean is stored as "0"/"1", a number as decimal text, and a RECT-like object as "l,t,r,b". Any other object throws.
  - `save()` returns a bool and shows no UI on failure.
  - `reload()` discards unsaved changes, rescans games and databases, and restarts playing media.
  - `isDirty()`. `filename` is the settings file path.
- Names share one flat namespace. They are "alphanumeric characters and a limited set of punctuation characters, including '.' and '_'", and case-sensitive (DefaultSettings.txt). Use a unique prefix such as `custom.` (KioskModeExample.html).
- **When to save.** PinballY saves on its own when the settings are dirty: before quitting, before launching a game, before opening Options, and after about 15 s of idle UI. Calling `save()` yourself is optional. The examples call `set()` without `save()` (KioskModeExample, FamilyFilterExample). They only save explicitly before logging off or shutting down (LogOffExample: `if (optionSettings.isDirty()) optionSettings.save();`).
- `save()` followed by `reload()` is needed only to make changes to *system* settings take effect. It has visible side effects such as a video restart, so do it rarely.
- Events on `optionSettings`: `settingspresave`, `settingspostsave` and `settingsreload`, none cancelable. The help calls the `succeeded` property "settingspostchange", but it belongs to `settingspostsave`.

### 2.7 logfile / console (LogfileObject.html, ConsoleObject.html)
- `logfile.log(...args)` writes to `PinballY.log` whatever the log options are.
- When the first argument contains `%` codes **and** more than one argument is passed, printf formatting applies: `%d %i %x %X %b %o %O %f %s %S %%`, with flags `- + space # 0`, width and `.precision`.
- `console.log/info/warning/error/exception/assert/count/countReset/time/timeLog/timeEnd/trace/format` print only in an attached debugger. Otherwise the output is discarded, per the help; in fact it also goes to `OutputDebugString` (see §6).

### 2.8 StatusLine (StatusLine.html)
Members:
- `add(text, index?)` and `remove(index)`.
- `setText(index, text)`: the new text shows immediately if that entry is on screen.
- `getText()` returns a `[{text, isTemp}]` snapshot.
- `getCur()` returns the current index, or −1.
- `show(text)` shows the text once, as a temporary entry. The entry is inserted just after the current message (and after any temporary ones already queued there), then removed once shown, so it shifts the indexes of the entries after it.
- `add(text, index?)` without an index (or out of range) appends at the end.
- `id`.

Text may contain `[substitution]` variables (StatuslineOptions.html).

### 2.9 command (Commands.html)
- Command IDs are integers, available as `command.Name`.
- `command.name(id)` returns names like "FilterFirst+3". `command.nameAndIndex(id)` returns `{name, index}`.
- `command.allocate(name?)` hands out IDs from `UserLast` downward and sets `command[name]`, so pick names that don't clash with built-in ones. Call it **once at startup**. IDs change between sessions, so **never persist them**.
- `UserFirst..UserLast` are ignored by default.
- Ranged groups: `FilterFirst..FilterLast`, `CaptureFirst..CaptureLast`, `MediaDropFirst..MediaDropLast`, `PickSysFirst..PickSysLast`, `UserFilterGroupFirst..UserFilterGroupLast`. `nameAndIndex()` only names some of them (see §6).
- Useful built-in commands:
  - Menus and navigation: `PlayGame`, `Quit`, `KillGame`, `PauseGame`, `ResumeGame`, `MenuReturn`, `MenuPageUp`, `MenuPageDown`, `ShowMainMenu`, `ShowExitMenu`, `ShowGameSetupMenu`, `ShowOperatorMenu`, `Options`.
  - Game dialogs: `RateGame`, `GameInfo`, `HighScores`, `Instructions`, `Flyer`, `AddFavorite`, `RemoveFavorite`, `HideGame`, `EditGameInfo`, `SetCategories`, `FilterBy*`.
  - Windows: `ViewBackglass`, `ViewDMD`, `ViewTopper`, `ViewInstCard`, `ViewPlayfield`, `HideWindow`, `ToggleFullScreen`, `ToggleWindowBorders`.
  - System: `PowerOff`, `PowerOffConfirm`, `MuteVideos`, `EnableVideos`, `CaptureGo`, `BatchCapture*`, `AboutBox`, `Help`.

### 2.10 Other objects
- `systemInfo` (SystemInfoObject.html): `platform`, `programDir`, `programExe`, `programName`, `version.{basic, build, buildDate, display, semantic, status}`.
  - Formats, from the source at tag `1.1.0-Beta10` (`VersionInfoUpdater/VersionInfoUpdater.cpp#L360-L420`, `PinballY/PlayfieldView.cpp#L715-L736`): `display` is `"1.1.0 (Beta 10)"` (`"1.2.3 (RC2)"` for an RC, `"1.2.3 (Release)"` without a sequence number); `semantic` is `"1.1.0-beta.10+<build>.<yyyymmddThhmm>"` (`-alpha`, `-beta`, `-rc`, or `-Dev.<build>` for a dev build; no suffix for a release); `build` is an integer.
  - **`status` does not hold the release status:** the C++ passes its format arguments one place off, so `status` gets the three-part version string (`"1.1.0"`, like `basic`). Read the release status and its number from `semantic`.
  - The game list is loaded before Javascript starts (`Application.cpp#L389`, `InitGameList`, then `InitJavascript` at `#L460`): `main.js` already sees every table.
- `HttpRequest` (HttpRequest.html): `new`, then `open(method, url, true, user?, pw?)`, `setRequestHeader`, then `send(body?) → Promise<string>`. Also `abort()`, `status`, `statusText`, `responseText`, `responseXML`, `readyState`, `getResponseHeader(name)`, `getAllResponseHeaders()`. It needs MSXML. Don't use `MSXML.XMLHTTP` through Automation instead.
- `createAutomationObject(progId)` (OLEAutomation.html) is the equivalent of VB `CreateObject`. For example, `Scripting.FileSystemObject` gives file access.
  - Indexed properties are read as `obj.Item(k)` and written as `obj.put_Item(k, v)`.
  - Use `new Variant()` for picky argument types or OUT parameters.
  - Array arguments and COM event sinks are **not supported**.
- `dllImport` (DllImport.html) calls Win32 or any DLL directly:
  - `bind(dll, "C prototype(s)")`, `define("typedef/struct/interface…")`, `create("TYPE")`.
  - Put `WINAPI` on stdcall functions, or memory gets corrupted. Callbacks are supported. Close native HANDLEs yourself.
  - Related classes: NativeObject, NativePointer, COMPointer, HANDLE/HWND (`getWindowPos()`, `isVisible()`), Int64/Uint64, Variant.
- **DrawingLayer** (DrawingLayer.html):
  - Content: `clear(0xAARRGGBB | "#RRGGBB")`, `loadImage(path)`, `loadVideo(path, {loop=true, mute, play=true, volume})`, `drawDMDText(text, {style, font, color, bgColor})`, `draw(fn(dc), w?, h?)`.
  - Layout and playback: `setScale({span|xSpan|ySpan})`, `setPos(x, y, "top left"…)` (x and y range from −0.5 to 0.5, with y pointing up), `alpha`, `mute`, `volume`, `play()`, `pause()`.
  - Event: `videoend`.
  - Drawing context `dc` (CustomDrawing.html): `fillRect`, `frameRect`, `drawImage`, `drawText`, `setFont`, `setTextColor`, `setTextArea`, `setTextAlign`, `measureText`, `getSize`, `getImageSize`. The `dc` is valid only during the call. For richer text, use `HtmlLayout` or `StyledText`.

---

## 3. Events

**Common API** (Events.html, EventTarget.html, Event.html):
- Register with `target.on("a b.ns", [data,] fn)` or `one(...)`, remove with `off("a.ns" | ".ns", fn?)`. `addEventListener(type, fn, {data, once})`, `removeEventListener` and `dispatchEvent` also exist.
- Event properties: `type`, `cancelable`, `defaultPrevented`, `timeStamp`, `target`, `data`. The help says `timestamp`, but SystemClasses.js defines `timeStamp`.
- Event methods: `preventDefault()` (no effect unless cancelable), `stopImmediatePropagation()`. Nothing bubbles.
- Listeners run synchronously, in registration order.
- Behaviour from SystemClasses.js, not in the help:
  - An exception thrown by a listener **escapes `dispatchEvent` and skips the remaining listeners**.
  - The returned value is ignored. An `async` listener's `preventDefault()` after its first `await` is too late.

| Event | Target | Cancelable → effect | Key properties |
|---|---|---|---|
| keydown / keyup / keybgdown / keybgup (KeyEvent.html) | mainWindow | yes → PinballY ignores the key (bg: cannot block the foreground app) | `key`, `code`, `vkey`, `location`, `repeat`, `repeatCount`, `background` |
| joystickbuttondown/up/bgdown/bgup | mainWindow | yes | `unit`, `button`, `repeat`, `repeatCount`, `background` |
| joystickaxischange(/bg) | mainWindow | – (must enable first) | `unit`, axis values via JoystickInfo |
| commandbuttondown/up/bgdown/bgup (CommandButtonEvent.html) | mainWindow | yes | `command` (e.g. "Next", "Select", "Exit", "ExitGame", "Launch"…), `repeat`, `background` |
| command (CommandEvent.html) | mainWindow | **yes → command not executed** | `id`, `name`, `index` (ranged) |
| menuopen / menuclose (MenuEvent.html) | mainWindow | open: **yes → menu not shown, unless `menuUpdated` is true** (see §4.2); close: no | `id`, `items`, `options`, `menuUpdated`; `addMenuItem`, `deleteMenuItem`, `tidyMenu` |
| popupopen / popupclose (PopupEvent.html) | mainWindow | open: yes → popup and its side effects skipped | `id` |
| attractmodestart / attractmodeend (AttractModeEvent.html) | mainWindow | start: yes → timer reset; end: no | – |
| wheelmode (WheelModeEvent.html) | mainWindow | no | fires on **return to the wheel** from a menu, popup, attract mode or **a running game** |
| prelaunch | mainWindow | yes → no launch | `game`, `command`, `overrides{exe, params, workingPath, envVars, swShow, processName, terminateBy, closeWindowName(IsRegex), closeWindowTimeout, runBefore(Pre), runAfter(Post)}` |
| runbeforepre / runbefore | mainWindow | yes → launch aborted | `game`, `command` |
| gamestarted / gameover / runafter / runafterpost | mainWindow | no | `game`, `command` |
| launcherror | mainWindow | yes → error message suppressed | `error` |
| postlaunch | mainWindow | (flagged cancelable, but it fires after the fact) | `game`, `command` |
| launchoverlayshow | mainWindow | yes → default dark background not drawn (SeamlessLoadingExample.html) | `game` |
| launchoverlaymessage | mainWindow | yes → system text not drawn | `id` ("init", "launching", "capturing", "running", "terminating", "gameover", "after"), `message` (writable, may be null), `hideWheelImage` |
| launchoverlayhide | mainWindow | no | `game` |
| precapture (MediaCaptureEvent.html) | mainWindow | yes → item skipped; `cancelBatch = true` cancels the batch | `commandLine` (writable), `filename`, `mediaType`, `rc`, … |
| dofevent (DOFEventEvent.html) | mainWindow | yes → DOF value not changed | `name`, `value` |
| underlaychange (UnderlayEvent.html) | mainWindow | yes | `filename` (writable), `game`, `options` |
| gameselect (GameSelectEvent.html) | gameList | no (after the fact) | `game` (may be null) |
| filterselect (FilterSelectEvent.html) | gameList | **yes; fires BEFORE the filter is applied** | `id` |
| highscoresrequest / highscoresready (HighScoresEvent.html) | gameList | request: yes → PinEMHi is not run | `game`, `scores`, `source`, `success` |
| settingspresave / postsave / reload | optionSettings | no | `succeeded` |
| statusline (StatusLineEvent.html) | each StatusLine | no; set `expandedText` to change the text | `sourceText`, `expandedText` |
| mediasyncbegin / load / end (MediaSyncEvent.html) | any window | begin and load: yes | `game`; on load: `video`, `image`, `defaultVideo`, `defaultImage` (writable); on end: `disposition` |
| videoend (VideoEvent.html) | DrawingLayer | no | `looping` |

**Launch order** (LaunchEvent.html). For a successful launch:
1. `prelaunch`
2. The screen is blanked, then the Run Before Pre command runs, then **`runbeforepre`**.
3. "Loading Game" is shown, then **`runbefore`**, then the Run Before command, then the game launches.
4. **`gamestarted`**. This means the first game window opened, not that the game is ready. VPX opens its editor first; add a delay if you need to wait.
5. The game runs. When it exits, "Game Exiting" is shown and **`gameover`** fires.
6. The Run After command runs, then **`runafter`**.
7. The screen is blanked, then **`runafterpost`**, then the Run After Post command.
8. **`postlaunch`**.

If the launch fails, `launcherror` fires *instead of* `gamestarted` and `gameover`. The launch-overlay events are fired once (`launchoverlayshow`), several times (`launchoverlaymessage`) and once (`launchoverlayhide`), in the order of the message ids above. PinballY clears a game's cached high scores at launch. The help doesn't say when `playCount`, `playTime` and `lastPlayed` are updated relative to these events.

**Interleaved launch order** (not in the help: read in PinballY's C++ source, see `docs/research/launch-events-order.md`, then confirmed on the cabinet with `LOG_LAUNCH_EVENTS=true` on 2026-10-22, PinballY 1.1.0 Beta 10 build 10086, for every case but the batch capture; the cabinet wins any disagreement). Quoted ids are `launchoverlaymessage` events; `"init"` and `"after"` carry a null `message`.
- **Timing.** `prelaunch`, `launchoverlayshow` and `"init"` fire synchronously, **during the `mainWindow.playGame()` call itself**. Every later event comes from the launch thread, one at a time on the UI thread, except `"terminating"`, fired by Exit Game itself. `launchoverlayhide` fires when the overlay's 150 ms fade-out starts, not when it ends.
- **A table that closes on its own:** `prelaunch`, `launchoverlayshow`, `"init"`, `runbeforepre`, `"launching"`, `runbefore`, `"running"`, `gamestarted`, `"gameover"`, `gameover`, `runafter`, `"after"`, `runafterpost`, `launchoverlayhide`, `postlaunch`.
- **Exit Game (KillGame) while playing:** the same, except that `"terminating"` fires at once when Exit Game is chosen, and `"gameover"` is then skipped: … `gamestarted`, `"terminating"`, `gameover`, `runafter`, `"after"`, `runafterpost`, `launchoverlayhide`, `postlaunch`. Exit Game before the table has loaded: `"terminating"` comes right after `runbefore`, and neither `"running"` nor `gamestarted` fires.
- **A launch failure:** `prelaunch`, `launchoverlayshow`, `"init"`, `runbeforepre`, `"launching"`, `runbefore`, `launcherror`, `launchoverlayhide`, `launchoverlayhide` again, then `postlaunch`: the hide fires **twice**, a few milliseconds apart. A missing table file is no failure: PinballY starts VPX, which reports the error itself, and the launch reads as a table that closes on its own; only an executable that cannot start fires `launcherror`. None of `"running"`, `gamestarted`, `"gameover"`, `gameover`, `runafter`, `"after"` and `runafterpost` fires. If the launch thread cannot even be created, only `prelaunch` and PinballY's error message appear.
- **A single capture:** the order of a table that closes on its own, with `"capturing"` instead of `"running"`. `gamestarted` and `gameover` still fire. PinballY closes the game itself after the capture, so `"gameover"` fires, never `"terminating"`.
- **A batch capture:** each table runs the single capture's whole sequence, from its own `prelaunch` to its own `postlaunch`, then the next table starts (to confirm on the cabinet: not traced). During a batch, Exit Game first shows a cancel prompt; a second press stops the batch.
- The source read is PinballY's `master`; the cabinet's 1.1.0 Beta 10 matched it on every traced case.

**Menu and popup ordering** (MenuEvent.html, PopupEvent.html). When one menu replaces another, the new menu's `menuopen` fires **before** the old menu's `menuclose`. So a `menuclose` doesn't mean no menu is showing. Popups work the same way.

---

## 4. Menus, commands and popups (Menus.html, MenuEvent.html, Commands.html, Popups.html)

### 4.1 `mainWindow.showMenu(id, items, options)`
- Returns immediately. A selection arrives later as a **`command` event** carrying the item's `cmd`.
- **Item fields:**
  - `title`
  - `cmd`: the command ID, or **−1** for a non-selectable item
  - `selected`, `checked`, `radio`, `hasSubmenu`, `stayOpen`
- **Separator:** `{ cmd: -1 }`, whose title defaults to "". tidyMenu treats `cmd < 0 && title == ""` as a separator. No other form is documented.
- **Paged section:** put `{cmd: command.MenuPageUp}` before the paged items and `{cmd: command.MenuPageDown}` after them.
- **Options:**
  - `isExitMenu`
  - `noAnimation`
  - `pageNo`: a number, or "same"
  - `dialogStyle: true`: the menu is wider, and the first item is a smaller word-wrapped message. By convention that first item has `cmd: -1`, followed by a separator.
- Pattern for refreshing a menu in place: use a `stayOpen` item, then call `showMenu` again with `{noAnimation: true, pageNo: "same"}`.
- The id you pass is reported in `getUIMode().menuID`.

### 4.2 Editing system menus in `menuopen`
- **Suppress** the menu with `ev.preventDefault()`. **Also set `ev.menuUpdated = false`** if any listener may have edited it: `FireMenuEvent` (`PlayfieldView.cpp`) checks `menuUpdated` first and, when true, shows the edited menu through `showMenu` even though the event was cancelled.
- **Edit** by changing `ev.items`, `ev.id` or `ev.options`, then set **`ev.menuUpdated = true`**, which is undefined by default.
- `ev.addMenuItem(where, item|items)`:
  - `where` can be a command ID, an exact title string, a RegExp, a predicate, undefined (the top), or `{before: x}` / `{after: x}`.
  - If `where` matches nothing, items go at the top (before) or the end (after).
  - When called without an `items` argument, it sets `menuUpdated` itself.
- `ev.deleteMenuItem(which)` removes items. Call `ev.tidyMenu()` afterwards.
- Several listeners can edit the same menu in turn.

System menu IDs:
- Common: "main", "exit", "operator", "game setup", "pause game", "power off", "game categories".
- Filters: "filter by category", "filter by era", "filter by manuf", "filter by rating", "filter by system", "filter by when added", "filter by when played".
- Capture, media drop and elevation dialogs: "capture", "batch capture …", "media drop …", "elevation required", "approve elevation", "play pick system", "confirm delete gameinfo", "confirm delete media", "swf error".

### 4.3 Custom commands
1. Allocate the ID once at startup with `const CMD = command.allocate("myName")`.
2. Add it to a menu (`addMenuItem` in `menuopen`, or `showMenu`).
3. Handle it in `mainWindow.on("command", ev => { if (ev.id === CMD) … })`.

Other uses:
- Run a built-in command with `mainWindow.doCommand(command.X)`.
- Block or override a command with `preventDefault()` in the `command` event.
- For button behaviour, use `doButtonCommand` or `commandbuttondown`.

### 4.4 Popups
- `showPopup({id, backgroundColor: 0xRRGGBB, opacity, backgroundImage, borderColor, borderWidth, textColor, width, height, x, y, draw(dc)})`.
- Width and height are percentages of the window height.
- If you give no height and no image, `draw()` must return a pixel height. In that case it is called **twice**, so it must have no side effects.
- System popup IDs: "about box", "batch capture preview", "capture delay", "media list", "message", "flyer", "game info", "high scores", "instructions", "rate game", "game audio volume".

---

## 5. Gotchas and recommended practices (as stated in the docs)
- Keep every handler under about 30–50 ms. Use timers and Promises, never busy-waits or synchronous HTTP (Javascript.html, HttpRequest.html).
- Programmatic calls don't fire the matching "user" events:
  - `showMenu` → `menuopen`
  - `setWheelGame` → `gameselect`
  - `setCurFilter` → `filterselect`
  - `start/endAttractMode` → the attractmode events
  - `doButtonCommand` → key and commandbutton events
  - UnderlayEvent: `underlaychange` never fires for script-initiated underlay changes
- `filterselect` fires *before* the new filter is in effect, so read the new wheel contents later.
- Don't persist command IDs, game `id`s or filter `cmd`s. Persist the config ID and the filter `id` instead (Commands.html, GameInfo.html, FilterInfo.html).
- Don't hold GameInfo objects across a `settingsreload` (GameInfo.html).
- `optionSettings.get()` returns strings, so use `getInt`, `getFloat` or `getBool` for typed values (OptionSettingsObject.html).
- Give custom settings variables, filter IDs and metafilters a unique prefix (OptionSettingsObject.html, FilterInfo.html).
- Use `on("evt.MyNamespace")` so a module can remove its own listeners with `off(".MyNamespace")` (Javascript.html).
- Use `mainWindow.message()` or `StatusLine.show()` to inform the user, and `logfile.log` for diagnostics. Don't use `alert()` outside debugging (SystemFunctions.html).
- To hide the backglass during play, use `on("gamestarted", …showWindow(false))` and `on("gameover", …showWindow(true))`. PinballY normally restores its pre-launch window layout by itself (HideWindowExample.html, Troubleshooting.html).
- Use `postlaunch`, with `once()`, to undo changes made in `prelaunch` (CaptureCommandLineChangeExample.html).
- Before a script-driven shutdown or log-off, run `if (optionSettings.isDirty()) optionSettings.save();` (LogOffExample.html).
- Direct Win32 changes to PinballY windows bypass the program. Use the JS window methods instead (WindowObjects.html).
- Mistakes in DLL calls can crash PinballY. Use `WINAPI` correctly and free handles (DllImport.html).
- Known inconsistencies in the help:
  - `configID` is really `configId`.
  - `timestamp` is really `timeStamp`.
  - "settingschange" is really `settingsreload`.
  - "settingspostchange" is really `settingspostsave`.
  - The `playGame` example passes the overrides as a 3rd argument. The documented signature is `(game, {overrides})`.

---

## 6. System scripts: what the code does that the help doesn't say

Checked in `Scripts\System\*.js` as shipped with Beta 10 (`SystemClasses.js` = upstream `a452891`; `CParser.js` unchanged since 2018) and in the PinballY C++. Details, line citations, and the review of the AI-modified copies on the cabinet: `docs/research/system-scripts.md`.

- **Loading:** `CParser.js`, then `SystemClasses.js`, run as classic sloppy-mode scripts before `main.js` (a module). The exe looks up about 60 of their globals by name and **disables Javascript** if one is missing. So the System scripts must match the exe version: upstream master, the future Beta 11, adds a `pinscape` global and requires it.
- **Undocumented globals:** `sprintf(fmt, …)`, `trySprintf`, `OutputDebugString(text)` and `_defineInternalType`; the script-scope bindings `CParser`, `Logger`, `Event` and `EventTarget`. The original scripts also leak `ifc` and `ranged`.
- **logfile:** each line is prefixed `[Script] `, has no timestamp, and is converted to the ANSI code page. printf formatting applies only with **two or more** arguments, and extra arguments after the format codes are dropped.
- **console** (corrects §2.7): output is not discarded without a debugger. Every call also goes to `OutputDebugString` as `console.log(<level>): <text>`. `warning` is sent at level "log", `timeLog`/`timeEnd` always report about 0 ms, and `count()` without a label shares one counter across all call sites.
- **printf quirks:**
  - `%s` of `null`/`undefined` throws.
  - `%10.3s` pads, then truncates, which leaves only spaces.
  - `%+d` of 0 gives `" 0"`.
  - `%.3d` zero-pads and ignores the width.
  - `%S` of an object nested more than 5 levels deep throws.
- **Events:** `addEventListener(type, fn, true|false)` throws a ReferenceError. `off("type.ns")` or `off(".ns")` throws once a listener of that type was added with `addEventListener`. When a listener throws, the later listeners are skipped, and the C++ logs the error and runs the default action even if `preventDefault()` was called.
- **Menus:**
  - `addMenuItem(where, item, items)` edits `ev.items`, not `items`.
  - `deleteMenuItem(/re/)` throws.
  - `deleteMenuItem(which, items)` returns a new array instead of editing `items`.
  - `tidyMenu` only sees separators that have `title: ""`, so it ignores `{ cmd: -1 }`.
- **command** (corrects §2.9): only `Capture*`, `Filter*` and `PickSys*` get `name` + `index`. Media-drop commands get a numeric `name`, and `UserFilterGroup*` is not a range. `allocate(name)` silently overwrites an existing `command[name]`.
- **HttpRequest:** `send()` rejects every status other than 200.
- **dllImport:**
  - A declaration string that ends with a `//` comment (no newline), or that has an unclosed `/*`, **freezes PinballY** in an infinite loop.
  - `unsigned long long` is parsed as signed, so write `ULONGLONG`.
  - `HFONT` is mapped to a 32-bit int.
