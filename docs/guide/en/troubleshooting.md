# Troubleshooting

[← Guide index](index.md)

## The "Problem" toast (Error Toast)

When something fails that you would not see otherwise, and that will not mend itself at the next start, the pack says so with a toast like the Achievement toasts, but with its own colour, a warning sign instead of a trophy and the header "Problem". It says in one sentence what the failure has cost and, for an Admin Profile, what to do about it. It stays on screen longer than the other toasts, and never interrupts a game.

| The toast says | Who sees it | What to do |
|---|---|---|
| "This game could not be saved: it won't count in your stats." | The Profile that played, after that game's other toasts. | Look in the Error Log for the cause. |
| "This game was counted, but it is missing from your play history." | The Profile that played, after that game's other toasts. | Look in the Error Log for the cause. |
| "The update to vX.Y.Z failed: the previous version is still in place. Details in …" | An Admin Profile (or anyone while no Profile is marked), once, waiting for one to be active. | Read the update helper's log it names, `%TEMP%\PinballYExpansionPack\pack-update.log` (see [Updates](updates.md)). |

A failure that answers a choice you have just made (a Profile Reset, a Pack Update download, a vpxtool install) shows its own message on that screen instead of a toast.

| The message says | What to do |
|---|---|
| "vpxtool could not be installed; nothing has changed. You can try again from the eXpansion Pack Settings." (or "… updated …" for an update) | The cabinet may be offline, the download may have been cut or blocked by the antivirus, or `vpxtool.exe` may be in use. Your previous `vpxtool.exe`, if any, is still in place. Read `%TEMP%\PinballYExpansionPack\script-reader-install.log`, then try again, or install vpxtool by hand (see [Install](install.md#vpxtool)). |

## The Error Log (`errors.log`)

PinballY starts a new `PinballY.log` at each launch, so the pack also writes every error it meets to its own Error Log, which survives restarts:

- **Where**: `PinballY\Scripts\ExpansionPack\errors.log`.
- **What**: one line per error, with its date, time, Pack Version and the Add-on at fault, and the call stack indented below. Warnings and information go to `PinballY.log` only.
- **Size**: once over 1 MB, it becomes `errors.old.log` at the next start, and a new `errors.log` begins.
- It is kept through every Pack Update, and can never be turned off.

The toasts never send the player to it: it is for the cabinet owner. **Attach `errors.log` (and `errors.old.log` if there is one) when you report a problem.**

## `PinballY.log`

PinballY's own log, in the PinballY folder, covers the current session only. At each start it lists your `.env.local` overrides, one "initialized" line per Add-on, and `ERROR` lines naming the Add-on at fault. Two settings add more lines to it, to help find a problem: `LOG_UNTRANSLATED_MENU_TITLES` and `LOG_LAUNCH_EVENTS` (see [Settings](settings.md)).

## Common questions

**The pack does not start at all.** Check that you have `PinballY\Scripts\ExpansionPack\main.js`, not `ExpansionPack\ExpansionPack\main.js` nor a folder named `PinballY-Expansion-Pack-<version>` (that one comes from "Source code (zip)", not `ExpansionPack.zip`), and that `Scripts\main.js` holds the import line (see [Install](install.md)). A pack that fails to load writes its error to `PinballY.log`, under "ExpansionPack:".

**There is no sound.** The sounds need the *Windows Media Player* optional feature of Windows, there by default on Windows 10 and 11: if it was removed, add *Windows Media Player Legacy* back in *Settings › Apps › Optional features* (on an "N" edition, install the *Media Feature Pack*). Check also the `*_SOUND_FILE` settings: an empty value means no sound.

**An original table has no high score board.** Its board appears once the table has been played with the pack, which learns where the table keeps it during its first game.

**A table with an empty ROM field has no board at all.** If you updated PINemHi, the `[romfind]` section of `romfind.ini` must be appended to `pinemhi.ini` (see [Install](install.md#pinemhi-368)).

**"Manage profiles" is missing from the Exit menu.** Once a Profile is marked, it shows to Admin Profiles only; while none is, it shows to every Profile but Guest and Child Profiles, with "Become admin" alone (see [Admin Profile](settings.md#admin-profile)). It also needs PinballY's Exit menu: if you disabled it in PinballY's options, the entry cannot show.

**A Profile mark (`isAdmin`, `isChild`) has no effect.** It must be `true` or `false`, at the top level of `profile.json`, with its key spelt exactly; a wrong mark is ignored and logged in `PinballY.log`. Edit `profile.json` with PinballY closed.

**The confetti or fireworks slow the cabinet down.** Turn them off with `CONFETTI=false` or `FIREWORKS=false`.

---

[← Guide index](index.md)
