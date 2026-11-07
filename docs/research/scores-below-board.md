# Research: last-game scores from the NVRAM, for scores that never enter the board

Date: 2026-11-07. Question (roadmap item `scores-below-board`, "Les scores qui n'entrent pas au tableau"): can the pack read the score of the **last game played** from a ROM table's `.nv` file, so the Personal Board (a Profile's 5 best scores on a table) fills even when the table's Default Scores are too high to enter the High Score table? How many of the cabinet's ROMs have that score mapped in `pinmame-nvram-maps`? What about tables without a ROM?

Sources (all read on 2026-11-07):
- **pinball-memory-maps** (ex `pinmame-nvram-maps`, renamed in August 2026) at master `eba9020` (2026-11-02), cited `maps:<path>#Lnn` = `https://github.com/tomlogic/pinball-memory-maps/blob/eba90209c329acaaa129ad8077ef63d8d0c43958/<path>#Lnn`. Counts below come from a script run over its `index.json`, every map it points to, and the `platforms/*.json` files (a descriptor counts as "in the `.nv`" when its `start`/`offsets` fall in a `memory_layout` entry of type `nvram`).
- **PinMAME** master `3c645a7` (2026-11-06), cited `pinmame:<path>#Lnn` = `https://github.com/vpinball/pinmame/blob/3c645a73e4747703af85516939927577fa52d113/<path>#Lnn`.
- **pinmame-nvram** Rust crate (used by vpxtool) master `fe60dc7` (2026-11-06), cited `pn:<path>#Lnn` = `https://github.com/francisdb/pinmame-nvram/blob/fe60dc7c24ea59e27f2f116adc89169ce473fb1e/<path>#Lnn`.
- **vpxtool** master `6eda3ce` (2026-11-06), cited `vt:<path>#Lnn`.
- This repo: `docs/research/high-scores.md` (HS), `docs/research/high-scores-tools.md` and `high-scores-tools/*.md`, `common/table_roms/`.

Not checked: anything on the cabinet, ROM behaviour beyond what the map README states (no ROM disassembly), the py-pinmame-nvmaps parser.

**Fact** = read in a primary source. **Inference** = my reading, not run. **Verify** = needs the cabinet.

## Short answer

| # | Question | Answer |
|---|---|---|
| 1 | How many of the cabinet's ROMs have last-game scores in the maps? | **Cannot be answered from the repo: no list of the cabinet's ROMs exists in it** (searched `common/table_roms/`, `docs/research/`, `tests/`). Over the whole map index: **1,290 of 1,589 ROM ids (81 %), 385 of 436 maps**, have last-game scores stored inside the `.nv`. All WPC, System 9/11, Data East, Sega/Stern Whitestar, Gottlieb System 3, Taito, Bally/Stern 6800 and Stern M-100/M-200 maps qualify, and 31 of 32 SAM ROM ids. Gottlieb System 1/80/80A/80B, Williams System 4-7 and Atari gen 1 keep the scores **in volatile RAM, not in the `.nv`** (285 ROM ids), so they cannot be read after the Play. Method to count on the cabinet: below, "Cabinet checks". |
| 2 | Tables without a ROM | **Confirmed: nothing generic.** No `.nv`, and no tool found reads a last-game score for them. PINemHi's LeaderBoard needs a per-table script patch (`high-scores-tools/pinbally_builtins_and_integration.md`). They stay High Scores only. |

Key facts for the grill:
- **Format**: last-game scores are `game_state.scores`, an array of descriptors (`label` "Player 1"…, `start`, `length`, `encoding` usually `bcd`). The old top-level `last_game` key was deprecated in format 0.6 and **no current map uses it**. Bally AS-2518-35 and Stern M-100/M-200 also have `game_state.final_scores`, to use instead when `game_over` is true.
- **Players**: `game_state.player_count` ("number of players in the current game, or the game that just finished") is in the `.nv` for **1,080 ROM ids** (WPC, System 9/11, Data East, Whitestar, SAM, Gottlieb System 3, Taito). Bally/Stern 6800 and Zaccaria have no player count. Score slots are fixed per map: 4 (396 maps), 6 (23: Sega Whitestar 6-player games, a few Data East, `gmine_l2`, `smman`), 2 (4).
- **Which player is which**: only the slot label (Player 1…6). Nothing in the maps says who stood at the cabinet.
- **Timing**: PinMAME writes the `.nv` **once, when emulation stops** (Fact), so the file holds the RAM as it was at exit: the finished game's scores, or an unfinished game's if the player quit mid-game. `game_over` is in the `.nv` for 1,221 ROM ids, but **not on SAM** (in RAM there), so on SAM a quit mid-game cannot be told apart.
- **Licence**: maps are **ODbL 1.0** (contents DbCL 1.0), with a required attribution sentence. Shipping maps, or data derived from them, makes that derived database ODbL too (share-alike).
- **No map shipping needed** (Inference): vpxtool, which the Table ROMs Add-on already uses as an optional install, embeds the maps and prints every resolved map field, `game_state` included, with `vpxtool nvram show <file>.nv`.

## 1. Map format for last-game scores (Fact)

- `game_state` is "a collection of memory areas used during a game to store the state of the game" (`maps:README.md#L495-L498`). Its key fields: **`scores`** "player scores from the current game or the game that just finished", **`player_count`** "number of players in the current game (1-6), or the game that just finished", `current_player` and `current_ball` (0 or above the count = no game in progress), `ball_count` (`#L502-L524`). Extra fields: **`final_scores`** ("In the 'Game Over' state, Bally AS-2518-35 games store the results of the previous game at a separate memory address than the scores when a game is in progress. Use this entry in place of `scores` when `game_over` is `true`", `#L530-L533`), **`game_over`** (bool, `#L552`), **`ignore_scores`** (scores not valid now, for example System 6 or Bally displays showing the HSTD, `#L554-L559`). The README warns that some items stay valid in game over (`credits`) but `current_player` and `tilted` must be ignored then (`#L504-L506`).
- History: format **0.6** "Deprecate `last_game` attribute in favor of `game_state.scores`" (`#L682`); **0.8** adds `final_scores` and `bool`, and renames `attract` to `game_over` (`#L689-L700`). `maps:schema/map.schema.json#L39-L62` lists `scores` and `final_scores` under `game_state` and no `last_game`. My scan: **0 maps** still have `last_game`.
- Descriptor (`#L289-L330`): `start` (CPU address), `length` or `end`, or `offsets`; `encoding` among `bcd`, `int`, `ch`, `bool`, `enum`, `bits`, `raw`, `wpc_rtc`, `dipsw`. `bcd`: "each byte represents two decimal digits"; nibbles 0xA-0xF count as 0 (`#L345-L349`). Optional `endian`, `nibble` (4-bit NVRAM on System 7, Gottlieb 80B, Stern M-100, Bally 6800: `#L170-L184`), `mask`, `scale`, `offset`, `special_values` (`#L351-L398`). Array entries may use `repeat` (`count`, `step`) (`#L298-L309`).
- Address to file: the platform file's `memory_layout` marks regions `"nvram"` = "non-volatile memory stored in PinMAME's `.nv` file" vs `"ram"` = volatile (`#L143-L149`). Since 2025 the maps also cover volatile RAM "that isn't stored in `.nv` files" (`#L23-L25`). The Rust reader seeks to `address − base of the nvram region` (`pn:src/lib.rs#L156-L165`, `src/model.rs#L61-L63`) and tries `last_game`, then `final_scores`, then `scores` (`pn:src/lib.rs#L596-L650`, comment "sometimes scores is outside nvram and we need to read final_scores instead"). A value outside the NVRAM resolves to the warning "Value is stored outside the NVRAM", with no value (`pn:src/resolve.rs#L530-L565`).
- Example, WPC Attack from Mars (`maps:maps/williams/wpc/afm_113.map.json#L147-L178`): `player_count` `int` at 5905; four `bcd` scores of `length` 6 at 5792, 5799, 5806, 5813. Example Bally Six Million Dollar Man (`maps/bally/as-2518-35/smman.map.json#L23-L171`): six `scores` and six `final_scores`; `game_over` and `ignore_scores` read lamp bits (`"reading 'game over' lamp"`, `"reading 'HSTD' lamp"`).
- `_metadata.free_only` ROMs are always Free Play (`#L215-L218`), irrelevant here.

## 2. Coverage per platform (Fact, my count at `eba9020`)

"In `.nv`" = every score descriptor in an `nvram` region. "Final" = `final_scores` in `nvram`. "Count" = `player_count` in `nvram`. "Over" = `game_over` in `nvram`. ROM ids from `index.json` (1,589 ids, 436 maps).

| Platform (map `platform`) | Maps | ROM ids | Last-game scores in `.nv` | Count | Over |
|---|---|---|---|---|---|
| Williams WPC (`williams-wpc-8K`, `-12K`) | 147 | 447 | 447 | 446 | 446 |
| Sega / Stern Whitestar (`whitestar`) | 43 | 334 | 334 | 334 | 334 |
| Data East (`dataeast`, `dataeast-v1`) | 38 | 137 | 137 | 137 | 137 |
| Williams System 11 (`-40K`, `-48K`) | 32 | 39 | 39 | 39 | 39 |
| Williams System 9 | 4 | 6 | 6 | 5 | 5 |
| Stern SAM (`stern-sam`) | 25 | 32 | 31 (`acd_170` has no `game_state`) | 29 | **1** |
| Gottlieb System 3 (`-32K` too) | 29 | 51 | 51 | 51 | 51 |
| Taito (`taito`, `taito-1979`) | 4 | 36 | 36 | 36 | 36 |
| Bally / Stern 6800 (`bally-17-*`, `bally-35-*`) | 42 | 145 | 145 (+ `final_scores`) | 0 | 144 |
| Stern M-100 | 2 | 25 | 25 (+ `final_scores`) | 0 | 25 |
| Stern M-200 | 7 | 25 | 24 via `final_scores` only (`scores` in RAM) | 0 | 0 |
| Zaccaria (`gen1`, `gen2`) | 10 | 10 | 10 | 0 | 0 |
| Capcom | 10 | 11 | 2 | 2 | 2 |
| Atari gen 2, Rowamet | 2 | 3 | 3 | 1 | 1 |
| Gottlieb System 1, 80, 80A, 80B | 15 | 198 | **0** (RAM) | – | – |
| Williams System 4/6/7 | 17 | 76 | **0** (RAM) | – | – |
| Atari gen 1 | 6 | 11 | **0** (RAM) | – | – |
| Alvin G, Zaccaria proto (no `game_state.scores`) | 3 | 3 | 0 | – | – |
| **Total** | **436** | **1,589** | **1,290** | **1,080** | **1,221** |

Score slots per map: 4 (396 maps), 6 (23), 2 (4), none (13: 8 Capcom, 2 Alvin G, `acd_170`, 1 Stern M-200, Zaccaria proto). `ignore_scores` exists on 54 maps (Bally, Stern M-100/M-200, Williams System 4/6), 34 of them in `nvram`.

## 3. When the `.nv` is written, and whether the scores survive (Fact unless marked)

- PinMAME loads the `.nv` before `cpu_run()` and saves it **after `cpu_run()` returns**, unless a switch-log playback is running (`pinmame:src/mame.c#L603-L629`, `#L639-L648`). The handler writes the battery-backed RAM block as it is, then mech positions and 6 DIP bytes (`pinmame:src/wpc/core.c#L3169-L3186`). I found no periodic save in `mame.c`, `core.c` or `win32com/Controller.cpp`; `Controller.NVRAM` / `ChangedNVRAM` only copy the RAM to a table script (`Controller.cpp#L538-L548`, `#L612-L625`). This matches HS §C: the `.nv` changes at VPX exit, and a kill skips it.
- So the `.nv` holds the RAM **at the moment emulation stopped** (Inference from the code). After a finished game: that game's scores (the README's "game that just finished"). After a quit mid-game: the unfinished game's scores, with `game_over` false where it is mapped in `nvram`. On SAM, `game_over`, `current_player` and `current_ball` are in RAM (for example `acd_170h`: `player_count` at `0x02110900` in NVRAM, `game_over` at `0x00034C7E` in RAM), so a mid-game quit cannot be detected.
- Whether a ROM clears the scores when a new game starts does not matter: the next `.nv` save happens at the next exit. **Not established by a primary source**: whether some ROMs blank or overwrite `scores` during attract mode (the README only names Bally/System 6 HSTD display and Bally's separate `final_scores`). **Verify**.
- A Play with no game started (launch, exit) leaves the previous Play's scores in the `.nv`: the same values come back. The new-file date proves only that PinMAME ran, not that a game was played (Inference). Comparing with the scores read before the Play, or `credits`/audits such as "games started", are possible guards; not checked per map.

## 4. Number of players and who is who

- `player_count` (1-6) is in the `.nv` for 1,080 ROM ids (section 2). Elsewhere all slots are always present; the number of players can only be guessed from non-zero slots (Inference, **Verify**: on Bally/Stern 6800 an unused slot may keep an older value or show blanks, which `bcd` reads as 0).
- Slots are labelled "Player 1"…"Player 6"; the map says nothing about the person. With one player the score is unambiguous. With several, the active Profile could be Player 1, or the game could be skipped: a design choice for the grill.

## 5. Licence (Fact)

- "Made available under the Open Database License … Any rights in individual contents of the database are licensed under the Database Contents License." Code in `tools/` is LGPL. Attribution: "Please include a GitHub link to the original project … along with the description, 'This program makes use of content from the Pinball Memory Maps project.'" (`maps:README.md#L69-L82`). "Modified map files, or maps created using an existing map as a starting point are also covered by that license" (`#L203-L206`). `LICENSE-ODbL.md` and `LICENSE-DbCL` are in the repo root.
- Inference: shipping a table of offsets extracted from the maps is a derived database, so ODbL share-alike plus attribution. Calling vpxtool (MIT, maps embedded) ships nothing; the pinmame-nvram README asks applications that display decoded data publicly to credit the maps (`high-scores-tools/vpxtool.md` §5).

## 6. Reading options (Inference, for the grill)

- **vpxtool**: `vpxtool nvram show <PATH>` prints the whole resolved map as JSON (`vt:src/cli.rs#L2270-L2295`); `resolve()` walks every map key recursively (`pn:src/resolve.rs#L33-L80`), so `game_state.scores`, `player_count` and `game_over` come out with `value` fields, and RAM-only fields carry the "outside the NVRAM" warning. `vpxtool scores show` covers only high-score sections. The Table ROMs Add-on already runs vpxtool when installed (`common/table_roms/script_reader_*.js`), and `nv_confirmation.js` already finds the one `.nv` that changed during a Play. **Verify** the released Windows vpxtool output on a cabinet `.nv`.
- **Own JS reader**: binary `.nv` read (`dllImport`, HS §A6), BCD/nibble decoding, plus a shipped ODbL subset of the maps. More work and a licence duty.

## Cabinet checks

1. **The count itself**: the ROMs PinballY knows per table (`rom` field) and the Table ROMs record (`table_roms.json` next to `cabinet.json`, `common/table_roms/table_rom_record.js`), checked against `index.json` and the table in section 2. Or `vpxtool nvram show` on each `.nv` of the NVRAM folder, counting those whose `game_state.scores` have `value`s. The repo has three ROM names only as file names in a sample User folder (`docs/research/high-scores-tools/user_folder/`: `SLUT_bttf_a27.txt`, `SLUT_eatpm_l4.txt`, `TAF_L7.txt`); `bttf_a27` (Data East), `eatpm_l4` (System 11) and `taf_l7` (WPC) are all mapped with scores in the `.nv`. Whether that folder comes from the cabinet is not stated.
2. Play a 1-player game on a WPC, a SAM and a Bally/Stern 6800 table to game over, exit, read the `.nv`: the slot holds the final score, `player_count` = 1, `game_over` = true.
3. Same, quit mid-game: what `game_over` and the scores read.
4. A 2-player game on a table without `player_count`: what the unused slots hold.
5. Launch and exit without starting a game: the scores are unchanged from the previous Play.

## Cabinet results (2026-11-07, #482)

Read on the cabinet by a temporary NVRAM probe (commit `4e98730`, since removed) with the released vpxtool the pack installs. Each play's real end-of-game score was noted by the owner. One real `vpxtool nvram show` answer per case is in `scores-below-board/` (the "after the game" read, UTF-8 without BOM): `wpc_taf_l7_*`, `sam_trn_174h_*`, `bally_m_mpac_*`, and `stern_m200_stargzr_sweep.json`.

- **Output shape** (Fact): JSON, `_fileformat` 0.8. `game_state.scores` and `final_scores` are arrays of `{ label, value }`. Single fields are `{ value }`. A field outside the NVRAM has no `value` but a warning. Audits are keyed by number with a `label` (`audits."B.3 STANDARD AUDS."."01"` = "GAMES STARTED" on WPC; `audits."Bookkeeping functions"."06"` = "Total Plays (Paid and Free Games)" on Bally).
- **Sweep**: 142 `.nv` in the NVRAM folder; **107 give values in `game_state.scores`** (many all 0: ROMs never played). Without values: 31 have no map in vpxtool (exit code 1), among them the cabinet's `ij4_210` (SAM), `pmv112`, `tomjerry`, `afm_113b_me`; `bsv103` has no `game_state`; `bk_l4` keeps its scores in RAM; `seawitch` and `stargzr` (Stern M-200) have `scores` outside the NVRAM but `final_scores` in it.

| Platform, ROM | Case | Real score | Read after the game | Spec rule today |
|---|---|---|---|---|
| WPC `taf_l7` | 1 player, game over | 530,050 | `scores` [530050, 0, 0, 0], `game_over` true | right |
| WPC `taf_l7` | quit after ball 1 | 165,020 | [165020…], `game_over` false | right (nothing) |
| WPC `taf_l7` | launch, no game | – | unchanged scores, `game_over` turns **true** | right (equal to before) |
| SAM `trn_174h` | 1 player, game over | 1,381,500 | [1381500…], `player_count` 1, no `game_over` | right |
| SAM `trn_174h` | quit after ball 1 | 116,490 | [116490…] | **wrong**: kept as a Play Score (known SAM limit) |
| Bally 6800 `m_mpac` | 1 player, game over | 159,560 | `scores` **[0, 0, 0, 0]**, `final_scores` [159560, 0, 0, 0], `game_over` false | **wrong**: refused |
| Bally 6800 `m_mpac` | quit after ball 1 | 6,090 | `scores` [6090…], `final_scores` [1501, 0, 1500, 0] (garbage), `game_over` false | right (nothing), by luck |
| Bally 6800 `m_mpac` | 2 players, game over | 159,090 / 162,090 | `scores` = `final_scores` = [159090, 162090, 0, 0], `game_over` false | **wrong**: refused |
| Bally 6800 `m_mpac` | launch, no game | – | `scores` and `final_scores` all 0 | right (all 0) |

- **`game_over` on Bally 6800 is always false** (8 reads: finished, quit, no game). It reads a lamp, and the lamp's state when emulation stops says nothing.
- **Bally 6800, finished game**: the score is in `final_scores`. `scores` is all 0 (1 player) or equal to `final_scores` (2 players). After a quit, `scores` holds the real score and `final_scores` garbage. One sample per case.
- **Unused slots** read 0 (2-player Bally game). `player_count` is sometimes garbage on other ROMs (`lca`: 153), as are `current_ball` values (20, 40, 70).
- **Audit counters**: on WPC, "GAMES STARTED" (01) rises on a finished or quit game, "TOTAL PLAYS" (02) on a finished game only, neither without a game. On Bally, "Total Plays" (06) rises by the number of players on a finished or quit game. On SAM no audit value changed. A launch without a game changes no audit anywhere.
- **An earlier, unexplained read**: a 1-player TAF game once gave `player_count` 4 and three scores, `game_over` false. It did not happen again in the second session.
- **A launch that fails before PinMAME starts** changes no `.nv`. A launch without a game can still rewrite the `.nv` (new date, same scores).

## Sources

- `https://github.com/tomlogic/pinball-memory-maps/tree/eba90209c329acaaa129ad8077ef63d8d0c43958`: `README.md`, `index.json`, `schema/map.schema.json`, `platforms/*.json`, `maps/williams/wpc/afm_113.map.json`, `maps/bally/as-2518-35/smman.map.json`, `maps/stern/sam/acd_170h.map.json`.
- `https://github.com/vpinball/pinmame/tree/3c645a73e4747703af85516939927577fa52d113`: `src/mame.c`, `src/wpc/core.c`, `src/win32com/Controller.cpp`.
- `https://github.com/francisdb/pinmame-nvram/tree/fe60dc7c24ea59e27f2f116adc89169ce473fb1e`: `src/lib.rs`, `src/model.rs`, `src/resolve.rs`.
- `https://github.com/francisdb/vpxtool/tree/6eda3ce3362561f38beafb2283b1cbad41b7b444`: `src/cli.rs`.
- This repo: `docs/research/high-scores.md`, `docs/research/high-scores-tools.md`, `docs/research/high-scores-tools/vpxtool.md`, `docs/research/high-scores-tools/pinbally_builtins_and_integration.md`, `common/table_roms/nv_confirmation.js`, `common/table_roms/table_rom_record.js`, `docs/roadmap.html` (`scores-below-board`).
