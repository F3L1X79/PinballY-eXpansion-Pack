# Updates

[← Guide index](index.md)

## The Update Prompt

At each start, PinballY asks GitHub in the background whether a newer version of the pack is out, without slowing the start down; offline, it only writes one line in `PinballY.log`.

When there is one, the next start opens the Update Prompt before anything else, titled "Update available": "eXpansion Pack vX.Y.Z is available.", with "Update now" and "Later". It waits for a start where the last player sees the setup entries (an [Admin Profile](settings.md#admin-profile), or anyone while no Profile is marked).

From the start that found it until the update is done, a gold arrow pointing down sits beside the wheel's clock (see [Status Icons](interface.md#status-icons)), for the same players. It goes if GitHub later says that version is no longer newer.

## Update now

"Update now" downloads and checks the new version, the gold comet turning over the dimmed wheel with "Downloading the update…" beneath it and the buttons blocked meanwhile, then closes PinballY, swaps the pack's folder for the new one, and starts PinballY again. The next start says so under "Update complete": "eXpansion Pack updated to vX.Y.Z", then, after a blank line, what is new as a list, one dash per sentence, in the cabinet's language. After a jump over several versions, the news of each version on the way is listed too, newest first, five sentences at most. A fix release with nothing new for the players shows the first line alone.

These are kept (the full list is in [Updating offline](#updating-offline)):

- your settings (`.env.local`);
- the Profiles (`profiles`);
- the files you put in `tools`, `vpxtool.exe` included;
- your own sounds and Default Score images;
- the pack's logs (`logs`): the Error Log, the Info Log and the Play Score anomaly log.

## When an update fails

- A download that fails before PinballY closes is told at once under "Update not possible": "The eXpansion Pack stays as it is."
- If the update failed after PinballY closed, the previous version is still in place, and a "Problem" toast tells whoever sees the setup entries where to read why (see [Troubleshooting](troubleshooting.md)).

## Later

"Later" is not asked again for that version: "Update to vX.Y.Z" stays in **eXpansion Pack Settings** until you update, and the gold arrow stays beside the clock.

## Keeping vpxtool up to date

Each version of the pack names the vpxtool version it was tried with. At each start, the pack asks the installed `vpxtool.exe` its version, in the background, and remembers it in `script_reader.json` (kept through updates). When that version is older, the next start (or the first start after an update of the pack that names a newer one) opens the same offer as for a missing vpxtool, saying "update" with both versions: "Update" downloads the new one, the gold comet turning over the dimmed wheel with "Downloading…" beneath it, and "No thanks" stops the offers, as for the install (see [Install](install.md#vpxtool)). A vpxtool equal to or newer than that version is never touched; one whose version cannot be read is left alone, the problem written to the Error Log.

## Turning the check off

Set "Pack update check" to "Off" in the Offline Mode group of **eXpansion Pack Settings**, or write `UPDATE_CHECK=false` in `.env.local`: the cabinet then never contacts GitHub. From the next start, a white circular arrow, crossed out, sits beside the wheel's clock as a reminder, for whoever sees the setup entries (see [Status Icons](interface.md#status-icons)).

A pack installed with git is never checked nor offered updates: run `git pull` in `Scripts\ExpansionPack`.

## Updating offline

A cabinet without Internet never sees the Update Prompt: update it by hand with the release zip, as "Update now" does. You can go straight from any version to the latest one (from 1.4 to 1.6, say): the pack reads the files of older versions as they are, with no step to run in between.

1. On another computer, download `ExpansionPack.zip` from the latest release (see [Install](install.md)) and bring it to the cabinet.
2. Close PinballY.
3. Rename `Scripts\ExpansionPack` to `ExpansionPack.old-<date>`: it is your copy of the previous version (see [Going back to the previous version](#going-back-to-the-previous-version)).
4. Extract the zip into `PinballY\Scripts`: you should get `Scripts\ExpansionPack\main.js`, not `ExpansionPack\ExpansionPack\main.js`.
5. Copy back from `ExpansionPack.old-<date>` into `ExpansionPack` those of the following that you have, over what the zip holds:
   - `.env.local`: your settings;
   - `profiles`: the Profiles;
   - `logs`: the pack's logs;
   - `assets\sounds\local`: your own sounds;
   - `assets\images\default_scores\local`: your own Default Score images;
   - `pack_update.json`: the answers given to the pack's notices;
   - `script_reader.json`: the vpxtool version the pack knows;
   - `quiet_wheel_pending.json`: a table volume to put back, there only after PinballY was cut off;
   - `tools`: the files you put there, `vpxtool.exe` included, but not `pack_update.ps1`, `restart_pinbally.ps1` and `script_reader_install.ps1`, which the zip ships newer.

   Coming from a version that kept its logs in the pack folder itself (`errors.log`, `play_scores_anomalies.log` and their `.old.log`), copy those too: the pack moves them into `logs` at its start.
6. Start PinballY.

So that the cabinet stops looking for updates it cannot reach, set "Pack update check" to "Off" in the Offline Mode group (see [Turning the check off](#turning-the-check-off)).

## Going back to the previous version

Close PinballY: the previous version is kept next to the pack as `Scripts\ExpansionPack.old-<date>` (the newest one only).

1. Copy `profiles`, `.env.local` and `pack_update.json` into it from `Scripts\ExpansionPack`, to keep the progress made since the update (and not be told that the update failed).
2. Rename `ExpansionPack` to anything else.
3. Rename that folder to `ExpansionPack`.

---

[← Guide index](index.md)
