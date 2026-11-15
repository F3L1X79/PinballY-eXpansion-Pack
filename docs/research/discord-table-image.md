# Research: the played table's image in Discord Rich Presence

Date: 2026-11-15. Roadmap item "Image de la table dans Discord Rich Presence" (`docs/roadmap.html`, `id="discord-table-image"`, lines 307-329). Follows `docs/research/discord-rich-presence.md`. Sources:
- Discord's developer docs, read from their source repo `github.com/discord/discord-api-docs` (`main`, 2026-11-15), cited as `api-docs:<path>` (`developers/events/gateway-events.mdx`, "Activity Assets" / "Activity Asset Image"; `developers/discord-social-sdk/development-guides/setting-rich-presence.mdx`; `developers/change-log.mdx`). Line numbers are not given: the file was read through WebFetch, which does not show them.
- Dolphin: `github.com/dolphin-emu/dolphin`, `master`, `Source/Core/UICommon/DiscordPresence.cpp`, and its pull request #11751.
- Virtual Pinball Spreadsheet: `github.com/VirtualPinballSpreadsheet/vps-db` (`main`), read through `api.github.com` and `raw.githubusercontent.com`, cited as `vps-db:<path>`.
- IPDB and OPDB block the sandbox (proxy 502); Félix saved the pages from his browser on 2026-11-15, cited as `ipdb:faq.html` (`ipdb.org/faq.html`), `ipdb:machine.cgi?id=495` (Recel "Check"), `opdb:home` (`opdb.org`) and `matchplay:opdb-and-pintips-api` (`docs.matchplay.events/opdb-and-pintips-api`). Copies were kept out of the repo.
- PinballY: `docs/pinbally/Help/GameInfo.html`, the digest `docs/pinbally/pinbally-help.md`, `docs/research/system-scripts.md`.
- Our code: `addons/discord_rich_presence.js`, `common/discord/discord_client.js`, `common/core/pinbally_host.js`, `common/updates/update_check.js`.

**Fact** = read in a primary source. **Inference** = my reading. **To verify on the cabinet** / **To ask** = nothing read settles it.

## Verdict

**Feasible, with the Virtual Pinball Spreadsheet as the source.** Discord takes any public `https` image URL in `large_image` (§1), so the pack needs a public URL per table, and a way to know before sending that the URL exists (Discord gives no feedback; §1.1). The VPS database is a single public 8 MB JSON on GitHub, with a `https://virtualpinballspreadsheet.github.io/vps-db/img/…webp` image per table file and backglass, an `ipdbUrl` for most real machines, and a 13-byte `lastUpdated.json` to poll (§3.2). IPDB photos are ruled out: the photographers keep the copyright and IPDB says it cannot grant reuse (§3.1). Main open points: VPS has no license (§3.2), and parsing 8 MB of JSON on PinballY's UI thread needs care (§5).

## 1. What Discord accepts in `assets.large_image` / `small_image`

- **Fact, two formats:** "Activity asset images are arbitrary strings which usually contain snowflake IDs or prefixed image IDs": an *Application Asset* `{application_asset_id}`, or a *Media Proxy Image* `mp:{image_id}`, served from `https://media.discordapp.net/{image_id}` (`api-docs:developers/events/gateway-events.mdx`, "Activity Asset Image").
- **Fact, external URLs:** "To use an external image via media proxy, specify the URL as the field's value when sending"; "You will only receive the `mp:` prefix via the gateway" (same section). So Discord fetches the URL itself and serves it through its media proxy.
- **Fact, formats:** uploaded assets are PNG, JPEG, WebP, and "Animated images are not supported for uploaded assets"; external URLs "support any publicly accessible image URL, including GIF, animated WebP, and AVIF" (same section). VPS images are WebP (§3.2): accepted either way.
- **Fact, both fields:** `large_image` and `small_image` both take an "Activity Asset Image"; `large_text` / `small_text` are hover texts; `large_url` / `small_url` make the image a link (`gateway-events.mdx`, "Activity Assets"). Also `invite_cover_image`, for Game Invites only.
- **Fact, size:** "it's highly recommended to make them 1024 x 1024"; an external URL works "as long it still has the proper dimensions and size" (`api-docs:…/setting-rich-presence.mdx`, asset upload limits). **No figure is given** for a maximum file size, dimensions or URL length. The older library header caps image *keys* at 32 bytes (`discord-rpc:include/discord_rpc.h`, cited in `discord-rich-presence.md` §2); it predates URLs and does not apply to them (Inference; the pack already sends a 90-character URL, see below).
- **Fact, uploaded assets:** up to 300 per application, keys lowercased (`setting-rich-presence.mdx`).
- **Fact, caching:** nothing in the docs says how long the media proxy caches an external image, or what happens when the URL answers 404. **To verify on the cabinet** (§1.1).
- **When URLs became possible:** no change-log entry announces it (`api-docs:developers/change-log.mdx`, searched for assets / images / external / media proxy: only `large_url`/`small_url`, 2025-07-17 and 2025-08-11, and `inviteCoverImage`, 2025-10-15). Community evidence only: on 2023-12-30 a reply in `github.com/discord/discord-api-docs/discussions/6592` (marked as the answer) says RPC "accepts external URLs … Just pass the URL instead of the asset-name"; a 2024-08-17 reply there says only the large image supports it. The current docs name both fields (above). Dolphin has relied on it since May 2023 (§2).
- **Already shipped by the pack (fact):** every activity sends `assets: { large_image: LOGO_URL }` with `LOGO_URL = "https://raw.githubusercontent.com/F3L1X79/PinballY-Expansion-Pack/main/docs/images/logo.png"` (`addons/discord_rich_presence.js:30-41`), and the guide says the logo shows (`docs/guide/en/settings.md:47`). So external URLs through raw RPC work on the cabinet today.
- **Secondary, `http` vs `https`:** a Tauon bug report (`github.com/Taiko2k/Tauon/issues/2309`, 2026-08-26, closed 2026-09-22) found that an `http://` URL in `large_image` is taken as an asset key and the card falls back to the app icon, with no error. It also suspects some clients drop the whole activity when an external `large_image` is paired with a registered key in `small_image`. **Inference:** send only `https` URLs, and if the logo moves to `small_image`, keep it an external URL like the large one.

### 1.1 No feedback on a broken URL

- **Fact:** the pack's client sends `SET_ACTIVITY` and reads back the echo (`common/discord/discord_client.js:84-114`); Discord fetches the image afterwards, on its side, and no doc describes an error for an unreachable image.
- **Fact, Dolphin's answer:** its cover server returns a fallback image when a title has no cover (PR #11751, OatmealDome, 2023-05-10: a title that does not exist "returns a fallback").
- **Inference:** the pack must decide from its own data that the image exists; a guessed URL that 404s would show a broken or empty image, not our logo. **To verify on the cabinet:** what Discord shows for a 404 URL.

## 2. How Dolphin does it

- **Fact:** `static constexpr char cover_url[] = "https://discord.dolphin-emu.org/cover-art/{}/{}.png";`, filled by `fmt::format(cover_url, region_code, SConfig::GetInstance().GetGameTDBID())`, where `region_code` comes from `GetGameTDBImageRegionCode(is_wii, region)` (`dolphin:Source/Core/UICommon/DiscordPresence.cpp`, `ArtworkForGameId()`).
- **Fact, fallback:** when `GetGameTDBID()` is empty, `largeImageKey = "dolphin_logo"` with a generic hover text; otherwise `largeImageKey = game_artwork`, `largeImageText = title`, and `smallImageKey = "dolphin_logo"` (same file, `UpdateDiscordPresence`). The only switch is `Config::MAIN_USE_DISCORD_PRESENCE`; there is no separate cover setting.
- **Fact, history:** PR #10390 (2022-01) linked GameTDB directly (`https://art.gametdb.com/wii/cover/{}/{}.png`); PR #11751 (opened 2023-04-12, merged 2023-05-19, commit `4efa10c`) replaced an in-emulator download with "a server-side script that will handle the cover art lookup" set up by OatmealDome, after he asked to "avoid downloading the image" and worried a slow request could hang the emulator (PR #11751 conversation). What the server does (proxy, mirror, redirect) is not public.
- **Fact, the key:** GameTDB IDs are the disc's universal game ID (e.g. `RMGE01`), known to the emulator from the disc itself. **Inference:** Dolphin's job is easy because every game carries a universal ID; our tables carry at best an `ipdbId` (§4), and many (originals, retheme) none. Dolphin's privacy page notes covers come from GameTDB and share the game ID with it (`dolphin-emu.org/docs/privacy/`, search extract).

## 3. Candidate image sources

### 3.1 IPDB (ipdb.org)

- **Fact (PinballY):** `ipdbId` is "the database key that IPDB uses"; the game page is `https://www.ipdb.org/machine.cgi?id=ipdbId` (`docs/pinbally/Help/GameInfo.html:315-321`).
- **Fact, image URLs:** the machine page lists thumbnails linking to `showpic.pl?id=495&picno=16253` ("Image # 16253: Check Backglass") and `picno=16254` ("Check Playfield") (`ipdb:machine.cgi?id=495`). `showpic.pl` is an HTML viewer page, not the image file. `picno` is a site-wide image number, unrelated to the machine ID (495 → 16253). **Inference:** no image URL can be built from `ipdbId`; finding the backglass means scraping the machine page and reading the captions.
- **Fact, terms:** footer of every page: "All photographs licensed from original photographers, who retain their copyright. Do not use without permission!" (`ipdb:machine.cgi?id=495`). FAQ #1, "Can I use pictures from your web site?": "The pictures on the site remain the property and copyright of the original photographers. We only get permission (license) to use them on the site, therefore we cannot give you permission to use them." The same answer warns against linking directly to the pictures, "or you may find we've replaced them with a less than flattering image" (`ipdb:faq.html`).
- **Fact, automated access:** "attempts to download the site in any automated way may result in your being banned from the site", because bandwidth for the images matters to them (`ipdb:faq.html`, mirroring question).
- **Conclusion:** asking IPDB is pointless by its own FAQ, hotlinking is explicitly unwelcome, and scraping risks a ban. **Ruled out** as an image source; `ipdbId` stays useful as a *matching key* (§3.2).

### 3.2 Virtual Pinball Spreadsheet (VPS)

- **Fact, the repo:** `vps-db` holds `db/vpsdb.json` (8,168,344 bytes) and `db/puplookup.csv`, an `img/` folder, `scripts/`, `lastUpdated.json`; it has no README and **no license** (`api.github.com/repos/VirtualPinballSpreadsheet/vps-db`: `"license": null`, `"description": null`; contents listing). Pushed 2026-11-15, created 2023-08-11, GitHub Pages on.
- **Fact, update mechanism:** `lastUpdated.json` is a bare epoch in ms (`1794765681747` on 2026-11-15). The workflow `.github/workflows/updateDb.yml` runs when `lastUpdated.json` is pushed, builds the db from the `staging` branch with `scripts/buildDb`, and publishes `db/` to `main` (`vps-db:.github/workflows/updateDb.yml`). Download URL: `https://raw.githubusercontent.com/VirtualPinballSpreadsheet/vps-db/main/db/vpsdb.json`.
- **Fact, format:** a top-level JSON array of game objects. Keys seen: `id` (e.g. `"--xQTsPe33"`), `name`, `manufacturer` (`"Original"` for originals), `year`, `type` (`"SS"`, `"EM"`), `players`, `theme[]`, `designers[]`, `broken`, `updatedAt`, `lastCreatedAt`, optional `ipdbUrl` (e.g. `"https://www.ipdb.org/machine.cgi?id=495"`), optional game-level `imgUrl`, and file lists `tableFiles[]`, `b2sFiles[]`, `wheelArtFiles[]`, `topperFiles[]`… Keys vary per game (`vps-db:db/vpsdb.json`, first 100 kB read).
- **Fact, images:** `tableFiles[]` and `b2sFiles[]` entries carry `imgUrl`, e.g. `https://virtualpinballspreadsheet.github.io/vps-db/img/idST46Zk60_1745823504738.webp`; some games have a game-level `imgUrl` (e.g. `…/img/-bG4P570_b2s_1698929000449.webp`). Every `imgUrl` seen points to `virtualpinballspreadsheet.github.io`. `wheelArtFiles[].urls` only link download pages (vpuniverse, vpforums), not images. One image fetched: HTTP 200, `image/webp`, 72.8 KB. Its picture and dimensions could not be viewed in the sandbox. **To verify:** what the `tableFiles` image shows (playfield screenshot?) vs. the `b2sFiles` one (backglass), and their size against the 1024×1024 recommendation.
- **Fact, other users:** VPinNexusVR loads a cached `vpsdb.json`, checks `lastUpdated.json` in the background and downloads again only when it changed, and matches tables by the "Name (Maker Year)" in their file name (`github.com/artlevandoski/VPinNexusVR` README, search extract); `davidkoski/vps-db-tool` reads the same raw URL. Not primary on VPS's intent, but shows the file is consumed this way.
- **Matching, inference:**
  1. `ipdbId` set → the game whose `ipdbUrl` ends in `id=<ipdbId>`. Exact, when filled.
  2. Else normalized `title` + `manufacturer` + `year` against `name` + `manufacturer` + `year` (case, accents, punctuation, "The"); several hits (one game per real machine, but retheme / originals share names) → no image rather than a wrong one.
  3. Which image: game-level `imgUrl`, else the `b2sFiles` image (closest to a "cover"), else the first `tableFiles` image. The cabinet's actual table file version cannot be matched to a `tableFiles` entry from GameInfo alone.
- **Hotlinking (inference):** the images are served by GitHub Pages of the VPS account; Discord's media proxy fetches them, not each viewer. GitHub Pages has soft bandwidth limits (100 GB/month, from GitHub's Pages docs; not read in this session). One cabinet's few launches a day are negligible.
- **To ask:** no license means default copyright. Reading a public JSON and linking public URLs is what other front-ends do (above), but VPS's maintainers have not said it is allowed. Ask them (GitHub issue on `vps-db`, or their Discord) before shipping.

### 3.3 Other options

- **OPDB (opdb.org):**
  - **Fact:** a free, volunteer-run database (editorial work by Pinball Map, hosting by Match Play Events) whose goal is "to facilitate data sharing between pinball software providers". It covers flipper machines only, "in practice … machines produced after 1948", and no originals are mentioned (`opdb:home`).
  - **Fact, API:** the Match Play docs list `/api/opdb/entry/{opdbId}` with an optional `includeImages` ("Include image data for entry") and `/api/opdb/changelog`, and recommend downloading the full data export over fetching machines one by one (`matchplay:opdb-and-pintips-api`). The page lists no lookup by IPDB ID. The `/api/machines/ipdb/{id}` endpoint quoted by older secondary sources is not in the current docs.
  - **Not read:** the token requirement, the export's rate limit and format, whether entries carry an IPDB ID, and the terms and license of the images (the "Data exports" page was not saved). Matching our tables would go through the export, by IPDB ID if present, else by name.
  - **Inference:** possible for real machines only, with more steps than VPS. **Not recommended** until the data-exports page and the image terms are read.
- **Our own hosting (a folder in the pack's repo, or a separate `…-images` repo, served by `raw.githubusercontent.com` like the logo):** fully under our control, URL known in advance, no external terms. Cost: someone uploads one image per table; the images themselves (wheel logos, backglass art) are fan art of trademarked machines, copyright of their authors and the manufacturers, so republishing them is less clean than linking VPS. **Inference:** fits a cabinet owner who wants exact images for their own tables, as a per-cabinet setting (a base URL + table file name), not as pack content.
- **Uploaded Discord assets in the shared "Virtual Pinball" app:** up to 300 keys, uploaded by hand by Félix on the Developer Portal (`setting-rich-presence.mdx`). Same rights question, a manual step per table, and only Félix's tables. **Not recommended.**
- **Local wheel images:** cannot be shown: Discord fetches by public URL only (§1). Uploading them from the cabinet to a host would need a credential on the cabinet. Ruled out.

## 4. The pack today

- **Fact, transport:** raw IPC over `\\?\pipe\discord-ipc-n` from PinballY's UI thread, no library (`docs/adr/0022-discord-rich-presence-speaks-discord-s-ipc-pipe-from-pinbally-s-ui-thread.md`; `common/discord/discord_client.js`). Shared application ID `1566536566082506823` (`addons/discord_rich_presence.js:25`).
- **Fact, fields sent:** wheel: `details` "Choosing a table" + `assets.large_image` = logo URL; attract mode: same with "Attract mode"; game: `details` = `cleanTitle(game.title)`, optional `state` "Table of the Day"/"Table of the Week", `timestamps.start`, `assets.large_image` = logo URL (`addons/discord_rich_presence.js:32-42`). No `large_text`, `small_image` or `large_url` today.
- **Fact, metadata available on `GameInfo`:** `title`, `displayName`, `manufacturer`, `year`, `tableType`, `ipdbId` (a string, may be empty), `rom`, `system`, `categories[]`, `filename`, `mediaName` (`docs/pinbally/pinbally-help.md:149-151`; `GameInfo.html:315-321`). The pack uses `ipdbId` nowhere today (grep of `common/` and `addons/`).
- **To verify on the cabinet:** how many of Félix's tables have `ipdbId` filled (PinballY fills it from its database XML; originals have none), and whether `title`/`manufacturer`/`year` match VPS spellings.

## 5. Feasibility in PinballY

- **Fact, HTTP:** `host.httpGet(url, headers)` wraps PinballY's `HttpRequest`, always asynchronous, a Promise of the reply text, rejected for any status but 200 (`common/core/pinbally_host.js:776-784`; `docs/research/system-scripts.md:137`). The update check already calls GitHub through it (`common/updates/update_check.js:98`). So downloading `lastUpdated.json` and `vpsdb.json` from `raw.githubusercontent.com` is the same path.
- **Fact, threading:** handlers should stay under 30-50 ms; the download itself is async, but `JSON.parse` runs on the UI thread (`pinbally-help.md` §5, from `Javascript.html`). **Inference:** parsing 8 MB in ChakraCore likely takes hundreds of ms in one block that cannot be sliced, which would show as a hitch. Options: parse only when no game runs and the wheel is idle, then write a small index (`ipdbId` → URL, normalized name+maker+year → URL) to a file with `host.files.writeText` (`pinbally_host.js:235`, `:275`) and read only that index afterwards; or have a maintainer script in `maintainer/` build that small index and publish it from the pack's repo, so the cabinet downloads a few hundred kB instead (at the cost of the maintainer's refresh cadence and of redistributing derived VPS data, see §3.2 "To ask"). **To verify on the cabinet:** the time of `JSON.parse` on the real 8 MB file.
- **Caching (inference):** keep the downloaded copy (or index) and its `lastUpdated` stamp; check `lastUpdated.json` once per PinballY start (13 bytes), download again only when it changed; offline → use the cached copy; no copy → logo.
- **Fallback (inference, as the roadmap asks):** no match, no network, no cache, or an ambiguous match → `large_image` = logo URL, exactly today's activity. With a match: `large_image` = table image, `large_text` = the title (or "Manufacturer Year"), `small_image` = logo URL, like Dolphin (§2). All public (`discord-rich-presence.md` §2): an image URL reveals nothing beyond the table name already shown.
- **Rate limit:** unchanged; the image goes in the same `SET_ACTIVITY` at game start (`discord-rich-presence.md` §3, 5 updates / 20 s).

## Options compared

| Option | Coverage | Rights | Work | Risk |
|---|---|---|---|---|
| VPS `vpsdb.json`, matched by `ipdbId` then name/maker/year | Most real machines and many originals, as long as VPS lists them | No license; to ask VPS | Download, cache, index, matching | 8 MB parse on UI thread; wrong match on ambiguous names |
| VPS index built by a maintainer script, hosted in the pack's repo | Same, refreshed when Félix runs it | Same, plus redistribution of derived data | Script + small runtime | Stale between refreshes |
| IPDB photos | Machines with an `ipdbId` | "Do not use without permission", IPDB cannot grant it; hotlinking unwelcome | Scraping (ban risk) | Ruled out |
| OPDB | Flipper machines after 1948, no originals | Image terms not read | Data export, matching | Data-exports page not read |
| Own hosting (per-cabinet base URL) | Exactly the owner's tables | Owner's responsibility | Manual upload per table | Effort per table |
| Discord uploaded assets | ≤ 300, Félix's choice | Same as own hosting | Manual portal upload | Only Félix's tables |

## Open questions for the grilling

1. VPS as the source: ask the VPS maintainers first (no license on `vps-db`), or ship and ask in parallel?
2. Download `vpsdb.json` on the cabinet (always current, 8 MB parse) or a maintainer-built index from the pack's repo (small, stale between refreshes)?
3. Which VPS image: game-level, backglass (`b2sFiles`) or table screenshot (`tableFiles`)? Needs a look at a few images in Discord's square crop.
4. Matching without `ipdbId`: name+maker+year only, or also the "Name (Maker Year)" form of `filename`/`mediaName`? What counts as ambiguous?
5. The logo as `small_image` during a game (Dolphin's layout), and `large_text` content.
6. A per-cabinet override (base URL for own images) now or never?
7. **On the cabinet:** what Discord shows for a 404 URL; `JSON.parse` time of the 8 MB file; share of tables with `ipdbId` filled; WebP display in the profile card.
