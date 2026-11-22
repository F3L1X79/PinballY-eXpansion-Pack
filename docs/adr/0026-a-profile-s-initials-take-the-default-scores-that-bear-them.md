---
status: accepted
---

# A Profile's Initials take the Default Scores that bear them

Completes ADR 0025. The History Import gives a Profile its PinballY totals, but the scores it made before the pack stay Default Scores, since a place is won only by a Play. An Admin Profile can now give a Profile three Initials, unique on the cabinet. Every place on a table's board that never had an owner and bears those Initials becomes that Profile's High Score, now and whenever such a place shows up later (a first board read, a game under a minute, a board changed outside a Play, a ROM reset). The Initials are part of the Profile's identity, like its name: a Profile Reset keeps them, and the places they took keep counting on the Household Board, the Personal Board and My High Scores, and for Achievements, which they unlock without a toast.

## Considered Options

- **Crediting a Play's place to the Profile whose Initials were typed, instead of the active Profile.** Rejected: a place won in a Play stays the active Profile's, Guest included, whatever initials were typed, as before.
- **A single claim, once per cabinet, like the History Import.** Rejected: tables added or first read later would keep the Profile's old scores as Default Scores.
- **Claimed places erased by a Profile Reset, like the History Import.** Rejected: the Initials still designate the Profile, so the board should still show it.
- **Taking a removed Profile's places too.** Rejected: a Profile re-created under the same name gets them back, and Initials would steal them first.

## Consequences

- Initials shared with a ROM's factory scores (such as "LED") take those scores; the Admin who chooses them accepts it.
- Changing or removing Initials gives the places they took back as Default Scores before the new Initials take theirs; a place won in a Play never moves.
- A claimed Table Record can become a Lost Record when another Profile beats it; claiming one makes nobody lose a record.
