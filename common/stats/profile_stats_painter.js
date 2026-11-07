// ============================================================
// Profile Stats painter: layout and drawing of the Profile Stats (card,
// sections, buttons, Exit Button, Button Hints), in reference pixels, from
// the prototype validated on the cabinet.
// Only drawing: no layer, no event, no side effect.
// - Every label of a row shares one size, the largest at which they all fit.
// ============================================================

import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS } from "../drawing/steamball_palette.js";
import { metalOf, tierMetalOf, tierOf, mix, MAX_MASTERY_LEVEL } from "../mastery/table_mastery.js";
import {
    text, oneLine, fillGradient, fillRounded, glow, drawAvatar, drawAvatarFrame, avatarFrameSide, avatarFrameInset, drawExitButton, exitTooltipRectOf, drawExitTooltip,
    drawButtonHintsBand, buttonHintsFooterRectOf, EXIT_AND_HINTS_METRICS as EXIT_AND_HINTS, drawBackdrop as drawPanelBackdrop, drawWheelLogo,
    measureWidth,
} from "../drawing/steamball_drawing.js";
import { drawMasterySquare, masterySquareSize } from "../mastery/mastery_square.js";

// In the Welcome Screen's band, which never shows at the same time, above
// its own values so each screen's reader sees only its own layers.
export const PROFILE_STATS_Z_INDEX = Object.freeze({ backdrop: 6120, card: 6121, buttons: 6122, sections: 6123, exitButton: 6124, buttonHints: 6125, marker: 6129, tooltips: 6130 });

export const REFERENCE_HEIGHT = 1920;

export const CHOICE = Object.freeze({ EXIT_BUTTON: "exitButton", ACHIEVEMENTS: "achievements", FRAME: "frame", MOST_PLAYED: "mostPlayed", TO_DISCOVER: "toDiscover", HOUSEHOLD: "household" });


const LOOK = Object.freeze({
    pad: 32,
    // The column starts under the Exit Button, exitGap below it; the
    // footer's rule footerGap below the card and the column.
    exitGap: 32, footerGap: 40,
    // The panel's width: a share of the window's, at most maxWidth.
    widthShare: 0.9, maxWidth: 1500,
    // The card: its share of the inner width (narrower in a portrait window,
    // so the column's stats have room), its inset, the gap to the column.
    cardShare: 0.4, portraitCardShare: 0.35, cardInset: 20, columnGap: 36,
    avatar: 190, avatarGap: 12, nameH: 66, nameSize: 34, minNameSize: 24, buttonsGap: 40,
    // The name drawn that much higher than its box, closer to the Avatar.
    nameLift: 12,
    // The card's soft glow, in rings around its frame.
    cardGlow: 6, cardGlowPeak: 0x40,
    // The Player Level block, top down: its title, the digits (their box
    // taller than they are, so the bar sits clear below), the bar, the points.
    playerLevel: Object.freeze({ titleH: 26, titleSize: 17, digitsH: 130, digitsSize: 96, digitsLift: 30, barH: 14, barGap: 12, pointsH: 58, pointsSize: 19 }),
    // The rule, then the Collection Mastery's title and block, its square
    // scaled by squareK.
    ruleH: 31,
    // Inside the block: the side inset, the goal's top (across the block's
    // width, over the square), the square's, bar's and count's tops, the
    // gap from the bar to the square.
    collection: Object.freeze({
        titleH: 34, titleSize: 15, minTitleSize: 12, h: 120, squareK: 1, goalSize: 16, minGoalSize: 13, barH: 10, currentSize: 16,
        inset: 16, goalY: 14, squareY: 48, barY: 67, currentY: 84, barGap: 16,
    }),
    // The buttons' labels share one size, the largest at which they all
    // fit, down to minSize.
    button: Object.freeze({ h: 74, gap: 14, size: 19, minSize: 14, weight: 600, countSize: 19 }),
    // The column: a section title, rows of stats side by side (statGap
    // apart, portraitStatGap in a portrait window), label over value; the
    // labels shrink together down to minLabelSize.
    titleH: 56, titleSize: 19, ruleY: 32, statGap: 24, portraitStatGap: 16, labelSize: 18, minLabelSize: 14,
    valueY: 32, valueSize: 26, minValueSize: 20, rowH: 74,
    sectionGap: 20, rowGap: 18,
    // A stat's pill: beside its value (gap), or under it (underGap); gold
    // when lit, its background the gold mixed that far into the panel. Never
    // wider than its room: its text is cut, at one size for every pill.
    pill: Object.freeze({ h: 30, size: 16, weight: 600, padX: 14, gap: 14, underGap: 16, litMix: 0.78 }),
    // A stat's thin bar under its value (or its pill), short of the
    // column's right edge by inset.
    shareBar: Object.freeze({ h: 6, gap: 8, inset: 24 }),
    // A wide strip under a section's rows (gapAbove, plus its share of the
    // spare height), the next one a fixed gap below: the wheel logo in a box at the left (a share of the column, at
    // most logoMaxW, inset from the strip's edges), the label, the name
    // and the pill beside it, from their tops.
    strip: Object.freeze({
        h: 132, gapAbove: 24, gap: 16, logoShare: 0.3, logoMaxW: 160, logoInsetX: 16, logoInsetY: 8, titleSize: 22, textGap: 16,
        labelY: 16, labelSize: 17, nameY: 40, nameSize: 21, minNameSize: 15, pillY: 87,
    }),
});

// ---------- Layout ----------


const pillWidth = (host, str, maxW = Infinity) => Math.min(maxW, measureWidth(host, str, { size: LOOK.pill.size, weight: LOOK.pill.weight }) + 2 * LOOK.pill.padX);

// A row of stats side by side in the column: every pill goes under its
// value when one does not fit beside its own, so the row stays aligned.
function rowBlock(host, section, stats, columnW, statGap) {
    const { pill, shareBar } = LOOK;
    const colW = Math.round((columnW - statGap * (stats.length - 1)) / stats.length);
    const valueWidth = stat => Math.min(colW, measureWidth(host, stat.value, { size: LOOK.valueSize, weight: 700, font: FONTS.display }));
    const isUnder = stats.some(stat => stat.pill && valueWidth(stat) + pill.gap + pillWidth(host, stat.pill.text) > colW);
    const hasShare = stats.some(stat => stat.share !== undefined);
    const h = LOOK.rowH + (isUnder ? pill.underGap + pill.h : 0) + (hasShare ? shareBar.gap + shareBar.h : 0);
    return { kind: "row", h, section, stats, colW, statGap, isUnder };
}

// The largest label size, down to minLabelSize, at which every row's
// labels fit their stat's width, so the whole column's labels match.
function labelSizeOf(host, rows) {
    const fitsAt = size => rows.every(row => row.stats.every(stat => measureWidth(host, stat.label, { size, weight: 400 }) <= row.colW));
    let size = LOOK.labelSize;
    while (size > LOOK.minLabelSize && !fitsAt(size)) size--;
    return size;
}

// The column's blocks top down; the spare height goes to the gaps only.
function columnBlocks(host, screen, columnW, statGap) {
    const blocks = [];
    screen.sections.forEach((section, index) => {
        if (index > 0) blocks.push({ kind: "gap", h: LOOK.sectionGap, isSpread: true });
        blocks.push({ kind: "title", h: LOOK.titleH, section });
        section.rows.forEach((stats, rowIndex) => {
            if (rowIndex > 0) blocks.push({ kind: "gap", h: LOOK.rowGap, isSpread: true });
            blocks.push(rowBlock(host, section, stats, columnW, statGap));
        });
        // The spare height goes above the strips, never between them: they
        // stay stacked as one group.
        (section.strips || []).forEach((strip, stripIndex) => {
            blocks.push(stripIndex === 0 ? { kind: "gap", h: LOOK.strip.gapAbove, isSpread: true } : { kind: "gap", h: LOOK.strip.gap });
            blocks.push({ kind: "strip", h: LOOK.strip.h, section, strip });
        });
    });
    const rows = blocks.filter(block => block.kind === "row");
    const labelSize = labelSizeOf(host, rows);
    for (const row of rows) row.labelSize = labelSize;
    return blocks;
}

// How wide the card's Avatar Frame is drawn at most, for its image's size.
export const AVATAR_FRAME_WIDTH = avatarFrameSide(LOOK.avatar);

// The Avatar's size, and its frame's margin on every side when it wears
// one: the frame, not only the Avatar, stays within the card's content width.
function avatarOf(screen, contentW) {
    const widest = screen.framePath ? contentW * contentW / avatarFrameSide(contentW) : contentW;
    const size = Math.min(widest, LOOK.avatar);
    return { size, inset: avatarFrameInset(screen.framePath, size) };
}

const playerLevelBlockH = () => {
    const look = LOOK.playerLevel;
    return look.titleH + look.digitsH + look.barH + look.barGap + look.pointsH;
};

const collectionBlockH = () => LOOK.collection.titleH + LOOK.collection.h;

function cardHeight(screen, avatar) {
    const { button } = LOOK;
    // Another Profile's read-only card has no button, nor their gap.
    const buttonsH = screen.buttons.length === 0 ? 0 : LOOK.buttonsGap + screen.buttons.length * (button.h + button.gap) - button.gap;
    const blocksH = playerLevelBlockH() + LOOK.ruleH + collectionBlockH();
    return LOOK.cardInset + avatar.size + 2 * avatar.inset + LOOK.avatarGap + LOOK.nameH + blocksH + buttonsH + LOOK.cardInset;
}

// The panel, the card and the column in a window referenceWidth wide; the
// panel is as tall as the taller of the card and the column, plus the footer.
function geometry(host, referenceWidth, screen) {
    const w = Math.min(Math.round(referenceWidth * LOOK.widthShare), LOOK.maxWidth);
    const innerW = w - 2 * LOOK.pad;
    const isPortrait = referenceWidth < REFERENCE_HEIGHT;
    const cardW = Math.round(innerW * (isPortrait ? LOOK.portraitCardShare : LOOK.cardShare));
    const contentW = cardW - 2 * LOOK.cardInset;
    const avatar = avatarOf(screen, contentW);
    const columnX = LOOK.pad + cardW + LOOK.columnGap;
    const columnW = w - LOOK.pad - columnX;
    const blocks = columnBlocks(host, screen, columnW, isPortrait ? LOOK.portraitStatGap : LOOK.statGap);
    const naturalH = blocks.reduce((sum, block) => sum + block.h, 0);
    const columnTop = EXIT_AND_HINTS.exitButton + LOOK.exitGap;
    const innerH = Math.max(cardHeight(screen, avatar), columnTop + naturalH);
    const spreads = blocks.filter(block => block.isSpread).length;
    const spare = spreads === 0 ? 0 : (innerH - columnTop - naturalH) / spreads;
    let y = columnTop;
    for (const block of blocks) {
        block.y = Math.round(y);
        y += block.h + (block.isSpread ? spare : 0);
    }
    const h = LOOK.pad + innerH + LOOK.footerGap + EXIT_AND_HINTS.footerH;
    const panel = { x: Math.round((referenceWidth - w) / 2), y: Math.round((REFERENCE_HEIGHT - h) / 2), w, h };
    return { panel, innerW, innerH, cardW, contentW, avatar, columnX, columnW, blocks };
}

// The backdrop: the dimmed wheel and the panel, drawn on a window-sized
// canvas whose height is REFERENCE_HEIGHT * scale.
export function drawBackdrop(host, dc, size, referenceWidth, screen) {
    drawPanelBackdrop(dc, size, REFERENCE_HEIGHT, geometry(host, referenceWidth, screen).panel);
}

// A bar on its track, filled to share (0 to 1).
function drawBar(dc, x, y, w, h, share, color) {
    dc.fillRect(x, y, w, h, COLORS.track);
    const filled = Math.round(w * Math.max(0, Math.min(1, share)));
    if (filled > 0) dc.fillRect(x, y, filled, h, color);
}

// The Player Level: its title, the level in big digits, the bar toward the
// next level and the points, centred in the card (cardX, cardW), from y.
function drawPlayerLevel(host, dc, playerLevel, cardX, cardW, contentX, contentW, y) {
    const look = LOOK.playerLevel;
    text(host, dc, playerLevel.title, { x: cardX, y, width: cardW, size: look.titleSize, weight: 700, color: playerLevel.color, font: FONTS.display, align: "center" });
    const digitsY = y + look.titleH;
    text(host, dc, playerLevel.number, { x: cardX, y: digitsY - look.digitsLift, width: cardW, size: look.digitsSize, weight: 700, color: playerLevel.color, font: FONTS.display, align: "center" });
    const barY = digitsY + look.digitsH;
    drawBar(dc, contentX, barY, contentW, look.barH, playerLevel.share, playerLevel.color);
    text(host, dc, playerLevel.current, { x: cardX, y: barY + look.barH + look.barGap, width: cardW, size: look.pointsSize, weight: 600, color: COLORS.description, align: "center" });
}

// The Collection Mastery as the Mastery Bar shows it, stacked to fit the
// card: the goal across the top, then the bar in the tier's metal with the
// current count under its end, and the Collection Tier square on the right. collection: { tier,
// reached, needed, goal, current }, current null at the last tier, whose
// bar is full. At tier 0 the bar and square take level 1's metal, so the
// block is never dull, and the goal is grey.
function drawCollection(host, dc, collection, x, y, w) {
    const look = LOOK.collection;
    const { tier, reached, needed } = collection;
    const lookLevel = Math.max(1, tier);
    dc.fillRect(x, y, w, look.h, COLORS.panelTranslucent);
    dc.frameRect(x, y, w, look.h, 1, COLORS.border);
    const size = masterySquareSize(look.squareK);
    const squareX = x + w - look.inset - size;
    const left = x + look.inset;
    const barW = squareX - look.barGap - left;
    oneLine(host, dc, collection.goal, { x: left, y: y + look.goalY, width: w - 2 * look.inset, size: look.goalSize, minSize: look.minGoalSize, weight: 600, color: tier > 0 ? metalOf(tier) : COLORS.description });
    drawBar(dc, left, y + look.barY, barW, look.barH, tier >= MAX_MASTERY_LEVEL ? 1 : reached / needed, tierMetalOf(tierOf(lookLevel)));
    if (collection.current !== null) oneLine(host, dc, collection.current, { x: left, y: y + look.currentY, width: barW, size: look.currentSize, weight: 600, color: COLORS.description, align: "right" });
    drawMasterySquare(host, dc, tier, squareX, y + look.squareY, look.squareK, lookLevel);
}

// A rounded pill holding pill.text, its left edge at x, from y, at most
// maxW wide; gold when lit.
function drawPill(host, dc, { text: str, isLit }, x, y, maxW) {
    const look = LOOK.pill;
    const w = pillWidth(host, str, maxW);
    fillRounded(dc, x, y, w, look.h, look.h / 2, isLit ? mix(COLORS.gold, COLORS.panel, look.litMix) : COLORS.track);
    oneLine(host, dc, str, {
        x: x + look.padX, y, width: w - 2 * look.padX, height: look.h, size: look.size, weight: look.weight, color: isLit ? COLORS.gold : COLORS.description,
    });
}

// A stat: its label over its value, its pill beside or under the value,
// and its thin gold bar at the bottom.
function drawStat(host, dc, stat, x, y, block) {
    const { pill, shareBar } = LOOK;
    oneLine(host, dc, stat.label, { x, y, width: block.colW, size: block.labelSize, weight: 400, color: COLORS.description });
    const valueW = oneLine(host, dc, stat.value, { x, y: y + LOOK.valueY, width: block.colW, size: LOOK.valueSize, minSize: LOOK.minValueSize, weight: 700, font: FONTS.display });
    const underY = y + LOOK.rowH + pill.underGap;
    if (stat.pill && block.isUnder) drawPill(host, dc, stat.pill, x, underY, block.colW);
    else if (stat.pill) {
        const pillX = Math.round(x + valueW + pill.gap);
        drawPill(host, dc, stat.pill, pillX, y + LOOK.valueY + Math.round((LOOK.rowH - LOOK.valueY - pill.h) / 2), x + block.colW - pillX);
    }
    if (stat.share !== undefined) {
        const barY = (block.isUnder ? underY + pill.h : y + LOOK.rowH) + shareBar.gap;
        drawBar(dc, x, barY, block.colW - shareBar.inset, shareBar.h, stat.share, COLORS.gold);
    }
}

// A strip, columnW wide from y: its tile, label, the table's wheel logo or
// the missing image (its title without either; nothing without a table),
// name and pill.
function drawStrip(host, dc, strip, y, columnW) {
    const look = LOOK.strip;
    fillGradient(dc, 0, y, columnW, look.h, COLORS.rowUnlocked, COLORS.tile);
    dc.frameRect(0, y, columnW, look.h, 1, COLORS.border);
    const logoW = Math.min(look.logoMaxW, Math.round(columnW * look.logoShare));
    const textX = look.logoInsetX + logoW + look.textGap;
    const textW = columnW - textX - look.logoInsetX;
    oneLine(host, dc, strip.label, { x: textX, y: y + look.labelY, width: textW, size: look.labelSize, weight: 400, color: COLORS.description });
    if (strip.hasTable) {
        drawWheelLogo(host, dc, strip, { x: look.logoInsetX, y: y + look.logoInsetY, w: logoW, h: look.h - 2 * look.logoInsetY }, look.titleSize);
    }
    oneLine(host, dc, strip.title, { x: textX, y: y + look.nameY, width: textW, size: look.nameSize, minSize: look.minNameSize, weight: 700, font: FONTS.display });
    if (strip.pill) drawPill(host, dc, strip.pill, textX, y + look.pillY, textW);
}

// A button's room for its label, left of its count.
function buttonLabelWidth(host, entry, w) {
    const { button } = LOOK;
    const countW = entry.count === null ? 0 : measureWidth(host, entry.count, { size: button.countSize, weight: button.weight });
    return w - 52 - countW;
}

// The largest size, down to minSize, at which every button's label fits.
function buttonLabelSize(host, buttons, w) {
    const { button } = LOOK;
    const fitsAt = size => buttons.every(entry => measureWidth(host, entry.label, { size, weight: button.weight }) <= buttonLabelWidth(host, entry, w));
    let size = button.size;
    while (size > button.minSize && !fitsAt(size)) size--;
    return size;
}

// A button: a tile with its label at labelSize, and its count in grey on its right.
function drawButton(host, dc, entry, w, h, labelSize) {
    const { button } = LOOK;
    fillGradient(dc, 0, 0, w, h, COLORS.rowUnlocked, COLORS.tile);
    dc.frameRect(0, 0, w, h, 1, COLORS.border);
    oneLine(host, dc, entry.label, { x: 20, y: 0, width: buttonLabelWidth(host, entry, w), height: h, size: labelSize, weight: button.weight });
    if (entry.count !== null) oneLine(host, dc, entry.count, { x: 20, y: 0, width: w - 40, height: h, size: button.countSize, weight: button.weight, color: COLORS.description, align: "right" });
}

// A section of the column: its title and rule, then its rows of stats.
function drawSection(host, dc, blocks, top, columnW) {
    for (const block of blocks) {
        const y = block.y - top;
        if (block.kind === "title") {
            text(host, dc, block.section.title, { x: 0, y, width: columnW, size: LOOK.titleSize, weight: 700, color: COLORS.gold, font: FONTS.display });
            dc.fillRect(0, y + LOOK.ruleY, columnW, 1, COLORS.border);
        } else if (block.kind === "row") {
            block.stats.forEach((stat, index) => drawStat(host, dc, stat, index * (block.colW + block.statGap), y, block));
        } else if (block.kind === "strip") {
            drawStrip(host, dc, block.strip, y, columnW);
        }
    }
}

// screen: { name, avatarPath, framePath (the worn Avatar Frame's image,
// null for none), playerLevel ({ title, number, color (the
// level's metal), share (0 to 1), current }), collectionTitle, collection (as drawCollection's), buttons (each { choice, label, count: null
// or a string }; none on another Profile's read-only card), sections (each { title, rows: [[{ label, value, pill
// (optional { text, isLit }), share (optional, 0 to 1: a thin gold bar) }]],
// strips (optional: [{ label, hasTable, title, logoPath, pill (null or as a stat's) }]) }),
// exitLook (an EXIT_BUTTON_LOOK), buttonHints (the footer's groups) };
// exitWord: the Exit Button's tooltip, given apart since the painter
// reads no text of its own. Returns the pieces, each { zIndex, rect, draw(dc) } drawn
// in its rect's own coordinates, and the highlight of each choice:
// { target (its own rect), tooltip (a piece shown while it is selected, or null) }.
export function layoutProfileStats(host, screen, referenceWidth, exitWord) {
    const { panel, innerH, cardW, contentW, avatar, columnX, columnW, blocks } = geometry(host, referenceWidth, screen);
    const top = panel.y + LOOK.pad;
    const cardX = panel.x + LOOK.pad;
    // Wider than the card by its glow, on every side.
    const G = LOOK.cardGlow;
    const pieces = [{
        zIndex: PROFILE_STATS_Z_INDEX.card,
        rect: { x: cardX - G, y: top - G, w: cardW + 2 * G, h: innerH + 2 * G },
        draw: dc => {
            fillGradient(dc, G, G, cardW, innerH, COLORS.panelTop, COLORS.tile);
            glow(dc, G, G, cardW, innerH, screen.playerLevel.color, G, LOOK.cardGlowPeak);
            dc.frameRect(G, G, cardW, innerH, 2, screen.playerLevel.color);
            const contentX = G + LOOK.cardInset;
            let y = G + LOOK.cardInset;
            const avatarX = G + Math.round((cardW - avatar.size) / 2);
            y += avatar.inset;
            drawAvatar(dc, screen.avatarPath, avatarX, y, avatar.size);
            drawAvatarFrame(dc, screen.framePath, avatarX, y, avatar.size);
            y += avatar.size + avatar.inset + LOOK.avatarGap;
            oneLine(host, dc, screen.name, {
                x: contentX, y: y - LOOK.nameLift, width: contentW, height: LOOK.nameH,
                size: LOOK.nameSize, minSize: LOOK.minNameSize, weight: 700, color: COLORS.gold, font: FONTS.display, align: "center",
            });
            y += LOOK.nameH;
            drawPlayerLevel(host, dc, screen.playerLevel, G, cardW, contentX, contentW, y);
            y += playerLevelBlockH();
            dc.fillRect(contentX, y, contentW, 1, COLORS.border);
            y += LOOK.ruleH;
            const collection = LOOK.collection;
            oneLine(host, dc, screen.collectionTitle, {
                x: contentX, y, width: contentW, size: collection.titleSize, minSize: collection.minTitleSize, weight: 700, color: COLORS.gold, font: FONTS.display, align: "center",
            });
            drawCollection(host, dc, screen.collection, contentX, y + collection.titleH, contentW);
        },
    }];

    const choiceAt = (target, tooltipShown = null) => ({ target, tooltip: tooltipShown });
    const highlights = {};

    // At the card's foot, whatever the panel's height.
    const { button } = LOOK;
    const buttonSize = buttonLabelSize(host, screen.buttons, contentW);
    let buttonY = top + innerH - LOOK.cardInset - (screen.buttons.length * (button.h + button.gap) - button.gap);
    for (const entry of screen.buttons) {
        const rect = { x: cardX + LOOK.cardInset, y: buttonY, w: contentW, h: button.h };
        pieces.push({ zIndex: PROFILE_STATS_Z_INDEX.buttons, rect, draw: dc => drawButton(host, dc, entry, rect.w, rect.h, buttonSize) });
        highlights[entry.choice] = choiceAt(rect);
        buttonY += button.h + button.gap;
    }

    // One piece per section, down to the next section's title.
    const sectionStarts = blocks.filter(block => block.kind === "title");
    sectionStarts.forEach((start, index) => {
        const next = sectionStarts[index + 1];
        const sectionBlocks = blocks.filter(block => block.section === start.section);
        const sectionH = (next ? next.y : innerH) - start.y;
        pieces.push({
            zIndex: PROFILE_STATS_Z_INDEX.sections,
            rect: { x: panel.x + columnX, y: top + start.y, w: columnW, h: sectionH },
            draw: dc => drawSection(host, dc, sectionBlocks, start.y, columnW),
        });
    });

    const size = EXIT_AND_HINTS.exitButton;
    const exitButton = { x: panel.x + panel.w - LOOK.pad - size, y: top, w: size, h: size };
    pieces.push({
        zIndex: PROFILE_STATS_Z_INDEX.exitButton,
        rect: exitButton,
        draw: dc => drawExitButton(dc, screen.exitLook),
    });
    highlights[CHOICE.EXIT_BUTTON] = choiceAt(exitButton, {
        zIndex: PROFILE_STATS_Z_INDEX.tooltips,
        rect: exitTooltipRectOf(exitButton),
        draw: dc => drawExitTooltip(host, dc, exitWord),
    });

    const footer = buttonHintsFooterRectOf(panel);
    pieces.push({
        zIndex: PROFILE_STATS_Z_INDEX.buttonHints,
        rect: footer,
        draw: dc => drawButtonHintsBand(host, dc, screen.buttonHints, { width: footer.w, height: footer.h }),
    });
    return { pieces, highlights };
}
