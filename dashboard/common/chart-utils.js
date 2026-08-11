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
})(typeof window !== "undefined" ? window : globalThis);
