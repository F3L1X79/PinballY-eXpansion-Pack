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

## The "Warning" toast (Warning Toast)

When something you turned on will not work for the rest of the session, the pack says so once with an amber toast, the header "Warning" and a warning sign. It is not a failure of the pack, so it is not written to the Error Log. Like every toast, it waits for the wheel, after the Welcome Screen and the Profile picker, and never interrupts a game.

| The toast says | Who sees it | What to do |
|---|---|---|
| "Discord not found: the table being played won't show on Discord. Start Discord before PinballY." | The active Profile, whoever it is, once per session. | Start Discord before PinballY, then restart PinballY. The pack tries three times in the first 30 seconds, and stops trying if Discord closes or refuses the connection later (see [Discord Rich Presence](settings.md#discord-rich-presence)). |

## The PinballY version notice

Each version of the pack names the PinballY version it was tested on. When the PinballY installed on your cabinet is newer than that, has a version the pack cannot read, or is older than the pack's minimum, the pack says so at startup or when a Profile becomes active, in a message with a single "Got it" button. Exit counts as having read it. It never turns anything off.

| The title says | What it means | What to do |
|---|---|---|
| "Untested PinballY version" | Your PinballY is newer than the one this version of the pack was tested on, or its version cannot be read. Everything may work fine. | Nothing for now. If something misbehaves, think of this first, and look for a newer version of the pack (see [Updates](updates.md)). |
| "PinballY version too old" | Your PinballY is older than the pack's minimum. Some features may not work. | Install a newer PinballY. |

**Who sees it:** each Admin Profile, once per PinballY version, at a start where that Profile is the active one, or as soon as it becomes the active Profile and the wheel is free. A Profile that gains the Admin mark while active sees it at its next start or switch. While the cabinet has no Admin Profile, it shows once for the whole cabinet, to the active Profile, Guest included. A Profile that does not see the setup entries never sees it. It comes back only when the installed PinballY version changes, and a Profile Reset does not bring it back.

The pack reacts only to what is installed: it never checks what PinballY has published. The same gap is written as a `WARNING` line in `PinballY.log`, even when nobody sees the message.

## The Error Log (`errors.log`)

PinballY starts a new `PinballY.log` at each launch, so the pack also writes every error it meets to its own Error Log, which survives restarts:

- **Where**: `PinballY\Scripts\ExpansionPack\errors.log`.
- **What**: one line per error, with its date, time, Pack Version and the Add-on at fault, and the call stack indented below. It also says why a file of the `profiles` folder could not be read, under which name it was kept, and whether its data came back from its backup or started from zero. Warnings and information go to `PinballY.log` and the Info Log only.
- **Size**: once over 1 MB, it becomes `errors.old.log` at the next start, and a new `errors.log` begins.
- It is kept through every Pack Update, and can never be turned off.

The toasts never send the player to it: it is for the cabinet owner. **Attach `errors.log` (and `errors.old.log` if there is one) when you report a problem.**

## The Info Log (`info.log`)

Every line the pack writes to `PinballY.log`, errors included, also goes to its Info Log, with a few extra lines meant to check how the pack behaves on your cabinet. It needs no PinballY log setting turned on, and it survives restarts:

- **Where**: `PinballY\Scripts\ExpansionPack\info.log`.
- **What**: one line per pack message, with its date, time and Pack Version. PinballY's own lines (tables, media, its own errors) stay in `PinballY.log` only.
- **Size**: once over 1 MB, it becomes `info.old.log` at the next start, and a new `info.log` begins.
- It is kept through every Pack Update.

**Attach `info.log` too when you report a problem**: it shows what the pack did just before.

## `PinballY.log`

PinballY's own log, in the PinballY folder, covers the current session only. At each start it lists your `.env.local` overrides, one "initialized" line per Add-on, and `ERROR` lines naming the Add-on at fault. Two settings add more lines to it, to help find a problem: `LOG_UNTRANSLATED_MENU_TITLES` and `LOG_LAUNCH_EVENTS` (see [Settings](settings.md)).

## Common questions

**The pack does not start at all.** Check that you have `PinballY\Scripts\ExpansionPack\main.js`, not `ExpansionPack\ExpansionPack\main.js` nor a folder named `PinballY-Expansion-Pack-<version>` (that one comes from "Source code (zip)", not `ExpansionPack.zip`), and that `Scripts\main.js` holds the import line (see [Install](install.md)). A pack that fails to load writes its error to `PinballY.log`, under "ExpansionPack:".

**No Add-on starts after a PinballY upgrade.** Look in `PinballY.log` for a line starting with `[ExpansionPack] Started:`. Its absence can mean that JavaScript was turned off, for instance by an older `Scripts\System\SystemClasses.js` next to a newer PinballY. Check that this file comes from the PinballY version you installed. Whether PinballY's installers overwrite that folder has not been checked, so do not assume they do.

**There is no sound.** The sounds need the *Windows Media Player* optional feature of Windows, there by default on Windows 10 and 11: if it was removed, add *Windows Media Player Legacy* back in *Settings › Apps › Optional features* (on an "N" edition, install the *Media Feature Pack*). Check also the `*_SOUND_FILE` settings: an empty value means no sound.

**An original table has no high score board.** Its board appears once the table has been played with the pack, which learns where the table keeps it during its first game.

**A table with an empty ROM field has no board at all.** If you updated PINemHi, the `[romfind]` section of `romfind.ini` must be appended to `pinemhi.ini` (see [Install](install.md#pinemhi-368)).

**Guest is the only Profile.** The pack ships with Guest alone. Create a Profile from **Change Player**, with its last slot, the "+", or from Windows, as a folder (see [Create a Profile](profiles.md#create-a-profile)).

**I marked a Profile as admin and lost the setup entries.** Once a Profile is marked, the others, Guest included, no longer see them, and you may still be on Guest: pick the marked Profile in Change Player, in the main menu or the Exit menu. PinballY opens Change Player by itself only once the cabinet has two Profiles or more besides Guest.

**I created my first Profile and Guest lost the setup entries, and the "+".** The first Profile created from the cabinet becomes an Admin Profile, as Name Entry's yellow line says, and you are still on Guest: pick the new Profile in Change Player, in the main menu or the Exit menu (see [Create a Profile](profiles.md#create-a-profile)).

**"Manage profiles" is missing from the Exit menu or the Operator Menu.** Once a Profile is marked, it shows to Admin Profiles only; while none is, it shows to every Profile but Guest and Child Profiles, with "Become admin" alone (see [Admin Profile](settings.md#admin-profile)). With PinballY's Exit menu disabled in its options, open the Operator Menu with the coin door service button.

**A Profile mark (`isAdmin`, `isChild`) has no effect.** It must be `true` or `false`, at the top level of `profile.json`, with its key spelt exactly; a wrong mark is ignored and logged in `PinballY.log`. Edit `profile.json` with PinballY closed: while it runs, its next save of the active Profile overwrites your edit, without any line in the log. If your edit is gone and a `profile.broken-<date>.json` file appeared, see the next question.

**A hand edit of `profile.json` disappeared, and a `profile.broken-<date>.json` file appeared next to it.** The pack could not read your edited file, most often for a missing or extra comma, and never reads or saves over a file it does not understand: it renamed it to `profile.broken-<date>.json`, which it keeps and never deletes, and brought the Profile back from its backup, `profile.bak.json`, the version saved before the last one, so without your edit. With no readable backup, the Profile starts from zero, and a broken backup is kept as `profile.bak.broken-<date>.json` too. `errors.log` says why the file could not be read, and whether the Profile came back from its backup or started from zero. To get your file back, close PinballY, fix the mistake in `profile.broken-<date>.json` (an editor that checks JSON shows where it is), then delete `profile.json` and rename the repaired file to `profile.json`. The Plays recorded since the recovery are in the `profile.json` you delete: they are lost. A file still unreadable is set aside again, and nothing else is lost. An unreadable `cabinet.json` or Play Log file (`play-log-<year>.json`) is set aside the same way.

**The confetti or fireworks slow the cabinet down.** Turn them off with `CONFETTI=false` or `FIREWORKS=false`.

---

[← Guide index](index.md)
