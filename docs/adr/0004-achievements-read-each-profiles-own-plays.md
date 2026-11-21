---
status: accepted
---

# Achievements read each Profile's own plays

Achievements must belong to one Profile, but PinballY keeps a single play count, play time and last-played date per table, shared by everyone. So the add-ons record each Profile's plays themselves and the Achievement definitions read that record instead of PinballY's play stats. This partly supersedes ADR 0001: the definitions no longer read PinballY globals for play data, and a shared record of plays is now needed. Existing progress is not carried over: every Profile, Guest included, starts from zero (partly superseded by ADR 0025: one Profile can take over the PinballY History, once per cabinet).

## Considered Options

- **Keep reading PinballY's play stats.** Rejected: one Profile's plays would unlock Achievements for every other Profile.
- **Swap PinballY's play stats on each Profile switch** (`gameInfo.update()` on every table). Rejected: it rewrites PinballY's databases on every switch and fights PinballY's own counters.
- **Separate PinballY settings and stats folders per Profile** (`/Settings:` and `/GameStats:`). Rejected: switching Profile would mean restarting PinballY.
