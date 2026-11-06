// ============================================================
// The hidden layer rule on the fake PinballY host: a hidden layer (alpha 0)
// is reduced to a point, a visible one is not. Shared by every test that
// checks a screen at rest. Never loaded by PinballY.
// ============================================================

export const POINT_SPAN = Object.freeze({ xSpan: 0.001, ySpan: 0.001 });

// A span left out is computed from the canvas's aspect: not a point.
export function isPoint(layer) {
    const { xSpan, ySpan } = layer.scale();
    return xSpan !== undefined && ySpan !== undefined && xSpan <= POINT_SPAN.xSpan && ySpan <= POINT_SPAN.ySpan;
}

// The layers breaking the rule, described for an assertion message; layers:
// every live layer by default.
export function layersBreakingTheRule(fake, layers = fake.drawingLayers()) {
    return layers
        .filter(layer => (layer.alpha === 0) !== isPoint(layer))
        .map(layer => `z ${layer.zIndex}, alpha ${layer.alpha}, scale ${JSON.stringify(layer.scale())}`);
}
