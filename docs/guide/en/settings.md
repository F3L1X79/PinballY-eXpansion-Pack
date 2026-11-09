# Settings

[← Guide index](index.md)

For the cabinet owner:

- **eXpansion Pack Settings**: from the Operator Menu, turn each Add-on on or off by category, pick the startup screen and the language, then restart PinballY in one press.
- **Admin Profile**: the setup entries for you alone.
- **Child Profile**: a wheel without Adult Tables for the kids.
- **Manage profiles**: mark an Admin Profile or a Child Profile, or start a Profile over (Profile Reset), alone or the whole household at once.
- **Menu Cleanup**: leaner PinballY menus (see [Interface](interface.md#menu-cleanup)).

Everything stays in one folder, with no change to PinballY itself.

## eXpansion Pack Settings

**eXpansion Pack Settings**, in the Operator Menu, sets the Add-ons, the startup screen, the language and the Offline Mode without editing any file, then restarts PinballY in one press. It also offers "Update to vX.Y.Z" once you answered "Later" to the Update Prompt (see [Updates](updates.md)), and, while the Table ROMs Add-on is on, a vpxtool line (see [Install](install.md#vpxtool) and [Updates](updates.md#keeping-vpxtool-up-to-date)):

- "Install vpxtool v0.38.0" while vpxtool is missing;
- "Update vpxtool (v0.37.1 → v0.38.0)" while yours is older than the version the pack names;
- "Update vpxtool", greyed with "vpxtool v0.38.0 is up to date" under it, while yours is that version or newer.

Under "Players and progress", **Ratings per Profile** gives each Profile its own star Ratings and Favorite Tables, kept in a `ratings.json` file of its folder. The first time it runs, every Profile, Guest included, is given the Ratings and Favorite Tables already on the cabinet. Turned off, everyone shares PinballY's Ratings and Favorite Tables again, and the Ratings Achievements are gone (`ADD_ON_PROFILE_RATINGS=false`).

Until the pack has read your vpxtool's version once (about ten seconds into the first start that finds it), or while that version cannot be read, there is no vpxtool line.

The **Offline Mode** group holds what reaches, or offers to reach, the internet, one switch each:

- **Pack update check**: PinballY asks GitHub for a newer version of the pack at each start (`UPDATE_CHECK`).
- **Offer vpxtool**: the pack may offer to install or update vpxtool (`OFFER_VPXTOOL`).
- **Discord Rich Presence**: Discord shows the table being played on your account, the very same switch as the Add-on's under "Launching and playing a table", with the same consent Dialog (see [below](#discord-rich-presence)).

## Discord Rich Presence

Discord Rich Presence shows, on the Discord account signed in on the cabinet's PC, what the cabinet is doing: "Choosing a table" on the wheel, during a game the table's name, how long the game has lasted and, when it is one, "Table of the Day" or "Table of the Week", under the name "Virtual Pinball" with the pack's logo, and nothing during attract mode, so a cabinet left on overnight shows nothing. **This is public**: your Discord friends and the members of your servers see it. Nothing else is sent: no Profile name, never the table under the wheel's selection, nothing else from your PC. An Adult Table shows its name like any other table.

It is **off by default**: turn it on in the eXpansion Pack Settings, under "Launching and playing a table" or in the Offline Mode group, or with `ADD_ON_DISCORD_RICH_PRESENCE=true`. Turning it on in the Settings asks for your consent every time, in a Dialog that says what becomes public, the cursor on "Cancel": only "Turn on" saves it. Turning it off never asks. Start Discord before PinballY: the pack never starts it, and looks for it three times, 15 seconds apart, at startup; if Discord is not running by then, or closes during the session, a [Warning toast](troubleshooting.md#the-warning-toast-warning-toast) says so once and the status stays empty until PinballY restarts (the reason is in `PinballY.log`). While Discord is actually showing the cabinet, its white symbol sits beside the wheel's clock, for everyone (see [Status Icons](interface.md#status-icons)).

## `.env.local`

Every other setting lives in `Scripts\ExpansionPack\.env.local`, one `KEY=value` per line (UTF-8). Copy `ExpansionPack\.env.example` and only write the ones you change, for example:

```
LANGUAGE=en
ACHIEVEMENT_SOUND_FILE=assets\sounds\local\trophy.mp3
ADD_ON_CLOCK=false
```

| Setting | Default | What it does |
|---|---|---|
| `LANGUAGE` | `en` | Interface language: `en`, `fr`, `de`, `es`, `it` or `pt`. |
| `ADULT_CATEGORY` | `NSFW` | PinballY category of the Adult Tables, hidden from Child Profiles. |
| `UNTRACKED_TABLES` | empty | Tables that are not really pinball games, such as a media player launched as a table: comma-separated titles, exactly as in PinballY (`Media Player,Jukebox`). They stay on the wheel and launch, but are left out of the stats, the Achievements and the Random Game. Remove a table from the list and it comes back with its saved games. |
| `COMMUNITY_TABLES_MANUFACTURER` | `VPX Community` | Manufacturer you gave to fictional or community tables, for the status line and the "Original Tables" filter. |
| `LAUNCH_SOUND_FILE` | `assets\sounds\launch.mp3` | Sound played when a table launches: a path from the pack's folder (your own sounds go in `assets\sounds\local\`) or a full path; empty = no sound. |
| `ACHIEVEMENT_SOUND_FILE` | `assets\sounds\achievement.wav` | Sound played with each Achievement toast. |
| `PROFILE_GREETING_SOUND_FILE` | `assets\sounds\profile_greeting.mp3` | Sound played when a player is greeted. |
| `CONFETTI_SOUND_FILE` | `assets\sounds\confetti.wav` | Sound played once when a shower of confetti starts. |
| `FIREWORKS_SOUND_FILE` | `assets\sounds\fireworks.wav` | Sound played once when the Fireworks start. |
| `PROFILE_PICKER_SOUND_FILE` | empty | Sound played each time the Profile picker carousel appears: at startup (`STARTUP_SCREEN=profilePicker`) or from "Change Player"; none ships with the pack. |
| `AVATAR_CHOICE_SOUND_FILE` | empty | Sound played once when Avatar Choice shows, after a new Profile's name is entered; none ships with the pack. |
| `STARTUP_SCREEN` | `profilePicker` | What PinballY shows first: `profilePicker` (the "Change Player" carousel, then the Welcome Screen; skipped while the cabinet has fewer than two Profiles besides Guest), `welcome` (the Welcome Screen) or `wheel` (the bare wheel, the last player greeted). A screen whose feature is turned off gives way to the next one, from the carousel to the Welcome Screen to the wheel. |
| `ACHIEVEMENT_TOAST_SECONDS` | `4` | Seconds an Achievement toast stays on screen (up to 60). |
| `ACHIEVEMENT_TOAST_SCALE` | `1.0` | Size of the toast, from `0.5` to `3`. Raise it on a large screen. |
| `CONFETTI` | `true` | `false` turns off the Confetti Shower that falls with the toast of a completed Challenge, a Platinum Achievement, Mastery Level 10 on a table or a new Collection Tier, if your PC struggles with it. |
| `FIREWORKS` | `true` | `false` turns off the Fireworks that come with the toast of a new Player Level, if your PC struggles with them. Independent of `CONFETTI`. |
| `UPDATE_CHECK` | `true` | `false` stops PinballY from asking GitHub for a newer version of the pack at each start, and from offering to update it (see [Updates](updates.md)). |
| `OFFER_VPXTOOL` | `true` | `false` stops the pack from ever offering to install or update vpxtool; you can still install it yourself. |
| `SKIP_RANDOM_GAME_ANIMATION` | `false` | `true` skips the wheel of fortune and launches the Random Game at once. |
| `ASK_TO_RATE_AFTER_MINUTES_PLAYED` | `60` | Minutes played on a table before you are asked to rate it. |
| `LOG_UNTRANSLATED_MENU_TITLES` | `false` | `true` writes each untranslated PinballY menu title to `PinballY.log`. |
| `LOG_LAUNCH_EVENTS` | `false` | `true` writes each launch event to `PinballY.log` with a millisecond timestamp, to check their order on the cabinet. |

Every feature can also be turned off with its `ADD_ON_*` key, for example `ADD_ON_CLOCK=false` or `ADD_ON_CHALLENGES=false`. Only Menu Cleanup, the Backglass Clock (`ADD_ON_BACKGLASS_CLOCK`, the time on the backglass screen during a game, see [Interface](interface.md#backglass-clock)) and Discord Rich Presence (`ADD_ON_DISCORD_RICH_PRESENCE`, see [above](#discord-rich-presence)) are off by default. Each key is described in [.env.example](../../../.env.example).

Each Profile's progress is saved in `Scripts\ExpansionPack\profiles`. Keep that folder when you reinstall or update the pack, and you get your progress back.

## Admin Profile

The first Profile [created from the cabinet](profiles.md#from-the-cabinet) while you only have Guest becomes an Admin Profile by itself: pick it in Change Player to keep the setup entries. Otherwise, to keep them for yourself, [create your Profile](profiles.md#create-a-profile) if you only have Guest, pick it in Change Player, and make it the first Admin Profile: while no Profile is marked, open **Manage profiles** in the Exit menu (Escape) or the Operator Menu and choose **Become admin**, its only line. Your Profile is marked at once and the full menu opens. Guest and Child Profiles do not see the entry, since they can never be Admin Profiles.

You can also mark it by hand, PinballY closed: in your Profile's `Scripts\ExpansionPack\profiles\<name>\profile.json`, add `"isAdmin": true,` as the first key, just after the opening brace. The comma at its end is required: JSON needs one between two keys.

```json
{
  "isAdmin": true,
  "version": 1,
  "plays": {
```

Editing that file remains the way to undo the mark while it is the only Admin Profile: remove the whole line, comma included. A `profile.json` the pack cannot read is set aside as `profile.broken-<date>.json` and your edit seems to vanish: see [Troubleshooting](troubleshooting.md).

From then on, that Profile marks the others from the cabinet: open **Manage profiles** in the Exit menu or the Operator Menu, pick a Profile and choose "Admin: no", which turns to "Admin: yes" at once. Choose it again to clear the mark.

- You can clear your own mark the same way while another Admin Profile remains: the menus then close, since you no longer have access to them.
- The last Admin Profile's Admin line is greyed out ("Last admin"): only editing its `profile.json` by hand takes the household back to everyone seeing everything.
- A Profile is never both an Admin Profile and a Child Profile: a Child Profile's Admin line is greyed out ("Remove the child mark first"), and so is Guest's ("Guest is never marked"); choosing it changes nothing.
- Once at least one Profile is marked, the other Profiles (Guest included) no longer see "Set Up Table" in the main menu nor "Operator Menu" in the Exit menu; the Admin Profiles still see both, and the coin door service button still opens the Operator Menu for anyone.
- Several Profiles can be marked.
- Guest is never an Admin Profile, and a mark that is not `true` or `false`, or whose key is misspelt (`"isAdmin "`, `"IsAdmin"`), is ignored and logged in `PinballY.log`.
- The Update Prompt, the vpxtool offer (see [Install](install.md#vpxtool)) and the "Problem" toasts meant for the owner show to Admin Profiles only, or to anyone while no Profile is marked (see [Updates](updates.md) and [Troubleshooting](troubleshooting.md)).

## Profile Reset

An Admin Profile also finds **Manage profiles** in two places: in the Exit menu (Escape), right after "Change Player", above "Operator Menu"; and in the Operator Menu, right after **eXpansion Pack Settings**, in their own group below "Batch Capture". Other Profiles never see it, even when the coin door service button opens the Operator Menu. It lists every Profile, Guest and yourself included, plus "Reset every profile", once there are two or more, to reset the whole household at once. Picking a Profile opens its own menu: its Admin and Child marks (see [Admin Profile](#admin-profile) and [Child Profile](#child-profile)) and **Reset**. With the [drawn menus](interface.md#drawn-menus) on, Exit or "Back" there brings you back to the list; with them off, both close the menu.

- After one confirmation (the cursor starts on "No"), "Reset" or "Reset every profile" starts the Profile over: its plays, Streaks, session records, Random Games, Challenge progress, announced Achievements, Table Mastery, Collection Tier and Avatar Frames are erased, while its name, Avatar, marks and the High Scores it won stay.
- A message then tells whether it worked.
- Its former files are kept next to them, as `profile.reset-<date>.json` and `play-log-<year>.reset-<date>.json`: to undo a reset, close PinballY and rename each copy back, without its `.reset-<date>` part.
- If you disabled PinballY's Exit menu in its options, the coin door service button still opens the Operator Menu, and Manage profiles with it.

## Child Profile

To keep the Adult Tables away from a child, tag them in PinballY with the category `NSFW` (or name your own category with `ADULT_CATEGORY` in `Scripts\ExpansionPack\.env.local`, spelt exactly as in PinballY), then mark the child's Profile: from an Admin Profile, open **Manage profiles** in the Exit menu or the Operator Menu, pick the child's Profile and choose "Child: no", which turns to "Child: yes" at once. Choose it again to clear the mark.

- An Admin Profile's Child line is greyed out ("Remove the admin mark first"), and so is Guest's ("Guest is never marked"): choosing it changes nothing.
- You can still mark a Profile by hand: add `"isChild": true` at the top level of its `Scripts\ExpansionPack\profiles\<name>\profile.json`, PinballY closed.
- A Profile marked again finds its own Achievements as it left them, with no new announcement.
- While that Profile is active, those tables are left off the wheel whatever the filter, the Random Game never draws one, and starting up never leaves the wheel on one; switching to another Profile brings them back at once.
- The Table of the Day and the Table of the Week stay the same for the whole household: while one is an Adult Table, the child does not get its card on the Welcome Screen, and that day or week neither extends nor breaks the child's Streak.
- Guest is never a Child Profile, so adult visitors see the whole collection.
- A Child Profile has three Achievements of its own (see [Achievements and Challenges](achievements_and_challenges.md)).
- This is no parental control: nothing asks for a password.

---

[← Guide index](index.md)
