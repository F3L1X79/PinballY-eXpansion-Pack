// ============================================================
// Production PinballY host: the single seam through which the shared modules
// reach PinballY (settings, clock, timers, tables, wheel, menus, layers,
// custom windows, sounds, files, programs, restart, HTTP, registry, pipes, logfile.log).
// Every call passes straight through to PinballY's globals; tests use
// tests/support/fake_pinbally_host.js. No side effects on import.
// ============================================================

import { isUntrackedTable } from "./untracked_tables.js";

// Whether a table belongs to the household's visible tables. Unconfigured
// tables never do, whatever "Hide unconfigured games" says: they show a raw
// file name, and their config ID may change once they are set up (spec #405).
// Nor do Untracked Tables, which stay on the wheel all the same.
export const isVisibleTable = game => !game.isHidden && game.isConfigured !== false && !isUntrackedTable(game);

const ADODB_TEXT_TYPE = 2;
const ADODB_READ_ALL = -1;
const ADODB_SAVE_OVERWRITE = 2;
// Behind PinballY's own background layer (z 0), so the probe never shows.
const IMAGE_PROBE_Z_INDEX = -1000;
// GetSystemMetrics index: the number of display monitors on the desktop.
const SM_CMONITORS = 80;
// Scripting.FileSystemObject's GetSpecialFolder id of the user's temporary folder.
const TEMPORARY_FOLDER = 2;
// ShellExecuteW's show command: hidden.
const SW_HIDE = 0;
// ShellExecuteW returns a number above this on success, an error code otherwise.
const SHELL_EXECUTE_MAX_ERROR = 32;
// CreateFileW's arguments for a read that leaves the file open to other
// readers and writers, so VPX never finds it busy.
const GENERIC_READ = 0x80000000;
// As an unsigned DWORD: a bitwise OR alone gives a negative number.
const GENERIC_READ_WRITE = (GENERIC_READ | 0x40000000) >>> 0;
const FILE_SHARE_READ_WRITE = 0x1 | 0x2;
const OPEN_EXISTING = 3;
const FILE_ATTRIBUTE_NORMAL = 0x80;
// Under the user's temporary folder: the wrapper script, each run's files,
// and the helpers' ready files and logs.
const PACK_TEMPORARY_FOLDER_NAME = "PinballYExpansionPack";
// In the pack's tools folder; see their own header for what they do.
const RESTART_HELPER_NAME = "restart_pinbally.ps1";
const PACK_UPDATE_HELPER_NAME = "pack_update.ps1";
const HELPER_POLL_MS = 200;
const RESTART_READY_TIMEOUT_MS = 15000;
// Longer: the Pack Update helper downloads and checks the release first.
const PACK_UPDATE_READY_TIMEOUT_MS = 120000;
// The Pack Update helper's ready file and log, in the pack's temporary folder.
const PACK_UPDATE_FILE_BASE_NAME = "pack-update";
const SCRIPT_READER_INSTALL_HELPER_NAME = "script_reader_install.ps1";
// The Script Reader install helper's log, output and exit code files, in the pack's temporary folder.
const SCRIPT_READER_INSTALL_FILE_BASE_NAME = "script-reader-install";
// The helpers' logs as the owner types them in Explorer's address bar.
export const PACK_UPDATE_LOG_HINT = `%TEMP%\\${PACK_TEMPORARY_FOLDER_NAME}\\${PACK_UPDATE_FILE_BASE_NAME}.log`;
export const SCRIPT_READER_INSTALL_LOG_HINT = `%TEMP%\\${PACK_TEMPORARY_FOLDER_NAME}\\${SCRIPT_READER_INSTALL_FILE_BASE_NAME}.log`;
// Given "<output file>" "<exit code file>" "<program>" "<args>"..., runs the
// program with its standard output in the first file and its standard error
// dropped, then writes its exit code to the second, through a .tmp file
// renamed once closed: that file appearing whole tells the run is over.
// The redirection comes first, since "echo 0> file" would redirect handle 0
// instead of writing "0".
const RUN_WRAPPER = "@echo off\r\n%3 %4 %5 %6 %7 %8 %9 > %1 2> nul\r\n"
    + "> \"%~2.tmp\" echo %errorlevel%\r\nmove /y \"%~2.tmp\" %2 > nul\r\n";
const MAX_PROGRAM_ARGS = 6;
// The pack's fixed folder under Scripts (ADR 0009): never detected at run time.
const PROJECT_FOLDER_NAME = "ExpansionPack";

// setWindowPos flags (WindowObjects.html): the window keeps its place and
// size, and never takes the focus from the running game.
export const SWP_NOSIZE = 0x1;
export const SWP_NOMOVE = 0x2;
const SWP_NOZORDER = 0x4;
const SWP_NOACTIVATE = 0x10;

// Shared with the fake host, which passes its own raw backglass window.
export function backglassRectOf(window) {
    return window.hwndFrame ? { ...window.hwndFrame.getWindowPos().windowRect } : null;
}

// A custom window (CustomWindow.html) as the pack acts on it; hwnd: the
// HWND class, whose TOPMOST and NOTOPMOST place it in the z-order.
// Shared with the fake host, which passes its own raw window and HWND.
export function mediaWindowOf(window, hwnd) {
    return {
        setBorderless: (borderless) => { window.borderlessMode = borderless; },
        // true keeps it shown while a game runs, when PinballY blanks its other windows.
        setShowMediaWhenRunning: (show) => { window.showMediaWhenRunningFlag = show; },
        showWindow: (visible) => { window.showWindow(visible); },
        // In front of every window that isn't topmost itself, or back among them.
        setTopmost: (topmost) => {
            window.setWindowPos(topmost ? hwnd.TOPMOST : hwnd.NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        },
        // The frame's place on the desktop, { left, top, right, bottom }.
        getWindowRect: () => ({ ...window.hwndFrame.getWindowPos().windowRect }),
        // Moves and sizes it without touching its z-order; PinballY saves the
        // new place under its configVarPrefix. Taken in getWindowRect()'s
        // units, not checked on the cabinet (pinbally-help.md §2.1).
        moveTo: ({ left, top, width, height }) => {
            window.setWindowPos(hwnd.TOP, left, top, width, height, SWP_NOZORDER | SWP_NOACTIVATE);
        },
        // Not in the visible window's units (pinbally-help.md §2.1, "Seen on
        // the cabinet"): only its aspect ratio can be trusted.
        getClientSize: () => {
            const { clientRect } = window.hwndView.getWindowPos();
            return { width: clientRect.right - clientRect.left, height: clientRect.bottom - clientRect.top };
        },
        // Its canvas is stretched over the whole window by default.
        createDrawingLayer: (zIndex) => window.createDrawingLayer(zIndex),
    };
}

// The id of PinballY's own "All Tables" filter.
export const ALL_TABLES_FILTER = "All";

// The pack's folder for a PinballY program folder, with no trailing backslash.
export const projectFolderOf = programFolder => `${programFolder.replace(/\\+$/, "")}\\Scripts\\${PROJECT_FOLDER_NAME}`;

// Text through ADODB.Stream, which encodes UTF-8 so accented names and paths
// survive (Scripting.FileSystemObject only knows ANSI and UTF-16).
function openUtf8Stream() {
    const stream = createAutomationObject("ADODB.Stream");
    stream.Type = ADODB_TEXT_TYPE;
    stream.Charset = "utf-8";
    stream.Open();
    return stream;
}

// INVALID_HANDLE_VALUE, (HANDLE)-1, as a hexadecimal string on 32 or 64 bits.
const isInvalidHandle = handle => /^(0x)?f+$/i.test(handle.toString());

// A named pipe opened on a synchronous handle (docs/adr/0022): every call
// returns at once, and null or false means the pipe is gone. createNative:
// dllImport.create. Shared with the fake host, which passes its own kernel32.
export function namedPipeOf(kernel32, handle, createNative) {
    return {
        // The bytes waiting to be read; PeekNamedPipe never waits.
        bytesWaiting: () => {
            const total = createNative("DWORD");
            return kernel32.PeekNamedPipe(handle, null, 0, null, total, null) ? total.value : null;
        },
        // Exactly count bytes, which bytesWaiting() must have reported first:
        // ReadFile would wait for missing ones, freezing PinballY.
        read: (count) => {
            const bytes = new Uint8Array(count);
            const readCount = createNative("DWORD");
            return kernel32.ReadFile(handle, bytes, count, readCount, null) && readCount.value === count ? bytes : null;
        },
        // A Uint8Array in one write.
        write: (bytes) => {
            const writtenCount = createNative("DWORD");
            return Boolean(kernel32.WriteFile(handle, bytes, bytes.length, writtenCount, null)) && writtenCount.value === bytes.length;
        },
        close: () => { kernel32.CloseHandle(handle); },
    };
}

// Opens a named pipe by name, null when it cannot be opened at once: never
// WaitNamedPipeW, which would freeze PinballY up to its timeout. No
// GetLastError either: PinballY never saves it, so "not found" and "busy"
// are one and the same.
function createPipeOpener() {
    // Bound on the first open, then kept.
    let kernel32 = null;
    return (name) => {
        if (!kernel32) {
            kernel32 = dllImport.bind("Kernel32.dll", `
                HANDLE WINAPI CreateFileW(LPCWSTR lpFileName, DWORD dwDesiredAccess, DWORD dwShareMode, LPVOID lpSecurityAttributes, DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes, HANDLE hTemplateFile);
                BOOL WINAPI PeekNamedPipe(HANDLE hNamedPipe, LPVOID lpBuffer, DWORD nBufferSize, DWORD *lpBytesRead, DWORD *lpTotalBytesAvail, DWORD *lpBytesLeftThisMessage);
                BOOL WINAPI ReadFile(HANDLE hFile, UINT8 *lpBuffer, DWORD nNumberOfBytesToRead, DWORD *lpNumberOfBytesRead, LPVOID lpOverlapped);
                BOOL WINAPI WriteFile(HANDLE hFile, UINT8 *lpBuffer, DWORD nNumberOfBytesToWrite, DWORD *lpNumberOfBytesWritten, LPVOID lpOverlapped);
                BOOL WINAPI CloseHandle(HANDLE hObject);
            `);
        }
        // Unshared, no FILE_FLAG_OVERLAPPED: a synchronous handle.
        const handle = kernel32.CreateFileW(name, GENERIC_READ_WRITE, 0, null, OPEN_EXISTING, 0, null);
        return isInvalidHandle(handle) ? null : namedPipeOf(kernel32, handle, type => dllImport.create(type));
    };
}

// A whole file's bytes, read through kernel32: ADODB.Stream and
// Scripting.FileSystemObject only read text. The handle is closed before
// returning, so the file is held for the read alone.
function createByteReader() {
    // Bound on the first read, then kept.
    let kernel32 = null;
    return (path) => {
        if (!kernel32) {
            kernel32 = dllImport.bind("Kernel32.dll", `
                HANDLE WINAPI CreateFileW(LPCWSTR lpFileName, DWORD dwDesiredAccess, DWORD dwShareMode, LPVOID lpSecurityAttributes, DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes, HANDLE hTemplateFile);
                BOOL WINAPI GetFileSizeEx(HANDLE hFile, LONGLONG *lpFileSize);
                BOOL WINAPI ReadFile(HANDLE hFile, UINT8 *lpBuffer, DWORD nNumberOfBytesToRead, DWORD *lpNumberOfBytesRead, LPVOID lpOverlapped);
                BOOL WINAPI CloseHandle(HANDLE hObject);
            `);
        }
        const handle = kernel32.CreateFileW(path, GENERIC_READ, FILE_SHARE_READ_WRITE, null, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, null);
        if (isInvalidHandle(handle)) throw new Error(`Cannot open ${path}.`);
        try {
            const size = dllImport.create("LONGLONG");
            if (!kernel32.GetFileSizeEx(handle, size)) throw new Error(`Cannot read the size of ${path}.`);
            // The value is an Int64 object; its decimal text converts exactly for any file this small.
            const bytes = new Uint8Array(Number(String(size.value)));
            if (bytes.length === 0) return bytes;
            // One read for the whole file: the help does not say whether a
            // subarray passes its own offset, and these files are a few KB.
            const readCount = dllImport.create("DWORD");
            if (!kernel32.ReadFile(handle, bytes, bytes.length, readCount, null) || readCount.value !== bytes.length) {
                throw new Error(`Cannot read ${path} whole.`);
            }
            return bytes;
        } finally {
            kernel32.CloseHandle(handle);
        }
    };
}

function createFileSystem() {
    let fileSystemObject = null;
    const fso = () => {
        if (!fileSystemObject) fileSystemObject = createAutomationObject("Scripting.FileSystemObject");
        return fileSystemObject;
    };

    const readText = (path) => {
        const stream = openUtf8Stream();
        try {
            stream.LoadFromFile(path);
            // ADODB.Stream keeps the UTF-8 byte order mark it writes itself.
            return stream.ReadText(ADODB_READ_ALL).replace(/^\uFEFF/, "");
        } finally {
            stream.Close();
        }
    };
    const writeText = (path, text) => {
        const stream = openUtf8Stream();
        try {
            stream.WriteText(text);
            stream.SaveToFile(path, ADODB_SAVE_OVERWRITE);
        } finally {
            stream.Close();
        }
    };

    return {
        // The names of the folder's sub-folders; none when it doesn't exist.
        listFolders: (folderPath) => {
            if (!fso().FolderExists(folderPath)) return [];
            const names = [];
            for (const folder of fso().GetFolder(folderPath).SubFolders) names.push(folder.Name);
            return names;
        },
        // The names of the folder's files; none when it doesn't exist.
        listFiles: (folderPath) => {
            if (!fso().FolderExists(folderPath)) return [];
            const names = [];
            for (const file of fso().GetFolder(folderPath).Files) names.push(file.Name);
            return names;
        },
        // Each file of the folder as { name, modified (ms), size }; null when
        // the folder doesn't exist.
        listFileInfos: (folderPath) => {
            if (!fso().FolderExists(folderPath)) return null;
            const infos = [];
            for (const file of fso().GetFolder(folderPath).Files) {
                infos.push({ name: file.Name, modified: new Date(file.DateLastModified).getTime(), size: Number(file.Size) });
            }
            return infos;
        },
        fileExists: (path) => fso().FileExists(path),
        folderExists: (path) => fso().FolderExists(path),
        // The whole file as a Uint8Array; throws when it is missing or unreadable.
        readBytes: createByteReader(),
        readText,
        writeText,
        // Read whole and saved again, in UTF-8: ADODB.Stream cannot open a
        // file for appending, and Scripting.FileSystemObject appends in ANSI
        // only. Creates a missing file.
        appendText: (path, text) => { writeText(path, (fso().FileExists(path) ? readText(path) : "") + text); },
        // Throws when the target already exists.
        renameFile: (fromPath, toPath) => { fso().MoveFile(fromPath, toPath); },
        deleteFile: (path) => { fso().DeleteFile(path); },
        // Overwrites the target; its folder must exist.
        copyFile: (fromPath, toPath) => { fso().CopyFile(fromPath, toPath, true); },
        // Does nothing when the folder exists; its parent folder must exist.
        createFolder: (folderPath) => {
            if (!fso().FolderExists(folderPath)) fso().CreateFolder(folderPath);
        },
        // The file's modified date (ms) and size in bytes; null when it doesn't exist.
        getFileInfo: (path) => {
            if (!fso().FileExists(path)) return null;
            const file = fso().GetFile(path);
            // PinballY hands a COM date over as a Date.
            return { modified: new Date(file.DateLastModified).getTime(), size: Number(file.Size) };
        },
        // dc.getImageSize is the only check that decodes the image: it throws
        // on a missing or unreadable file, where drawImage draws nothing
        // without an error. It exists only inside a draw callback, so a
        // throwaway layer behind every other one provides it.
        isImageReadable: (path) => {
            const probe = mainWindow.createDrawingLayer(IMAGE_PROBE_Z_INDEX);
            try {
                let readable = false;
                probe.draw(dc => {
                    try {
                        dc.getImageSize(path);
                        readable = true;
                    } catch (error) {
                        // The answer itself: the caller logs the unreadable image.
                    }
                }, 1, 1);
                return readable;
            } finally {
                mainWindow.removeDrawingLayer(probe);
            }
        },
    };
}

// Numbered across hosts, so two runs never share their files, and named
// after the session's start, so a run of an earlier session never does either.
const RUN_SESSION = Date.now();
let nextRunNumber = 1;

// The pack's folder under the user's temporary folder, created when missing.
function preparePackTemporaryFolder(files) {
    const fso = createAutomationObject("Scripting.FileSystemObject");
    const folder = `${fso.GetSpecialFolder(TEMPORARY_FOLDER).Path}\\${PACK_TEMPORARY_FOLDER_NAME}`;
    files.createFolder(folder);
    return folder;
}

// Starts a program hidden, without waiting: ShellExecuteW returns at once.
// Not WScript.Shell's Run: PinballY's COM bridge does not offer it ("Object
// doesn't support property or method 'Run'" on the cabinet).
function createHiddenStarter() {
    // Bound on the first start, then kept.
    let shell32 = null;
    // what: the program as the error names it.
    return (program, parameters, what = program) => {
        if (!shell32) {
            shell32 = dllImport.bind("Shell32.dll", `
                HINSTANCE WINAPI ShellExecuteW(HWND hwnd, LPCWSTR lpOperation, LPCWSTR lpFile, LPCWSTR lpParameters, LPCWSTR lpDirectory, INT nShowCmd);
            `);
        }
        const instance = shell32.ShellExecuteW(null, "open", program, parameters, null, SW_HIDE).toNumber();
        if (instance <= SHELL_EXECUTE_MAX_ERROR) throw new Error(`ShellExecuteW could not start ${what} (error ${instance}).`);
    };
}

// Runs programs hidden through cmd.exe, which shows no window with
// SW_HIDE; the output and exit code go through files that result() reads
// once the run is over.
function createProgramRunner(files, startHidden) {
    let runFolder = null;

    function prepareRunFolder() {
        if (runFolder) return runFolder;
        const folder = preparePackTemporaryFolder(files);
        // In ANSI through FileSystemObject: the UTF-8 byte order mark
        // ADODB.Stream writes would break the script's first line.
        const wrapper = createAutomationObject("Scripting.FileSystemObject").CreateTextFile(`${folder}\\run.cmd`, true, false);
        try {
            wrapper.Write(RUN_WRAPPER);
        } finally {
            wrapper.Close();
        }
        runFolder = folder;
        return folder;
    }

    return (programPath, args) => {
        if (args.length > MAX_PROGRAM_ARGS) throw new Error(`At most ${MAX_PROGRAM_ARGS} program arguments, not ${args.length}.`);
        const folder = prepareRunFolder();
        const basePath = `${folder}\\run-${RUN_SESSION}-${nextRunNumber++}`;
        const outputPath = `${basePath}.out`;
        const codePath = `${basePath}.code`;
        const quoted = [`${folder}\\run.cmd`, outputPath, codePath, programPath, ...args].map(text => `"${text}"`).join(" ");
        // cmd.exe strips the outer quotes and keeps each quoted argument.
        startHidden("cmd.exe", `/d /c "${quoted}"`, `cmd.exe for ${programPath}`);

        let result = null;
        return { result: runResultReader(files, codePath, outputPath) };
    };
}

// Reads a hidden run's exit code file, written last, then its output file:
// null while the run goes on, then { exitCode, output }, the files deleted.
function runResultReader(files, codePath, outputPath) {
    let result = null;
    return () => {
        if (result) return result;
        if (!files.fileExists(codePath)) return null;
        const code = files.readText(codePath).trim();
        if (!/^-?\d+$/.test(code)) throw new Error(`Not an exit code in ${codePath}: "${code}"`);
        const output = files.fileExists(outputPath) ? files.readText(outputPath) : "";
        result = { exitCode: Number(code), output };
        files.deleteFile(codePath);
        if (files.fileExists(outputPath)) files.deleteFile(outputPath);
        return result;
    };
}

// The powershell.exe parameters that run a helper of tools\ hidden, with
// its arguments ({ name: value }).
function helperParameters(helperName, helperArgs, errorLabel) {
    const helperPath = `${projectFolderOf(systemInfo.programDir)}\\tools\\${helperName}`;
    // A quote would end the argument early and pass the rest as others.
    const quoted = Object.entries(helperArgs).find(([, value]) => String(value).includes("\""));
    if (quoted) throw new Error(`A quote in the ${errorLabel}'s -${quoted[0]} argument.`);
    const args = Object.entries(helperArgs).map(([name, value]) => ` -${name} ${typeof value === "number" ? value : `"${value}"`}`).join("");
    return `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${helperPath}"${args}`;
}

// Runs the Script Reader install helper hidden while PinballY goes on; it
// writes its output, then its exit code, as a hidden program run does.
function createScriptReaderInstaller(files, startHidden) {
    return ({ zipUrl, sha256, version }) => {
        const folder = preparePackTemporaryFolder(files);
        const basePath = `${folder}\\${SCRIPT_READER_INSTALL_FILE_BASE_NAME}-${RUN_SESSION}-${nextRunNumber++}`;
        const outputPath = `${basePath}.out`;
        const codePath = `${basePath}.code`;
        startHidden("powershell.exe", helperParameters(SCRIPT_READER_INSTALL_HELPER_NAME, {
            LogFile: `${folder}\\${SCRIPT_READER_INSTALL_FILE_BASE_NAME}.log`, OutputFile: outputPath, CodeFile: codePath,
            ZipUrl: zipUrl, Sha256: sha256, Version: version, ToolsFolder: `${projectFolderOf(systemInfo.programDir)}\\tools`,
        }, "Script Reader install helper"), "the Script Reader install helper");
        return { result: runResultReader(files, codePath, outputPath) };
    };
}

// Quits PinballY for a PowerShell helper of tools\, started hidden as
// PinballY's own child, which outlives its Quit (no WMI needed, as tried on
// the cabinet). The helper reads PinballY's command line while it is alive,
// so Quit runs only once its ready file exists; onFailed after readyTimeoutMs
// without it (docs/adr/0017).
function createHelperQuitter(files, startHidden, getProcessId, { helperName, fileBaseName, readyTimeoutMs, errorLabel }) {
    // helperArgs: the helper's own arguments after the common ones, { name: value }.
    return ({ onQuitting, onFailed }, helperArgs = {}) => {
        const folder = preparePackTemporaryFolder(files);
        const readyPath = `${folder}\\${fileBaseName}-ready`;
        // Left by an earlier start that never quit.
        if (files.fileExists(readyPath)) files.deleteFile(readyPath);
        startHidden("powershell.exe", helperParameters(helperName, {
            ParentPid: getProcessId(), ReadyFile: readyPath, LogFile: `${folder}\\${fileBaseName}.log`, ...helperArgs,
        }, errorLabel));
        let waitedMs = 0;
        const poll = setInterval(() => {
            waitedMs += HELPER_POLL_MS;
            try {
                if (files.fileExists(readyPath)) {
                    clearInterval(poll);
                    onQuitting();
                    mainWindow.doCommand(command.Quit);
                } else if (waitedMs >= readyTimeoutMs) {
                    clearInterval(poll);
                    onFailed(new Error(`The ${errorLabel} was not ready after ${readyTimeoutMs / 1000} s.`));
                }
            } catch (error) {
                // A poll that fails would fail again every 200 ms.
                clearInterval(poll);
                onFailed(error);
            }
        }, HELPER_POLL_MS);
    };
}

// The sound rotations by file path, one set per PinballY session (its COM
// factory): every screen playing Next.wav shares the same players instead
// of creating its own.
const soundRotationsBySession = new WeakMap();

function requireSoundFile(filePath) {
    if (!createAutomationObject("Scripting.FileSystemObject").FileExists(filePath)) {
        throw new Error(`Sound file not found: ${filePath}`);
    }
}

let randomSource = Math.random;

// True during a playGame() call of the pack: PinballY fires "prelaunch"
// synchronously inside it (pinbally-help.md §3, Timing).
let isPackLaunching = false;

// Only for the tests' fake host: Math is no PinballY global it could replace,
// and every module making its own host would otherwise really draw.
export function setRandomSource(source) {
    randomSource = source;
}

export function createPinballYHost() {
    // Created on the first sound played: most sessions never play one.
    let mediaPlayer = null;
    // Bound on the first monitor count, then kept.
    let user32 = null;
    // Bound on the first process id asked, then kept.
    let processKernel32 = null;
    const getProcessId = () => {
        if (!processKernel32) processKernel32 = dllImport.bind("Kernel32.dll", "DWORD WINAPI GetCurrentProcessId();");
        return Number(processKernel32.GetCurrentProcessId());
    };
    const files = createFileSystem();
    const startHidden = createHiddenStarter();

    return {
        settings: {
            getString: (key, defaultValue) => optionSettings.get(key, defaultValue),
            getInt: (key, defaultValue) => optionSettings.getInt(key, defaultValue),
            getFloat: (key, defaultValue) => optionSettings.getFloat(key, defaultValue),
            getBool: (key, defaultValue) => optionSettings.getBool(key, defaultValue),
            set: (key, value) => { optionSettings.set(key, value); },
        },
        // The settings' own events, such as "settingsreload".
        onSettingsEvent: (eventName, handler) => { optionSettings.on(eventName, handler); },

        now: () => new Date(),
        setTimeout: (callback, ms) => setTimeout(callback, ms),
        clearTimeout: (id) => { clearTimeout(id); },
        setInterval: (callback, ms) => setInterval(callback, ms),
        clearInterval: (id) => { clearInterval(id); },

        getVisibleTables: () => gameList.getAllGames().filter(isVisibleTable),
        // Hidden and unconfigured tables included.
        getAllTables: () => gameList.getAllGames(),
        // The current wheel selection in wheel order: index 0 is the current table.
        getWheelTables: () => gameList.getAllWheelGames(),
        // The current table alone, without listing the whole selection; null
        // when the wheel selection is empty.
        getCurrentTable: () => gameList.getWheelGame(0) || null,
        getGameInfo: (configId) => gameList.getGameInfo(configId),
        // The table's wheel logo file, null when it has none.
        getWheelImage: (game) => {
            const found = game.resolveMedia("wheel image", true);
            return found && found.length > 0 ? found[0] : null;
        },
        // Doesn't fire "filterselect"; fires "gameselect" only when the
        // current table has to change.
        setCurrentFilter: (filterId) => { gameList.setCurFilter(filterId); },
        // PinballY prefixes the id with "User."; a filter without a group is
        // listed in no filter menu. Returns its command ID.
        createFilter: (desc) => gameList.createFilter(desc),
        // The filter by its id ("All", "User.<id>"...); its cmd is its main
        // menu item's command, for this session only.
        getFilterInfo: (filterId) => gameList.getFilterInfo(filterId),
        getCurrentFilterId: () => gameList.getCurFilter().id,
        // The current filter's title as PinballY's menus show it, in English
        // (FilterInfo.title; FilterInfo has no menuTitle): for display only,
        // never to recognise a filter by.
        getCurrentFilterTitle: () => gameList.getCurFilter().title,
        // The command of the main menu item opening the current filter's
        // group (FilterByEra...); undefined for a top-level filter.
        getCurrentFilterGroupCmd: () => gameList.getCurFilter().groupCmd,
        // Runs the current filter again, before() included.
        refreshFilter: () => { gameList.refreshFilter(); },
        // Always on top of the current filter, in effect at once; returns its id.
        createMetaFilter: (desc) => gameList.createMetaFilter(desc),
        // Makes the table at this wheel offset the current one, instantly:
        // no spin animation, no sound, no "gameselect".
        setWheelGame: (offset) => { gameList.setWheelGame(offset, { animate: false }); },

        // Only the mode name ("wheel", "menu", "popup", "running", "attract").
        getUIMode: () => mainWindow.getUIMode().mode,
        // The whole UI mode object; runMode is present only while a game
        // starts, runs or exits.
        getFullUIMode: () => mainWindow.getUIMode(),
        showMenu: (id, items, options) => { mainWindow.showMenu(id, items, options); },
        on: (eventName, handler) => { mainWindow.on(eventName, handler); },
        // The game list's own events, such as "gameselect" or "filterselect".
        onGameListEvent: (eventName, handler) => { gameList.on(eventName, handler); },
        createDrawingLayer: (zIndex) => mainWindow.createDrawingLayer(zIndex),
        removeDrawingLayer: (layer) => { mainWindow.removeDrawingLayer(layer); },
        // The main window's view size, read without drawing anything; only
        // compared with itself to tell a change (PinballY tells no script):
        // the layers measure the window through a drawing context.
        getViewSize: () => {
            const { clientRect } = mainWindow.hwndView.getWindowPos();
            return { width: clientRect.right - clientRect.left, height: clientRect.bottom - clientRect.top };
        },
        // Fires no "underlaychange".
        setUnderlay: (filePath) => { mainWindow.setUnderlay(filePath); },
        // The wheel's icons, hidden or shown again.
        showWheel: (visible) => { mainWindow.showWheel(visible); },
        // The launch overlay's background layer: exists only during a launch,
        // cannot be removed, moved or resized.
        getLaunchOverlayBackground: () => mainWindow.launchOverlay.bg,
        // The image PinballY would pick for a global media file, such as
        // ("Images", "underlay"): the media folder first, then PinballY's
        // Assets folder; undefined when neither has one.
        resolveGlobalImage: (subfolder, baseName) => gameList.resolveMedia(subfolder, baseName, "image"),
        // A .wav file found as PinballY finds its own, such as a button sound
        // the owner replaced in Media\Button Sounds; undefined when none.
        resolveGlobalSound: (subfolder, baseName) => gameList.resolveMedia(subfolder, baseName, "wave"),
        createStyledText: (options) => new StyledText(options),

        allocateCommand: (name) => command.allocate(name),
        // PinballY's own command IDs, such as "PlayGame" or "MenuReturn".
        getBuiltInCommand: (name) => command[name],
        doCommand: (id) => { mainWindow.doCommand(id); },
        // A mapped button pressed then released, as by the player, such as
        // "Exit" to close the native menu shown; fires no "commandbuttondown".
        pressButton: (name) => {
            mainWindow.doButtonCommand(name, true, 0);
            mainWindow.doButtonCommand(name, false, 0);
        },
        // As a menu entry or a button runs it: "command" first, then
        // PinballY's own handling unless a listener prevented it.
        // doCommand() alone fires no "command" (JsDoCommand skips
        // FireCommandEvent), so a script's own command would do nothing.
        runCommand: (id) => {
            if (mainWindow.dispatchEvent(new CommandEvent(id))) mainWindow.doCommand(id);
        },
        playGame: (game) => {
            isPackLaunching = true;
            try {
                mainWindow.playGame(game);
            } finally {
                isPackLaunching = false;
            }
        },
        // Read in "prelaunch": true for a launch any host of the pack started
        // (Random Game, a table a screen offered), false for the player's own.
        isLaunchStartedByPack: () => isPackLaunching,

        // drawImage resolves relative paths from this folder, not from Scripts/.
        getProgramFolder: () => systemInfo.programDir,
        // Where the pack keeps its settings, Profiles and assets.
        getProjectFolder: () => projectFolderOf(systemInfo.programDir),
        // { display, semantic, build, ... }: read the release status from semantic
        // (docs/pinbally/pinbally-help.md §2.10).
        getPinballYVersion: () => systemInfo.version,
        // Read again on each call: a screen can be plugged in or out while
        // PinballY runs.
        countMonitors: () => {
            if (!user32) user32 = dllImport.bind("User32.dll", "int WINAPI GetSystemMetrics(int nIndex);");
            return user32.GetSystemMetrics(SM_CMONITORS);
        },
        showBackglass: (visible) => { backglassWindow.showWindow(visible); },
        // The backglass window's frame on the desktop, { left, top, right,
        // bottom }, the backglass screen on a cabinet; null without a frame.
        getBackglassWindowRect: () => backglassRectOf(backglassWindow),
        // The backglass window's own layers, drawn over its picture or video.
        createBackglassDrawingLayer: (zIndex) => backglassWindow.createDrawingLayer(zIndex),
        removeBackglassDrawingLayer: (layer) => { backglassWindow.removeDrawingLayer(layer); },
        // desc: createMediaWindow's (MainWindowObject.html); see mediaWindowOf().
        createMediaWindow: (desc) => mediaWindowOf(mainWindow.createMediaWindow(desc), HWND),
        // From 0 to 1, for a rare draw or an effect's: here so that the tests'
        // fake host never wins one in a scenario about something else.
        random: () => randomSource(),
        // Through the Windows Media Player COM component, like the launch
        // sound; throws when it is unavailable or the file is missing
        // (Windows Media Player itself fails silently on a missing file).
        playSound: (filePath) => {
            requireSoundFile(filePath);
            if (!mediaPlayer) {
                const player = createAutomationObject("WMPlayer.OCX.7");
                player.settings.autoStart = true;
                mediaPlayer = player;
            }
            mediaPlayer.URL = filePath;
        },
        // For a short sound played in quick succession: its players, loaded
        // once, play it in turn. Restarting a player still playing blocks
        // PinballY for 60 to 130 ms, while one at rest starts in a few.
        // Shared by every caller asking for the same file, with the player
        // count of the first. play(volume) takes 0 to 100, 100 when omitted.
        // Throws like playSound().
        createSoundRotation: (filePath, playerCount) => {
            if (!soundRotationsBySession.has(createAutomationObject)) soundRotationsBySession.set(createAutomationObject, new Map());
            const rotations = soundRotationsBySession.get(createAutomationObject);
            if (rotations.has(filePath)) return rotations.get(filePath);
            requireSoundFile(filePath);
            const players = [];
            for (let index = 0; index < playerCount; index++) {
                const player = createAutomationObject("WMPlayer.OCX.7");
                player.settings.autoStart = false;
                player.URL = filePath;
                players.push(player);
            }
            let next = 0;
            const rotation = {
                play: (volume = 100) => {
                    const player = players[next];
                    next = (next + 1) % players.length;
                    player.settings.volume = volume;
                    player.controls.currentPosition = 0;
                    player.controls.play();
                },
            };
            rotations.set(filePath, rotation);
            return rotation;
        },
        // A sound played over and over until stopped, on its own player,
        // loaded at once so that play() starts it in a few ms. Throws like playSound().
        createLoopingSound: (filePath) => {
            requireSoundFile(filePath);
            const player = createAutomationObject("WMPlayer.OCX.7");
            player.settings.autoStart = false;
            player.settings.setMode("loop", true);
            player.URL = filePath;
            return {
                play: () => {
                    player.controls.currentPosition = 0;
                    player.controls.play();
                },
                stop: () => { player.controls.stop(); },
            };
        },
        // Runs the program hidden, without waiting; returns { result() },
        // null while it runs, then { exitCode, output } (its standard output;
        // its standard error is dropped). At most MAX_PROGRAM_ARGS arguments.
        runHiddenProgram: createProgramRunner(files, startHidden),
        // Quits PinballY for a helper to start it again, as it was started;
        // onQuitting() runs right before Quit, onFailed(error) instead when
        // the helper cannot get ready, PinballY then staying open.
        restartPinballY: createHelperQuitter(files, startHidden, getProcessId, {
            helperName: RESTART_HELPER_NAME, fileBaseName: "restart", readyTimeoutMs: RESTART_READY_TIMEOUT_MS, errorLabel: "restart helper",
        }),
        // Quits PinballY, as restartPinballY() does, for the Pack Update
        // helper to download zipUrl, check its sha256 and install packVersion
        // over the pack folder, then start PinballY again.
        startPackUpdate: (() => {
            const quitForHelper = createHelperQuitter(files, startHidden, getProcessId, {
                helperName: PACK_UPDATE_HELPER_NAME, fileBaseName: PACK_UPDATE_FILE_BASE_NAME, readyTimeoutMs: PACK_UPDATE_READY_TIMEOUT_MS, errorLabel: "Pack Update helper",
            });
            return ({ zipUrl, sha256, packVersion, onQuitting, onFailed }) => quitForHelper({ onQuitting, onFailed }, {
                ZipUrl: zipUrl, Sha256: sha256, PackVersion: packVersion, PackFolder: projectFolderOf(systemInfo.programDir),
            });
        })(),
        // Starts the Script Reader install helper hidden, PinballY staying
        // open: it downloads zipUrl, checks its sha256 and swaps vpxtool.exe
        // of version into tools\. Returns { result() } as runHiddenProgram
        // does: exit code 0 once installed, the old vpxtool.exe kept otherwise.
        installScriptReader: createScriptReaderInstaller(files, startHidden),
        // A GET through PinballY's HttpRequest (MSXML), always asynchronous:
        // a synchronous one freezes PinballY. A Promise of the reply text,
        // rejected for any status but 200.
        httpGet: (url, headers = {}) => {
            const request = new HttpRequest();
            request.open("GET", url, true);
            for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
            return request.send();
        },
        // A registry value by its full path ("HKCU\\Software\\...\\name");
        // null when it is missing.
        readRegistryValue: (path) => {
            const shell = createAutomationObject("WScript.Shell");
            let value;
            try {
                value = shell.RegRead(path);
            } catch (error) {
                // A method PinballY's COM bridge does not offer throws a
                // TypeError, which must not pass for a missing value.
                if (error instanceof TypeError) throw error;
                // RegRead throws on a missing value: that is the answer.
                return null;
            }
            return String(value);
        },
        // A named pipe ("\\\\?\\pipe\\..."), null when it cannot be opened at
        // once; see namedPipeOf() for its calls.
        openPipe: createPipeOpener(),
        getProcessId,
        files,
        log: (text) => { logfile.log(text); },
    };
}
