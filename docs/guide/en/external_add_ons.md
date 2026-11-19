# With your External Add-ons

[← Guide index](index.md)

An **External Add-on** is any script you run in PinballY next to the pack: one you wrote, one copied from the PinballY help, one from the official [PinballY-Addons-and-Examples](https://github.com/PinballY/PinballY-Addons-and-Examples) repository, or one shared by a community author such as RichardL64 or timhobbs. Most of them run fine next to the pack. A few take the same screen as one of the pack's Add-ons, and then only one of the two can win. This page lists the ones known, what you see, and what to do.

The Add-on names below are those of the **eXpansion Pack Settings**, in the Operator Menu (see [Settings](settings.md)).

## Why the pack's line goes last

PinballY runs one file, `Scripts\main.js`, and every other script only through an `import` line in it. Scripts imported before the pack get their turn first on each PinballY event, and the pack can then see what they did: a launch they cancelled, a launch message they blanked, a menu entry they added. A script imported after the pack acts after it, and leaves no trace the pack can read.

So **the pack's line must be the last line of `Scripts\main.js`** (see [Install](install.md)). When another `import(` line follows it, a **Conflict Notice** at startup asks an Admin Profile (anyone, while no Profile is an Admin) to move the pack's line to the end, once for the cabinet.

## What the pack handles by itself

These overlaps are fixed on the pack's side. You see nothing, and there is nothing to do:

- **A launch another script cancelled** (RichardL64's `Spin.js`, which cancels a launch that comes too soon after the plunger): the pack treats it as no launch. The **Backglass Clock** does not show, **High Scores** reads no board, and no pack surprise starts on it.
- **A launch message another script blanked** (RichardL64's `LaunchVideo.js`, timhobbs's `launchAnimations.js` with its option on): **PinballY translation** leaves it blank instead of writing its translation back.
- **A "Table setup" entry another script already added to the main menu** (the official `command_example`): the pack's own "Set Up Table" from **Menu commands** gives way to it, so the menu has only one.

## What the pack tells you: the launch screen

When a script imported before the pack takes the launch screen, the pack's **Launch overlay** still shows its own screen over it, so your launch video or image never appears. Back on the wheel, a **Conflict Notice** tells an [Admin Profile](settings.md#admin-profile) (anyone, while no Profile is an Admin) what happened, and which script line to remove from `Scripts\main.js` to keep only the pack's screen. When it finds a known launch script in `Scripts` or its sub-folders (`LaunchVideo.js`, `LaunchFade.js`, `launchAnimations.js`, `FlexDMD.js`, or an older copy of `seamless_launch_overlay.js`), it names it after "Probably:".

- "Turn off Launch overlay" gives the launch screen back to your script: it saves the [Launch overlay](settings.md#expansion-pack-settings) off, then offers "Restart now" or "Later".
- "Keep both", or Exit, keeps things as they are.
- After either answer, the Notice never shows again on this cabinet, even after an update of the pack or if you turn the Launch overlay on again.

To keep the pack's launch screen instead, remove your script's import line from `Scripts\main.js`.

## Script by script

| External Add-on | What you see next to the pack | What to do |
|---|---|---|
| RichardL64's `LaunchVideo.js` | The pack's Loader instead of your launch video. During the game, the closing Loader hides behind the black screen `LaunchVideo.js` leaves. A Conflict Notice says so. | Keep your video: turn off **Launch overlay** (from the Notice, or in the settings). Keep the pack's screen: remove the `LaunchVideo.js` import line. |
| RichardL64's `LaunchFade.js` | The pack's Loader instead of the dimmed wheel. A Conflict Notice says so. | Turn off **Launch overlay**, or remove the `LaunchFade.js` import line. |
| timhobbs's `launchAnimations.js` | The pack's Loader instead of your launch animation. A Conflict Notice says so. | Turn off **Launch overlay**, or remove the `launchAnimations.js` import line. |
| Official `seamless-launch`; the help's "Seamless Loading", "Launch Backgrounds" and "Custom Launch Videos" examples | The pack's Loader instead of your launch image or video; `seamless-launch` does what the Launch overlay already does. A Conflict Notice says so. | Remove the example's lines (the pack's Launch overlay does the same, with a Loader), or turn off **Launch overlay** to keep your own image or video. |
| Official `FlexDMD` | Its launch image is replaced by the pack's Loader; its DMD works. A Conflict Notice says so. | Turn off **Launch overlay** to keep its launch image. |
| Official `seamless-launch-spinner` | The pack's Loader instead of its spinner video. **No Conflict Notice**: this script does not mark the launch screen as taken, so the pack cannot see it. | Turn off **Launch overlay**, or remove the `seamless-launch-spinner` import line. |
| RichardL64's `Startup.js` | Its "Loading startup game..." text is replaced by PinballY's translated launch message, and hidden while the Launch overlay is on. | Nothing, unless you want its text: then turn off **Launch overlay** and **PinballY translation** (which also stops translating PinballY's menus). |
| The help's "Hide a Window During Play"; timhobbs's `toggleWindows` (`gameEvents.js`, `forceCapture.js`) | Both they and the pack's **Backglass** hide the backglass during a game and show it again after it. **No Conflict Notice**: the pack cannot see who hid a window. | Keep one: remove the snippet, or turn off **Backglass** if your script also hides the DMD and topper and you prefer it. |
| Official `wheel-actions` | Its own menu, not drawn in the pack's style nor translated, on the wheel entries it adds: it stops every later script from seeing that menu. **No Conflict Notice.** | Nothing: the pack's **Drawn Menus** still draw every other menu. |
| RichardL64's `Spin.js` | Nothing: a launch it cancels stays cancelled. | Nothing. |
| Official `command_example` | One "Table setup" entry in the main menu, its own. | Nothing. |
| Official `FlexDMD`, `two-tables-one-wheel` | They start some tables themselves, in place of PinballY's Play: the launch is theirs. | Nothing. |
| Scripts that add menu entries (timhobbs's `tableEdit.js`, `forceCapture.js`, official examples) | Their entries are drawn in the pack's style, in their own words: the pack does not translate them. With `LOG_UNTRANSLATED_MENU_TITLES=true`, they are listed in `PinballY.log` as untranslated. | Nothing. |
| RichardL64's `Filter.js`, `FilterTop.js` | They run fine. With the **Wheel Order** by year, a filter they pick is shown by year, like one picked from Change Filter. | Nothing. |
| Official `CategoryButtons` | It runs fine, but a category it switches to stays alphabetical even with the **Wheel Order** by year: it changes the filter without telling the other scripts. | Nothing; pick the category from Change Filter to see it by year. |
| RichardL64's `AttractFade.js`, `AutoOff.js`; official `auto_shutdown` | They run fine: they only listen to attract mode, and the Attract Order line of the **Wheel Order** still sets how attract mode moves through the tables. | Nothing. |

## Scripts that run fine next to the pack

Besides the scripts marked "Nothing" above, these share no screen with the pack: RichardL64's `FlexDMD.js` (it only drives the DMD), the official `show_instruction_card`, `start_random_table`, `sleep_computer`, `BatchCategoryTagging`, `MissingMediaFilter`, `meta_filters`, `additional_filters`, `menu_submenu_batch_file` and `PinMAME_functions`, and timhobbs's `showApronCard.js` and `vpcHighScores.js`. Keep them.

## A broken script can stop the pack

A script that fails to load can keep the whole pack from loading, even though the pack's line is separate: no Drawn Menus, no Profile badge, and `info.log` is not rewritten, since no pack code ran. This happens most often with a script saved from GitHub's web page instead of the file itself: the file then holds HTML, and `PinballY.log` shows an error such as `Unexpected token '<'`.

- **Look in `PinballY.log`**, in the PinballY folder. The pack's line writes `ExpansionPack not loaded (…): look for a script error just above in this log` (`ExpansionPack: …` with the line of older installs): the line above it names the script at fault.
- **Download scripts with GitHub's Raw button**, on the script's page, then save that page; or remove that script's import line from `Scripts\main.js`.

---

[← Guide index](index.md)
