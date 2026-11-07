# Choosing a table

[← Guide index](index.md)

## Welcome Screen: Table of the Day, Table of the Week

<img src="../../images/welcome_screen.png" alt="The Welcome Screen with the Table of the Day and the Table of the Week" width="480">

Every day there is a table nobody in the house has played yet, or the one left alone the longest, and every week a random one. The Welcome Screen greets you with both at startup, again after Change Player, and whenever you pick **Welcome Screen** in the main menu, with what they mean for you.

- While your weekly Challenge has Challenge Tables, it also shows one of them, drawn at random. That Challenge Table is never one of the two tables already shown, unless one more game finishes your Challenge.
- From there, launch one of them, stay on the table on the wheel, change player or spin a Random Game.
- Play them several days or weeks in a row to build a Streak.
- Neither is ever a hidden table or an unconfigured one (a table file PinballY found but that was never set up), even when your wheel shows it.
- When someone else takes one of your High Scores, Guest included, your next Welcome Screen tells you who, once, so you know which record to win back.
- While the Welcome Screen is open, the video sound of the table on the wheel is turned down, and comes back as it closes.

For a Child Profile, see [Settings](settings.md#child-profile): the Table of the Day and the Table of the Week stay the same for the whole household.

## Table Mastery

<img src="../../images/table_mastery.png" alt="The Mastery Bar of the selected table: Rookie, Mastery Level 1" width="297">

Every minute you play a table builds your Table Mastery of it, through ten Mastery Levels from Rookie to Pinball Wizard, each longer to reach than the one before.

- The Mastery Bar, at the top right of the wheel screen, shows how far you are on the selected table, and a toast announces the level you reach.
- Under it, five stars give your own Rating of the selected table, and change as soon as you rate it. A table you have not rated has none: a zero shows as five empty stars.
- The lower status line gives what the whole household thinks of the selected table: its Household Rating, the average of your Ratings rounded to the half star, with how many of you rated it (see [Profiles](profiles.md#ratings-and-favorite-tables)).
- When ten of your tables reach the next level, your Collection Mastery climbs a tier. Hidden and unconfigured tables do not count.
- Mastery Level 10 on a table and each new Collection Tier bring a shower of confetti.
- Each Collection Tier also unlocks an Avatar Frame, from the Enchanted Forest to the Celestial Legend, to wear around your Avatar: pick it in **My Profile**, under **Frame**.
- Play on a holiday (New Year's Day, Chinese New Year, Valentine's Day, Easter, Halloween, Christmas and five more) and that day's Holiday Frame is yours for good, announced by a toast when you come back to the wheel.

## High Scores

<img src="../../images/high_score_board.png" alt="A table's High Score Board: the podium under its three crowns, then the other places, one of them won by a Profile" width="400">

When you enter a table's high score board, the place is yours: the pack reads the board before and after each game and, for a game of a minute or more, credits every new score to the Profile that was playing, whatever initials were typed, the other players of a multiplayer game included.

- A toast announces your best place, or the Table Record and whom you took it from.
- The scores already on the board at the first read, factory ones included, belong to no one, and a ROM reset that brings them back is never credited.
- A High Score stays won even once later scores push it off the board, and earns its own Achievements.
- **My Profile** shows the High Scores and Table Records you still hold, and **Household Stats** who holds the most Table Records.
- Tables without a ROM (community originals) count too: the pack reads their board in Visual Pinball X's `User` folder (`VPReg.stg`, or the text file some tables keep there), learns where each table keeps it during its first game, and hands it to PinballY, so the DMD and the table's info box show it as well. Their board appears once such a table has been played with the pack.

**High Scores** in the main menu (or PinballY's `HighScores` button, if mapped) opens the selected table's board, drawn in the Steamball look in place of PinballY's own window:

- the three first places on a podium under a Gold, Silver and Bronze crown, the others in rows below;
- each with its rank, score, initials and the Profile that won it (name, Avatar and Avatar Frame), or "Default score" with a portrait picked by its initials, the same on every table;
- the board is read again from the table each time you open it, so it always shows what the table holds now;
- the flippers scroll a board too long for the screen.

To read the boards of about 300 more ROMs, update PINemHi (see [Install](install.md#pinemhi-368)).

## Random Game and filters

- A Random Game is spun on a wheel of fortune (`SKIP_RANDOM_GAME_ANIMATION=true` launches it at once). Launch one from the Welcome Screen, or from "Launch a random table" in the main menu, under "Play": it draws from the tables on the wheel, the Active Filter included.
- Behind "Change Filter" in the main menu: "Tables to Discover", "Most Played Tables", "My High Scores" (the tables where you hold a place on the board), "Favorite Tables", "Hidden Tables" (while a table is hidden), "Original Tables" (the manufacturer set by `COMMUNITY_TABLES_MANUFACTURER`) and "Challenge Tables".
- A reminder asks you to rate a table once you have played it long enough (`ASK_TO_RATE_AFTER_MINUTES_PLAYED`), unless your Profile has rated it already.
- Star ratings and "Favorite Tables" are the active Profile's own: what you rate or add to the favourites changes nobody else's (see [Profiles](profiles.md#ratings-and-favorite-tables)).

---

[← Guide index](index.md)
