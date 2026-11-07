// ============================================================
// The Pack Update helper shipped in tools\ (never run here: it needs Windows
// and a live PinballY): it takes the arguments the PinballY host passes,
// checks the digest before its ready file and waits for PinballY after it,
// keeps the player's data, renames old before new and starts PinballY again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const HELPER = readFileSync(new URL("../../tools/pack_update.ps1", import.meta.url), "utf8");
const HOST = readFileSync(new URL("../../common/core/pinbally_host.js", import.meta.url), "utf8");
const GITIGNORE = readFileSync(new URL("../../.gitignore", import.meta.url), "utf8");

const position = text => {
    const index = HELPER.indexOf(text);
    assert.ok(index > 0, `the helper has ${text}`);
    return index;
};

test("takes the arguments the host passes it", () => {
    const params = /^param\((.*)\)$/m.exec(HELPER)[1];
    for (const name of ["ParentPid", "ReadyFile", "LogFile"]) {
        assert.ok(params.includes(`$${name}`), `the helper takes -${name}`);
        assert.ok(HOST.includes(`${name}: `), `the host passes -${name}`);
    }
    for (const name of ["ZipUrl", "Sha256", "PackVersion", "PackFolder"]) {
        assert.ok(params.includes(`$${name}`), `the helper takes -${name}`);
        assert.ok(HOST.includes(`${name}: `), `the host passes -${name}`);
    }
});

test("downloads over TLS 1.2, checks the digest and the extracted main.js, reads PinballY's command line, then writes the ready file", () => {
    const tls = position("[Net.SecurityProtocolType]::Tls12");
    const download = position("Invoke-WebRequest -Uri $ZipUrl");
    const digest = position("if ($digest -ne $Sha256");
    const leftover = position("Remove-Item -LiteralPath $newRoot");
    const extract = position("Expand-Archive");
    const mainJs = position("Join-Path $newPack 'main.js'");
    const commandLine = position("$p.CommandLine");
    const ready = position("Set-Content -Path $ReadyFile");
    assert.ok(tls < download && download < digest && digest < leftover && leftover < extract && extract < mainJs);
    assert.ok(mainJs < commandLine && commandLine < ready);
    assert.ok(HELPER.includes("-UseBasicParsing"));
    assert.ok(HELPER.includes("SecurityProtocol -bor"), "on top of the defaults");
});

test("waits for PinballY after the ready file, then copies each keep-list entry before the swap", () => {
    const ready = position("Set-Content -Path $ReadyFile");
    const wait = position("Wait-Process -Id $ParentPid -Timeout 60");
    const keep = position("foreach ($name in $KeptFiles)");
    const tools = position("$ShippedTools -notcontains $item.Name");
    const renameOld = position("Rename-Item -LiteralPath $PackFolder -NewName $oldName");
    assert.ok(ready < wait && wait < keep && keep < tools && tools < renameOld);
    for (const entry of [
        "'.env.local'", "'quiet_wheel_pending.json'", "'pack_update.json'", "'script_reader.json'", "'errors.log'", "'errors.old.log'",
        "'play_scores_anomalies.log'", "'play_scores_anomalies.old.log'", "'profiles'", "'assets\\sounds\\local'", "'assets\\images\\default_scores\\local'",
    ]) {
        assert.ok(HELPER.includes(entry), `keeps ${entry}`);
    }
    assert.ok(HELPER.includes("$ShippedTools = @('restart_pinbally.ps1', 'pack_update.ps1', 'script_reader_install.ps1')"), "tools\\ but the shipped helpers");
});

test("renames old before new, renames back on failure, keeps one old copy and starts PinballY again", () => {
    const renameOld = position("Rename-Item -LiteralPath $PackFolder -NewName $oldName");
    const moveNew = position("Move-Item -LiteralPath $newPack -Destination $PackFolder");
    const renameBack = position("Rename-Item -LiteralPath $oldPack -NewName $packName");
    const olderCopies = position("-Filter ($packName + '.old-*')");
    const start = position("Start-Process -FilePath $exe");
    assert.ok(renameOld < moveNew && moveNew < renameBack && renameBack < olderCopies && olderCopies < start);
    assert.ok(position("$ErrorActionPreference = 'Stop'") < renameOld,"a failed rename reaches the catch that puts the old folder back");
    assert.ok(HELPER.includes("if ($updated -and $older.Name -ne $oldName)"), "a failed update keeps the older copies");
    assert.ok(HELPER.includes("'PinballY Admin Mode.exe'"), "started again through Admin Mode when that was the parent");
});

test("is plain ASCII, as Windows PowerShell reads a file without a byte order mark, and ships with the pack", () => {
    assert.ok(/^[\x00-\x7F]*$/.test(HELPER));
    assert.ok(GITIGNORE.includes("!tools/pack_update.ps1"));
});
