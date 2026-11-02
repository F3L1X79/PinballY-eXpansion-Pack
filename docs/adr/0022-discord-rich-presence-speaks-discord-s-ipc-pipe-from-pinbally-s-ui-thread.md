---
status: accepted
---

# Discord Rich Presence speaks Discord's IPC pipe from PinballY's UI thread, with one shared application

Discord Rich Presence talks to the Discord desktop client over its local named pipe, `\\?\pipe\discord-ipc-0` to `-9`, straight from the pack's Javascript: five kernel32 calls through `dllImport` (`CreateFileW`, `PeekNamedPipe`, `ReadFile`, `WriteFile`, `CloseHandle`), plus `GetCurrentProcessId` for the activity's `pid`. The handle is synchronous; the pack only reads bytes `PeekNamedPipe` already reports, never calls `WaitNamedPipeW`, and polls on a host interval on the UI thread (no thread, no native callback). Any call that fails ends the connection for the session. The application is one shared "Virtual Pinball" application on Discord's Developer Portal, owned by the pack's author, its Application ID in the repo like the Dolphin emulator's; a hand-edited `DISCORD_APPLICATION_ID` replaces it. Protocol facts and sources: `docs/research/discord-rich-presence.md`.

## Considered Options

- **A PowerShell helper in `tools\` owning the pipe**, fed through a file. Rejected for now: a process, a file protocol and PowerShell's start time, to remove one risk (below). Worth reopening if a blocked write shows on the cabinet.
- **Discord's Social SDK (a native DLL).** Rejected: the pack ships no library; the older `discord-rpc` and Game SDK are deprecated or archived anyway.
- **One application per owner**, each creating their own on the Developer Portal. Rejected: a developer account and a portal visit per cabinet, for a feature meant to be one switch. It is the only option the Developer Terms clearly allow.
- **Overlapped (non-blocking) writes.** Rejected for now: an `OVERLAPPED` struct and event kept alive between calls, for the same risk as the helper.

## Consequences

- Accepted risk (decided 2026-10-29): Discord's Developer Terms §2(d) say developer credentials, the Application ID included, "may not be embedded in open source projects". Discord may disable the application; `DISCORD_APPLICATION_ID` lets an owner use their own then.
- Accepted risk: a `WriteFile` to a hung Discord whose pipe buffer is full would block PinballY. The frames are a few hundred bytes, so it needs a hung client.
- No `GetLastError` (PinballY never saves it): "not found" and "busy" pipes look the same, and the first pipe that opens wins, even with several Discord clients.
- The READY frame's user object is API Data (§13): never kept nor logged.
- What Discord shows goes when PinballY quits or crashes, since Windows closes the pipe with the process: no clear is needed at quit. To check on the cabinet, with the other points of the research's "To verify on the cabinet".
- The fake host's fake Discord (`tests/support/fake_discord.js`) reproduces only this ADR and the research.
