# Settings

[← Guide index](index.md)

For the cabinet owner:

- **eXpansion Pack Settings**: from the Operator Menu, turn each Add-on on or off by category, pick the startup screen and the language, then restart PinballY in one press.
- **Admin Profile**: the setup entries for you alone.
- **Child Profile**: a wheel without Adult Tables for the kids.
- **Manage profiles**: mark an Admin Profile or a Child Profile, give a Profile its Initials, hand PinballY's own play history to one Profile (History Import), start a Profile over (Profile Reset), alone or the whole household at once, or remove a Profile from the cabinet (Profile Removal).
- **Menu Cleanup**: leaner PinballY menus (see [Interface](interface.md#menu-cleanup)).

Everything stays in one folder, with no change to PinballY itself.

## eXpansion Pack Settings

**eXpansion Pack Settings**, in the Operator Menu, sets the Add-ons, the startup screen, the language, the Wheel Guides, the Attract Order and the Offline Mode without editing any file, then restarts PinballY in one press. It also offers "Update to vX.Y.Z" once you answered "Later" to the Update Prompt (see [Updates](updates.md)), and, while the Table ROMs Add-on is on, a vpxtool line (see [Install](install.md#vpxtool) and [Updates](updates.md#keeping-vpxtool-up-to-date)):

- "Install vpxtool v0.38.0" while vpxtool is missing;
- "Update vpxtool (v0.37.1 → v0.38.0)" while yours is older than the version the pack names;
- "Update vpxtool", greyed with "vpxtool v0.38.0 is up to date" under it, while yours is that version or newer.

Until the pack has read your vpxtool's version once (about ten seconds into the first start that finds it), or while that version cannot be read, there is no vpxtool line.

The list, from top to bottom:

- **Language** and **Startup screen**;
- the Add-on categories, each opening its page: **Players and progress**, **Wheel** (the wheel screen's Add-ons, then the Wheel Guides' own lines and the Attract Order line), **Menus**, **Filters** (the filters the pack adds: Most Played Tables, Tables to Discover, Hidden Tables, Original Tables) and **Launching and playing a table**;
- the **Offline Mode** group;
- the "Update to" and vpxtool lines while they apply, then **Back**.

Under "Players and progress", **Ratings per Profile** gives each Profile its own star Ratings and Favorite Tables, kept in a `ratings.json` file of its folder (see [Ratings and Favorite Tables](profiles.md#ratings-and-favorite-tables)). Turned off, everyone shares PinballY's Ratings and Favorite Tables again, and the Ratings Achievements are gone (`ADD_ON_PROFILE_RATINGS=false`).

Under "Menus", **Hidden Games** is on by default: some surprises unlock menu entries, so do not be puzzled when one appears in a player's main menu. Turned off, those entries never show (`ADD_ON_ROCKET_GAME=false`). **Easter Eggs** is on by default too: for players who would rather not be surprised, turn it off and no surprise ever happens again, for any Profile; what a Profile already unlocked stays, those menu entries included (`ADD_ON_EASTER_EGGS=false`). **Set Up Table** adds that entry to the main menu (`ADD_ON_CUSTOM_MENU_COMMANDS=false` to remove it).

Under "Wheel", **Wheel Order** is on, its wheel alphabetical until a player switches it to by year; turned off, "Change Filter" loses its order entry and the wheel stays alphabetical (`ADD_ON_WHEEL_ORDER=false`, see [Wheel Order](choosing_a_table.md#wheel-order)). It has nothing to do with attract mode: the Attract Order line below it works with Wheel Order on or off.

The **Attract Order** line, at the bottom of the "Wheel" page after a separator, chooses how attract mode moves through the tables once the cabinet sits idle:

- **As PinballY** (the default): PinballY jumps a few tables at random at each switch, as without the pack.
- **In Order**: each switch moves to the next table of the wheel, with PinballY's own one-step spin, and starts over at the first after the last. With the wheel by year, attract mode is a chronological tour.
- **Whole Wheel**: every table of the wheel is shown once, in a shuffled order, before any comes back, never the table already on screen. Each switch is one fast spin of the wheel, and each new attract mode shuffles again.

To do this, the pack takes PinballY's switches over: saving In Order or Whole Wheel keeps the value of PinballY's "Switch games every" option, puts a one-day value in its place so PinballY no longer switches, and switches itself at the interval you had set. Saving As PinballY gives your value back. If you change "Switch games every" in PinballY's options meanwhile, the pack takes your new value at the next start: PinballY switches with it for that session, the pack from the start after. Like the other lines, the choice applies when PinballY restarts (`ATTRACT_ORDER`). **Before removing the pack, set the Attract Order back to As PinballY**: otherwise PinballY's attract mode keeps the one-day value and never switches tables.

Under "Wheel", **Wheel Guides** shows where you are on the wheel: the Wheel Rail, the letters (or decades) along the right edge with a gold pill on the selected table's, the Wheel Position, the selected table's place out of the wheel's tables, in the bottom right corner, and the Favorite Heart, red on a Favorite Table, in the bottom left corner (see [Interface](interface.md#on-the-wheel-screen)). Turned off, "Table n/total" comes back to the lower status line (`ADD_ON_WHEEL_GUIDES=false`).

While Wheel Guides is saved on, the "Wheel" page lists four more lines after its separator, above the Attract Order line, to keep only the guides you want; each applies when PinballY restarts:

- **Wheel Rail** On or Off (`WHEEL_RAIL`);
- **Rail by year**, shown while the Wheel Rail is saved on: **Decades only** (the default) or **Decades and years**, each decade's years under it when the wheel is by year, and the Next Page and Previous Page buttons then jumping by year instead of by decade (`WHEEL_RAIL_YEARS`; the letters of the alphabetical wheel stay as they are);
- **Wheel Position** On or Off: turned off, "Table n/total" comes back to the lower status line (`WHEEL_POSITION`);
- **Favorite Heart** On or Off (`FAVORITE_HEART`).

For a held flipper button to scroll the wheel at the pace the cabinet was tuned for, set PinballY's own "Auto-repeat rate" (Options, Game Wheel) to `180ms`: the pack never changes it.

Under "Launching and playing a table", **Launch overlay** keeps the screen from flashing black while a table loads (`ADD_ON_SEAMLESS_LAUNCH_OVERLAY=false` to turn it off). If another script you run in PinballY, such as a launch video script, takes the launch screen before the pack, the pack's overlay still shows, and a **Conflict Notice** says so once: see [With your External Add-ons](external_add_ons.md#what-the-pack-tells-you-the-launch-screen).

The **Offline Mode** group holds what reaches, or offers to reach, the internet, one switch each:

- **Pack update check**: PinballY asks GitHub for a newer version of the pack at each start (`UPDATE_CHECK`).
- **Offer vpxtool**: the pack may offer to install or update vpxtool (`OFFER_VPXTOOL`).
- **Discord Rich Presence**: Discord shows the table being played on your account, the very same switch as the Add-on's under "Launching and playing a table", with the same consent Dialog (see [below](#discord-rich-presence)).

## Discord Rich Presence

Discord Rich Presence shows, on the Discord account signed in on the cabinet's PC, what the cabinet is doing: "Choosing a table" on the wheel, during a game the table's name, how long the game has lasted and, when it is one, "Table of the Day" or "Table of the Week", under the name "Virtual Pinball" with the pack's logo, and "Attract mode" while the idle cabinet runs attract mode. **This is public**: your Discord friends and the members of your servers see it. Nothing else is sent: no Profile name, never the table under the wheel's selection, nothing else from your PC. An Adult Table shows its name like any other table.

It is **off by default**: turn it on in the eXpansion Pack Settings, under "Launching and playing a table" or in the Offline Mode group, or with `ADD_ON_DISCORD_RICH_PRESENCE=true`. Turning it on in the Settings asks for your consent every time, in a Dialog that says what becomes public, the cursor on "Cancel": only "Turn on" saves it. Turning it off never asks. Start Discord before PinballY: the pack never starts it, and looks for it three times, 15 seconds apart, at startup; if Discord is not running by then, or closes during the session, a [Warning toast](troubleshooting.md#the-warning-toast-warning-toast) says so once and the status stays empty until PinballY restarts (the reason is in `PinballY.log`). While Discord is actually showing the cabinet, its white symbol sits beside the wheel's clock, for everyone (see [Status Icons](interface.md#status-icons)).

## `.env.local`

Every other setting lives in `Scripts\ExpansionPack\.env.local`, one `KEY=value` per line (UTF-8). Copy `ExpansionPack\.env.example` and only write the ones you change, for example:

```
LANGUAGE=en
ACHIEVEMENT_SOUND_FILE=assets\sounds\local\trophy.mp3
ADD_ON_CLOCK=false
```

The eXpansion Pack Settings write to this file too. A key they save that is not in it yet is added at the end, with its comment from `.env.example` above it, so you can read what it does without opening that file.

| Setting | Default | What it does |
|---|---|---|
| `LANGUAGE` | `en` | Interface language: `en`, `fr`, `de`, `es`, `it` or `pt`. |
| `ADULT_CATEGORY` | `NSFW` | PinballY category of the Adult Tables, hidden from Child Profiles. |
| `UNTRACKED_TABLES` | empty | Tables that are not really pinball games, such as a media player launched as a table: comma-separated titles, exactly as in PinballY (`Media Player,Jukebox`). They stay on the wheel and launch, but are left out of the stats, the Achievements and the Random Game. Remove a table from the list and it comes back with its saved games. |
| `COMMUNITY_TABLES_MANUFACTURER` | `VPX Community` | Manufacturer you gave to fictional or community tables, for the status line and the "Original Tables" filter. |
| `LAUNCH_SOUND_FILE` | `assets\sounds\launch.mp3` | Sound played when a table launches: a path from the pack's folder (your own sounds go in `assets\sounds\local\`) or a full path; empty = no sound. |
| `LAUNCH_SOUND_VOLUME` | `50` | Volume of the launch sound, from `0` to `100`. It plays outside PinballY's own audio, so PinballY's volume settings and Pinvol do not lower it: with Pinvol, lower this value until the sound matches your tables. A value outside `0`-`100`, or not a number, plays at `50` and is written to `logs\errors.log`. |
| `ACHIEVEMENT_SOUND_FILE` | `assets\sounds\achievement.wav` | Sound played with each Achievement toast. |
| `PROFILE_GREETING_SOUND_FILE` | `assets\sounds\profile_greeting.mp3` | Sound played when a player is greeted. |
| `CONFETTI_SOUND_FILE` | `assets\sounds\confetti.wav` | Sound played once when a shower of confetti starts. |
| `FIREWORKS_SOUND_FILE` | `assets\sounds\fireworks.wav` | Sound played once when the Fireworks start. |
| `PROFILE_PICKER_SOUND_FILE` | empty | Sound played each time the Profile picker carousel appears: at startup (`STARTUP_SCREEN=profilePicker`) or from "Change Player"; none ships with the pack. |
| `AVATAR_CHOICE_SOUND_FILE` | empty | Sound played once when Avatar Choice shows, after a new Profile's name is entered; none ships with the pack. |
| `STARTUP_SCREEN` | `profilePicker` | What PinballY shows first: `profilePicker` (the "Change Player" carousel, then the Welcome Screen; skipped while the cabinet has fewer than two Profiles besides Guest), `welcome` (the Welcome Screen) or `wheel` (the bare wheel, the last player greeted). A screen whose feature is turned off gives way to the next one, from the carousel to the Welcome Screen to the wheel. |
| `ATTRACT_ORDER` | `pinballY` | How attract mode moves through the tables: `pinballY` (as PinballY does), `inOrder` (the next table of the wheel) or `wholeWheel` (every table once, shuffled). Set it in the eXpansion Pack Settings rather than here: saving it there also sets PinballY's "Switch games every" (see [above](#expansion-pack-settings)). |
| `ACHIEVEMENT_TOAST_SECONDS` | `4` | Seconds an Achievement toast stays on screen (up to 60). |
| `ACHIEVEMENT_TOAST_SCALE` | `1.0` | Size of the toast, from `0.5` to `3`. Raise it on a large screen. |
| `CONFETTI` | `true` | `false` turns off the Confetti Shower that falls with the toast of a completed Challenge, a Platinum Achievement, Mastery Level 10 on a table or a new Collection Tier, if your PC struggles with it. |
| `FIREWORKS` | `true` | `false` turns off the Fireworks that come with the toast of a new Player Level, if your PC struggles with them. Independent of `CONFETTI`. |
| `UPDATE_CHECK` | `true` | `false` stops PinballY from asking GitHub for a newer version of the pack at each start, and from offering to update it (see [Updates](updates.md)). |
| `OFFER_VPXTOOL` | `true` | `false` stops the pack from ever offering to install or update vpxtool; you can still install it yourself. |
| `SKIP_RANDOM_GAME_ANIMATION` | `false` | `true` skips the wheel of fortune and launches the Random Game at once. |
| `ASK_TO_RATE_AFTER_MINUTES_PLAYED` | `60` | Minutes played on a table before you are asked to rate it. |
| `LOG_UNTRANSLATED_MENU_TITLES` | `false` | `true` writes each untranslated PinballY menu title to `PinballY.log`. |
| `LOG_LAUNCH_EVENTS` | `false` | `true` writes each launch event to `PinballY.log` with a millisecond timestamp, to check their order on the cabinet. Not in the eXpansion Pack Settings. |
| `WHEEL_RAIL` | `true` | `false` removes the Wheel Rail (`#` and A to Z along the right edge of the wheel screen, or decades with the Wheel Order by year, a gold pill on the selected table's; see [Interface](interface.md#on-the-wheel-screen)). |
| `WHEEL_RAIL_YEARS` | `false` | `true` shows, by year, each decade's years under it on the Wheel Rail, smaller, as two digits (`84`), the pill on the selected table's year (see [Choosing a table](choosing_a_table.md#wheel-order)). The Rail by year line of the Settings' "Wheel" page sets it too. |
| `WHEEL_RAIL_SECONDS` | `3` | Seconds the Wheel Rail stays without a move before sliding away; the next move brings it back. A whole number; `0` keeps it always shown. Needs `WHEEL_RAIL=true` (see [Interface](interface.md#on-the-wheel-screen)). |
| `WHEEL_POSITION` | `true` | `false` removes the Wheel Position (`17/100`, bottom right of the wheel screen) and gives "Table n/total" back to the lower status line (see [Interface](interface.md#on-the-wheel-screen)). |
| `FAVORITE_HEART` | `true` | `false` removes the Favorite Heart (bottom left of the wheel screen, red on a Favorite Table; see [Interface](interface.md#on-the-wheel-screen)). |

Every feature can also be turned off with its `ADD_ON_*` key, for example `ADD_ON_CLOCK=false` or `ADD_ON_CHALLENGES=false`. `ADD_ON_HOUSEHOLD_CHALLENGE=false` turns off the [Household Challenge](achievements_and_challenges.md#household-challenge) and its card on its own: it works whether the Challenges are on or off. Only Menu Cleanup, the Backglass Clock (`ADD_ON_BACKGLASS_CLOCK`, the time on the backglass screen during a game, see [Interface](interface.md#backglass-clock)) and Discord Rich Presence (`ADD_ON_DISCORD_RICH_PRESENCE`, see [above](#discord-rich-presence)) are off by default. Each key is described in [.env.example](../../../.env.example).

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

An Admin Profile also finds **Manage profiles** in two places: in the Exit menu (Escape), right after "Change Player", above "Operator Menu"; and in the Operator Menu, right after **eXpansion Pack Settings**, in their own group below "Batch Capture". Other Profiles never see it, even when the coin door service button opens the Operator Menu. It lists every Profile, Guest and yourself included, plus "Reset every profile", once there are two or more, to reset the whole household at once. Picking a Profile opens its own menu: its Admin and Child marks (see [Admin Profile](#admin-profile) and [Child Profile](#child-profile)), its **Initials** (see [Initials](#initials)), **Take over PinballY's history** (see [History Import](#history-import)), **Reset** and **Remove** (see [Profile Removal](#profile-removal)). With the [drawn menus](interface.md#drawn-menus) on, Exit or "Back" there brings you back to the list; with them off, both close the menu.

- After one confirmation (the cursor starts on "No"), "Reset" or "Reset every profile" starts the Profile over: its plays, Streaks, session records, Random Games, Challenge progress, announced Achievements, Table Mastery, Collection Tier and Avatar Frames are erased, while its name, Avatar, marks and the High Scores it won stay. Only the scores won since the reset count for it, except the places its [Initials](#initials) took.
- A message then tells whether it worked.
- Its former files are kept next to them, as `profile.reset-<date>.json` and `play-log-<year>.reset-<date>.json`: to undo a reset, close PinballY and rename each copy back, without its `.reset-<date>` part.
- If you disabled PinballY's Exit menu in its options, the coin door service button still opens the Operator Menu, and Manage profiles with it.
- A Profile Reset also erases what the Profile took over from PinballY's history, and the History Import is not offered again.

### Profile Removal

**Remove**, under "Reset" in a Profile's own menu, takes a Profile off the cabinet: a test Profile, a mistyped name, someone who moved out. After one confirmation (the cursor starts on "No"), the cabinet forgets it at once, without restarting PinballY: it leaves the list, Change Player, the Household Stats, the Household Boards, the Rocket Board and the helpers line of the Welcome Screen. Its places on a table's own high score board stay, shown as Default Scores; a Profile created later under the same name gets its High Scores back. Its Initials are free for another Profile, and its games of the week still count for the Household Challenge.

- Its files are not erased: its folder in `Scripts\ExpansionPack\profiles` is renamed `_<name> removed <date>`, which the pack ignores (see [Troubleshooting](troubleshooting.md) to bring it back).
- Guest and the Profile in use are never removed: their "Remove" line is greyed, with its reason. There is no "remove every profile".
- If the folder cannot be renamed (a file open in another program), a message says so, the cause goes to the log, and nothing changes.

### Initials

A Profile's **Initials** are the three letters that stand for it on tables' high score boards, such as "FEL": the high scores bearing them that belong to no Profile, made before the pack for instance, become this Profile's. The line, in a Profile's own menu right after its marks, shows them ("Initials: FEL"), or "Initials: none".

- Choosing it opens Name Entry with the current Initials already entered: capital letters A to Z only, erase and OK, three letters at most. On the third letter, the cursor goes to OK and the letters are greyed: only erase and OK can be chosen.
- OK asks to confirm, saying how many high score places, on how many tables, the Initials will take, with those tables' names one under the other ("..." past ten); "No" changes nothing. "Yes" saves them and gives the Profile those places, then says how many it took, or that none bears them yet. The Achievements those places reach are unlocked without a toast, even when the Profile is picked later.
- Changing them gives back, as default scores, the places the former Initials took, before the new ones take theirs; the confirmation says how many. A score the Profile won in a game stays its own, and a lost Table Record on a place given back is no longer shown on the Welcome Screen.
- OK with every letter erased clears them, after a confirmation saying how many places they give back; Exit changes nothing. The Profile's menu then comes back, on its Initials.
- Removing a Profile frees its Initials for another Profile.
- Initials another Profile already has are refused, naming it, and OK stays greyed until three letters are entered (unless you are clearing them).
- Guest never has Initials: its line is greyed. The line is missing while the High Scores Add-on is off.
- A Profile Reset keeps the Initials, like the name, Avatar and marks, and the places they took keep counting on Household scores, Your 5 best scores and My High Scores. The High Score Achievements those places reach are unlocked again without a toast.
- Set by hand, `"initials": "FEL"` in the Profile's `profile.json` must be three capital letters; anything else is ignored and written to the log.

### History Import

PinballY counts, for each table, the games played, the time played and the last game's date, since long before the pack, in `GameStats.csv` in its install folder. **Take over PinballY's history**, in a Profile's own menu just before "Reset", hands that history to this Profile: pick the Profile that actually played. The pack only reads PinballY's stats, never changes them.

**Warning: once per cabinet.** Once done, the History Import is no longer offered, on any Profile, even after a Profile Reset of the one that received it. Only removing that Profile (**Remove**) offers it again to the others, with what is left over: a History Import made on the wrong Profile is made again by removing it, then taking the history over on the right one.

- A confirmation (the cursor starts on "No") tells how many games, hours and tables would be added; a message then tells what was taken over, or that it failed (the cause in the log), in which case nothing changed.
- What every Profile, Guest included, already played with the pack is taken off PinballY's counts, so no game counts twice. Untracked Tables are left out.
- PinballY's last-played date is taken only for a table the Profile never played with the pack.
- The games go into the Profile's per-table totals (Table Mastery, play time, favourite and dusty tables), never into its Play Log: Daily Streaks and Profile Rewards are untouched.
- The Achievements, Mastery Levels and Collection Tiers the history reaches are unlocked without a toast, even when the Profile is picked later: no flood of toasts, and the next game announces only what it reaches itself.
- The count may be slightly high: PinballY also counts launches shorter than a minute.
- The line is greyed with its reason for Guest, once the cabinet's history was taken over (naming the Profile that received it), and when nothing is left to take over.

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
