# The Achievement List is drawn on layers, drawn ahead and kept

The Achievement List used native PinballY menus: no progress bars or images, a paged section that reopens on the wrong page, and an Exit press that closes every menu instead of going back one level. We decided to draw it as one scrolling list on `mainWindow` drawing layers, with the buttons swallowed through `commandbuttondown` while it is open (as the Profile picker does). Each item (a row or a section header) has its own layer, drawn once and afterwards only moved. The header and footer sit on a mask layer above the rows, which hides a row sliding out of the list. The Avatars of the Unlock Rate sit on small layers of their own, one set per on-screen slot, reused from row to row. Everything is drawn ahead from startup, a few milliseconds at a time while no button is pressed and no game runs, and kept from one opening to the next. A move therefore only slides layers.

## Considered Options

- **`mainWindow.showPopup` re-shown on each move.** Rejected: about 600 ms per move on the cabinet. It also consumes the next Select or Exit press, and no script can close it (see ADR 0003).
- **One full-window layer redrawn on each move.** Rejected: it stutters, since each draw rasterises every visible row.
- **Rows drawn with their images.** Rejected: PinballY reads the image file again on every `drawImage`, which is about 95 % of a row's cost (50 to 85 ms per row with four Avatars, a few ms without). Rank emblems are drawn with rectangles instead, or come from an image on reused layers like the Avatars.

## Consequences

- About a hundred layers stay alive for the whole session. They are hidden when the list closes and redrawn only when the active Profile, the Achievements or the window size change.
- A hidden layer is reduced to a point (`common/drawing/placed_layers.js`), and a layer coming back on screen regains its scale; a layer staying on screen is still only moved.
- Drawing ahead pauses 400 ms after any button press, so it never makes the wheel stutter. A list opened before the drawing ahead ends draws the missing rows on the spot, at the old cost.
- The navigation sound uses three Windows Media Players in turn: restarting a player that is still playing blocks PinballY for 60 to 130 ms.
- `StyledText` ignores a semi-transparent `backgroundColor`, so key caps and pills use opaque colours.

Prototype and measurements: branch `prototype/achievement-list` (verdict in its last commit).
