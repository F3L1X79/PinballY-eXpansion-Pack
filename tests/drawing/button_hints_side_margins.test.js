// ============================================================
// The Button Hints in a footer too narrow for them (a portrait panel):
// shrunk so they keep a margin on both sides of the band, never squeezed
// against its edges; the flipper key caps of the six languages fit a wide
// and a tall footer. Draws the footer alone with a host whose texts
// measure in proportion to their size; runs no screen.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { drawButtonHintsBand } from "../../common/drawing/steamball_drawing.js";

// Texts as wide as 0.6 of their size per letter, like a real font.
const host = {
    createStyledText: options => {
        let text = "";
        const size = () => options.textStyle.size + 2 * (options.padding || 0);
        return {
            add: str => { text += str; },
            measure: () => ({ width: text.length * options.textStyle.size * 0.6 + 2 * (options.padding || 0), height: size() }),
            draw: (dc, rect) => dc.drawText(text, rect),
        };
    },
};

const LANGUAGES = ["en", "fr", "de", "es", "it", "pt"];

// One language's lang.buttonHints, read straight from its file.
const buttonHintsOf = async language => (await import(`../../lang/${language}.js`)).default.buttonHints;

const GROUPS = [
    { keys: ["GAUCHE", "DROITE"], label: "PARCOURIR" },
    { keys: ["SELECT"], label: "CHOISIR" },
    { keys: ["EXIT"], label: "FERMER" },
];

// The left and right margins of the hints drawn in a footer of that size,
// and the height of their tallest text (smaller once shrunk to fit).
function marginsOf(groups, { width, height }) {
    const texts = [];
    const dc = { fillRect: () => {}, drawText: (_text, rect) => texts.push(rect) };
    drawButtonHintsBand(host, dc, groups, { width, height });
    const left = Math.min(...texts.map(rect => rect.x));
    const right = Math.max(...texts.map(rect => rect.x + rect.width));
    return { left, right: width - right, textHeight: Math.max(...texts.map(rect => rect.height)) };
}

test("hints too wide for the footer keep a margin on both sides", () => {
    const { left, right } = marginsOf(GROUPS, { width: 960, height: 167 });
    assert.ok(left >= 30, `left margin ${left}`);
    assert.ok(right >= 30, `right margin ${right}`);
});

// The flipper key caps of every language, with that language's longest
// words, on a wide (landscape) and a tall (portrait) screen's footer.
test("the flipper key caps fit a wide and a tall footer in every language", async () => {
    const upper = text => text.toLocaleUpperCase();
    const longer = (a, b) => (b.length > a.length ? b : a);
    for (const language of LANGUAGES) {
        const words = await buttonHintsOf(language);
        const groups = [
            { keys: [upper(words.keyCaps.prev), upper(words.keyCaps.next)], label: upper(longer(words.browse, words.scroll)) },
            { keys: [upper(words.keyCaps.select)], label: upper(words.choose) },
            { keys: [upper(words.keyCaps.exit)], label: upper(longer(words.back, words.close)) },
        ];
        const wide = marginsOf(groups, { width: 2560, height: 167 });
        const tall = marginsOf(groups, { width: 960, height: 167 });
        for (const { left, right } of [wide, tall]) assert.ok(left >= 30 && right >= 30, `${language}: margins ${left}, ${right}`);
        // Shrinking keeps the margins whatever the words: the wide footer
        // must not shrink at all, the tall one only a little.
        assert.equal(wide.textHeight, marginsOf(GROUPS.slice(1), { width: 2560, height: 167 }).textHeight, `${language} shrunk on a wide footer`);
        assert.ok(tall.textHeight >= 0.8 * wide.textHeight, `${language} tall footer text ${tall.textHeight} vs ${wide.textHeight}`);
    }
});

// French keeps "Gauche" / "Droite": the side alone names the flipper.
test("the Prev and Next key caps name the left and right flippers", async () => {
    for (const language of LANGUAGES.filter(language => language !== "fr")) {
        const { prev, next } = (await buttonHintsOf(language)).keyCaps;
        assert.match(prev, /flipper/i, `${language} prev "${prev}"`);
        assert.match(next, /flipper/i, `${language} next "${next}"`);
    }
});
