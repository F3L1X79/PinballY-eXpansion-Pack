# Research: getting ready for the next PinballY version

Date: 2026-11-01. Roadmap item #4, "Se préparer à la prochaine version de PinballY" (`docs/roadmap.html`). Sources:
- PinballY upstream, `github.com/mjrgh/PinballY`, read through the GitHub API (`gh api`): releases, tags, branches, the commit list since 2024-10-01, and the diff `compare/1.1.0-Beta10...master`. Master is at `d84763e32f089317db405798d83ea26f77a18606` (2026-02-24). Files at that commit are cited as `<path>#Lnn` (`https://github.com/mjrgh/PinballY/blob/d84763e/<path>#Lnn`); commits are cited by short SHA (`https://github.com/mjrgh/PinballY/commit/<sha>`).
- Upstream issues and pull requests on the same repo, cited as `issue #N` / `PR #N`. Comments by `mjrgh` (Michael J Roberts, the author) are treated as primary for his intentions; comments by other accounts are information only.
- ChakraCore upstream, `github.com/chakra-core/ChakraCore` (releases, master commits since 2024-08-01, PR #6973).
- The local help (`docs/pinbally/Help/*.html`, 1.1.0 Beta 10, build 10086), the digest `docs/pinbally/pinbally-help.md`, the examples sheet `docs/pinbally/pinbally-examples.md`, and `docs/research/system-scripts.md`.
- Our code (`main.js`, `addons/`, `common/`), cited as `<path>:<line>`.

Not read: `mjrnet.org`, the author's download page, which also hosts `VersionHistory.txt` (connection refused / 502 from the sandbox). So a build published only there, and not on GitHub, cannot be ruled out. **To verify** in a browser.

**Fact** = read in a primary source. **Inference** = my reading, not checked on a running PinballY. **To verify on the cabinet** = nothing read settles it.

## Verdict

1. **No PinballY release since 1.1.0 Beta 10** (GitHub release 2024-11-03, tag `1.1.0-Beta10` = `9cf6686`). Master is 9 commits ahead. The last one is 2026-02-24, and there has been nothing on master in the eight months since. `VersionHistory.txt` on master opens a section **"TBD (1.1.0 Beta 11)"**. The next version is therefore a Beta 11, not a 1.2, as far as the source shows.
2. **What is known of Beta 11 is small and almost harmless for the pack.** Of six changes, only two touch Javascript. (a) A new global `pinscape`, which the exe **requires**: a `SystemClasses.js` without it turns Javascript off, and with it every Add-on. (b) Table folders are now scanned **recursively**, so new unconfigured tables can appear and a game's `filename` can hold a subfolder. Nothing changed in events, native menus, `systemInfo`, `dllImport` / `CParser.js`, `optionSettings`, `HttpRequest`, drawing layers, `logfile` or the Javascript engine.
3. **No primary source announces a breaking change.** No issue, PR or author comment mentions one. Expecting breaking changes is reasonable for a beta, but nothing published supports it today.
4. **Optional chaining stays unavailable even if PinballY updates ChakraCore.** ChakraCore has had no release since v1.11.24 (2020-12-09). Its optional chaining PR (#6973) has been open and unmerged since 2024-04-15. Master commits since August 2024 are build and CI fixes. PinballY last updated ChakraCore in Beta 7 (`c2e0a03`) and has not touched it since.
5. **Version detection works, with one hole.** `systemInfo.version.semantic` is the reliable field, and `startup_summary.js` already reads it. But master's `VersionInfo.h` still says Beta 10. An exe built from master today reports `"1.1.0 (Beta 10)"` while it requires `pinscape`. Only `build` (`10106` on master against `10086` for Beta 10) tells it apart, and our comparison ignores `build`.

## 1. Beta 10 baseline

**Facts**
- Releases on GitHub, newest first: `1.1.0-Beta10` (2024-11-03, "This release fixes some media capture bugs that appeared in 1.1 Beta 9", assets `PinballY-20241103.zip/.msi` and `PinballY-64bit-20241103.zip/.msi`), `1.1.0-Beta9` (2024-09-25), `1.1.0-Beta8` (2024-09-21), `1.1.0-Beta7a` (2024-08-31, pre-release), `1.1.0-Beta6` (2022-07-17). No later release or tag exists (`gh api repos/mjrgh/PinballY/releases`, `/tags`).
- Tag `1.1.0-Beta10` points to `9cf6686` "1.1 Beta 10" (2024-11-03). `VersionInfoUpdater/BuildNumber.txt` there is `10086`. That is the build the cabinet logs (`docs/research/launch-events-order.md:67`).
- Branches: `master` and `Immutable_Sprites`, whose last commit `da241a4` is from 2019-12-23 ("stashing on branch since it's pretty destabilizing"). No active side branch.
- The pack names Beta 10 as both minimum and last tested version (`common/core/startup_summary.js:15-16`, `README.md:37`, `README.fr.md:37`, `docs/guide/en/install.md:7`, `docs/guide/fr/install.md:7`).

## 2. Changes since Beta 10

The full diff `1.1.0-Beta10...master` is 9 commits and 25 files. The only script file is `scripts/system/SystemClasses.js` (+8 lines). No change to `JavascriptEngine.cpp/.h`, `CParser.js`, `VersionInfoUpdater.cpp`, `PinballY/VersionInfo.h` or `ChakraCore/` (file list of the compare).

| # | Change | Source | Impact on the pack | Files touched in the pack |
|---|---|---|---|---|
| 1 | New global `pinscape` (an `EventTarget`) with a getter/setter `nightMode`. **The exe looks it up and disables Javascript if it is missing.** | `92b55cb` (2026-01-14); `scripts/system/SystemClasses.js` (`this.pinscape = new EventTarget();` after `this.gameList`); `PinballY/PlayfieldView.cpp#L834` (`GetObj(jsPinscape, "pinscape")` in the required-globals list), `#L1198-L1200`; `Help/PinscapeObject.html`; asked in issue #258 | **High, but outside our code.** A Beta 11 exe with a Beta 10 `SystemClasses.js` loads no Add-on. That happens on a cabinet that keeps hand-edited System scripts, or after an install that keeps the old `Scripts\System\`. The cabinet copy already defines `pinscape` (`docs/research/system-scripts.md`, "State of the cabinet's copies"). A normal install ships both files from the same build (Inference). New optional feature: a Night Mode read/write, which an Add-on could use to mute sounds (idea, not a need). | None. `pinscape` is not in the allowed globals of `.claude/rules/conventions.md`; add it there and to `common/core/pinbally_host.js` only if a feature uses it. |
| 2 | Table folders are scanned **recursively**. The `filename` of a file found by the scan becomes the path **relative to the system's Tables folder** (`Sub\Table.vpx`). Its `title` and `mediaName` come from the base name. | `6090773` (2026-01-04, vbousquet), merged by PR #276 (`35e0dba`, `300b5df`, 2026-02-24); `PinballY/GameList.cpp#L4039` (`SetTitleFromFilename`), `#L5358` (recursive `ScanFolder`), `#L5370` (`fs::relative`); `PinballY/Application.cpp` (`NewFileScanThread`) | **Medium.** (a) A player with old copies, backups or VPX 10.8.1 per-table folders under `Tables\` gets **new unconfigured tables** (`<title>.Unconfigured` configId, `GameList.cpp#L4089-L4106`). They count everywhere we list tables. (b) For such a game, `resolveGameFile()` keeps `folder` = the Tables root and `filename` = `Sub\X.vpx` (`GameList.cpp#L4390-L4394`). `path` stays the full, correct path (Inference). We only read `path`, so no break. (c) Flat layouts are unchanged: `sepPos == npos` keeps the old code path. | `common/core/pinbally_host.js:443-447` (`getVisibleTables`/`getAllTables`/`getWheelTables`); `common/core/startup_summary.js:52` (table count); `common/table_roms/script_queue.js:42-46` (one vpxtool read per new `.vpx`); `common/table_roms/nv_confirmation.js:45-46` (`path` only, OK); `common/tables/period_table.js` (Table of the Day / Week pool); every store keyed by `configId` (Profile stats, Achievements). |
| 3 | `GameStats.csv` gets a daily backup: on the first write of the day the old file is renamed to `GameStats backup yyyy-MM-dd.csv`. On later writes it is deleted, then the temp file is renamed in. | `ce3c59f` (2026-02-21); `PinballY/CSVFile.cpp` (`CSVFile::Write`) | None: our code never reads or writes `GameStats.csv` (grep of `main.js`, `addons/`, `common/`). Stats still go through `GameInfo` fields. | None. |
| 4 | "Run command at startup/exit" accepts a `.lnk` (launched with `ShellExecuteEx`). The help now says those commands are waited for (synchronous). | `92b55cb`; `890ac7d` (2026-02-23); `PinballY/Application.cpp` (`RunCommand`); `Help/StartupOptions.html` | None for scripts. Of note only if the install guide ever tells owners to put a tool in Run at startup: it must not stay running, or PinballY waits. | None. |
| 5 | Edit Game Details: auto-complete waits for typing; Backspace cancels it. Default audio-capture codec no longer forced to `aac` for audio output. | `92b55cb`; `PlayfieldView.cpp` (`EditGameInfo`), `Application.cpp` (`GameMonitorThread::Main`); issues #248, #259 | None. | None. |
| 6 | Help and log text only: the ChakraCore paragraph of `Javascript.html` adds "Microsoft is no longer investing in ChakraCore development", a Pinball FX setup, a `[NOWAIT TERMINATE]` typo fix. `Config.cpp` fixes the format of the `Settings.txt` save-error message (`%hs` → `%s`). `VersionHistory.txt` records libvlc 3.0.21 under Beta 9. | `ea4baca`, `185ca44`, `d84763e`; `Utilities/Config.cpp` (`ConfigManager::Save`) | None. The ChakraCore sentence supports §4: the engine is frozen. | None. |

### Areas checked and found unchanged on master (facts, from the compare file list)
- Events (names, order, properties), native menus (`menuopen`/`menuclose`, `showMenu`, `MenuReturn`), drawing layers, `mainWindow` methods: no change to their C++ (`PlayfieldView.cpp` diff limited to the hunks above) or to `SystemClasses.js` apart from `pinscape`.
- `systemInfo`: same construction (`PlayfieldView.cpp#L715-L736`), same version strings (`VersionInfoUpdater.cpp` untouched).
- `dllImport` / `CParser.js`: untouched (`CParser.js` unchanged since 2018, `docs/research/system-scripts.md` Verdict 1).
- `optionSettings`, `gameList` API, `HttpRequest`, `logfile`: untouched.

## 3. Pending pull requests that could land in the next version

None is merged. Listed because they touch the scripting API or what our Add-ons draw:

| PR | State | What | Relevance to the pack |
|---|---|---|---|
| #284 (dynajoe, 2026-07-01) | open | Fix a crash (access violation) when the **same function object** is passed twice as a `dllImport` callback | None today: we declare no callback type (`dllImport.bind` calls at `common/core/pinbally_host.js:129`, `:279`, `:382`, `:536` are plain prototypes). A trap to remember if a feature ever needs `EnumWindows`-style callbacks on Beta 10: pass a fresh arrow function each time. |
| #280 (dynajoe) | open | New setting `PlayfieldWindow.MediaRotation` (default 270, the current hard-coded value) | Only playfield background media; default unchanged. None (Inference). |
| #281 (dynajoe) | open | APNG loader: downscale frames, cap texture memory at 64 MB | None known: our layers use `loadImage` / drawing, not large APNGs (Inference). |
| #285 (dynajoe) | closed by its author 2026-08-03, not merged | `DrawingLayer.setRotation()` | Would have been a new API; not coming. |

Open feature issues that may shape the next release (no author commitment): VPX 10.8.1 per-table folder layout with a `medias/` subfolder (issue #289, 2026-10-10). That layout also moves PinMAME's `nvram/` into each table folder. Owner-side, `common/table_roms/nv_confirmation.js:21-29` only looks at the system NVRAM path and the VPinMAME registry key (Inference: a VPX change, not a PinballY one). openPinDev input support (issues #278, #287: "on my to-do list", mjrgh 2026-02-27 and 2026-09-24).

## 4. Javascript engine (ChakraCore)

**Facts**
- PinballY ships prebuilt ChakraCore binaries (`ChakraCore/x64/lib/ChakraCore.dll`, `ChakraCore/x86/lib/ChakraCore.dll`). The last change is `c2e0a03` (2024-08-30, Beta 7): "update ChakraCore to latest". mjrgh confirms Beta 7 migrated "to the (then) latest version of the Javascript engine (ChakraCore)" (issue #272, 2025-09-25).
- ChakraCore upstream: last release v1.11.24 (2020-12-09). Master commits since 2024-08-01 are build, CI, C++14/17 and platform fixes (`97e68c9` 2026-02-19 is the newest). None adds syntax.
- Optional chaining: `chakra-core/ChakraCore` PR #6973 "Optional chaining", open since 2024-04-15, not merged (state read 2026-11-01).

**Inference:** the next PinballY, even with a fresh ChakraCore, would accept the same syntax as Beta 10. The rules "no `?.`" and "`??` accepted" (`.claude/rules/conventions.md`, Syntaxe) stay valid. A new ChakraCore DLL could still change runtime behaviour, so the pack's syntax and test checks stay useful. **To verify on the cabinet** after an upgrade: the file version of `ChakraCore.dll` (Explorer > Properties > Details), compared with Beta 10's.

## 5. Detecting the running PinballY version

**Facts**
- API: `systemInfo.version` (`Help/SystemInfoObject.html`), built by the C++ right after the System scripts (`PlayfieldView.cpp#L715-L736`). Fields: `display`, `semantic`, `basic` (literal `PINBALLY_VERSION`), `status`, `build` (integer), `buildDate` (`Date`). The format arguments are `fullVerWithStat, semVer, fullVer, buildNo, unix_date*1000`, so **`status` receives `fullVer`** (`"1.1.0"`), not the release status (`docs/pinbally/pinbally-help.md:220`, confirmed at master).
- Strings, from `VersionInfoUpdater/VersionInfoUpdater.cpp#L360-L420`, with inputs `PINBALLY_VERSION`, `PINBALLY_RELEASE_STATUS` (`STATUS_ALPHA/BETA/RC/DEV/RELEASE`), `PINBALLY_PRERELEASE_SEQNO`, `PINBALLY_FORK_ID` read from `PinballY/VersionInfo.h`:
  - `display`: `"1.1.0 (Beta 10)"`; RC: `"1.2.3 (RC2)"`; a sequence number of 0 or a release: `"1.2.3 (Beta)"`, `"1.2.3 (Release)"`; Dev: `"1.2.3 (Dev)"`. A fork appends `.<fork>` to the number (`"1.1.0.Fork (Beta 10)"`).
  - `semantic`: Beta/Alpha/RC with a number: `"1.1.0-beta.10+10086.<yyyymmddThhmm>"`; Dev: `"1.1.0-Dev.<build>+<date>"`; release: `"1.1.0+<build>.<date>"`. A fork adds `<fork>.` right after `+`.
- `PinballY/VersionInfo.h` on master: `PINBALLY_VERSION "1.1.0"`, `STATUS_BETA`, `PINBALLY_PRERELEASE_SEQNO 10`, last changed `57caeeb` (2024-10-15). **Master still identifies itself as Beta 10.** Only `BuildNumber.txt` moved (`10086` → `10106`).
- Our reader: `host.getPinballYVersion()` returns `systemInfo.version` (`common/core/pinbally_host.js:532`). `writeStartupSummary` logs `display` and `build` (`common/core/startup_summary.js:50`). It compares `semantic` as `[major, minor, patch, status rank, pre-release number]` (`:19-31`), **without the build number**, and logs a WARNING outside [minimum, last tested] (`:54-62`).
- How others do it: the author's own update-check example compares a release **date** taken from the online `VersionHistory.txt` against `systemInfo.version.buildDate`. Its stated reason is that "comparing version strings correctly is rather tricky" with the beta suffixes (`Help/UpdateCheckExample.html:147-180`). vbousquet's FlexDMD PinballY script copies that example (`github.com/vbousquet/flexdmd`, `Scripts/PinballY/main.js:32-40`; secondary, a third-party script). The official Add-ons repository (`github.com/PinballY/PinballY-Addons-and-Examples`, last commit `beb36ea` 2025-01-16) has no `systemInfo` reference (GitHub code search). No example gates features on a version.

**Inferences**
- A real Beta 11 will give `semantic` `"1.1.0-beta.11+<build>.<date>"`, which our comparison already reports as newer. A 1.1.0 release gives `"1.1.0+…"` (rank `""` > `beta`), also reported.
- The blind spot: an exe built from master before the author bumps `VersionInfo.h` (a self-build, or a test build shared on a forum) reads as Beta 10, so no WARNING. Yet it requires `pinscape` and scans subfolders. Adding `build > 10086` as a second "newer than tested" test would close it (a design choice for the grilling, not made here).
- `buildDate` is a usable tie-breaker too, but `build` is simpler and monotonic in the author's tree (`BuildNumber.txt`).
- Do not use `status` (wrong field) or `basic` (no release status).

## 6. Upcoming or announced changes

**Facts**
- The only written plan is the "TBD (1.1.0 Beta 11)" section of `VersionHistory.txt` (master, `d84763e` "version notes"). It lists exactly items 1 to 5 of §2: `pinscape`, `.lnk` startup commands, auto-complete, the audio codec, recursive table folders, daily `GameStats.csv` backups.
- No date is given. Master has been idle since 2026-02-24. Recent author activity is issue replies only (latest 2026-09-24, issue #287).
- No issue, PR or author comment announces a change to the scripting API, the event model, menus, or a ChakraCore replacement. On a Night Mode event, mjrgh chose a property polled with `setInterval` over a native event, and said "I can always add a formal event in the future" (issue #258, 2024-12-18).

## 7. Open points (to verify)

1. **mjrnet.org downloads:** check in a browser whether `http://mjrnet.org/pinscape/PinballY.php` or `…/downloads/PinballY/VersionHistory.txt` offers anything newer than Beta 10 (unreachable from the sandbox).
2. **On the cabinet, after installing the next version:** whether the installer (MSI or ZIP) overwrites `Scripts\System\`. If it does not, the cabinet's edited `SystemClasses.js` stays in place: it already has `pinscape`, but it would miss any other new global. Check that `logfile.log` shows our `[ExpansionPack] Started:` line at all: no line means Javascript was turned off.
3. **On the cabinet:** the first startup line after the upgrade (`display`, `build`) confirms the exact strings. Check that the WARNING "newer than … tested" appears.
4. **On the cabinet, if subfolders exist under any `Tables\` folder:** compare the table count of the startup line before and after the upgrade, and look for new `*.Unconfigured` tables in the wheel and the Table of the Day pool.
5. **On the cabinet:** `ChakraCore.dll` file version before and after (§4).
6. Whether to make `build` part of the version check (§5), for the grilling.
