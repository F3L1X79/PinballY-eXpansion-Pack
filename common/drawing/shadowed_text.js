// ============================================================
// Text with a soft drop shadow, drawn into a drawing layer's context, so
// it reads over any background video: the Profile picker, its badge, the
// clock, its Status Icons and the Backglass Clock share the same look. No side effects on import.
// ============================================================

const FONT = "Segoe UI";
// Also the Status Icons' shadow, so they sit in the clock's look.
export const SHADOW = Object.freeze({ color: 0xC0000000, offset: 2 });

// The text's size as drawShadowedText draws it, without drawing it.
export function measureShadowedText(host, { size, weight }, text, width) {
    const styled = host.createStyledText({ textStyle: { font: FONT, size, weight } });
    styled.add(text);
    return styled.measure(width);
}

// Draws the text across a column (the whole width by default), centred
// unless given another alignment; returns the text's measured size.
export function drawShadowedText(host, dc, { size, weight }, color, text, y,
    { x = 0, width = dc.getSize().width, align = "center" } = {}) {
    let measured = null;
    for (const [offset, textColor] of [[SHADOW.offset, SHADOW.color], [0, color]]) {
        const styled = host.createStyledText({ textAlign: align, textStyle: { font: FONT, size, weight, color: textColor } });
        styled.add(text);
        measured = styled.measure(width);
        styled.draw(dc, { x: x + offset, y: y + offset, width, height: measured.height });
    }
    return measured;
}
