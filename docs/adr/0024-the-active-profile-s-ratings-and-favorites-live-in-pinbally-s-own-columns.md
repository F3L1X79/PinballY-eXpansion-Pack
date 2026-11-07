# The active Profile's Ratings and Favorite Tables live in PinballY's own columns

Each Profile keeps its own Ratings and Favorite Tables in the pack's files, but while a Profile is active its values are written into PinballY's global `rating` and `isFavorite` columns, and those columns are the truth for it: the pack reads them back into the Profile's file when the Profile is left and at startup, then writes the next Profile's values (only the tables that differ). We chose this over keeping the values apart because PinballY's own star display, rating dialog, Favorites filter and rating filters then show the active Profile's values without being redrawn, and every way of changing a rating, the Operator Menu included, is caught without hooking each one.

## Consequences

- A Profile change interrupted halfway leaves the columns mixing two Profiles; the pack records that a change is under way, and at startup rewrites the active Profile's values instead of reading the columns back.
- A Profile change costs one `update()` per differing table (an XML write and a wheel refresh each), to be measured on the cabinet.
- The Hidden flag is not part of this: it stays for the whole cabinet (spec #263).
