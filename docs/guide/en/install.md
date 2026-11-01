# Install

[← Guide index](index.md)

## What you need

- **Windows** and **PinballY 1.1.0 Beta 10** or later.
- The *Windows Media Player* optional feature of Windows, for the sounds. Windows 10 and 11 install it by default, so there is nothing more to install; only the "N" editions sold in Europe lack it, and Microsoft's free *Media Feature Pack* adds it.
- No git: the release zip is all you need.

## Step by step

1. **Download `ExpansionPack.zip`** from the latest release: https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/latest (not "Source code (zip)", whose folder is named `PinballY-Expansion-Pack-<version>` and isn't found by the pack).
2. **Extract it into `PinballY\Scripts`**. The zip already holds a folder named `ExpansionPack`, the name the pack looks for: you should get `PinballY\Scripts\ExpansionPack\main.js`, not `ExpansionPack\ExpansionPack\main.js`.
3. **Create `PinballY\Scripts\main.js` with only this line** if the file doesn't exist, or **add this line to it** if it does:
   ```js
   import("./ExpansionPack/main.js").catch(e => logfile.log("ExpansionPack: " + e.message));
   ```
   Your own scripts keep running: nothing else in `Scripts` is touched, and they still run if the pack folder is missing or the pack fails to load (the error goes to `PinballY.log`).
4. **Optional: create `ExpansionPack\.env.local`**, only if you want to change a setting the eXpansion Pack Settings don't cover (see [Settings](settings.md)): copy `ExpansionPack\.env.example` and keep the lines you change, one `KEY=value` per line (UTF-8). Without it, the pack runs with its defaults.
5. **Optional: update PINemHi to 3.6.8** (see below).
6. **Restart PinballY** and check `PinballY.log` (see [First start](#first-start)). The pack then offers to install vpxtool (see below).
7. **Choose your Add-ons** from **eXpansion Pack Settings** in the Operator Menu: turn each one on or off, pick the startup screen and the language, then restart PinballY in one press.

## vpxtool

With vpxtool, each table's ROM is filled in by itself (the Table ROMs Add-on). vpxtool is written by Francis De Brabandere, under the Apache-2.0 licence (https://github.com/francisdb/vpxtool); the pack does not include it, and you have nothing to download yourself.

While it is missing and the Table ROMs Add-on is on, a message opens at startup, after the Update Prompt and before the startup screen, for an Admin Profile (or anyone while no Profile is marked). It says what vpxtool is for, who wrote it, its licence and its site, and that you can still install it later. **Install** downloads it from its author's releases, checks it and puts `vpxtool.exe` in `ExpansionPack\tools`, with the comet and "Downloading…" on screen; PinballY stays open. A message then says whether it worked, and the table scripts are read at once.

**No thanks** saves `OFFER_VPXTOOL=false` in `.env.local`: the pack never asks again, and **Offer vpxtool** reads Off in the Offline Mode group of the eXpansion Pack Settings (see [Settings](settings.md#expansion-pack-settings)). Exit closes the message without an answer: it comes back at the next start. Until an Admin Profile starts PinballY, the message waits.

Later on, **eXpansion Pack Settings** shows **Install vpxtool v0.38.0** while it is missing and the Table ROMs Add-on is on, whatever you answered; it opens the same message. You can also install it by hand: download `vpxtool` for Windows from its releases page (https://github.com/francisdb/vpxtool/releases) and put `vpxtool.exe` in `ExpansionPack\tools`, next to the restart helper already there.

Without it, a table's ROM is still found, after its first Play.

## PINemHi 3.6.8

With PINemHi 3.6.8, the High Scores read the boards of about 300 more ROMs.

1. Replace the files of `PinballY\PINemHi` with those of [PINemHi 3.6.8](https://www.pinemhi.com/).
2. **Append the whole `[romfind]` section of its `romfind.ini` to the end of its `pinemhi.ini`**. PinballY reads that section from `pinemhi.ini` only: without it, a table with an empty ROM field gets no board at all.
3. Set `USER=` in `pinemhi.ini` to Visual Pinball X's `User` folder.

## First start

After restarting PinballY, check `PinballY.log`: it lists your overrides, one "initialized" line per Add-on, and `ERROR` lines naming the Add-on at fault.

PinballY starts a new `PinballY.log` at each launch, so the pack also keeps every error in `Scripts\ExpansionPack\errors.log`, across launches: see [Troubleshooting](troubleshooting.md).

Once the cabinet has two Profiles or more besides Guest, PinballY starts on Change Player; see [Profiles](profiles.md) and the `STARTUP_SCREEN` setting in [Settings](settings.md).

## Backing up and uninstalling

Everything the pack keeps stays in `Scripts\ExpansionPack`: your settings (`.env.local`) and each Profile's progress (`profiles`).

- **To back up**, copy that folder.
- **To reinstall or update by hand**, keep the `profiles` folder, and you get your progress back.
- **To uninstall**, delete it and remove the import line from `Scripts\main.js`.

## Installing with git

For contributors: instead of the zip, run `git clone https://github.com/F3L1X79/PinballY-Expansion-Pack.git ExpansionPack` from `PinballY\Scripts`, then follow the steps from step 3. A pack installed with git is never offered [updates](updates.md): run `git pull` instead.

---

[← Guide index](index.md)
