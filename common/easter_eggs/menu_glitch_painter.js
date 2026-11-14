// ============================================================
// The Menu Glitch's copy of the open Drawn Menu, on a canvas showing part of
// it: PinballY cannot capture the screen, so each strip redraws the panel,
// the texts and the selection. Only drawing: no layer, no event.
// - Entries are plain centred lines: the copy only lives 3 s, torn.
// ============================================================

import { DRAWN_MENU_LOOK as LOOK, ROW_KIND, pointsOf, selectionSize } from "../drawn_menu/drawn_menu_painter.js";
import { STEAMBALL_FONTS as FONTS } from "../drawing/steamball_palette.js";
import { UNBOUNDED } from "../drawing/steamball_drawing.js";

const LINE_WEIGHT = 600;

// box: the part of the menu the canvas shows, in window pixels; view: what
// borrow() gives; textOf(row, index) and colorOf(row, index): a row's text,
// and its colour (null for its own). The footer's index is -1.
export function drawMenuCopy(host, dc, box, view, { textOf, colorOf }) {
    const { geometry, model, scroll } = view;
    const { k } = geometry;

    function image({ file }, rect) {
        if (rect.height < 1 || rect.y + rect.height <= box.y || rect.y >= box.y + box.height) return;
        dc.drawImage(`${view.imagesFolder}\\${file}`, rect.x - box.x, rect.y - box.y, rect.width, rect.height);
    }

    // Top, stretched middle and bottom, as the Drawn Menu places them.
    function stack([top, middle, bottom]) {
        const x = Math.round(geometry.panel.x);
        const topY = Math.round(geometry.panel.y);
        const bottomY = Math.round(geometry.panel.y + geometry.panel.height) - bottom.size.height;
        const middleY = topY + top.size.height;
        image(top, { x, y: topY, ...top.size });
        image(middle, { x, y: middleY, width: top.size.width, height: bottomY - middleY });
        image(bottom, { x, y: bottomY, ...bottom.size });
    }

    function line(str, y, height, color, sizePx, font = FONTS.body) {
        if (y + height <= box.y || y >= box.y + box.height) return;
        const styled = host.createStyledText({ textAlign: "center", textStyle: { font, size: pointsOf(sizePx), weight: LINE_WEIGHT, color } });
        styled.add(str);
        const lineHeight = styled.measure(UNBOUNDED).height;
        styled.draw(dc, { x: geometry.listX - box.x, y: y - box.y + (height - lineHeight) / 2, width: geometry.listWidth, height: lineHeight });
    }

    stack(view.panel);
    const listTop = geometry.contentTop + geometry.areaOffset;
    model.rows.forEach((row, index) => {
        const top = geometry.rowTops[index] - scroll;
        const height = geometry.rowHeights[index];
        if (top < -0.5 || top + height > geometry.areaHeight + 0.5) return;
        const y = listTop + top;
        if (row.kind === ROW_KIND.SEPARATOR) {
            dc.fillRect(geometry.listX + geometry.listWidth / 4 - box.x, Math.round(y + height / 2) - box.y, geometry.listWidth / 2, 1, LOOK.colors.gold);
        } else if (row.kind === ROW_KIND.HEADING) {
            line(textOf(row, index).toLocaleUpperCase(), y, height, colorOf(row, index) || LOOK.colors.heading, LOOK.heading.size * k, FONTS.display);
        } else {
            const ownColor = index === model.selected ? LOOK.colors.gold : LOOK.colors.entry;
            line(textOf(row, index), y, LOOK.rowHeights.entry * k, colorOf(row, index) || ownColor, LOOK.entry.size * k);
        }
    });
    if (model.footer) {
        const footerTop = listTop + geometry.areaHeight + LOOK.rowHeights.separator * k;
        model.footer.forEach(({ label, name }, index) => {
            const footerRow = { title: `${label} ${name}` };
            line(textOf(footerRow, -1), footerTop + index * LOOK.footer.height * k, LOOK.footer.height * k,
                colorOf(footerRow, -1) || LOOK.colors.footerLabel, LOOK.footer.size * k);
        });
    }
    const rowHeight = geometry.rowHeights[model.selected];
    const size = selectionSize(geometry, rowHeight);
    const selectedY = listTop + geometry.rowTops[model.selected] - scroll + rowHeight / 2;
    image(view.outline, { x: geometry.listX - size.margin, y: selectedY - size.height / 2, width: size.width, height: size.height });
    stack(view.glass);
}
