# PinballY eXpansion Pack

Unofficial add-ons for the PinballY virtual pinball front end, built on its JavaScript scripting API: they help the player choose what to play, reward play with achievements, and polish the interface.

## Language

### Add-ons

**Add-on**:
A self-contained feature that `main.js` starts at launch and that the player can turn off in the configuration, except the Easter Eggs, which cannot be turned off.
_Avoid_: plugin, script (a script is just a `.js` file)

**Easter Egg**:
A rare, unannounced event of the cabinet, each tied to its own moment: at most one a day for the whole cabinet, and never twice the same for a Profile. Described nowhere for the player. Each one gives the active Profile a Secret Achievement of the Surprises family.
_Avoid_: Surprise (Surprises is only the Achievement family), hidden event, glitch

**Rocket Game**:
One of the two games of the main menu where a rocket dodges asteroids on the flippers, one with shooting and one without: the Rocket Easter Egg's game, played again on purpose. Its entries show only for a Profile that has had that Easter Egg.
_Avoid_: mini-game, arcade, Rocket (alone: the Easter Egg)

**Rocket Board**:
The Household's five best scores in one Rocket Game, a Profile possibly holding several places, shown only at the end of a game of it.
_Avoid_: leaderboard, high score table, Household Board (the High Score Board's view)

**Rocket Game**:
One of the two games of the main menu where a rocket dodges asteroids on the flippers, one with shooting and one without: the Rocket Easter Egg's game, played again on purpose. Its entries show only for a Profile that has had that Easter Egg.
_Avoid_: mini-game, arcade, Rocket (alone: the Easter Egg)

**Rocket Board**:
The Household's five best scores in one Rocket Game, a Profile possibly holding several places, shown only at the end of a game of it.
_Avoid_: leaderboard, high score table, Household Board (the High Score Board's view)

**Rocket Game**:
One of the two games of the main menu where a rocket dodges asteroids on the flippers, one with shooting and one without: the Rocket Easter Egg's game, played again on purpose. Its entries show only for a Profile that has had that Easter Egg.
_Avoid_: mini-game, arcade, Rocket (alone: the Easter Egg)

**Rocket Board**:
The Household's five best scores in one Rocket Game, a Profile possibly holding several places, shown only at the end of a game of it.
_Avoid_: leaderboard, high score table, Household Board (the High Score Board's view)

**Discord Rich Presence**:
What the Discord account signed in on the cabinet's PC shows publicly while PinballY runs: the table being played, or that one is being chosen, and never a Profile's name. Off until the owner accepts a Dialog saying what becomes public. Discord's own name for it, kept in every language.
_Avoid_: Discord status, Discord activity, presence

### Distribution

**Pack Version**:
The version number of the eXpansion Pack as a whole, raised with each release the owner publishes. Add-ons have no version of their own.
_Avoid_: PinballY version (PinballY's own number), build, release (a release is the published package of one Pack Version)

**PinballY Version**:
The version PinballY itself announces, such as 1.1.0 (Beta 10). The build number behind it does not count.
_Avoid_: Pack Version (the eXpansion Pack's own number), build

**Tested PinballY Version**:
The PinballY Version that each Pack Version names as tried on the maintainer's cabinet.
_Avoid_: latest PinballY (the pack never looks at what PinballY has published), supported version

**PinballY Version Notice**:
The Dialog that tells the cabinet's PinballY Version is newer than the Tested PinballY Version, unreadable, or older than the pack's minimum. It is raised by what is installed, never by what PinballY has published. Shown as "Avis de version de PinballY" in French.
_Avoid_: PinballY warning (a Warning Toast is something else), version prompt (it asks nothing), update notification

**Pack Update**:
Replacing the installed eXpansion Pack with a newer Pack Version while PinballY is closed, keeping the Household's Profiles and the owner's settings and files. It belongs to the pack itself, not to an Add-on.
_Avoid_: upgrade, patch, install (installing is the first, manual copy)

**Update Check**:
The question the pack asks GitHub in the background at each start: is there a newer Pack Version?
_Avoid_: update notification, version check

**Offline Mode**:
The group of the eXpansion Pack Settings where the owner turns off, one by one, what the pack would fetch from the internet or offer to fetch, or would send there. Shown as "Mode hors ligne" in French.
_Avoid_: network settings, airplane mode

**Update Prompt**:
The question shown at startup, before anything else, when a newer Pack Version was found at an earlier start: update now, or later.
_Avoid_: update notification, update toast

**Release Highlights**:
One to three sentences per Pack Version, written for the Household and translated into every language of the pack, that say what the new version brings. Shown as "Nouveautés" in French.
_Avoid_: changelog (the developers' full, English-only list of changes), release notes, what's new

**Script Reader**:
The outside program, vpxtool, that reads a table's script to find its ROM. It is never shipped in the pack: the cabinet downloads it from its author's own releases, once the owner has agreed. Shown as "vpxtool" everywhere.
_Avoid_: ROM reader, table script tool

**Script Reader Version**:
The version of the Script Reader that each Pack Version names as the one to install, tried on the maintainer's cabinet first.
_Avoid_: latest vpxtool (the pack never follows its author's latest release by itself)

**Script Reader Prompt**:
The Dialog that offers to install the Script Reader when it is missing, or to update it when it is older than the Script Reader Version, saying what it is for, who wrote it, under which licence and where it comes from.
_Avoid_: vpxtool toast, install popup

### Errors

**Error Toast**:
A toast with its own colour and a warning sign, that says in one sentence what a failure of the pack has cost. It is only for a failure the player would not see otherwise and that does not mend itself at the next start. Shown as "Problème" in French.
_Avoid_: error popup, error dialog (a toast never waits for the player), alert

**Warning Toast**:
An amber toast that says in one sentence that something the owner turned on will not work for the rest of the session, and what to do about it. Not an error of the pack, so it is never written to the Error Log as one. Shown as "Avertissement" in French.
_Avoid_: Error Toast (for a failure of the pack), alert

**Error Log**:
The pack's own file, kept through every Pack Update, where every error it meets is written down, so that it can still be read after PinballY has restarted. The Error Toast never refers the player to it. Shown as "journal des erreurs" in French.
_Avoid_: logfile, PinballY.log (PinballY's own log, which keeps only the current session)

### Menus

**Drawn Menu**:
A menu the player sees drawn in the pack's own style instead of PinballY's native one, with the same entries and the same effect when one is chosen. Shown simply as "menu".
_Avoid_: Steamball menu (Steamball is the palette), custom menu, popup (a popup shows information, a menu offers choices)

**Drawn Screen**:
A screen the pack draws over the dimmed wheel, which takes the player's buttons until it closes. A Drawn Menu is not one: a menu offers a list of entries, in the place of PinballY's own.
_Avoid_: overlay, popup, session

**Dialog**:
A Drawn Menu that waits for the player's answer about one thing. The pack shows one at a time, only when the wheel is free, the most urgent first.
_Avoid_: popup (a popup shows information without waiting), alert, message box

**Rating**:
The star rating a Profile gives a table; each Profile has its own. Shown as "note" in French.
_Avoid_: score, stars

**Household Rating**:
The average of the Ratings that the Household's Profiles have given a table, the active Profile's included. A table rated by fewer than two of them has none. Shown as "note de la maison" in French.
_Avoid_: average rating, community rating, Rating (alone: a Rating is one Profile's)

**Rating Prompt**:
The Dialog that offers to open PinballY's own rating dialog, once a table the active Profile has not yet rated has been played long enough.
_Avoid_: rating popup

**Operator Menu**:
PinballY's own menu for looking after the cabinet, opened from the Exit menu or the coin door's service button.
_Avoid_: admin menu, settings menu

**Setup Entries**:
The menu entries for looking after the cabinet: Table Setup, the Operator Menu and the eXpansion Pack Settings. They are seen by an Admin Profile, or by every Profile while no Profile is marked as one.
_Avoid_: admin entries, operator entries

**eXpansion Pack Settings**:
The screens, reached from the Operator Menu, where the owner turns each Add-on on or off and picks the interface language without editing the configuration by hand. They belong to the pack itself, not to an Add-on. Shown as "Réglages de l'eXpansion pack" in French.
_Avoid_: Theme Settings (a theme is a palette), options menu, Pack Settings

**Filter Picker**:
The submenu, opened from the main menu's "Change Filter" entry, that lists the wheel selections, then PinballY's filter groups. Shown as "Changer de filtre" in French.
_Avoid_: Filter Tables, filter menu (each group's own list is a filter menu too), filter groups (the groups are what it lists)

**Active Filter**:
The filter the wheel applies right now, a wheel selection or a filter from one of PinballY's groups. Shown as "Filtre actif" in French.
_Avoid_: current filter, current selection

**Selection Marker**:
The soft gold glow that flows without end around the current choice of a drawn screen. The choice it surrounds is the current (or highlighted) choice; only the glow itself is never called a highlight.
_Avoid_: halo (for the selection; a Rank emblem's or a Mastery square's halo stays a halo), cursor, highlight

**Exit Button**:
The button at the top right of a drawn screen that does just what Exit does there. It shows a back arrow when Exit brings something back, and a cross only when Exit leaves the bare wheel. Shown as "Retour" or "Fermer" in French.
_Avoid_: close cross, back button (it is one button whose look follows where Exit goes)

**Button Hints**:
The footer of a drawn screen that shows, as key caps followed by what they do, the player's buttons that act there. Shown under no title.
_Avoid_: help bar, legend

**Loader**:
A small gold comet circling over whatever is already shown on the playfield screen, while something the player waits for gets ready. Where the wait cannot explain itself, it carries a one-line caption. Shown as "Indicateur de chargement" in French.
_Avoid_: spinner, loading screen, splash screen (it is not a screen, only a comet over the current one)

### Wheel

**Wheel Arc**:
The gold arc drawn under the wheel's icons and following its curve. Shown as "arc de la roue" in French.
_Avoid_: underlay (PinballY's name for the image layer that carries it), wheel colour

### Time

**Backglass Clock**:
The time shown on a small plaque on the backglass screen, from a table's launch until its game ends, where neither Windows nor the wheel's clock can be seen. Shown as "horloge du backglass" in French.
_Avoid_: game clock, overlay clock, the clock (that is the wheel's)

**Status Icon**:
A small icon beside the wheel's clock, shown only while the state it stands for lasts. Absent means the state is off; there is no crossed-out icon. Shown as "icône d'état" in French.
_Avoid_: indicator, badge (that is the Profile's), notification

### Profiles

**Profile**:
The identity a player picks so that their plays and Achievements count for them; no password, anyone can pick any Profile. Plays count only for the active Profile, even when several people share one game.
_Avoid_: account, user, login

**Profile Picker**:
The carousel of Avatars where a player picks the active Profile, and whose last slot creates a new one.
_Avoid_: profile menu, player list

**Profile Badge**:
The active Profile's Avatar, shown at the top right of the wheel screen.
_Avoid_: profile icon

**Name Entry**:
The screen where a new Profile's name is put together with the flippers, one character at a time. It has no Exit Button, its choices being the characters. Shown as "Saisie du nom" in French.
_Avoid_: virtual keyboard, onscreen keyboard (it has no keys), high score entry

**Avatar Choice**:
The screen that follows Name Entry, where a Profile just created picks its Avatar among the pack's portraits. Leaving it without choosing keeps the Default Avatar. It is offered only then: afterwards an Avatar changes only from Windows. Shown as "Choix de l'Avatar" in French.
_Avoid_: avatar picker (too close to Profile Picker), player select, avatar gallery

**Guest**:
The Profile that always exists and cannot be removed. Its plays stay its own when a player who played as Guest creates a Profile: nothing moves over.
_Avoid_: default user, anonymous

**Household**:
Every Profile of the cabinet except Guest, Child Profiles included, whether or not it has played. Shown as "la maison" in French.
_Avoid_: family, all players, users

**Admin Profile**:
A Profile marked as one of those who look after the cabinet: only Admin Profiles see the Setup Entries, and only they mark and reset Profiles. Guest is never one, nor is a Child Profile.
_Avoid_: administrator, operator (the operator is whoever holds the coin door key)

**Child Profile**:
A Profile marked as a child's, from which Adult Tables are left out. Not parental control: nothing asks for a password. Guest is never one.
_Avoid_: kid mode, parental control, family filter

**Profile Reset**:
Starting a Profile over as if it had never played, while its name, Avatar, marks, Ratings and Favorite Tables stay.
_Avoid_: fresh start, wipe, achievement reset (the Achievements come from the plays, so the plays go too)

**Avatar**:
The picture that stands for a Profile.
_Avoid_: profile picture, photo

**Default Avatar**:
The Avatar of a Profile that has no picture of its own: a plain silhouette, except for Guest, which has its own picture.
_Avoid_: placeholder, generic avatar, Default Score image (those portraits stand for Default Scores)

**Profile Greeting**:
The short greeting, with the Avatar and the Profile's name, shown when a Profile is picked and when PinballY starts, so the player knows whose plays will count.
_Avoid_: welcome toast, login message

**Play**:
A game of at least one minute on a table other than an Untracked Table, which counts for the Profile active when it started. A shorter game is a launch by mistake and counts for nothing, except for the Rage Quit Achievement.
_Avoid_: session (the session stats count only Plays, except the Rage Quit flag), launch (a launch becomes a Play only after a minute)

**Play Log**:
The dated list of a Profile's Plays: when each started, which table, and how long it lasted. Earlier games are known only by their totals.
_Avoid_: Game Log, play history, journal

**Daily Streak**:
The number of consecutive calendar days, up to today, in which the active Profile started at least one Play, on any table. Shown as "Jours d'affilée sur la borne" in French.
_Avoid_: Streak (alone: a Period Table Streak belongs to a Period Table), login streak, visit streak

**Profile Stats**:
The screen that sums up a Profile's own plays, opened from "Mon profil" ("My Profile") for the active Profile. The screen itself has no title.
_Avoid_: Pinball Profile, player card, profile screen (a Profile is the identity, not the screen)

**Household Stats**:
The screen that sets the Household's Profiles side by side, one column each, on the stats where more is better. Shown as "Statistiques de la maison" in French, opened from "La maison".
_Avoid_: leaderboard, ranking, comparison

**Profile Reward**:
Something a Profile unlocks through play and then chooses to wear; today only Avatar Frames. Unlocked rewards follow what earned them, so a Profile Reset takes them back. Shown as "récompense" in French.
_Avoid_: cosmetic, unlockable, skin

**Avatar Frame**:
A themed frame drawn around the Avatar wherever it is shown, unlocked by reaching a Collection Tier or as a Holiday Frame. It is not the gold ring that marks the selected Avatar in the Profile Picker. Shown as "cadre" in French.
_Avoid_: skin, border, badge (the Profile Badge is the Avatar at the top right of the wheel screen), gold frame

**Holiday Frame**:
An Avatar Frame for one holiday, unlocked once and for good by a Play that starts or ends on that day; there is one per holiday, never one per year. Shown as "cadre de fête" in French.
_Avoid_: event frame, seasonal frame, Christmas 2026 frame

**Reward Prompt**:
The Dialog that follows the toast of a Profile's first Avatar Frame, once, and says where to equip it.
_Avoid_: popup, notification, reward toast (a toast never waits for the player)

### Choosing what to play

**Period**:
A calendar span, either a day or a week (Monday to Sunday), during which a Period Table stays the same.
_Avoid_: timeframe, cycle

**Period Table**:
A table picked once per Period and kept for the whole Period, offered to the player as a suggestion, the same for every Profile.
_Avoid_: daily pick, featured table, table of period

**Adult Table**:
A table in the PinballY category set aside for adults ("NSFW" unless configured otherwise). A Child Profile never sees one.
_Avoid_: NSFW table, hidden table (one of the Hidden Tables, PinballY's own flag for the whole cabinet; only the Adult Table category keeps a table from a Child Profile)

**Table of the Day**:
The Period Table whose Period is a day; prefers tables never played, otherwise the one played longest ago.

**Table of the Week**:
The Period Table whose Period is a week; picked purely at random.

**Welcome Screen**:
The screen shown over the dimmed wheel that greets the active Profile, tells it its Lost Records, shows the Period Tables, and offers a table to launch or to change player. While it is open, toasts wait for it to close. Shown as "Écran d'accueil" in French.
_Avoid_: startup prompt, splash screen, dialog (it does more than ask a question)

**Startup Screen**:
The first screen PinballY shows when it starts, chosen by the owner: the Profile Picker, the Welcome Screen, or the bare wheel. Shown as "Écran de démarrage" in French.
_Avoid_: splash screen, first screen

**Last Played Table**:
The table of the active Profile's most recent Play, across the whole collection, however it was launched.

**Random Game**:
A table drawn at random from the current wheel selection and launched right away.
_Avoid_: random table, lucky pick

**Tables to Discover**:
The tables the active Profile can see that it has never played, offered as a wheel selection. Shown as "Tables à découvrir" in French.
_Avoid_: never played tables, unplayed tables, new tables

**Hall of Fame**:
The ten tables the active Profile can see that it has spent the most time on, offered as a wheel selection. Shown as "Most Played Tables" ("Tables les plus jouées" in French).
_Avoid_: top played, most played, leaderboard

**My High Scores**:
The tables the active Profile can see on whose high score board it still holds a High Score, offered as a wheel selection. Shown as "Mes meilleurs scores" in French.
_Avoid_: my records, Mes records (a record is only the Table Record)

**Favorite Tables**:
The tables the active Profile has added to its favourites, offered as a wheel selection; each Profile has its own. Shown as "Tables favorites" in French.
_Avoid_: Favorites, favourites filter

**Hidden Tables**:
The tables carrying PinballY's Hidden flag, for the whole cabinet, offered to every Profile as a wheel selection. A Hidden Table is not one a Profile can see: it is left out of every other selection and list. Shown as "Tables masquées" in French.
_Avoid_: masked tables, operator tables

**Unconfigured table**:
A table file PinballY found but that was never set up. It stays on a wheel that shows it and can be played, but it is not one a Profile can see. Shown as "table non configurée" in French.

**Untracked Table**:
A table listed in `UNTRACKED_TABLES`, not really a pinball game. It stays on the wheel and launches, but makes no Play, is not one a Profile can see, and the Random Game never draws it.
_Avoid_: excluded table, ignored table

**Period Table Streak**:
The number of consecutive Periods in which the active Profile made a Play on the Period Table that started during its Period.
_Avoid_: Streak (alone: the Daily Streak is another one), combo, chain

**Periods Played**:
The total number of Periods, consecutive or not, in which the active Profile made a Play on the Period Table that started during its Period.
_Avoid_: exploration count, total streak

**Day's Manufacturers**:
The distinct non-empty manufacturers of the tables of the Plays started during one calendar day, hidden tables included.

### Challenges

**Challenge**:
A casual play goal set for one week, the same for every Profile, such as playing five different Stern tables; it is completed or missed when the week ends. Shown as "Défi" in French.
_Avoid_: quest, goal, mission, Achievement (an Achievement is a permanent milestone)

**Challenge Card**:
The small card at the top right of the wheel screen that keeps the week's Challenge and the active Profile's progress always in view.
_Avoid_: challenge widget, challenge popup, status line

**Challenge Tables**:
The tables the active Profile can see that would move its Challenge forward if played now, offered as a wheel selection; only some Challenges have them.
_Avoid_: challenge filter, eligible tables

**Challenge Toast**:
A toast with its own colour and no trophy, that announces that the active Profile completed the week's Challenge.
_Avoid_: challenge popup, challenge achievement

### Table Mastery

**Table Mastery**:
How well a Profile knows one table, measured only by the time its Plays on that table have lasted. A progression of its own, with no Achievement. Shown as "Maîtrise" in French.
_Avoid_: XP, table level, experience

**Mastery Level**:
The step of Table Mastery a Profile has reached on a table, from 1 at its first Play up to 10, shown as a number with a name, from Novice (Rookie) to Mage du flipper (Pinball Wizard).
_Avoid_: level (alone: the player's level is another thing), rank (an Achievement Rank is how hard an Achievement is), tier

**Collection Mastery**:
How far a Profile has taken its tables, tier by tier, measured by ten of the tables it can see. Shown as "Maîtrise de la collection" in French.
_Avoid_: global mastery, player level (the player's level comes from Achievement Ranks), completion (a completion Achievement covers a group of tables)

**Collection Tier**:
The step of Collection Mastery, from 0 to 10: tier N means ten tables at Mastery Level N or above. Shown as "palier" in French.
_Avoid_: level (a Mastery Level belongs to one table), stage, rank (an Achievement Rank is how hard an Achievement is)

**Mastery Bar**:
The small panel at the top right of the wheel screen that keeps in view the active Profile's Table Mastery of the selected table.
_Avoid_: level bar, progress bar (alone), mastery widget, Mastery Card

**Rating Plate**:
The small plate of five stars under the Mastery Bar (or in its place) that shows the active Profile's own Rating of the selected table; absent on a table it has not rated.
_Avoid_: rating bar, star widget

**Mastery Toast**:
A toast with its own colour and no trophy, that announces the Mastery Level the active Profile has just reached on a table.
_Avoid_: level-up popup, mastery achievement (Table Mastery has no Achievement)

### High Scores

**High Score**:
A place on a table's own high score board that a Profile won with a Play, whatever initials were typed. It stays won even when better scores push it off the board. Shown as "meilleur score" in French.
_Avoid_: record (the Table Record is only the best one), hi-score, score (the score of a game that did not reach the board is known only as a Play Score)

**Play Score**:
The best score of a Play, read from the table's memory after it, credited to the Profile active when it started even when another player made it. Known only on tables with a ROM whose memory gives it, and never for a game left unfinished, when the table tells it.
_Avoid_: last game score, NVRAM score, High Score (a Play Score won no place on the table's board)

**Play Score Anomaly Log**:
The pack's own file, kept through every Pack Update, where a Play whose memory reads oddly for the Play Score rules is written down, never an ordinary one, for the owner to send with a report. Shown as "journal des anomalies des scores de partie" in French.
_Avoid_: Error Log (an anomaly is no error of the pack)

**Default Score**:
A score that belongs to no Profile: already on a table's high score board when the pack first read it, or a High Score whose Profile was removed. Shown as "score par défaut" in French.
_Avoid_: original score (confused with original tables), anonymous score, factory score (not all of them come from the factory)

**Table Record**:
The best score on a table's high score board, whoever holds it, an anonymous one included. Shown as "record" in French.
_Avoid_: Grand Champion (the name only some tables give it), world record

**Lost Record**:
A Table Record a Profile held that another Profile beat with a Play, until the Welcome Screen has told it. Shown as "record perdu" in French.
_Avoid_: rivalry (the feature, not the record), stolen record, notification

**High Score Toast**:
A toast with its own colour and no trophy, that announces the best place a Play won on a table's high score board, or the Table Record; for a Play that won no place, a House Record or a Personal Best instead. One per Play at most. Shown as "Meilleur score" in French.
_Avoid_: high score popup, record toast

**Personal Best**:
A Play Score that beats every earlier score of the Profile on the table, Guest included; the first score on a table is none. Shown as "Record perso" in French.
_Avoid_: personal record, new best

**House Record**:
A Play Score that takes the first place of the table's Household Board from another Profile. Shown as "Record de la maison" in French.
_Avoid_: household record, family record, Table Record (the best score on the table's own board)

**High Score Board**:
The drawn screen of the selected table's scores, in three views: the Table Board, the Household Board and the Personal Board. It always opens on the Table Board. Shown as "Tableaux des meilleurs scores" in French.
_Avoid_: high scores popup, leaderboard

**Table Board**:
The view of the High Score Board that shows the table's own high score board with each place's owner. Not the table’s own board, which it shows. Shown as "Scores de la ROM" in French.

**Household Board**:
The view of the High Score Board that ranks the Household's Profiles by their best High Score or Play Score on the table since their last Profile Reset, one place each. Shown as "Scores de la maison" in French.
_Avoid_: leaderboard, family board

**Personal Board**:
The view of the High Score Board that shows the active Profile's five best scores on the table since its last Profile Reset: its High Scores, those pushed off the table's board included, and its Play Scores, a Play counted once. Shown as "Vos 5 meilleurs scores" in French.
_Avoid_: Personal 5, My High Scores (the wheel selection of tables where it still holds one)

### Achievements

**Achievement**:
A milestone the player reaches through play, announced once with an Achievement Toast, except for the two Easter Eggs whose joke a toast would give away.
_Avoid_: trophy, badge, success

**Achievement Toast**:
A small card in the bottom-right corner of the playfield screen that announces one Achievement in the colour of its Achievement Rank. It never waits for the player nor takes their input.
_Avoid_: popup, notification, dialog (a dialog waits for the player)

**Unlocked**:
An Achievement whose condition holds right now. It can be lost again, for example when a table joins a completed group, and is not announced a second time when it comes back.
_Avoid_: earned, obtained

**Achievement List**:
The screen that shows every Achievement in one scrolling list: the Unlocked ones, then the missing ones. Shown as "Succès personnels" in French, opened from "Mes succès" ("My Achievements").
_Avoid_: My Achievements, trophy room

**Achievement Family**:
A kind of Achievement, absent as a whole when the Add-on it depends on is turned off: Collection, Play Time, Period Tables, Sessions, Random Game, Manufacturers, Decades, Categories, Challenges, High Scores, Surprises, Ratings, Young Players. Young Players exists only for Child Profiles, in place of the Achievements a child never gets.
_Avoid_: group (a group is the set of tables a completion Achievement covers, such as one manufacturer's tables), category (a PinballY table category)

**Notified**:
An Achievement whose Achievement Toast has started showing, or, for one with no toast, that has been found Unlocked. Only Notified Achievements count for the Player Level.
_Avoid_: acknowledged, seen, unlocked (an Achievement can be unlocked but not yet Notified)

**Achievement Rank**:
How hard an Achievement is: Bronze, Silver, Gold or Platinum.
_Avoid_: tier, level, difficulty, grade

**Player Level**:
How far a Profile has come as a player, earned through the Achievement Ranks of its Notified Achievements, with no last level. It is worked out afresh each time, so it can drop. Shown as "Niveau" in French.
_Avoid_: XP, player rank (an Achievement Rank is how hard an Achievement is), level (alone: a Mastery Level belongs to one table), Collection Tier

**Level Toast**:
A toast with its own colour and no trophy, that announces the Player Level the active Profile has just reached, and comes with the Fireworks.
_Avoid_: level-up popup, rank-up

**Confetti Shower**:
A shower of coloured confetti falling across the whole wheel screen, to celebrate along with the toast of a big win. It never waits for the player nor takes their input. Shown as "Pluie de confettis" in French.
_Avoid_: celebration, party, fireworks (Fireworks celebrate a Player Level)

**Fireworks**:
Rockets shot up from the bottom of the wheel screen that burst into rings of glowing streaks, to celebrate along with the Level Toast. Shown as "Feu d'artifice" in French.
_Avoid_: confetti, celebration, level-up effect

**Unlock Rate**:
How many of the Household's Profiles have been Notified of an Achievement, shown on the Achievement List by their Avatars.
_Avoid_: rarity (a rare Achievement has a low Unlock Rate), household rate, global percentage

**Achievement Progress**:
How far the active Profile is from a missing Achievement: the very value its unlock condition tests, against the target that unlocks it.
_Avoid_: progress (alone), completion (a completion Achievement covers a group of tables)

**Secret Achievement**:
An Achievement whose title and description stay out of sight while it is missing, with "???" and a hint in their place. Only standalone Achievements can be secret, since a series or a group completion is a goal to aim at. Shown as "Succès secret" in French.
_Avoid_: hidden achievement (Hidden is PinballY's own flag for tables), mystery achievement
