---
status: accepted
---

# One Profile can take over the PinballY History, once per cabinet

Partly supersedes ADR 0004, which said existing progress is not carried over. A cabinet that installs the pack often has years of games behind it, and every Profile starting from zero throws them away. An Admin Profile can now hand the PinballY History to one Profile, from that Profile's menu in Manage profiles, once per cabinet. For each table, the History Import adds PinballY's count and play time minus what every Profile, Guest included, has already counted, never below zero; PinballY's last-played date is taken only for a table the Profile has never played. The figures go into the Profile's per-table totals, never into its Play Log, since PinballY keeps no dated games. ADR 0004's rule still holds for everything else: Achievements read each Profile's own totals, which now include what it imported.

## Considered Options

- **A cabinet total shown apart, in Household Stats, touching no Profile.** Rejected: the single player of a cabinet would still lose their Table Mastery, favourite and dusty tables.
- **Importing the full PinballY totals.** Rejected: the games played since the pack's install are already in the Profiles' totals and would count twice.
- **An import that can be done again, or into several Profiles.** Rejected: after the subtraction, a second run would only add the launches under a minute PinballY counts and the pack does not.
- **Making up dated Plays in the Play Log.** Rejected: it would fake Daily Streaks, Profile Rewards and the Play Log's dates.

## Consequences

- Achievements the import reaches (play time, Collection Tiers) are unlocked without a toast; the import's closing Dialog sums them up.
- The imported count is slightly high, since PinballY also counts launches shorter than a minute; the play time is right.
- A Profile Reset erases the import like everything else, and the import is not offered again.
- A Profile Removal of the importer sets its record aside with its folder, so the import is offered again to the other Profiles, with what the listed Profiles have not counted: an import made on the wrong Profile is redone this way.
