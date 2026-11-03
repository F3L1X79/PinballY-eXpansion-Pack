# PinballY eXpansion Pack

Unofficial add-ons for the PinballY virtual pinball front end, built on its JavaScript scripting API: they help the player choose what to play, reward play with achievements, and polish the interface.

## Language

### Add-ons

**Add-on**:
A self-contained feature that `main.js` starts at launch and that the player can turn off in the configuration.
_Avoid_: plugin, script (a script is just a `.js` file)

**Discord Rich Presence**:
What the Discord account signed in on the cabinet's PC shows publicly while PinballY runs: the table being played and for how long, with "Table of the Day" or "Table of the Week" when it is one, or that a table is being chosen on the wheel; nothing during attract mode, and never a Profile's name. Off until the owner turns it on and accepts, each time, a Dialog saying what becomes public. The pack never starts Discord itself. Discord's own name for it, kept in every language.
_Avoid_: Discord status, Discord activity, presence

### Distribution

**Pack Version**:
The version number of the eXpansion Pack as a whole, raised with each release the owner publishes, and compared with the latest published release to know whether an update exists. Add-ons have no version of their own.
_Avoid_: PinballY version (PinballY's own number), build, release (a release is the published package of one Pack Version)

**Pack Update**:
Replacing the installed eXpansion Pack with a newer Pack Version while PinballY is closed, keeping the Household's Profiles and the owner's settings and files; if it fails, the previous Pack Version stays in place. It belongs to the pack itself, not to an Add-on. Only whoever sees the setup entries is offered one.
_Avoid_: upgrade, patch, install (installing is the first, manual copy)

**Update Check**:
The question the pack asks GitHub in the background at each start: is there a newer Pack Version? A newer one is remembered for the next start, where the Update Prompt offers it; at the start that found it, only a Status Icon shows it. It can be turned off in the Offline Mode, and a pack installed with git is never checked.
_Avoid_: update notification, version check

**Offline Mode**:
The group of the eXpansion Pack Settings where the owner turns off, one by one, what the pack would fetch from the internet or offer to fetch, or would send there: the Update Check, the Script Reader Prompt, and Discord Rich Presence (the same switch as its Add-on's). Turning one off never removes the matching install or update line from the eXpansion Pack Settings. Shown as "Mode hors ligne" in French.
_Avoid_: network settings, airplane mode

**Update Prompt**:
The question shown at startup, before anything else, when a newer Pack Version was found at an earlier start: update now, or later. Asked once per Pack Version; afterwards the update stays available from the eXpansion Pack Settings.
_Avoid_: update notification, update toast

**Release Highlights**:
One to three sentences per Pack Version, written for the Household rather than for developers and translated into every language of the pack, that say what the new version brings. They are shown once, at the start after a successful Pack Update, together with those of every Pack Version skipped on the way (five at most, the newest first). A Pack Version may have none, often a fix-only one. Shown as "Nouveautés" in French.
_Avoid_: changelog (the developers' full, English-only list of changes), release notes, what's new

**Script Reader**:
The outside program, vpxtool, that reads a table's script to find its ROM. It is never shipped in the pack: the cabinet downloads it from its author's own releases, and only once the owner has agreed. Shown as "vpxtool" everywhere.
_Avoid_: ROM reader, table script tool

**Script Reader Version**:
The version of the Script Reader that each Pack Version names as the one to install, tried on the maintainer's cabinet before it is named. A Script Reader older than it is offered an update; an equal or newer one, the owner's own included, is left alone.
_Avoid_: latest vpxtool (the pack never follows its author's latest release by itself)

**Script Reader Prompt**:
The Dialog, shown at startup to whoever sees the setup entries, that offers to install the Script Reader when it is missing, or to update it when it is older than the Script Reader Version, saying what it is for, who wrote it, under which licence and where it comes from. The owner may say no; it is then never asked again, and the install stays available from the eXpansion Pack Settings or by hand. The eXpansion Pack Settings' install line opens the same Dialog, whose "No thanks" there changes nothing.
_Avoid_: vpxtool toast, install popup

### Errors

**Error Toast**:
A toast like the Achievement Toast, but with its own colour and a warning sign instead of a trophy, that says in one sentence what a failure has cost and, for an Admin Profile, what to do about it; it stays longer than the other toasts. It is shown only for a failure the player would not see otherwise and that does not mend itself at the next start: a Play that could not be saved, or not kept in the Play Log, shown to the Profile that played it after that Play's other toasts; a Pack Update that failed, shown once to an Admin Profile, waiting for one to be active. A failure that answers a choice the player has just made keeps its own message on that screen. Shown as "Problème" in French.
_Avoid_: error popup, error dialog (a toast never waits for the player), alert

**Warning Toast**:
A toast like the Error Toast, but amber, that says in one sentence that something the owner turned on will not work for the rest of the session, and what to do about it: Discord Rich Presence when Discord cannot be reached. Shown once per session to the active Profile, whoever it is, once the wheel is reached like the other toasts. Not an error of the pack, so it is never written to the Error Log as one. Shown as "Avertissement" in French.
_Avoid_: Error Toast (for a failure of the pack), alert

**Error Log**:
The file, kept in the pack's folder and through every Pack Update, where every error the pack meets is written down with its date and Pack Version, so that it can still be read after PinballY has restarted; PinballY's own log starts afresh at each launch. It belongs to the pack itself and can never be turned off. The Error Toast never refers the player to it. Shown as "journal des erreurs" in French.
_Avoid_: logfile, PinballY.log (PinballY's own log, which keeps only the current session)

### Menus

**Drawn Menu**:
A menu the player sees drawn in the pack's own style instead of PinballY's native one, with the same entries and the same effect when one is chosen: the menus a player meets (main, Exit, filter choices, power off), the table's setup and categories, the Operator Menu, the pause menu of a running game (drawn over the native one, kept open underneath; native during a media capture), the menus that look after the cabinet (media capture, deleting a table's details, system choice, elevation), and those the Add-ons open: every menu, in short. Only the media drop menus, met when dropping files with the mouse on a PC, and the confirmation of a media file's deletion, part of the table's media list, stay native, and so does every menu when the Add-on is turned off or a menu cannot be drawn. PinballY's popups are not menus and stay native. Shown simply as "menu".
_Avoid_: Steamball menu (Steamball is the palette), custom menu, popup (a popup shows information, a menu offers choices)

**Dialog**:
A Drawn Menu that waits for the player's answer about one thing: a gold title, a message, then its answers (the Update Prompt, the Rating Prompt, the first Avatar Frame's prompt, the update and restart results). The pack shows one at a time, only when the wheel is free, the most urgent first.
_Avoid_: popup (a popup shows information without waiting), alert, message box

**eXpansion Pack Settings**:
The screens, reached from the Operator Menu by whoever sees its setup entries, where the cabinet's owner turns each Add-on on or off and picks the interface language without editing the configuration by hand. Each Add-on has a page saying what it does and what is lost, there and elsewhere, without it. A choice is kept at once but takes effect only when PinballY restarts, which the screens offer on leaving. They belong to the pack itself, not to an Add-on, so they can never be turned off. Shown as "Réglages du pack" in French.
_Avoid_: Theme Settings (a theme is a palette), options menu, Pack Settings

**Filter Picker**:
The submenu, opened by the player from the main menu's "Change Filter" entry, that lists the wheel selections (All Tables and the pack's own, each only while it has tables), then PinballY's filter groups (by era, manufacturer, category, rating, and the others the player kept), each opening PinballY's own list of filters for that group. Choosing a selection or a filter closes the menus on the filtered wheel. Back or Exit goes up one level at a time: from a group to the Filter Picker on that group, from the Filter Picker to the main menu on its entry. The current selection, and the group the Active Filter belongs to, are marked. Shown as "Changer de filtre" in French.
_Avoid_: Filter Tables, filter menu (each group's own list is a filter menu too), filter groups (the groups are what it lists)

**Active Filter**:
The filter the wheel applies right now, a wheel selection or a filter from one of PinballY's groups, named in the main menu: under its entries in a Drawn Menu ("Active filter: <name>"), on the entry itself in PinballY's native menu. Shown as "Filtre actif" in French.
_Avoid_: current filter, current selection

**Selection Marker**:
The soft gold glow around the current choice of a drawn screen (Welcome Screen, Profile Stats, Household Stats, the Avatar Frame list, the current character of Name Entry, and the Exit Button of the Achievement List and High Score Board), whose golds, from bronze to a white gleam, flow round it without end, always the same way, so the player sees at once where they are; it jumps straight to a new choice. Drawn Menus mark their selected entry their own way.
The choice it surrounds is the current (or highlighted) choice; only the glow itself is never called a highlight.
_Avoid_: halo (for the selection; a Rank emblem's or a Mastery square's halo stays a halo), cursor, highlight

**Exit Button**:
The button at the top right of the drawn screens (Welcome Screen, Profile Stats, Household Stats, Achievement List, Avatar Frame list, High Score Board; Name Entry alone has none) that does just what Exit does there, chosen like the screen's other choices. It shows a back arrow, its tooltip saying "Back", whenever Exit brings something back, a parent screen or a menu; and a cross, its tooltip saying "Close", only when Exit leaves the bare wheel. On a screen with no other choice it is always the current one. The screen's footer names the same word after the Exit key. Shown as "Retour" or "Fermer" in French.
_Avoid_: close cross, back button (it is one button whose look follows where Exit goes)

**Button Hints**:
The footer of a drawn screen that shows, as key caps followed by what they do, the player's buttons that act there: the flippers (browse, or scroll on a High Score Board longer than the window), Select (choose), and Exit, named with the Exit Button's word. A button that does nothing on that screen is left out. Shown under no title.
_Avoid_: help bar, legend

**Loader**:
A small gold comet that circles without end in the middle of the playfield screen, always in the same place (on the top third only over the High Score Board already shown), with no backdrop, over whatever is already there, while something the player waits for gets ready: PinballY starting up until the Startup Screen shows, the Welcome Screen or the Profile picker (over the wheel already dimmed for it), a table launching, or closing to go back to the wheel (never while it is played), the High Score Board while it reads a table's board afresh, and the Profile Stats, the Household Stats, the Achievement List and Name Entry (the Avatar Frame list too if it proves slow) while they get ready, over the wheel or the Profile picker already dimmed for them, and only if they are not ready within a moment; the screen then fades in whole, and Exit meanwhile gives up opening it. It only shows where it can keep turning, never on a screen drawn all at once, nor when the Welcome Screen comes back after Change Player, nor when Exit goes back to the screen the player came from (the Profile Stats or the Household Stats), which comes back at once as it was left, unless an Avatar Frame equipped meanwhile changed it. It also turns over the dimmed wheel while a Pack Update gets ready or the Script Reader is installed. Where the wait cannot explain itself, it carries a caption, one line written in gold just beneath it: the step under way while a table launches or closes ("Chargement en cours…", "Retour aux tables…"), "Téléchargement de la mise à jour…" during a Pack Update, or "Téléchargement en cours…" while the Script Reader is installed; elsewhere it shows alone. It never takes the player's buttons. Shown as "Indicateur de chargement" in French.
_Avoid_: spinner, loading screen, splash screen (it is not a screen, only a ring over the current one)

### Wheel

**Wheel Arc**:
The gold arc drawn under the wheel's icons and following its curve, shown by default unless the player has their own decoration there. Shown as "arc de la roue" in French.
_Avoid_: underlay (PinballY's name for the image layer that carries it), wheel colour

### Time

**Backglass Clock**:
The time shown on a small plaque with the Steamball panel gradient and a gold frame, in the wheel's clock look (soft white, a drop shadow, a gold underline), on the backglass screen, at its top left until the owner places it, from a table's launch until its game ends, in front of the table's own backglass, where neither Windows nor the wheel's clock can be seen. Off unless the owner turns it on. Shown as "horloge du backglass" in French.
_Avoid_: game clock, overlay clock, the clock (that is the wheel's)

**Backglass Clock Placement**:
The screen opened from the Expansion Pack Settings, outside a game, that shows the Backglass Clock alone on the backglass screen with its Windows borders so the owner moves and resizes it with the mouse, then confirms in a Dialog on the wheel screen. Shown as "placement de l'horloge du backglass" in French.
_Avoid_: clock editor, clock setup

**Status Icon**:
A small icon beside the wheel's clock, shown only while the state it stands for lasts, and never over a game: Discord Rich Presence actually showing the cabinet publicly, to everyone; and, only to whoever sees the setup entries, the Update Check turned off, or a newer Pack Version waiting to be installed. Absent means the state is off; there is no crossed-out icon. Shown as "icône d'état" in French.
_Avoid_: indicator, badge (that is the Profile's), notification

### Profiles

**Profile**:
The identity a player picks so that their plays and Achievements count for them; no password, anyone can pick any Profile from the main menu. The active Profile stays active across restarts until another one is picked, unless the Profile picker is turned off: Guest is then active at startup. Plays count only for the active Profile, even when several people share one game. It is created from the Profile picker's last slot by whoever sees the setup entries, or by hand in Windows.
_Avoid_: account, user, login

**Name Entry**:
The screen, opened from the Profile picker's last slot, where a new Profile's name is put together with the flippers, one character at a time, under a few lines explaining how the name can be changed afterwards; while the Household is empty, one more line says that this Profile will become an Admin Profile and must then be picked. The only drawn screen with no Exit Button, its choices being the characters: Exit alone goes back to the Profile picker. Never a toast, since it waits for the player. Shown as "Saisie du nom" in French.
_Avoid_: virtual keyboard, onscreen keyboard (it has no keys), high score entry

**Guest**:
The Profile that always exists and cannot be removed; it is the active Profile until another one is picked, and whenever the Profile picker is turned off. Its plays, Achievements and Challenge progress stay its own when a player who played as Guest creates a Profile: nothing moves over.
_Avoid_: default user, anonymous

**Household**:
Every Profile of the cabinet except Guest, Child Profiles included, whether or not it has played. Shown as "la maison" in French.
_Avoid_: family, all players, users

**Admin Profile**:
A Profile marked as one of those who look after the cabinet: only Admin Profiles see the setup entries of the menus, and only they mark Profiles as Admin or Child Profiles and reset them, from the Exit menu. While no Profile is marked, every Profile sees everything, and the active Profile can make itself the first Admin Profile; the first Profile created with Name Entry in an empty Household becomes one by itself. The last Admin Profile cannot lose its mark from the cabinet. Guest is never one, nor is a Child Profile.
_Avoid_: administrator, operator (the operator is whoever holds the coin door key)

**Child Profile**:
A Profile marked as a child's: Adult Tables are left out of everything it can pick a table from, Period Tables included: while a Period Table is an Adult Table, it is not offered to a Child Profile at all. Not parental control: nothing asks for a password. Guest is never one.
_Avoid_: kid mode, parental control, family filter

**Profile Reset**:
Starting a Profile over as if it had never played: its plays, Play Log (and so its Daily Streak), Period Table Streaks, session stats, Random Games, Challenge progress and Notified Achievements are erased, after a dated copy of its former data is kept, while its name, Avatar and marks stay. Only an Admin Profile can reset one, or every Profile at once (Guest and itself included), and never while no Profile is an Admin Profile.
_Avoid_: fresh start, wipe, achievement reset (the Achievements come from the plays, so the plays go too)

**Avatar**:
The picture that stands for a Profile.
_Avoid_: profile picture, photo

**Profile Greeting**:
The short greeting, with the Avatar and the Profile's name, shown when a Profile is picked and when PinballY starts, so the player knows whose plays will count. It gives way to the Welcome Screen whenever that screen shows, since it greets the Profile itself, and the screen then plays its sound.
_Avoid_: welcome toast, login message

**Play**:
A game of at least one minute on a table, which counts for the Profile active when it started. A shorter game is a launch by mistake and counts for nothing, except for the Rage Quit Achievement, which notices a game given up early without making it a Play.
_Avoid_: session (the session stats count only Plays, except the Rage Quit flag), launch (a launch becomes a Play only after a minute)

**Play Log**:
The dated list of a Profile's Plays: when each started, which table, and how long it lasted, kept year by year. It starts empty on the day it is introduced: earlier games are known only by their totals. Shown to no one yet; it feeds later summaries such as a yearly one.
_Avoid_: Game Log, play history, journal

**Daily Streak**:
The number of consecutive calendar days, up to today, in which the active Profile started at least one Play, on any table, however it was launched; a day without one breaks it, with no day of grace, but it is still alive all day long as long as yesterday counted. Read from the Play Log, so the days before it was introduced do not count. Shown as "Jours d'affilée sur la borne" in French.
_Avoid_: Streak (alone: a Period Table Streak belongs to a Period Table), login streak, visit streak

**Profile Stats**:
The screen, opened by the player from the main menu, that sums up the active Profile's own plays (or, opened from the Household Stats, another Household Profile's, only to look at): games played, total time, its Player Level and Collection Mastery, average game length, favourite manufacturer (community tables aside), decade and table, its first table played, collection completion, Achievements Unlocked, Daily Streak, Period Table Streaks, completed Challenges, and the way to its Hall of Fame and Tables to Discover. Opened from "Mon profil" ("My Profile"); the screen itself has no title.
_Avoid_: Pinball Profile, player card, profile screen (a Profile is the identity, not the screen)

**Household Stats**:
The screen, opened from the Profile Stats, that sets the Household's Profiles side by side, one column each (the active Profile first, then in the Profile picker's order), on the stats where more is better: Player Level, Collection Mastery, Achievements Unlocked, games played, total time, Daily Streak, completed Challenges and Table Records held; the best of each line is in gold, every Profile tied for it too, and a line where nobody has anything has none. Each column shows the Profile's Avatar, in its Avatar Frame, and name. Picking a column opens that Profile's Profile Stats. Offered once the Household has two Profiles, to Guest too, which has no column of its own. Shown as "Statistiques de la maison" in French, opened from "La maison".
_Avoid_: leaderboard, ranking, comparison

**Profile Reward**:
Something a Profile unlocks through play and then chooses to wear; today only Avatar Frames, of which it wears at most one. Every Profile has them, Guest and Child Profiles included. Unlocked rewards follow what earned them and are never kept apart from it, so a Profile Reset takes them back and the Profile wears none again. Chosen from the Profile Stats, where the rewards still to unlock show with what unlocks them. Shown as "récompense" in French.
_Avoid_: cosmetic, unlockable, skin

**Avatar Frame**:
A frame drawn around the Avatar wherever it is shown: one for each Collection Tier from 1 to 10, unlocked by reaching that tier, plus the Holiday Frames; each has a theme of its own (an enchanted forest, steam and gears, a celestial legend…) rather than the colour of a Mastery Level, and reaching a quarter of the Avatar's size beyond it on every side; a new Avatar Frame of a Collection Tier is announced by a line in that tier's toast, and the first one a Profile unlocks is followed by a Reward Prompt; none is worn until the player equips it. A Profile that wears none keeps each place's usual look. It is not the gold ring that marks the selected Avatar in the Profile picker, which stays around it. The Player Level pip stays on top of it, in its corner. Shown as "cadre" in French.
_Avoid_: skin, border, badge (the Profile badge is the Avatar shown at the top right of the wheel screen), gold frame

**Holiday Frame**:
An Avatar Frame for one holiday (New Year's Day, Chinese New Year, Valentine's Day, Mardi Gras, St. Patrick's Day, Easter Sunday, Fête de la Musique, Halloween, Día de los Muertos on 1 or 2 November, Thanksgiving, Christmas on 24 or 25 December), unlocked once and for good by a Play that starts or ends on that day, and announced by a toast of its own on the way back to the wheel; there is one per holiday, never one per year. It does not depend on Collection Mastery, and a Profile Reset takes it back. Shown as "cadre de fête" in French.
_Avoid_: event frame, seasonal frame, Christmas 2026 frame

**Reward Prompt**:
The dialog that follows the toast of a Profile's first Avatar Frame, once: it names the frame and says where to equip it (My Profile, then Frame), with a "Go equip it" button that opens that list and a "Got it" button that closes it; it never comes back, equipped or not. Later frames get only their toast line. A Profile Reset brings it back with the next first reward. Waits its turn after the Welcome Screen and before the rating prompt.
_Avoid_: popup, notification, reward toast (a toast never waits for the player)

### Choosing what to play

**Period**:
A calendar span, either a day or a week (Monday to Sunday), during which a Period Table stays the same.
_Avoid_: timeframe, cycle

**Period Table**:
A table picked once per Period and kept for the whole Period, offered to the player as a suggestion. The same for every Profile. Never the previous Period's table, unless it is the only one.
_Avoid_: daily pick, featured table, table of period

**Adult Table**:
A table in the PinballY category set aside for adults ("NSFW" unless configured otherwise). A Child Profile never sees one, and it counts in none of its groups for completion Achievements.
_Avoid_: NSFW table, hidden table (one of the Hidden Tables, PinballY's own flag for the whole cabinet; only the Adult Table category keeps a table from a Child Profile)

**Table of the Day**:
The Period Table whose Period is a day; prefers tables never played, otherwise the one played longest ago.

**Table of the Week**:
The Period Table whose Period is a week; picked purely at random.

**Welcome Screen**:
The screen shown over the dimmed wheel when PinballY starts (as the Startup Screen, or once a Profile is picked or kept in the Profile picker that opened as the Startup Screen), again after Change Player picked another Profile, and whenever the player opens it from the main menu, that greets the active Profile by its Avatar and name, tells it its Lost Records, shows the Table of the Day and the Table of the Week with what they mean for that Profile, and, when its Challenge has Challenge Tables, one of them drawn at random each time the screen opens (not a Period Table it already shows, unless one more Play would complete the Challenge), and offers to stay on the table selected on the wheel, to change player or to launch a Period Table, that Challenge Table or a Random Game. While it is open, toasts and Confetti Showers wait for it to close, and the selected table's own sound (its videos and audio track, never the pack's sounds) drops at once to half the recorded level (a table already set at or below it is left alone), as it does while the Profile picker is open, and comes back at once when the last of them closes, without rising in between when one follows the other. Shown as "Écran d'accueil" in French.
_Avoid_: startup prompt, splash screen, dialog (it does more than ask a question)

**Startup Screen**:
The first screen PinballY shows when it starts, chosen by the cabinet's owner: the Profile picker (the usual one, skipped while the Household has fewer than two Profiles), which the Welcome Screen then follows whether a Profile is picked or the last active one kept with Exit, the Welcome Screen alone, or the bare wheel, where the Profile Greeting greets the last active Profile. While the Welcome Screen or the Profile picker is open as the Startup Screen, toasts and prompts wait for it to close. A Startup Screen that is turned off gives way to the next one, from the Profile picker to the Welcome Screen to the wheel. Shown as "Écran de démarrage" in French.
_Avoid_: splash screen, first screen

**Last Played Table**:
The table of the active Profile's most recent Play, across the whole collection, however it was launched.

**Random Game**:
A table drawn at random from the current wheel selection and launched right away; never the Last Played Table, unless it is the only one in the selection.
_Avoid_: random table, lucky pick

**Tables to Discover**:
The tables the active Profile can see that it has never played, offered as a wheel selection from the Filter Picker and from the Profile Stats. Shown as "Tables à découvrir" in French.
_Avoid_: never played tables, unplayed tables, new tables

**Hall of Fame**:
The ten tables the active Profile can see that it has spent the most time on, ranked from the most played, offered as a wheel selection from the Filter Picker. Shown as "Most Played Tables" ("Tables les plus jouées" in French), like the same tables in the Profile Stats.
_Avoid_: top played, most played, leaderboard

**My High Scores**:
The tables the active Profile can see on whose high score board it still holds a High Score, ranked by the best place it holds there, then by title, offered as a wheel selection from the Filter Picker, right under the Hall of Fame; the entry is in the Filter Picker only while there is at least one. Shown as "Mes meilleurs scores" in French.
_Avoid_: my records, Mes records (a record is only the Table Record)

**Favorite Tables**:
The tables the household has added to PinballY's favourites, offered as a wheel selection from the Filter Picker, right under My High Scores. Shown as "Tables favorites" in French.
_Avoid_: Favorites, favourites filter

**Hidden Tables**:
The tables carrying PinballY's Hidden flag, for the whole cabinet, offered to every Profile as a wheel selection from the Filter Picker, right under the Favorite Tables, Adult Tables left out for a Child Profile; the entry is in the Filter Picker only while at least one table is hidden. A Hidden Table is not one a Profile can see: it is left out of every other selection and list. Shown as "Tables masquées" in French.
_Avoid_: masked tables, operator tables

**Period Table Streak**:
The number of consecutive Periods in which the active Profile made a Play on the Period Table that started during its Period, however it was launched. A Period whose Period Table is an Adult Table neither extends nor breaks a Child Profile's Period Table Streak.
_Avoid_: Streak (alone: the Daily Streak is another one), combo, chain

**Periods Played**:
The total number of Periods, consecutive or not, in which the active Profile made a Play on the Period Table that started during its Period, however it was launched. Never lower than the longest Period Table Streak.
_Avoid_: exploration count, total streak

**Day's Manufacturers**:
The distinct non-empty manufacturers of the tables of the Plays started during one calendar day, however they were launched, hidden tables included.

### Challenges

**Challenge**:
A casual play goal set for one week, the same for every Profile, Guest included, such as playing five different Stern tables; each Profile's own progress counts only Plays on tables it can see, started during the week, and the Challenge is completed or missed when the week ends. Shown as "Défi" in French.
_Avoid_: quest, goal, mission, Achievement (an Achievement is a permanent milestone)

**Challenge Card**:
The small card at the top right of the wheel screen, under the Profile badge when there is one, that keeps the week's Challenge and the active Profile's progress always in view; when there is something new, such as progress or the previous week's verdict, its content changes in place.
_Avoid_: challenge widget, challenge popup, status line

**Challenge Tables**:
The tables the active Profile can see that would move its Challenge forward if played now, offered as a wheel selection from the Filter Picker, right under "All Tables"; only some Challenges have them, for example not one about total play time. The entry is in the Filter Picker only while the active Profile's Challenge has Challenge Tables, so neither once the Challenge is completed nor for a Challenge without any; when none is left while they are on the wheel, every table comes back.
_Avoid_: challenge filter, eligible tables

**Challenge Toast**:
A toast like the Achievement Toast, but with its own colour and no trophy, that announces that the active Profile completed the week's Challenge.
_Avoid_: challenge popup, challenge achievement

### Table Mastery

**Table Mastery**:
How well a Profile knows one table, measured only by the time its Plays on that table have lasted (a game shorter than a minute adds nothing). A progression of its own, with no Achievement, started over by a Profile Reset. Shown as "Maîtrise" in French.
_Avoid_: XP, table level, experience

**Mastery Level**:
The step of Table Mastery a Profile has reached on a table, from 1 at its first Play up to 10, each step taking longer to reach than the one before. Shown as a number with a name that suits any player, from Novice (Rookie) at 1 to Mage du flipper (Pinball Wizard) at 10, both more and more brilliant from one level to the next.
_Avoid_: level (alone: the player's level is another thing), rank (an Achievement Rank is how hard an Achievement is), tier

**Collection Mastery**:
How far a Profile has taken its tables, tier by tier: its Collection Tier is the highest Mastery Level that ten of the tables it can see have reached, starting at 0, and its progress is how many tables, out of ten, have reached the next one. A Profile that can see fewer than ten tables needs all of them. Ten tables at Mastery Level 10 is the end. A tier reached is lost only by a Profile Reset. Shown as "Maîtrise de la collection" in French.
_Avoid_: global mastery, player level (the player's level comes from Achievement Ranks), completion (a completion Achievement covers a group of tables)

**Collection Tier**:
The step of Collection Mastery, from 0 to 10: tier N means ten tables at Mastery Level N or above. Shown as "palier" in French.
_Avoid_: level (a Mastery Level belongs to one table), stage, rank (an Achievement Rank is how hard an Achievement is)

**Mastery Bar**:
The small panel at the top right of the wheel screen, under the Challenge Card or in its place when there is none, that keeps in view the active Profile's Table Mastery of the selected table: its bar fills toward the next Mastery Level in the colour of the level reached, whose name heads the panel and whose number sits in a square at the bar's end. For a table never played it stays empty, with no number, under "À découvrir" ("To discover"). It lights up once when a Play has moved it forward, and is hidden while a game runs.
_Avoid_: level bar, progress bar (alone), mastery widget, Mastery Card

**Mastery Toast**:
A toast like the Achievement Toast, but with its own colour and no trophy, that announces the Mastery Level, by its name and number, that the active Profile has just reached on a table; one only per Play, for the highest level reached.
_Avoid_: level-up popup, mastery achievement (Table Mastery has no Achievement)

### High Scores

**High Score**:
A place on a table's own high score board that a Profile won with a Play: a score that was not on the board before the Play goes to the Profile active when the Play started, Guest and Child Profiles included, whatever initials were typed and even when several players shared the game. Only a score counts, not a feat such as a number of combos or castles. The scores already on the board when the pack first reads it are Default Scores, for good. A High Score once won stays won even when better scores push it off the board, and a Profile Reset does not take it away; only removing the Profile does, and the score then becomes a Default Score. Shown as "meilleur score" in French.
_Avoid_: record (the Table Record is only the best one), hi-score, score (the score of a game that did not reach the board is never known)

**Default Score**:
A score that was already on a table's high score board when the pack first read it, whoever really set it, or a High Score whose Profile was removed since: it belongs to no Profile, for good (a Profile later created under the removed one's name gets its High Scores back, accepted), and only its initials are shown, with the placeholder image they pick on the High Score Board (the same for the same initials on every table). Shown as "score par défaut" in French.
_Avoid_: original score (confused with original tables), anonymous score, factory score (not all of them come from the factory)

**Table Record**:
The best score on a table's high score board, whoever holds it, an anonymous one included. Shown as "record" in French.
_Avoid_: Grand Champion (the name only some tables give it), world record

**Lost Record**:
A Table Record a Profile held that another Profile, Guest included, beat with a Play since the Welcome Screen last showed it that Profile's Lost Records; Child Profiles lose and take them like any other, Guest never has any. The Welcome Screen tells the Profile once, in a single line naming who took each one (the three most recent, then how many more), and then never again; it is dropped as soon as the Profile holds that Table Record again, when the Profile that took it is removed, and while the table is not one the Profile can see. Shown as "record perdu" in French.
_Avoid_: rivalry (the feature, not the record), stolen record, notification

**High Score Toast**:
A toast like the Mastery Toast, with its own colour and no trophy, the place won in its tile, that announces the best place a Play won on a table's high score board, or the Table Record when that place is the first, naming the Profile it was taken from, Guest included, when another one held it; one only per Play, after the other toasts of that Play. No board opens by itself. Shown as "Meilleur score" in French.
_Avoid_: high score popup, record toast

**High Score Board**:
The drawn screen, opened by the player from the main menu, that shows the selected table's high score board with each place's owner: the three first places on a podium (the Table Record in the middle and highest), the others in rows below, each with its rank, score, initials, and the Profile that won it (name and Avatar) or "Default score". Not a table's own board, which it shows. Shown as "Meilleurs scores" in French.
_Avoid_: high scores popup, leaderboard

### Achievements

**Achievement**:
A milestone the player reaches through play, announced once with an Achievement Toast.
_Avoid_: trophy, badge, success

**Achievement Toast**:
A small card in the bottom-right corner of the playfield screen that announces one Achievement, shown in the colour of its Achievement Rank with that Rank's emblem: it rises from the bottom edge, stays a few seconds, then fades away on its own. It never waits for the player nor takes their input, and shows over everything, menus included, except the Welcome Screen, which it waits for. Several toasts stack, the newest at the bottom pushing the older ones up.
_Avoid_: popup, notification, dialog (a dialog waits for the player)

**Unlocked**:
An Achievement whose condition holds right now. It can be lost again, for example when a table joins a completed group; losing it does not announce it a second time when it comes back. An Achievement on a Period Table Streak or on the Daily Streak is the exception: the longest one unlocks it, so a broken streak never takes it back.
_Avoid_: earned, obtained

**Achievement List**:
The screen, opened by the player, that shows every Achievement in one scrolling list of two sections: the Unlocked ones, the most recently Notified at the top, then the missing ones, the highest Unlock Rate first. Each Achievement shows its Achievement Rank. Shown as "Succès personnels" in French, opened from "Mes succès" ("My Achievements").
_Avoid_: My Achievements, trophy room

**Achievement Family**:
A kind of Achievement, absent as a whole when the Add-on it depends on is turned off: Collection, Play Time, Period Tables, Sessions, Random Game, Manufacturers, Decades, Categories, Challenges, High Scores, Surprises, Young Players. Young Players exists only for Child Profiles, in place of the Achievements a child never gets: a Play started at snack time, a Play started on a Wednesday afternoon (both Secret Achievements), and a Table Record taken from a Household Profile that is not a child (absent when High Scores are turned off); a Profile no longer marked as a child loses them like a family turned off. Surprises gathers Secret Achievements that hang on no Add-on but the Achievements themselves, such as a Play started at an unusual hour. Period Tables gathers every Achievement about playing the Table of the Day or the Table of the Week (first play, total Periods played, Period Table Streaks).
_Avoid_: group (a group is the set of tables a completion Achievement covers, such as one manufacturer's tables), category (a PinballY table category)

**Notified**:
An Achievement whose Achievement Toast has started showing. Toasts still waiting while a game runs are not Notified yet.
_Avoid_: acknowledged, seen, unlocked (an Achievement can be unlocked but not yet Notified)

**Achievement Rank**:
How hard an Achievement is: Bronze, Silver, Gold or Platinum. Every Achievement has one, whether Unlocked or missing.
_Avoid_: tier, level, difficulty, grade

**Player Level**:
How far a Profile has come as a player, earned through the Achievement Ranks of its Notified Achievements, each Rank worth more than the one below; each level takes more to reach than the one before, with no last level, so a bigger collection, which has more Achievements, lets a Profile climb higher. A Child Profile's points are scaled up by as much as the Achievements it is kept from (Adult Tables, Achievements a child never gets) would have given a Profile that is not a child, so that it climbs as fast as an adult. Levels have no names, only a number. It is worked out afresh from the Notified Achievements each time: an Achievement no longer Unlocked keeps its points, but a level can drop when a Notified Achievement is worth less (a smaller group lowers a group completion's Rank) or is gone (its Add-on turned off), and a Profile Reset starts it over. Besides the Profile Stats, it shows as a small round pip at the corner of the Avatar (on the Profile badge, the Welcome Screen and each Avatar of the Profile picker, in the same proportions), in a metal that climbs with the level (Bronze from 1, Silver from 5, Gold from 10, Platinum from 20, a little lighter at each level in between; the Level Toast and the Profile Stats card take the same metal), the Welcome Screen's with the level shown when the screen is drawn; the badge's pip takes a new level when its Level Toast starts, and shows a drop only at the next Profile switch or startup. Shown as "Niveau" in French.
_Avoid_: XP, player rank (an Achievement Rank is how hard an Achievement is), level (alone: a Mastery Level belongs to one table), Collection Tier

**Level Toast**:
A toast like the Achievement Toast, but with its own colour and no trophy, that announces the Player Level the active Profile has just reached, after the Achievement Toasts that brought it; one only per return to the wheel, for the highest level reached. It comes with the Fireworks, and when the same return brings a Confetti Shower, both start a second before the shower ends. Any rise after a Play is announced, even back to a level reached before and lost; a level a Profile already had when PinballY started, or when the Player Level first appeared, is not.
_Avoid_: level-up popup, rank-up

**Confetti Shower**:
A shower of coloured confetti released all at once from above the wheel screen, falling down across all of it, in front of everything, toasts and menus included (it waits for the Welcome Screen to close), to celebrate along with the toast of a completed Challenge, of a Platinum Achievement, of Mastery Level 10 or of a Collection Tier completed; one shower only when the same return to the wheel brings several. It never waits for the player nor takes their input, and vanishes at once when a table launches or attract mode starts. Shown as "Pluie de confettis" in French.
_Avoid_: celebration, party, fireworks (Fireworks celebrate a Player Level)

**Fireworks**:
Rockets shot up from the bottom of the wheel screen that burst into rings of glowing streaks, in colours that change from one burst to the next, in front of everything like the Confetti Shower, to celebrate along with the Level Toast; the same show whatever the level reached. It never waits for the player nor takes their input, and vanishes at once when a table launches or attract mode starts. Shown as "Feu d'artifice" in French.
_Avoid_: confetti, celebration, level-up effect

**Unlock Rate**:
How many of the Household's Profiles have been Notified of an Achievement, shown on the Achievement List by the Avatars of the Profiles other than the active one. It is not shown while there is only one Profile besides Guest.
_Avoid_: rarity (a rare Achievement has a low Unlock Rate), household rate, global percentage

**Achievement Progress**:
How far the active Profile is from a missing Achievement: the very value its unlock condition tests, against the target that unlocks it (for a Period Table Streak or the Daily Streak, the current one: a missing Achievement on it starts over from 0 when it breaks). Only Achievements with a counted target of at least 2 have one, unless that value starts over at every game, like a tour of the wheel; an Unlocked Achievement shows none.
_Avoid_: progress (alone), completion (a completion Achievement covers a group of tables)

**Secret Achievement**:
An Achievement whose title and description stay out of sight while it is missing: the Achievement List shows "???" and a hint in their place, with its Achievement Rank, Unlock Rate and order as for any other. Once Unlocked, its Achievement Toast and row show it like any other. Only standalone Achievements can be secret, never one of a series of thresholds nor a group completion, which are goals to aim at. Shown as "Succès secret" in French.
_Avoid_: hidden achievement (Hidden is PinballY's own flag for tables), mystery achievement
