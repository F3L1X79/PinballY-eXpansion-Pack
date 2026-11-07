# Research: PINemHi online scores on the High Score Board

Date: 2026-11-07. For roadmap item #1 of `docs/roadmap.html` (`#pinemhi-online`, "Scores en ligne PINemHi sur le High Score Board", **gold / moyen-gros**): an "Online Scores" tab next to the local scores, with the world #1 of the PINemHi LeaderBoard for the current table, then the household's best score (another Profile, or failing that a Default Score).

Builds on [`high-scores-tools.md`](high-scores-tools.md) and its note [`high-scores-tools/vpin_studio_and_community_tools.md`](high-scores-tools/vpin_studio_and_community_tools.md) §3 (cited "VSC §3"), which already establish: PINemHi 3.6.8 is the latest version, the LeaderBoard is a separate program that sends player 1's score to pinemhi.com with a name + code account, ROM-less tables need a table-script patch, and no licence text was found. This file does not repeat that; it adds what the distributed files show about the site's endpoints, and the PinballY side.

Sources:
- `pby:` PinballY upstream, `github.com/mjrgh/PinballY` at `d84763e` (2026-02-23), shallow clone: `Third Party Licenses.txt`, `Help/Credits.html`, `Help/HighScores.html`, `PINemHi/` (the bundled 1.3.1: `pinemhi.exe`, `pinemhi.ini`, `Whatsnew PINemHi.txt`), `scripts/system/SystemClasses.js`.
- `vps:` the PINemHi 3.6.8 files that vpin-studio redistributes, `github.com/syd711/vpin-studio` at `187e558` (2026-11-05), `resources/pinemhi/`: `PINemHi LeaderBoard installation and config.txt` (written by Dna Disturber, cited "install notes"), `PINemHi_Leaderboard.exe` (FileVersion 3.6.8.0), `pinemhi_rom_monitor.exe` (AutoHotkey; its script is stored as plain text inside the exe), `pinemhi.ini.template`, `list.txt`. Strings were read with `strings -e l` (UTF-16, .NET) and `grep -a` (AHK script); nothing was run.
- The local help `docs/pinbally/Help/*.html` (cited `Help/<file>:<line>`), the digest `docs/pinbally/pinbally-help.md`, and our code.

**Blocked on 2026-11-07** (so the site itself could not be read this time):
- `https://www.pinemhi.com/`: `curl` exit 56 through the sandbox proxy; WebFetch `connect ECONNREFUSED 46.235.42.211:443`. `http://www.pinemhi.com/` and `http://pinemhi.com/`: the proxy answered `502 Bad Gateway`. Same for `http://pinemhi.com/hiscores.php`. So no page, response body, `robots.txt` or terms page of pinemhi.com was read. (VSC §3 did reach the home page and `code.php` on 2026-10-11.)
- `vpuniverse.com` (the author's 3.6.8 release thread): `curl` exit 56. `vpforums.org` (author's threads `showtopic=44580`, `16572`), `forums.gameex.com`, `forums.launchbox-app.com`: WebFetch failed with no output. Only search-result snippets were seen, which are not used as sources below.

**Fact** = read in a primary source cited. **Inference** = my reading. **Unknown** = to check on the cabinet or to ask the author.

## Short answers

| # | Question | Answer |
|---|---|---|
| 1 | API or scraping? | **No documented API was found, but the LeaderBoard client itself reads per-ROM top 10s from plain PHP URLs**: `https://www.pinemhi.com/top10_best.php?rom=<rom>` is "the top 10 best scores for the table" (Fact: URL in `PINemHi_Leaderboard.exe`; meaning from the install notes). The reply is very likely **pre-formatted text, not JSON** (Inference from how the monitor cleans it). It is an undocumented endpoint, not a published API. **Terms of use: unknown**, the site was unreachable. |
| 2 | Licence / permission | **No licence is published** in any PINemHi file read (bundled 1.3.1 or 3.6.8). PinballY ships PINemHi "**Used by permission**", i.e. mjrgh asked Dna Disturber (Fact). Calling pinemhi.com from the pack is a different use (its server, not its exe) and should be asked of the author the same way; contact in VSC: `info@pinemhi.com`, or the author's VPForums / VPUniverse threads. |
| 3 | LeaderBoard coverage | **Player 1 only**, any score (even 1,000), sent when you quit without starting a new game, only by players with a pinemhi.com name + code (Fact, install notes). Boards are keyed by **ROM name**; ROM-less tables use a fake ROM name and a table-script patch (44 such names in the client). There is no published per-table list of who has a board; the supported ROM list is PINemHi's `-lr` output. Whether the cabinet's tables have a non-empty world board: **Unknown, measure it**. |
| 4 | Offline / slow | `HttpRequest` is async and Promise-based, resolves only on status 200, and has **no timeout**: an unanswered request stays pending (Fact). `abort()` exists but its effect on the Promise is undocumented. So the tab must apply its own deadline, and show a kept answer or "no answer". The pack already does the same things for its Update Check (cache-busting query, failure = one log line). |

## 1. Does pinemhi.com expose an API?

### What the distributed files show (Fact)

The bundled **PINemHi 1.3.1** (`pby:PINemHi/pinemhi.exe`) talks to no website: its strings hold no `pinemhi.com` URL, only the usage text (`PINemHi -v`, `-lgf`, `-lgv`, **`-lr` "displays the roms (vpinmame) that are supported"**, `PINemHi <romname>.<extension>`) and "PINemHi written by Dna Disturber (2015)". Its `pinemhi.ini` has only `[paths]` and `[options]` (lines 4, 8). This also answers VSC open question 1: **1.3.1 does accept `-lr`**.

In 3.6.8, the network side is in two programs:

**`PINemHi_Leaderboard.exe`** (.NET, 3.6.8.0) contains these URLs:

| Use | URL (prefix as stored) |
|---|---|
| Submit a score | `https://www.pinemhi.com/bridgetweet.php`, `bridgetweet_5min.php`, `bridgetweet_fp.php`; method `POST`, `application/x-www-form-urlencoded`; fields `&user=`, `&score=`, `&rom=`, `&table=`, `&code=`, `&special1=`…`&special8=`, `&tweet=` |
| Best top 10 of a table | `https://www.pinemhi.com/top10_best.php?rom=` (and `top10_best_5min.php?rom=`), saved to `.\PINemHi LeaderBoard\TOP10_Best\<rom>.txt` |
| Personal top 10 | `top10_personal.php?user=` (+ `_5min`), `top10_personal_specials.php?user=` |
| Friends | `top10_friends.php?user=…&friend1=`…`&friend9=` (+ `_5min`) |
| Cup | `top10_cup.php?user=` (+ `_5min`) |
| Badges | `badgeslist.php?user=` |

**`pinemhi_rom_monitor.exe`** (AHK) fetches with `UrlDownloadToFile`: `challenges_online.php?user=%user%&code=%code%`, `challengeskiddie_online.php?user=%user%&code=%code%`, `weeklychallenge.php?user=%user%`, `weeklychallenge_5min.php?user=%user%`. It reads `[user] name`, `code` and `[online] best_scores`, `top`, `nodatetime`, `notime` from `pinemhi.ini`, and shows the best board by reading back `TOP10_Best\%romname%.txt`.

The install notes define the board: "best_scores gives the top 10 best scores for the table" (line 120), "the top 10 best score for a table from people that joined the online leaderboard". `pinemhi.ini.template` line 24 points to `http://www.pinemhi.com/hiscores.php` for registration.

vpin-studio, the most complete third-party tool, **does not call any of these endpoints**: its only `pinemhi.com` reference is a browser link to `hiscores.php` (`vps:vpin-studio-ui/.../PINemHiPreferencesController.java:301`).

### What the reply looks like (Inference)

The monitor cleans the saved best board this way before showing it (`pinemhi_rom_monitor.exe`, script lines 3640–3662 as dumped): drop the last two lines, remove lines starting with `PINEMHI`, collapse blank lines, break after `>>>`, optionally strip `\d+:\d+:\d+` times and `\d+-\d+-\d+` dates, replace `TOP 10` with `TOP <n>`, then pad or cut to `top` lines. So `top10_best.php` most likely returns **plain text already laid out for display**: a `PINEMHI…` header, a `TOP 10` title, one line per place with name, score and a date-time, and some trailer. Not JSON, not HTML. Parsing it means guessing a layout the author can change at any time.

Also Inference: `top10_best.php?rom=` seems to need no `user`/`code` (no other parameter is stored next to it, unlike `top10_friends.php`). Not verified: the parameters may be appended from other strings at runtime.

### Terms of use

**Unknown.** No terms, `robots.txt` or API page could be read (site blocked, see top). No PINemHi file mentions automated access, rate limits or third-party clients. Inference: these are private endpoints of the author's own client, served from a small personal site (it already refuses HTTPS on 443 from here, while the client uses `https://`); reading them from another program is the author's call, not something to assume.

**Answer**: we would not scrape HTML pages; we would call the same undocumented text endpoint as the official client. That is less fragile than scraping `hiscores.php`, but still unsupported: format and URL can change without notice, and it needs the author's agreement.

## 2. Licence and permission

**Facts**
- PinballY: "PINemHi — High score features thanks to PINemHi by Dna Disturber. Used by permission. http://www.pinemhi.com" (`pby:Third Party Licenses.txt:272-275`). Help: "PINemHi is included in the PinballY distribution with the author's permission" (`Help/HighScores.html:35-37`); credits list "PINemHi by Dna Disturber" (`pby:Help/Credits.html:37`). No licence text is reproduced for it, unlike the other entries of that file.
- The bundled `Whatsnew PINemHi.txt` (1.3.1) ends "Have Fun. ---Dna Disturber---", with no licence. `PINemHi_Leaderboard.exe` 3.6.8 has `LegalCopyright` "Copyright 2026" with no holder, and no licence string. The install notes and `pinemhi.ini.template` ("PINemHi created by Dna Disturber") have no licence or terms.
- Author: **Dna Disturber** ("DnaDisturber", "vpforums member", `Help/HighScores.html:35`). Contact: `info@pinemhi.com` (VSC §open questions 5, from the site on 2026-10-11; not re-checked today), his release threads on VPForums (`showtopic=44580`) and VPUniverse (topic 10770), both unreachable here.

**Inference**
- "Used by permission" covers PinballY redistributing the exe. It says nothing about third parties reading the server. The pack would ship no PINemHi file, but would send requests to the author's site from every cabinet that turns the tab on: ask first, as the roadmap note already says.
- What to ask: may a PinballY add-on call `top10_best.php?rom=` (how often; is a User-Agent wanted; is there a preferred, stable endpoint or a JSON one); may it show the #1 name and score; is caching a reply for a day fine.

## 3. What does the LeaderBoard record?

**Facts** (install notes, lines cited)
- "catches the score and specialscores from player 1" (7). "The normal score doesn't have to be on the hiscore table of the game, even scores like 1000 can be submitted" (8). Special scores (loops, martians…) only "if they are over the score of the hiscore table" (9).
- Sent when you quit without starting a new game (11–12), or with `send_button` (keys section). "The scores are sent to the website http://pinemhi.com/" (16). A name and code from the site are required (58; `pinemhi.ini.template:24-27`).
- No frontend plugin needed: `pinemhi_rom_monitor.exe` watches for VPX (19–22). It finds the ROM from the running game's description through `romfind.ini`, runs `pinemhi_leaderboard "<rom>" …` before and after the game, and **does not submit when the score did not change** ("probably because there was no game played … it could also be that this rom is not supported (yet)"). Some games "can only submit scores from fully completed games" (monitor script log lines).
- Each board is keyed by **ROM name** (`rom=` in submit and `top10_best.php?rom=`); the client also sends `table=`. Separate boards exist for **5-minute mode** (`_5min` URLs) and for Future Pinball (`bridgetweet_fp.php`).
- ROM-less tables: the client knows 43 fake ROM names read from `.pmh` files (`gotg`, `batman66`, `futurama`, `sthings4`, … `kissstern`, `matrix`) plus `jammerjoh`; each needs `romsub.exe` in the tables folder and the snippet from `code.php` in the table script (install notes 138–139; VSC §3 counted 46 tables on `code.php`).
- Supported ROMs: `PINemHi -lr` (in 1.3.1 too, see §1). vpin-studio's copy of 3.6.8 has a `list.txt` of 1,555 ROM names (origin of that file not checked); VSC counts 1,559 in `scoringdb.json`. Bundled 1.3.1 claims 1,240 ROMs (`Whatsnew PINemHi.txt`).

**Inference**
- The world board only holds scores of people who installed the LeaderBoard, registered, and played that **exact ROM name**. A table run on another revision (`afm_113` vs `afm_113b`) probably has its own board (keyed by ROM, not by game); whether the site merges revisions is **Unknown**.
- PinballY's games give us the ROM: `GameInfo.rom` (`pinbally-help.md`; already used by `addons/high_scores.js:353`). A table without a ROM in PinballY, or a ROM-less table without the patch, has no reachable board: the tab shows "no online board" there.
- The board is a top 10 of submitted games, not of machines' high score tables: a household's own scores appear there only if someone on the cabinet uses the LeaderBoard. That fits the idea (world #1 vs household best from our own data), and nothing needs an account to *read*, if §1's Inference holds.
- No published list says which ROMs actually have entries. Coverage on the cabinet can only be measured by asking `top10_best.php` for each ROM once (with permission), or by browsing `hiscores.php`.

## 4. Offline cabinet, slow reply

**Facts**
- `HttpRequest`: `open(method, url, true)` then `send()` returns a Promise; always pass `true` or the UI freezes (`Help/HttpRequest.html:138`). `abort()` "cancel[s] an asynchronous request in progress" (`:114`). `status` is valid after completion (`:193`). No timeout property or option is documented.
- The wrapper (`pby:scripts/system/SystemClasses.js#L2009-L2113`) creates `Msxml2.XMLHTTP.6.0` down to `Microsoft.XMLHTTP`, resolves with `responseText` **only when `status == 200`**, else rejects with `new Error(statusText)`, and only does either when `readyState == 4`. It sets no timeout. (The cabinet's patched copy resolves on any 2xx: `docs/research/system-scripts.md:45`.)
- Throws "Required system component MSXML is not installed" if no class can be created (same file).
- The pack already wraps it: `host.httpGet(url, headers)` (`common/core/pinbally_host.js:676-684`). The Update Check calls it inside a Promise so a refused `open()` fails like an offline request, adds `?t=<now>` because "the cache-busting query keeps MSXML from answering with an earlier reply", logs a failure as one line, and documents that it "stays pending while GitHub doesn't answer" (`common/updates/update_check.js:62-63, 94-101`). The fake host has a `FakeHttpRequest` (`tests/support/fake_pinbally_host.js:1161-1174`).

**Inference**
- No timeout means an offline cabinet may or may not fail fast (DNS failure is usually quick; a dropped route can hang for the WinINet default). The tab needs its own deadline (`setTimeout`, e.g. 3–5 s) that shows the fallback, and must ignore a late reply. Whether `abort()` then settles the Promise is **Unknown** (the wrapper only settles on `readyState == 4`), so do not rely on it to free anything.
- Offline errors from MSXML usually come back as `readyState == 4` with a WinINet code (12xxx) as `status` and an empty `statusText`, so `error.message` may be `""`; the Update Check already handles that ("no reason given"). Unverified on the cabinet.
- Caching: per the Update Check, MSXML may serve a cached GET; add the same query buster, or rely on that cache on purpose. A world #1 changes rarely: keep the last good reply per ROM (with its date) and show it, marked with its age, when offline or late. Asking at most once per ROM per day or per session would also be the polite rate to propose to the author.
- Never fetch during a Play or on every wheel move: fetch when the tab is opened (or the High Score Board opens on a ROM table), through the foreground/background drawing rules of `conventions.md`, under `safeHandler`.

## What this means for the item (Inference)

- Feasible without new dependencies: one GET per ROM through `host.httpGet`, a text parser for the reply, a kept-reply cache, our own timeout.
- Blocking point: **the author's agreement** and a sample reply. Until then, the endpoint and its format are guesses from client binaries.
- Size stays **gold / moyen-gros** if the reply is simple text; the household half ("best other Profile, else Default Score") is local data the High Score Board already has.

## Open questions

1. **Ask Dna Disturber** (`info@pinemhi.com` or his VPForums thread): permission to call `top10_best.php?rom=` from a PinballY add-on; whether a stable or JSON endpoint exists; rate and caching he wants; whether reading needs a `user`/`code`.
2. **On the cabinet** (or from a network that reaches pinemhi.com): fetch `https://www.pinemhi.com/top10_best.php?rom=afm_113b` once and keep the raw reply as a fixture; check its layout against §1's Inference; check `https://` works from MSXML on the cabinet.
3. Read pinemhi.com's pages for terms of use and `robots.txt` (blocked here).
4. How many of the cabinet's ROMs have a non-empty world board (needs 1 and 2)? Are revisions merged?
5. MSXML on the cabinet: time to fail when offline (cable out, DNS down); what `status`/`statusText` come back; does `abort()` settle the Promise?
