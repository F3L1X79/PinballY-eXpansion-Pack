// ============================================================
// Rewrites one key of a .env.local text: every active KEY=value line of that
// key takes the new value, else one line is appended under its comment from
// .env.example. saveEnvSetting writes it to the pack's .env.local and logs it.
// - Comments, blank lines, other keys, BOM and each line's ending stay byte for byte.
// - A key's comment: the # lines right above it, plus the "# false also:" lines right under it.
// - saveEnvSetting throws on a failed read or write: each caller tells the owner its own way.
// ============================================================

import { envKeyOf, splitEnvLine } from "../core/env_overrides.js";

const FALSE_ALSO = "# false also:";

// keyPath: the config key ("offerVpxtool", "addOns.tableRoms"); scriptName: the log line's prefix.
export function saveEnvSetting(host, keyPath, value, scriptName) {
    const folder = host.getProjectFolder();
    const envLocalPath = `${folder}\\.env.local`;
    const examplePath = `${folder}\\.env.example`;
    const text = host.files.fileExists(envLocalPath) ? host.files.readText(envLocalPath) : null;
    const exampleText = host.files.fileExists(examplePath) ? host.files.readText(examplePath) : null;
    if (exampleText === null) host.log(`[${scriptName}] No .env.example in the pack folder: ${envKeyOf(keyPath)} gets no comment if added.`);
    host.files.writeText(envLocalPath, rewriteEnvLine(text, keyPath, value, exampleText));
    host.log(`[${scriptName}] Saved ${envKeyOf(keyPath)}=${value} in .env.local.`);
}

// A missing file (text null) gives that line under its comment, with Windows line endings.
export function rewriteEnvLine(text, keyPath, value, exampleText = null) {
    const envKey = envKeyOf(keyPath);
    const newLine = `${envKey}=${value}`;
    if (text === null || text === undefined) return withComment(newLine, envKey, exampleText, "\r\n");

    // Lines and their endings alternate, so each ending is written back as read.
    const parts = text.split(/(\r?\n)/);
    let found = false;
    for (let index = 0; index < parts.length; index += 2) {
        // Read as the override parser does, past the BOM.
        const bom = index === 0 && parts[0].startsWith("\uFEFF") ? "\uFEFF" : "";
        const split = splitEnvLine(parts[index].slice(bom.length));
        if (split === null || split.envKey !== envKey) continue;
        parts[index] = `${bom}${newLine}`;
        found = true;
    }
    if (found) return parts.join("");

    const lineEnding = text.includes("\r\n") || !text.includes("\n") ? "\r\n" : "\n";
    const body = text.replace(/^\uFEFF/, "");
    const endsLine = body === "" || text.endsWith("\n");
    return `${text}${endsLine ? "" : lineEnding}${withComment(newLine, envKey, exampleText, lineEnding)}`;
}

// The new line with its comment lines, each one ended by lineEnding.
function withComment(newLine, envKey, exampleText, lineEnding) {
    const { above, under } = commentOf(envKey, exampleText);
    return [...above, newLine, ...under].map(line => `${line}${lineEnding}`).join("");
}

function commentOf(envKey, exampleText) {
    const none = { above: [], under: [] };
    if (exampleText === null || exampleText === undefined) return none;
    const lines = exampleText.replace(/^\uFEFF/, "").split(/\r?\n/);
    const keyIndex = lines.findIndex(line => {
        const split = splitEnvLine(line);
        return split !== null && split.envKey === envKey;
    });
    if (keyIndex < 0) return none;

    // A "# false also:" line above belongs to the key before, so it ends the comment.
    let start = keyIndex;
    while (start > 0 && isComment(lines[start - 1]) && !lines[start - 1].trim().startsWith(FALSE_ALSO)) start -= 1;
    let end = keyIndex + 1;
    while (end < lines.length && lines[end].trim().startsWith(FALSE_ALSO)) end += 1;
    return { above: lines.slice(start, keyIndex), under: lines.slice(keyIndex + 1, end) };
}

function isComment(line) {
    return line.trim().startsWith("#");
}
