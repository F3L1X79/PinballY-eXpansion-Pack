// ============================================================
// The lower status line's messages without their position, in the six
// languages: no "Table n/total", each starting with a capital (or a figure),
// and the same messages as with the position.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import en from "../../lang/en.js";
import fr from "../../lang/fr.js";
import de from "../../lang/de.js";
import es from "../../lang/es.js";
import it from "../../lang/it.js";
import pt from "../../lang/pt.js";

const LANGUAGES = { en, fr, de, es, it, pt };
// Each message's values after the position.
const VALUES = {
    manufacturer: [], manufacturerFictional: [], playCount: [3], playTime: [2, 5], year: [],
    householdRating: [3.5, 2], yourRating: [4], noRating: [],
};

for (const [language, lang] of Object.entries(LANGUAGES)) {
    test(`${language}: every lower status line message reads without its position`, () => {
        const withPosition = lang.tableInfoStatusLines;
        const withoutPosition = lang.tableInfoStatusLinesNoPosition;
        assert.deepEqual(Object.keys(withoutPosition).sort(), Object.keys(withPosition).sort());
        for (const [key, message] of Object.entries(withoutPosition)) {
            const text = message(...VALUES[key]);
            assert.doesNotMatch(text, /\[Filter\.Count\]/, `${key}: no position`);
            assert.match(text, /^[\p{Lu}\d]/u, `${key}: "${text}" starts with a capital`);
            const positioned = withPosition[key](17, ...VALUES[key]);
            assert.equal(positioned.slice(positioned.indexOf(" - ") + 3).toLowerCase(), text.toLowerCase(), `${key}: the same message`);
        }
    });
}
