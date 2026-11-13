# ============================================================
# Pack Update helper (common/core/pinbally_host.js starts it hidden, then
# runs Quit once the ready file exists). See docs/adr/0018 and 0017.
# 1. While PinballY runs: downloads ZipUrl, checks its SHA-256, extracts it
#    to ExpansionPack.new next to the pack folder, reads how PinballY was
#    started, then writes the ready file. A failure here leaves PinballY running.
# 2. Once PinballY quits: copies the player's data into the new folder,
#    renames the pack folder to ExpansionPack.old-<date> and the new one in
#    its place (renaming back on failure), keeps only that one old copy.
# 3. Starts PinballY again the way it was started, whether the update worked or not.
# Logs each step to LogFile (%TEMP%\PinballYExpansionPack\pack-update.log). Windows PowerShell 5.1, ASCII only.
# ============================================================

param([int]$ParentPid, [string]$ReadyFile, [string]$LogFile, [string]$ZipUrl, [string]$Sha256, [string]$PackVersion, [string]$PackFolder)

# Rename-Item, Move-Item and Copy-Item fail without throwing otherwise: no catch would see them.
$ErrorActionPreference = 'Stop'

# The player's data, copied from the old folder into the new one.
$KeptFiles = @('.env.local', 'quiet_wheel_pending.json', 'pack_update.json', 'script_reader.json')
$KeptFolders = @('profiles', 'logs', 'assets\sounds\local', 'assets\images\default_scores\local')
# tools\ is kept but for these, which the release ships.
$ShippedTools = @('restart_pinbally.ps1', 'pack_update.ps1', 'script_reader_install.ps1')

function Log([string]$Text) {
    Add-Content -Path $LogFile -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff') + ' ' + $Text)
}

# The arguments of a command line, without its program, quoted or not.
function ArgumentsOf([string]$CommandLine) {
    if (-not $CommandLine) { return '' }
    if ($CommandLine.StartsWith('"')) { return $CommandLine.Substring($CommandLine.IndexOf('"', 1) + 1).Trim() }
    if ($CommandLine.IndexOf(' ') -gt 0) { return $CommandLine.Substring($CommandLine.IndexOf(' ') + 1).Trim() }
    return ''
}

# Copies a file or a whole folder of the old pack into the new one, over what the release ships.
function Keep([string]$From, [string]$To) {
    if (-not (Test-Path -LiteralPath $From)) { return }
    $parent = Split-Path $To
    if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
    if (Test-Path -LiteralPath $From -PathType Container) {
        if (-not (Test-Path -LiteralPath $To)) { New-Item -ItemType Directory -Path $To | Out-Null }
        # Piped, not a wildcard path: a [ or ] in a Profile or sound name stays literal.
        Get-ChildItem -LiteralPath $From -Force | Copy-Item -Destination $To -Recurse -Force
    } else {
        Copy-Item -LiteralPath $From -Destination $To -Force
    }
    Log ('kept ' + $From.Substring($PackFolder.Length + 1))
}

$scripts = Split-Path $PackFolder
$packName = Split-Path $PackFolder -Leaf
$newRoot = Join-Path $scripts ($packName + '.new')
# The release zip's top folder is already named ExpansionPack.
$newPack = Join-Path $newRoot 'ExpansionPack'
$zip = Join-Path (Split-Path $LogFile) 'ExpansionPack.zip'

try {
    Log ('---- Pack Update to ' + $PackVersion + ' asked by PinballY, pid ' + $ParentPid)
    # Windows PowerShell 5.1 may still offer only TLS 1.0, which GitHub refuses.
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    # The progress bar slows Invoke-WebRequest down many times over, even hidden.
    $ProgressPreference = 'SilentlyContinue'
    Log ('downloading ' + $ZipUrl)
    Invoke-WebRequest -Uri $ZipUrl -OutFile $zip -UseBasicParsing
    $digest = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($digest -ne $Sha256.ToLowerInvariant()) { Log ('SHA-256 ' + $digest + ' is not the expected ' + $Sha256 + ', no update'); exit 1 }
    Log 'SHA-256 checked'

    if (Test-Path -LiteralPath $newRoot) {
        Remove-Item -LiteralPath $newRoot -Recurse -Force
        Log ('leftover ' + $newRoot + ' removed')
    }
    Expand-Archive -LiteralPath $zip -DestinationPath $newRoot
    Remove-Item -LiteralPath $zip -Force
    if (-not (Test-Path -LiteralPath (Join-Path $newPack 'main.js'))) { Log 'no ExpansionPack\main.js in the zip, no update'; exit 1 }
    Log ('extracted to ' + $newRoot)

    $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $ParentPid)
    if (-not $p) { Log 'PinballY process not found, no update'; exit 1 }
    $exe = $p.ExecutablePath
    $arguments = ArgumentsOf $p.CommandLine
    $parent = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $p.ParentProcessId)
    if ($parent -and $parent.Name -eq 'PinballY Admin Mode.exe') {
        $exe = $parent.ExecutablePath
        $arguments = ArgumentsOf $parent.CommandLine
        Log ('started by PinballY Admin Mode: ' + $exe)
    }
    # Not ready without it: PinballY then stays, and shows the failure.
    if (-not $exe) { Log 'executable path not readable, no update'; exit 1 }
    Log ('to start again: ' + $exe + ' [' + $arguments + ']')

    Set-Content -Path $ReadyFile -Value $PID
    Log 'ready, waiting for PinballY to quit'
} catch {
    Log ('ERROR ' + $_ + ', no update: PinballY stays')
    exit 1
}

$watch = [Diagnostics.Stopwatch]::StartNew()
Wait-Process -Id $ParentPid -Timeout 60 -ErrorAction SilentlyContinue
# Still running: nothing to swap or start again.
if (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue) { Log 'PinballY still running after 60 s, no update'; exit 1 }
Log ('PinballY gone after ' + $watch.ElapsedMilliseconds + ' ms')
# As on the cabinet: a short pause, so PinballY's files are let go.
Start-Sleep -Milliseconds 500

$oldName = $packName + '.old-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss')
$oldPack = Join-Path $scripts $oldName
$updated = $false
try {
    foreach ($name in $KeptFiles) { Keep (Join-Path $PackFolder $name) (Join-Path $newPack $name) }
    # profiles\ whole: the player's Guest Avatar replaces the shipped one.
    foreach ($name in $KeptFolders) { Keep (Join-Path $PackFolder $name) (Join-Path $newPack $name) }
    $tools = Join-Path $PackFolder 'tools'
    if (Test-Path -LiteralPath $tools) {
        foreach ($item in Get-ChildItem -LiteralPath $tools -Force) {
            if ($ShippedTools -notcontains $item.Name) { Keep $item.FullName (Join-Path $newPack ('tools\' + $item.Name)) }
        }
    }

    Rename-Item -LiteralPath $PackFolder -NewName $oldName
    Log ('previous version kept as ' + $oldPack)
    try {
        Move-Item -LiteralPath $newPack -Destination $PackFolder
    } catch {
        Rename-Item -LiteralPath $oldPack -NewName $packName
        Log 'previous version put back'
        throw
    }
    $updated = $true
    Log ('updated to ' + $PackVersion)
} catch {
    Log ('ERROR ' + $_ + ', the previous version stays')
}

try {
    if (Test-Path -LiteralPath $newRoot) { Remove-Item -LiteralPath $newRoot -Recurse -Force }
    # Only after a swap: a failed update never deletes the last good copy.
    foreach ($older in Get-ChildItem -LiteralPath $scripts -Directory -Filter ($packName + '.old-*')) {
        if ($updated -and $older.Name -ne $oldName) {
            Remove-Item -LiteralPath $older.FullName -Recurse -Force
            Log ('older copy removed: ' + $older.Name)
        }
    }
} catch {
    Log ('ERROR cleaning up: ' + $_)
}

try {
    $folder = Split-Path $exe
    if ($arguments) { $started = Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory $folder -PassThru }
    else { $started = Start-Process -FilePath $exe -WorkingDirectory $folder -PassThru }
    Log ('started again, pid ' + $started.Id)
} catch {
    Log ('ERROR ' + $_)
    exit 1
}
