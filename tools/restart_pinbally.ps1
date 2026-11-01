# ============================================================
# Restarts PinballY for the eXpansion Pack Settings (common/core/pinbally_host.js
# starts it hidden, then runs Quit once the ready file exists).
# 1. While PinballY is alive: reads its executable, command line and parent.
# 2. Writes the ready file.
# 3. Waits for PinballY to end (up to 60 s), then starts it again the same
#    way: PinballY Admin Mode.exe when that was its parent, so PinballY keeps
#    its admin channel; otherwise the same executable, arguments and folder.
# Logs each step to LogFile. See docs/adr/0017.
# ============================================================

param([int]$ParentPid, [string]$ReadyFile, [string]$LogFile)

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

try {
    Log ('---- restart asked by PinballY, pid ' + $ParentPid)
    $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $ParentPid)
    if (-not $p) { Log 'PinballY process not found, no restart'; exit 1 }
    $exe = $p.ExecutablePath
    $arguments = ArgumentsOf $p.CommandLine
    $parent = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $p.ParentProcessId)
    if ($parent -and $parent.Name -eq 'PinballY Admin Mode.exe') {
        $exe = $parent.ExecutablePath
        $arguments = ArgumentsOf $parent.CommandLine
        Log ('started by PinballY Admin Mode: ' + $exe)
    }
    # Not ready without it: PinballY then stays, and shows why after 15 s.
    if (-not $exe) { Log 'executable path not readable, no restart'; exit 1 }
    Log ('to start again: ' + $exe + ' [' + $arguments + ']')

    Set-Content -Path $ReadyFile -Value $PID
    Log 'ready, waiting for PinballY to quit'

    $watch = [Diagnostics.Stopwatch]::StartNew()
    Wait-Process -Id $ParentPid -Timeout 60 -ErrorAction SilentlyContinue
    if (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue) { Log 'PinballY still running after 60 s, no restart'; exit 1 }
    Log ('PinballY gone after ' + $watch.ElapsedMilliseconds + ' ms')
    # As on the cabinet: a short pause before the new instance takes the screens.
    Start-Sleep -Milliseconds 500

    $folder = Split-Path $exe
    if ($arguments) { $started = Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory $folder -PassThru }
    else { $started = Start-Process -FilePath $exe -WorkingDirectory $folder -PassThru }
    Log ('started again, pid ' + $started.Id)
} catch {
    Log ('ERROR ' + $_)
    exit 1
}
