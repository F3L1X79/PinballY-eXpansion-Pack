---
status: accepted
---

# A Pack Update is offered at the start after its discovery, and applied by a helper outside PinballY

Each PinballY start asks GitHub, in the background, for the latest release; a newer Pack Version is remembered, and the Update Prompt opens at the *next* start, before the Profile picker, the Welcome Screen and the Profile Greeting. Choosing to update hands over to a PowerShell helper in `tools\`, started hidden like the restart helper (ADR 0017): it downloads and checks the release before PinballY quits, then swaps the pack folder for the new one, keeping the player's data, and starts PinballY again. The next start tells whether the update took, by comparing the running Pack Version with the one requested.

## Considered Options

- **Wait for GitHub's reply before the Startup Screen.** Rejected: every start would wait up to a couple of seconds, offline cabinets included, for a question that is new once in a while.
- **Open the prompt as soon as the reply arrives.** Rejected: by then the Profile picker or the Welcome Screen is open, and a table launched from it skips the prompt.
- **A script the player pastes into PowerShell to install and update.** Rejected: running PowerShell by hand frightens players; the pack already runs a hidden helper to restart, so updating from inside PinballY adds no new kind of risk.
- **An `.exe` installer.** Rejected: unsigned, it warns through SmartScreen at every version; signing costs a yearly certificate that Artifact Signing does not offer a French individual.
- **Extract the new release over the installed folder.** Rejected: files a release removed would stay, and a locked file would stop it halfway; the swap keeps one previous folder to roll back to.

## Consequences

- A newer Pack Version reaches the Update Prompt one start late; only a Status Icon on the wheel, which takes no button, shows it from the start that found it until the Pack Update.
- The first install stays manual (extract the release zip into `Scripts\`, add the import line); only updates are automatic.
- A cabinet installed with git (`ExpansionPack\.git`) never asks GitHub: `git pull` updates it.
