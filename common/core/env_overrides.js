// ============================================================
// Merges the KEY=value lines of a .env.local text into the default
// configuration. Keys are the config keys in UPPER_SNAKE_CASE (addOns
// entries take the ADD_ON_ prefix); the expected type comes from the
// default value. Pure: no file access, no logging, defaults left untouched.
// ============================================================

// Prefix of the keys of each configuration section, in the singular so a
// line reads "ADD_ON_ACHIEVEMENTS=false".
const SECTION_PREFIXES = { addOns: "ADD_ON" };

const toUpperSnake = name => name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

// The env key of a configuration key path: "language" gives LANGUAGE,
// "addOns.achievements" gives ADD_ON_ACHIEVEMENTS.
export function envKeyOf(keyPath) {
    const dot = keyPath.indexOf(".");
    if (dot === -1) return toUpperSnake(keyPath);
    const section = keyPath.slice(0, dot);
    return `${SECTION_PREFIXES[section] || toUpperSnake(section)}_${toUpperSnake(keyPath.slice(dot + 1))}`;
}

// A line split at its first "=", trimmed: null for a blank or comment line,
// envKey null for a line with no key before an "=".
export function splitEnvLine(rawLine) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) return null;
    const separator = line.indexOf("=");
    if (separator <= 0) return { line, envKey: null, value: null };
    return { line, envKey: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() };
}

// Maps every env key to where it lives in the configuration.
function buildKeyMap(defaults) {
    const keyMap = new Map();
    for (const [key, value] of Object.entries(defaults)) {
        if (value !== null && typeof value === "object") {
            for (const subKey of Object.keys(value)) {
                keyMap.set(envKeyOf(`${key}.${subKey}`), { section: key, key: subKey });
            }
        } else {
            keyMap.set(envKeyOf(key), { section: null, key });
        }
    }
    return keyMap;
}

function stripQuotes(value) {
    const first = value[0];
    if (value.length >= 2 && (first === "\"" || first === "'") && value[value.length - 1] === first) {
        return value.slice(1, -1);
    }
    return value;
}

// Returns { ok: true, value } or { ok: false } when the text doesn't fit the default's type.
function convert(text, defaultValue) {
    switch (typeof defaultValue) {
        case "boolean": {
            const lower = text.toLowerCase();
            if (lower === "true") return { ok: true, value: true };
            if (lower === "false") return { ok: true, value: false };
            return { ok: false, expected: "true or false" };
        }
        case "number": {
            const number = Number(text);
            if (text.trim() !== "" && Number.isFinite(number)) return { ok: true, value: number };
            return { ok: false, expected: "a number" };
        }
        default:
            return { ok: true, value: text };
    }
}

export function applyEnvOverrides(defaults, text) {
    const config = { ...defaults };
    for (const [key, value] of Object.entries(defaults)) {
        if (value !== null && typeof value === "object") config[key] = { ...value };
    }

    const keyMap = buildKeyMap(defaults);
    const overridden = [];
    const problems = [];
    // The problems that lose a setting the owner wrote; an unknown key may
    // just be one the pack no longer reads.
    const invalidValues = [];

    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    lines.forEach((rawLine, index) => {
        const split = splitEnvLine(rawLine);
        const lineLabel = `line ${index + 1}`;
        if (split === null) return;

        const { line, envKey } = split;
        if (envKey === null) {
            problems.push(`${lineLabel}: expected KEY=value, got "${line}"`);
            return;
        }

        const target = keyMap.get(envKey);
        if (!target) {
            problems.push(`${lineLabel}: unknown key "${envKey}"`);
            return;
        }

        const owner = target.section ? config[target.section] : config;
        const rawValue = stripQuotes(split.value);
        const converted = convert(rawValue, owner[target.key]);
        if (!converted.ok) {
            const problem = `${lineLabel}: invalid value "${rawValue}" for ${envKey} (expected ${converted.expected})`;
            problems.push(problem);
            invalidValues.push(problem);
            return;
        }

        owner[target.key] = converted.value;
        if (!overridden.includes(envKey)) overridden.push(envKey);
    });

    return { config, overridden, problems, invalidValues };
}
