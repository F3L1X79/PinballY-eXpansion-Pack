# Research: recording the best finished game of a launch (live Play Score capture)

Date: 2026-11-08. Question: PinMAME writes the `.nv` only when emulation stops, so a launch with several games only shows the last one to `vpxtool nvram show`. Can the pack observe scores while the table runs, and record the **best finished game of the launch**? Three approaches: a hook in VPX's shared VBScript, a VPX plugin, or reading process memory from PinballY's JavaScript.

Sources (all read on 2026-11-08):
- **VPX** `vpinball/vpinball` master `4fd4426` (2026-11-08), cited `vpx:<path>#Lnn`; tag `v10.8.0-2051-28dd6c3` (the latest non-pre-release, 2025-01-29), cited `vpx@10.8.0:<path>#Lnn`; pre-release tag `v10.8.1-5436-af26b2d93` (2026-08-21) for file presence.
- **PinMAME** `vpinball/pinmame` master `1e0703d` (2026-11-08), cited `pinmame:<path>#Lnn`.
- **pinmame-nvram** `fe60dc7`, cited `pn:<path>#Lnn`; **vpxtool** `6eda3ce`, cited `vt:<path>#Lnn`; maps as in SBB.
- **Table corpus** `jsm174/vpx-standalone-scripts` `33ab147` (2026-10-27): 284 `.vbs` scripts, 170 of them ROM tables by the HS regex, cited `corpus:<table>`. Patched for standalone and biased to popular or recent tables (HS header).
- **Cyber Pinball** `gocode/cyberpinball` `fe59193` (2026-11-07, GPL-3.0), cited `cp:<path>#Lnn`. An existing project doing this, read for its mechanism. Its statements about ROM behaviour are its own bench notes, so they are cited as such and stay **Verify** for this cabinet.
- This repo: `docs/research/scores-below-board.md` (SBB), `docs/research/high-scores.md` (HS), `docs/research/high-scores-tools/vpxtool.md` (VT), `common/high_scores/last_game_reader.js`, `docs/pinbally/pinbally-help.md` (PH), `docs/pinbally/Help/`.

Not checked: anything on the cabinet (its VPX, VPinMAME, `core.vbs` and PinballY bitness are unknown); the commit that introduced `get_NVRAM` (the clones are shallow); ROM disassembly; the contents of released pre-release zips; VPX standalone behaviour (out of scope, the cabinet is Windows). PUP/PinUP and DOF: no source was read beyond a code search, which found no score capture. No code was run: every performance figure below is an Inference.

**Fact** = read in a primary source. **Inference** = my reading, not run. **Verify** = needs the cabinet.

## Short answer

| # | Approach | Works? | Reaches volatile-RAM ROMs? | Verdict |
|---|---|---|---|---|
| 1 | VBScript hook through **`GlobalPlugIn.vbs`** (no edit of `core.vbs`), reading `Controller.NVRAM` | **Yes per source, on VPX 10.8.0 and the classic VPinMAME.** The bytes are the `.nv` bytes by construction, so vpxtool decodes them | No (Gottlieb 1/80, Williams 4-7, Atari gen 1: 285 ROM ids, SBB) | **Recommended, after a one-table probe** |
| 2a | **Inspector plugin**, already in VPX 10.8.1 pre-releases: decoded live states over HTTP | Yes per source, but only with the PinMAME plugin of 10.8.1. Not on 10.8.0 or the COM VPinMAME | Yes | Keep for later, if the cabinet moves to 10.8.1 |
| 2b | Own native plugin | Same reach as 2a, plus a build step and an API its authors say not to rely on | Yes | **Rejected** |
| 3 | `ReadProcessMemory` from JS | Not reliably: no exported pointer to the emulated RAM | In principle | **Rejected** |
| - | A way to make PinMAME flush the `.nv` during a game | **None found** | - | - |

Key points:
- `core.vbs` already has a user extension point: it loads an optional **`GlobalPlugIn.vbs`** "instead of altering the core.vbs" (Fact, section 1.2). That file is not shipped by VPX, so an update does not overwrite it (Inference).
- **No single end-of-game signal exists** for every platform over `Controller` (section 4). The robust rule is offline: split the samples of a launch at each score reset, and keep the last sample before each reset.
- Samples at the start of a launch can hold the **previous launch's game**. They must be discarded (section 4).

## 1. VBScript hook

### 1.1 The API (Fact)

- `Controller.NVRAM`: read-only. It sets up a RAM file and calls `Machine->drv->nvram_handler(file, 1)`, then returns a `VT_ARRAY | VT_VARIANT` 1D array, 0-based, one byte per element (`pinmame:src/win32com/Controller.cpp#L539-L576`). Empty result (`S_FALSE`) when no machine runs.
- `Controller.ChangedNVRAM`: same handler, compares with a static copy, returns a `rows x 3` table (number, new value, old value), or Empty when nothing changed or the emulation is not running. The first call after a game change returns Empty and only takes the baseline. Capped at `CORE_MAXNVRAM` = 131118 bytes (`Controller.cpp#L599-L686`; `pinmame:src/wpc/core.h#L340`).
- `core.vbs` calls `ChangedNVRAM` from `PinMAMETimer_Timer` when `UseNVRAM` is true and `NVRAMCallback` is an object (`vpx:src/scripts/core.vbs#L38-L39`, `#L2717-L2722`; same in `vpx@10.8.0:scripts/core.vbs#L37-L38`, `#L2491-L2493`). `UseVPMNVRAM` must be set before `core.vbs` loads (`vpx:docs/Changelog_Scripts.txt#L145-L146`).
- **Threading**: the property runs on the caller's thread, the VPX script thread. `get_NVRAM` has no `m_hEmuIsRunning` guard (`Controller.cpp#L539-L542`) and no lock against the emulation thread. A multi-byte BCD score read while the ROM updates it can be torn (Inference). A finished game's scores are static, so this affects only in-progress samples.
- **Availability in tables**: Scared Stiff reads its live score with `NVRAM(CInt("&h16A0"))` and following bytes, for a floating score effect (`corpus:Scared Stiff (Bally 1996) v1.29`, `FloatingTextUpdates`, its comment says "WPC current score"), and Defender reads settings the same way (`corpus:Defender (Williams 1982) VPW v1.4`, `NvRam_Init`). So a table script can do this, and indexing works in shipped tables.
- **Version floor**: `core.vbs` of 10.8.0 already has the callback path. The VPinMAME version that added `NVRAM` was not established. **Verify**: log `Controller.Version` on the cabinet.

### 1.2 Where to inject (Fact)

- Every ROM table goes through `core.vbs`: `LoadVPM` in the table calls `LoadVBSFiles` then the controller (`vpx:src/scripts/controller.vbs#L144-L146`, `#L158-L163`), and each system script runs `LoadCore`, which `ExecuteGlobal`s `core.vbs` and `VPMKeys.vbs` (`vpx:src/scripts/WPC.vbs#L9-L18`, `sam.vbs#L4-L13`, `Bally.vbs#L4-L13`). **Same `core.vbs` for all systems**; per-system values live in the system script (`GameOnSolenoid` below).
- **Corpus count** (regex, comments stripped): of 170 ROM tables, 169 call `LoadVPM`, 1 (`Thunderbirds original 2022`) runs `ExecuteGlobal GetTextFile("core.vbs")` itself, and **0 embed `Sub PinMAMETimer_Timer` or `Class cvpmTimer`**. None sets `NVRAMCallback`.
- `core.vbs` ends with `LoadScript("GlobalPlugIn.vbs")`, "useful for adding custom scripting that can be used for all tables instead of altering the core.vbs" (`vpx:src/scripts/core.vbs#L3276-L3277`; `vpx@10.8.0:scripts/core.vbs#L3062`; introduced per `vpx:docs/Changelog_Scripts.txt#L235`). `LoadScript`/`CheckScript` look in the given path, then `ScriptsDirectory`, then a table-relative folder (`core.vbs#L92-L112`). `GetTextFile` resolves through `SearchScript`, table folder first in current builds (`vpx:src/core/ScriptGlobalTable.cpp#L396-L402`, `vpx:src/core/FileLocator.cpp#L414-L443`).
- The file is not in VPX's `src/scripts` (listing). A DOF configuration tool edits a user's `<VPX>\Scripts\GlobalPlugIn.vbs` (`mkalkbrenner/dof_configtool_client:src/Controller/TextEditController.php#L181-L187`), so a cabinet may already have one, and the pack must merge rather than overwrite.
- A hook placed directly in `core.vbs` would need re-applying after each VPX update, since `core.vbs` is a shipped file (Inference; the installers were not read).

**Inference, injection without changing table behaviour.** `GlobalPlugIn.vbs` runs at global scope after `core.vbs` is fully defined, and before the `Controller` object exists (`LoadVBSFiles` comes before `LoadController`). So it can do:
```vbscript
UseNVRAM = True
Set NVRAMCallback = GetRef("PackNvramTick")
```
A table that sets its own `NVRAMCallback` later replaces ours and silently loses the capture, which harms nothing. The callback only needs `Controller` at tick time, so the load order is safe. `PinMAMETimer_Timer` wraps the call in `On Error Resume Next` (`core.vbs#L2694-L2725`), so a runtime error in our code does not stop the emulation loop. A compile error in `GlobalPlugIn.vbs` is swallowed by `LoadScript`'s `On Error Resume Next` (`core.vbs#L108-L112`): the table still plays, capture is just absent.

### 1.3 Snapshots and vpxtool

- **Same bytes, Fact**: `mame.c` writes the `.nv` with `(*Machine->drv->nvram_handler)(nvram_file, 1)` (`pinmame:src/mame.c#L645`); `Controller.NVRAM` calls that same pointer with the same argument (`Controller.cpp#L548`). For the drivers that use `core_nvram`, the handler writes the RAM block, then mech positions, then 6 DIP bytes (`pinmame:src/wpc/core.c#L3169-L3186`). The RAM file only appends (`pinmame:src/fileio.c#L369-L381`). So a dump has the `.nv`'s length and layout (Inference: identical by construction), including nibble layouts and offsets.
- `NVRAM` is the handler's region, **not all of RAM**. Scores in volatile RAM are absent, as in the `.nv` (SBB section 2). On 142 cabinet `.nv` files, 107 had values (SBB).
- **vpxtool** finds the map from the file name: `file_name().split('.').next()` (`pn:src/lib.rs#L314-L333`), so `taf_l7.nv`, and also `taf_l7.0001.nv`, resolves to `taf_l7` (Inference, `vpxtool nvram show` also has its own extension check, `vt:src/cli.rs#L2211-L2235`; **Verify** the dotted name). `open_nvram` checks only existence, and values are read by seek, so no file-length check was found (I did not run a truncated file; a dump is not truncated anyway).
- **File I/O from a table script**: `CreateObject("Scripting.FileSystemObject")` is what `core.vbs` itself uses (`core.vbs#L95`). Binary is awkward from VBScript. Writing **hex text** with `CreateTextFile` and converting after the Play is the safe path; the pack already has `WriteFile` through `dllImport` (`common/core/pinbally_host.js#L148`, `#L164-L167`). Alternatively Windows `certutil -decodehex` through the hidden `cmd.exe` route the pack uses (HS A5) (Inference).

### 1.4 Cost (Inference, no measurement)

- `ChangedNVRAM` runs on **every `PinMAMETimer` tick**, interval -2 on 10.8 ("more than once a frame", `core.vbs#L69-L77`). Native cost is one copy and one compare of the NVRAM (up to 131 KB on SAM), plus building the change table. It is small but paid each tick, and it starts as soon as the hook is installed, on every ROM table.
- A full `Controller.NVRAM` allocates 16 bytes per element (`VARIANT`) and returns a copy: about 130 KB on WPC, about 2 MB on SAM. A hex loop in VBScript over 8 KB is tens of thousands of interpreted operations (likely single-digit to tens of ms); over 131 KB it is likely a visible hitch. **Do not do it every tick**, gate by `GameTime`, and keep the rate low on SAM. Cyber Pinball polls `NVRAM` every 500 ms but every 2 s when it is over 32 KB (`cp:packages/core/src/livestate.ts#L396`, `#L406`, `#L451-L457`), a sign the author met the cost.
- Writing a full dump every few seconds is 8-131 KB of text each. Writes hit disk on the script thread (Inference).
- Lighter alternative: if the hook knows the **score slot offsets**, it reads only those bytes (as Cyber Pinball does) and writes a line per change. That needs offsets from the maps, hence the ODbL duties (SBB section 5): the pack would ship a derived table under ODbL with attribution, or fetch the maps at runtime. Owner decision.

## 2. VPX plugin (10.8.1 and later)

### 2.1 What exists (Fact)

- **VPX 10.8.0 has no plugin system**: the tag has no `plugins/` folder (tree of `v10.8.0-2051-28dd6c3`). The system is "a new preliminary plugin architecture" of 10.8.1, which is still in pre-release (`vpx:docs/Changelog.txt#L11`, `#L178`; releases API). So **a plugin is not available on a released stable VPX today**.
- API: C/C++ DLLs described by `plugin.cfg` (`windows.x86`, `windows.x64` keys, `vpx:plugins/helloworld/plugin.cfg`), scanned from the plugin folders, enabled per plugin by `[Plugin.<id>] Enable` (`vpx:src/core/player.cpp#L199-L212`, `vpx:src/core/FileLocator.cpp#L214-L234`).
- **Not stable**: `MsgPlugin.h`, `VPXPlugin.h`, `ScriptablePlugin.h`, `ControllerPlugin.h` and `PinMAMEPlugin.h` each open with "WARNING ... will evolve likely a lot before being considered stable. Do not use it, or if you do, use it knowing that you're plugin will be broken by the upcoming updates" (`vpx:plugins/plugins/MsgPlugin.h#L14-L18`, `pinmame:src/libpinmame/PinMAMEPlugin.h#L8-L12`).
- PinMAME data for a plugin: `PMPI_READ_MEMORY` reads the main CPU's address space (`PinMAMEPlugin.h#L37-L46`, `libpinmame.cpp#L2297-L2307`), and group `PMPI_GROUP_GAMESTATE` publishes decoded values from a memory map through `PinmameSetMemMap` (`PinMAMEPlugin.h#L82`, `libpinmame.cpp#L2774-L2779`, `#L3783`). Map getters read CPU memory directly with `memory_find_base(0, ...)` (`libpinmame.cpp#L3590`), so **volatile RAM is reachable**. The VPX plugin looks for `memmaps/` next to the table, in settings, or in the plugin folder (`vpx:plugins/pinmame/PinMAMEPlugin.cpp#L469-L490`), and builds may bundle them from `third-party/memmaps` (`make/CMakeLists_plugin_PinMAME.txt#L116-L119`, whether released zips include them was not checked).
- **Classic VPinMAME.dll**: the COM interface has no memory read and no game state; its IDL has `NVRAM`, `ChangedNVRAM`, `Lamp`, `Solenoid`, `GetMech` and no equivalent (`pinmame:src/win32com/VPinMAME.idl`). The plugin overrides the `VPinMAME.Controller` COM name when enabled (`PinMAMEPlugin.cpp#L556`), and a table sees that as `Controller.IsPlugin` (`controller.vbs#L286-L287`). So approach 2 **requires the PinMAME plugin**, not the installed VPinMAME (Inference).

### 2.2 Inspector plugin: no build needed (Fact)

- `plugins/inspector`, in the 10.8.1 pre-release tag `5436` and master. It "opens a local web server that shows dynamic played machine game states" (`vpx:docs/Changelog.txt#L188`), port setting default 2113 (`vpx:plugins/inspector/InspectorPlugin.cpp#L41`), with `/api/tree` and `/api/states` (`WebServer.cpp#L108-L112`).
- It **binds `0.0.0.0`** (`WebServer.cpp#L45`) and has `/api/state/toggle` (`#L112`), so it is reachable from the LAN and can change state: a risk to weigh, and Cyber Pinball gates it behind a firewall rule (`cp:livestate.ts#L46-L48`).
- Cyber Pinball reads it from the table script on 127.0.0.1 to get SAM's RAM-only values (`cp:livestate.ts#L42-L46`). PinballY's `HttpRequest` could poll it during a Play (Inference; `PH` lists `HttpRequest`; JS timers run during a game, section 3).
- Why not now: 10.8.1 is not released, and it changes where `.nv`, `VPReg` and user files go (HS A4, B1). If the cabinet moves, this is the cleanest way to reach RAM-only values.

### 2.3 Own plugin (Inference)

A custom DLL gives what Inspector already gives, plus C++ and two architectures to build, distribute and keep up with an API its authors say will break. The pack has no build step and no external dependency without approval. **Not worthwhile.**

## 3. Reading process memory from JS (Fact unless marked)

- **No locator**: `VPinMAME.def` exports only `DllCanUnloadNow`, `DllGetClassObject`, `DllRegisterServer`, `DllUnregisterServer` (`pinmame:src/win32com/VPinMAME.def`; `VPinMAME64.def` exists, not read). The RAM pointer is a C global such as `UINT8 *wpc_ram` in `pinmame:src/wpc/wpc.c#L151`, set through the memory map, per driver. The map addresses are CPU addresses, not process addresses.
- **Inference**: finding the RAM needs a scan of the VPX process with `VirtualQueryEx`/`ReadProcessMemory`, for instance for a block of the `.nv` read before launch. VPX holds gigabytes of textures, so the scan is slow and unstable, and per-build signatures break with each VPinMAME update.
- **Bitness**: a 64-bit PinballY exists next to the 32-bit one (`docs/pinbally/Help/Install.html#L67-L70`). A 32-bit process cannot address a 64-bit VPX through `ReadProcessMemory` (Inference; not documented here). **Verify** which builds the cabinet runs.
- **`dllImport`** constraints: bind with `WINAPI`, handles closed by hand, mistakes crash PinballY (PH section dllImport, `Help/DllImport.html`). `OpenProcess` for `PROCESS_VM_READ` is an ordinary same-user call, though Windows security tools may flag scanning (Inference, **Verify** antivirus).
- **JS timers run during a game** (Fact): the pack's Backglass Clock raises its window with `setInterval` during a Play (`addons/backglass_clock.js#L179`), and PH records layers drawn during a game (`PH#L77`).
- **Licence**: unchanged, maps are ODbL if offsets are shipped (SBB section 5).

## 4. Detecting the end of a game

| Signal | Reach | Status |
|---|---|---|
| `game_over` in the maps | In NVRAM on WPC, System 9/11, Data East, Whitestar, Gottlieb 3, Taito | **Unreliable on Bally 6800** (always false, SBB); **absent from NVRAM on SAM** (SBB, RAM-only `0x00034C7E` on `acd_170h`) |
| `current_ball`, `current_player`, `player_count` | In NVRAM on most platforms | SAM: `current_ball`, `current_player` are RAM-only; garbage seen on some ROMs (SBB) |
| Audits (games started) | WPC, Bally 6800 | SBB: WPC "Games started" rises on a finished or quit game; **no audit changed on SAM** |
| `final_scores` | Bally 6800, Stern M-100/M-200 | The pack's `playScoreOf` already uses it; garbage after a quit (SBB) |
| `Controller.Solenoid(GameOnSolenoid)` | 54 of the 74 files in `src/scripts` mention the constant (WPC 31, Bally and Stern 19; `sam.vbs` does not define it); Fact: `core.vbs` reads it for `vpmFlips` (`core.vbs#L2393-L2398`) | **Verify**: a falling edge is expected on game end, but tilt and ball drain may trip it too. As a sampling trigger only, repeated edges are harmless |
| `Controller.Lamp(n)` | Game Over lamp number differs per game; the Bally maps read a lamp for `game_over`, unreliable per SBB | Per-game knowledge needed: not generic |
| `Controller.GetMech` | Mech positions only (`Controller.cpp#L1425-L1430`) | Irrelevant |
| Plugin `game_state` | Everything mapped, including RAM (section 2) | 10.8.1 + PinMAME plugin only |
| Score reset at a new game | Whatever exposes `scores` | Best generic rule, needs the behaviour below verified |

**Clearing of previous scores.** SBB left this open. Cyber Pinball's bench notes give one data point: on T2 (`t2_l8`), at ROM start the memory shows the previous game for about three seconds, then the ROM clears it, and on SAM a ball counter keeps a quit game's ball until the next game (`cp:livestate.ts#L24-L39`). Bally 6800 keeps results in `final_scores` and zeroes `scores` after a finished 1-player game (SBB). **Verify per platform** what `scores` do at game end, in attract mode, and at Start.

**Recommended rule (Inference).** Treat the launch as a series of samples and decode them after `gameover`:
1. Discard samples from before the ROM's reset at startup (a fixed delay plus "scores differ from the `.nv` copied at launch"), or the previous launch's game is credited to this one.
2. Split into games at each drop of a slot's score toward zero; the last sample before each split is that game's result. A game that the player abandons by pressing Start cannot be told apart from a finished game on platforms without a reliable flag.
3. Take the maximum slot across games, and keep the existing `.nv` rule (`playScoreOf`) for the last game. A snapshot taken before a game's final ball undercounts it, so the sample interval matters: about 2 s, or a GameOn edge, keeps the final score, since post-game attract lasts longer than that (**Verify**).

## 5. Comparison

| | 1. `GlobalPlugIn.vbs` hook | 2a. Inspector | 2b. Own plugin | 3. Process memory |
|---|---|---|---|---|
| Coverage | All ROM tables that load `core.vbs` (170/170 in the corpus) whose scores are in NVRAM; not the 285 volatile-RAM ids | All mapped ROMs including RAM, but only on 10.8.1 + PinMAME plugin | Same as 2a | Whatever can be located |
| Reliability | Good for bytes (same as `.nv`); end of game by score resets | Good data; unreleased stack | Unstable API | Poor |
| Effort | Medium: hook, sample files, decode, segmentation, tests | Medium: move the cabinet first | Large, plus a build | Large |
| Maintenance | Low: survives VPX updates; one file to install | Depends on 10.8.1 changes | High | High |
| Risk to the cabinet | Hitches if sampling is too heavy; a bad hook only loses capture; a pack-installed file outside the pack's folder | LAN exposure; layout change of 10.8.1 | Crashes VPX | Crashes PinballY, AV flags |

## 6. Recommendation

**Approach 1, through `GlobalPlugIn.vbs`, gated by the probe below.** It is the only approach that works on a released VPX with the classic VPinMAME. The hook is one reversible file, the decoder (`vpxtool nvram show`) and the pack's parsing stay as they are, and a failure degrades to today's behaviour (last game only).

Reasons not to go further without the probe: no measurement of hitches exists, and the score-reset behaviour is not established per platform. If either fails, **plain statement**: keep the current last-game rule. The loss is limited to games below the board in a multi-game launch.

Order of work if the probe passes: (a) sampling by `GameTime` plus a GameOn edge when defined, hex dumps, decoded after the Play; (b) only if hitches appear on SAM, an offset-based light hook (ODbL decision). Installing `GlobalPlugIn.vbs` is a footprint outside the pack, like the vpxtool install, so it needs the owner's approval and a guide page. Revisit Inspector when VPX 10.8.1 ships.

## Cabinet checks (first probe, one WPC table, then SAM and Bally 6800)

1. Log VPX version and bitness, `Controller.Version`, `Controller.IsPlugin`, PinballY bitness, and whether `<VPX>\Scripts\GlobalPlugIn.vbs` already exists. Check that the installed `core.vbs` contains the `LoadScript("GlobalPlugIn.vbs")` line.
2. Add a minimal `GlobalPlugIn.vbs` writing a timestamp and `UBound(Controller.NVRAM)` every 5 s to a file. Check it loads, that `UBound` + 1 equals the `.nv` size, and that the table plays normally.
3. Write one full dump as hex, convert it to `<rom>.nv` and run `vpxtool nvram show`: same `game_state` as the file PinMAME writes at exit? Try a dotted name (`taf_l7.0001.nv`).
4. Play two games in one launch. Log per sample: time, scores, `current_ball`, `game_over`, audits. Answer: when do scores clear (game over, attract, Start)? How long after startup is the previous game visible? Does a game over keep the final score until Start?
5. Log `Controller.Solenoid(GameOnSolenoid)` edges during two games, tilt and ball drains included.
6. Measure hitches: GameTime deltas in the callback, with sampling off and on, at 8 KB (WPC) and 131 KB (SAM). Reduce the interval until invisible.
7. Check coexistence: a table using `Controller.NVRAM` itself (Scared Stiff style) still works. If a `GlobalPlugIn.vbs` existed in step 1, merge and retest.
8. If the cabinet runs VPX 10.8.1 with the PinMAME plugin: compare `NVRAM` there and the `ChangedNVRAM` column order. The plugin registers (`nvramNo`, `oldStat`, `currStat`) (`vpx:plugins/pinmame/PinMAMEPlugin.cpp#L178`, `#L110-L122`), while COM returns (number, new, old) (`Controller.cpp#L683-L684`), so columns 1 and 2 would be swapped (Inference). Reading full `NVRAM` avoids it.

## Other findings

- **No flush found** (Fact): `.nv` writes are in `mame.c` after the run ends (`pinmame:src/mame.c#L640-L648`). Nothing periodic in `core.c`, `Controller.cpp`; `grep` for autosave and flush paths found none. The IDL has no save method. The MAME `.hi` file path exists (`FILETYPE_HIGHSCORE`, `libpinmame.cpp#L93`) and was not examined further.
- VPX has a manual "tournament score" export in the pause menu (`vpx:docs/Changelog.txt#L536`): manual, so not a game-end signal.
- **Existing projects**: Cyber Pinball (GPL-3.0, so mechanism only, no copy) is the closest. It injects a poller in a duplicated table's script, reads `Controller.NVRAM` at map offsets, writes `key=value` lines to a file, and uses Inspector for SAM (`cp:livestate.ts#L20-L48`, `#L451-L490`). Its approach requires a table copy per game, which `GlobalPlugIn.vbs` avoids. VPin Studio: code search of `NVRAM` gives parsers and tests, none live (HS B3). `francisdb/vpinball-floating-scores` documents the same `Controller.NVRAM` route for effects.

## Sources

- `https://github.com/vpinball/vpinball/tree/4fd4426ca5a6a1f964c94b67bb8d91c4d2a8bc08` and tag `v10.8.0-2051-28dd6c3`: `src/scripts/core.vbs`, `src/scripts/controller.vbs`, `src/scripts/WPC.vbs`, `sam.vbs`, `Bally.vbs`, `stern.vbs`, `docs/Changelog.txt`, `docs/Changelog_Scripts.txt`, `src/core/ScriptGlobalTable.cpp`, `src/core/FileLocator.cpp`, `src/core/DynamicScript.cpp`, `src/core/player.cpp`, `plugins/README.md`, `plugins/plugins/*.h`, `plugins/pinmame/*`, `plugins/inspector/*`, `plugins/helloworld/plugin.cfg`, `make/CMakeLists_plugin_PinMAME.txt`.
- `https://github.com/vpinball/pinmame/tree/1e0703dd77018cc6f77f19e27d8a0c436bda8b46`: `src/win32com/Controller.cpp`, `src/win32com/VPinMAME.idl`, `src/win32com/VPinMAME.def`, `src/wpc/core.c`, `src/wpc/core.h`, `src/wpc/wpc.c`, `src/mame.c`, `src/fileio.c`, `src/libpinmame/libpinmame.cpp`, `src/libpinmame/libpinmame.h`, `src/libpinmame/PinMAMEPlugin.h`.
- `https://github.com/francisdb/pinmame-nvram/tree/fe60dc7c24ea59e27f2f116adc89169ce473fb1e`: `src/lib.rs`. `https://github.com/francisdb/vpxtool/tree/6eda3ce3362561f38beafb2283b1cbad41b7b444`: `src/cli.rs`.
- `https://github.com/jsm174/vpx-standalone-scripts/tree/33ab14795463d67922415f91784b0b53995b4182` (284 `.vbs`). `https://github.com/gocode/cyberpinball/tree/fe59193af796baaab41b8be7bf616b5e2497b6eb`: `packages/core/src/livestate.ts`. `https://github.com/mkalkbrenner/dof_configtool_client`: `src/Controller/TextEditController.php`. `https://github.com/francisdb/vpinball-floating-scores`: `README.md`.
- This repo: see the header.
