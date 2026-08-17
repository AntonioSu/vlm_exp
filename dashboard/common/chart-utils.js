// Shared tooltip ordering: largest numeric value first (nulls last when included).
(function (global) {
  function compareNumericDesc(va, vb) {
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return vb - va;
  }

  function seriesPresentAtIndex(series, idx) {
    return series
      .filter((s) => s.data[idx] != null)
      .sort((a, b) => compareNumericDesc(a.data[idx], b.data[idx]));
  }

  function seriesTooltipLines(series, idx, valueSuffix, { includeNull = false } = {}) {
    const list = includeNull
      ? series.slice().sort((a, b) => compareNumericDesc(a.data[idx], b.data[idx]))
      : seriesPresentAtIndex(series, idx);
    return list
      .map((s) => {
        const v = s.data[idx];
        const text = v == null ? "—" : `${v}${valueSuffix}`;
        return `<span style="color:${s.color}">●</span> ${s.name}: ${text}`;
      })
      .join("<br>");
  }

  function barTooltipLines(categories, data, colors, valueSuffix) {
    return categories
      .map((name, i) => ({ name, value: data[i], color: colors[i] }))
      .filter((r) => r.value != null && !Number.isNaN(r.value))
      .sort((a, b) => compareNumericDesc(a.value, b.value))
      .map((r) => `<span style="color:${r.color}">●</span> ${r.name}: ${r.value}${valueSuffix}`)
      .join("<br>");
  }

  global.ChartTooltip = {
    compareNumericDesc,
    seriesPresentAtIndex,
    seriesTooltipLines,
    barTooltipLines,
  };

  // Draw category labels without overlap. Prefers round numbers (100, 50, 10)
  // when labels are numeric (eval/train step axes), and always keeps the first
  // and last tick. Hover tooltips still show every step.
  function drawSparseXLabels(ctx, categories, xAt, y, { minGap = 10 } = {}) {
    const labeled = [];
    (categories || []).forEach((c, i) => {
      const text = c == null || c === "" ? "" : String(c);
      if (text) labeled.push({ text, x: xAt(i), n: Number(c) });
    });
    if (!labeled.length) return;

    const widthOf = (text) => ctx.measureText(text).width;
    const allNumeric = labeled.every((l) => Number.isFinite(l.n));
    const last = labeled.length - 1;
    const score = (l, k) => {
      if (k === 0 || k === last) return 1e9;
      if (!allNumeric) return 0;
      const n = Math.abs(l.n);
      if (n === 0) return 1000;
      if (n % 100 === 0) return 100;
      if (n % 50 === 0) return 50;
      if (n % 20 === 0) return 20;
      if (n % 10 === 0) return 10;
      return 0;
    };

    const order = labeled.map((_, k) => k)
      .sort((a, b) => score(labeled[b], b) - score(labeled[a], a) || a - b);
    const taken = [];
    order.forEach((k) => {
      const l = labeled[k];
      const hw = widthOf(l.text) / 2;
      const collides = taken.some((j) => {
        const o = labeled[j];
        return Math.abs(l.x - o.x) < hw + widthOf(o.text) / 2 + minGap;
      });
      if (!collides) taken.push(k);
    });
    taken.sort((a, b) => a - b);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    taken.forEach((k) => ctx.fillText(labeled[k].text, labeled[k].x, y));
  }

  global.ChartAxis = { drawSparseXLabels };
})(typeof window !== "undefined" ? window : globalThis);
