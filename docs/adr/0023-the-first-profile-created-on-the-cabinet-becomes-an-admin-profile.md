---
status: accepted
---

# The first Profile created on the cabinet becomes an Admin Profile

Completes ADR 0020. When Name Entry creates a Profile while the Household is empty, that Profile is marked as an Admin Profile at once, and Name Entry says so beforehand. Guest can never be one, so a new cabinet would otherwise stay open to everyone until someone found Manage profiles. From that moment Guest no longer sees the setup entries, nor the Profile picker's slot that creates a Profile, until the new Profile is picked by hand. ADR 0020's own path remains for every other case: a Household that already has a Profile, even with no Admin Profile, and a first Profile created by hand in Windows, are never marked by themselves, since a cabinet left open on purpose must stay open.

## Considered Options

- **No mark at creation, "Become admin" left in Manage profiles.** Rejected: the owner who wants the setup entries for themselves has to know a menu the cabinet never mentions.
- **A Dialog offering the mark after the creation.** Rejected: the answer would come after the name is chosen, while a line on Name Entry is read before anything is created, and Exit still leaves.
- **Switching to the new Profile at once.** Rejected: an Admin Profile creating a child's Profile would lose Manage profiles, and with it the Child mark it came to set.

## Consequences

- A parent who creates a child's Profile first makes the child an Admin Profile. It is undone from the cabinet: that Profile marks another one, which then clears its mark and sets the Child mark.
- A player who leaves the Profile picker with Exit after the creation stays on Guest, without the setup entries, until they pick the new Profile.
- Removing the only Profile by hand empties the Household again, so the next one created is marked in turn.
