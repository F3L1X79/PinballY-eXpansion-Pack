# Changelog

What changed in each Pack Version of the Expansion Pack, newest first. It starts at 1.0.0, the first public release; the 0.x trial releases are not listed.

## v1.4.0 (2026-11-08)

- **Ratings and Favorite Tables per Profile**: each Profile has its own star Ratings and Favorite Tables, in the rating dialog, the filters and "Add to Favorites". The first time, every Profile, Guest included, is given those already on the cabinet, so nobody loses a favourite. **Ratings per Profile** in the eXpansion Pack Settings goes back to one set for everyone.
- **Ratings on the wheel screen**: the active Profile's Rating shows under the Mastery Bar, the lower status line gives the Household Rating of the selected table, and Rate Table in the main menu shows the Rating you already gave.
- **Ratings Achievements**: four steps for 1, 5, 10 and 25 tables rated, announced as soon as the rating dialog closes.
- **High Score Boards in three views**: buttons under the board turn from **ROM scores** to **Household scores** (each Profile once, with its best score and the date) and **Your 5 best scores**, scores since pushed off the table's board included.
- **Play Scores**: with vpxtool, Household scores and Your 5 best scores also count games too low for the table's board, on ROM tables whose memory keeps the last game's score. They count from this update on. A game that wins no place can now earn a **Personal Best** or **House Record** toast. What looks wrong is noted in `play_scores_anomalies.log`, to send with a report about a missing or wrong score.
- **Backglass Clock**: its place is now saved by the pack after each game, as PinballY could put it back where it was. It opens in the very top right corner, and a click sending it behind the backglass no longer stops you from dragging it.
- **Small touches**: a category needs at least two tables you can see to have its Achievement, and one that drops to a single table loses it, points included; Household Stats open faster, each Profile's stats being read ahead in the background; the menu entries are now High Score Boards and Back to the Welcome Screen; the Welcome Screen's table cards are more compact.

## v1.3.0 (2026-11-06)

- **Avatar Choice**: right after Name Entry, a new Profile picks its Avatar among 24 portraits with the flippers, on a wide or a tall screen. Exit asks before keeping the default Avatar, now a plain grey silhouette. A photo dropped as `avatar.jpg` in the Profile's folder wins over `avatar.png`, and `AVATAR_CHOICE_SOUND_FILE` can play a sound as the screen shows.
- **PinballY version notice**: when the PinballY on the cabinet is newer than the one the pack was tested on, has a version the pack cannot read, or is older than its minimum, an Admin Profile is told once per PinballY version, at startup or when it becomes active. It never turns anything off.
- **Backglass comet**: while a table loads and closes, the gold comet also turns in the middle of the backglass.
- **Menus**: Change Player and Manage profiles have their own group in the Exit menu, after Shut Down; in the Operator Menu, the eXpansion Pack Settings and Manage profiles have theirs, after Batch Capture.
- **Small touches**: unconfigured tables (found by PinballY but never set up) no longer count anywhere a Profile's tables do, the World Tour included; the sound set in `PROFILE_PICKER_SOUND_FILE` plays each time the Change Player carousel appears; a broken `profile.json` set aside at startup is kept in the Error Log, and the guide explains how to fix it by hand; screens follow a change of window size more smoothly.

## v1.2.0 (2026-11-04)

- **Create a Profile from the cabinet**: the "+" at the end of Change Player opens Name Entry, a ring of characters you move along with the flippers, no keyboard or Windows needed. The first Profile created on a cabinet that only has Guest becomes an Admin Profile.
- **Discord Rich Presence**: Discord can show the table being played on the account signed in on the cabinet's PC, and names the Table of the Day or of the Week. It is public, so it is off by default and asks for your consent each time it is turned on in the eXpansion Pack Settings, also from the Offline Mode group. Nothing shows during attract mode, and a Warning toast tells you when Discord cannot be reached.
- **Status Icons**: small icons beside the wheel's clock show that Discord is showing the cabinet, that a Pack Update is waiting, or that the Update Check is turned off.
- **Backglass Clock**: now a small plaque in the wheel clock's look, with its blue gradient, gold frame and drop shadow. It appears as soon as a table is launched, so games no longer start paused, opens at the top right of the backglass screen, and stays where you drag it.
- **Small touches**: the Bronze, Silver, Gold and Platinum emblems each have a gem of their own; the French texts now say "Réglages de l'eXpansion pack" everywhere.

## v1.1.0 (2026-11-01)

- **New name**: the Expansion Pack is now the PinballY eXpansion Pack, on screen and in the guide. Its folder, `ExpansionPack.zip` and the GitHub repository keep their names, so nothing changes for the install or the Pack Update.
- **Random table**: Launch a random table straight from the main menu, under Play.
- **Profiles**: an Admin Profile marks a Profile as Admin or Child from the cabinet, in Manage profiles; the first Admin Profile marks itself. A menu line that can't be used now shows why.
- **Backglass Clock**: the time in a small box on the backglass screen during a game, in front of VPX's backglass.
- **vpxtool**: installed and kept up to date from the Expansion Pack Settings, downloaded from its author; when it is missing or too old, a prompt at startup offers it instead of an error.
- **Offline Mode**: a new group in the Expansion Pack Settings turns off the Update Check and the vpxtool offer, for a cabinet without internet.
- **Small touches**: the Pack Update shows "Downloading the update" under the loader; the Daily Streak line on the Welcome Screen is larger and set apart from the greeting.

## v1.0.0 (2026-10-29)

First public release of the Expansion Pack, for PinballY 1.1.0 Beta 10 or later.

- **Profiles**: a Profile and an Avatar for everyone in the Household, picked with Change Player and greeted by the Welcome Screen; Guest for visitors; only games of a minute or more count. Profile Stats and Household Stats; an Admin Profile for the setup entries and a Child Profile that leaves the Adult Tables off the wheel.
- **Achievements and Challenges**: a weekly Challenge for the whole Household, with its card on the wheel screen; dozens of Achievements from Bronze to Platinum, a few of them secret, announced by toasts that never interrupt a game; a Player Level shown on the Avatar.
- **Choosing a table**: the Table of the Day and the Table of the Week, with their Period Table Streaks; a Mastery Level for each table, from Rookie to Pinball Wizard; High Scores credited to the Profile that played and shown on a podium; a Random Game on a wheel of fortune.
- **Interface**: PinballY's menus and messages in English, French, German, Spanish, Italian and Portuguese, drawn in the Steamball look, sorted into sections and fitting the screen from the first second; Dialogs with a gold title; a clock, launches without a black flash, replaceable sounds, and Expansion Pack Settings to turn each Add-on on or off.
- **Distribution and updates**: `ExpansionPack.zip` from the GitHub releases, installed with one line in `Scripts\main.js`; an Update Check at each start and a Pack Update in one press that keeps settings, Profiles and your own files, then shows the Release Highlights of each new version; an Error Log in `errors.log`; a player guide in English and French.
