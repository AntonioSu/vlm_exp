// S3 overlay: dashed. Detail charts use S3_ALT[key]; multi-exp Easy+S3
// overlays should pass S3_ALT[k] so they do not match the Easy curve.
function s3Series(name, data, color) {
  return { name, data, color: color || COLORS.s3, dash: [6, 4] };
}

// V2 overlay: short dash (difficulty-band / unified shaped / KL=none).
function v2Series(name, data, color) {
  return { name, data, color: color || COLORS.v2, dash: [2, 3] };
}

// Easy-24K overlay: dotted (DAPO length ablation, max_response_length=24576).
function e24kSeries(name, data, color) {
  return { name, data, color: color || COLORS.e24k || "#7c3aed", dash: [1, 3] };
}

// Easy-32K overlay: dash-dot-dot (DAPO length ablation, max_response_length=32768).
function e32kSeries(name, data, color) {
  return { name, data, color: color || COLORS.e32k || "#6366f1", dash: [3, 1, 1, 1] };
}

// Think32K overlay: long dash-dot (DAPO easy × thinking, max_response_length=32768).
function think32kSeries(name, data, color) {
  return { name, data, color: color || COLORS.think32k || "#14b8a6", dash: [6, 2, 1, 2] };
}

// S1-24K overlay: dash-dot-dash (DAPO × S1 × 24K cold-start, max_response_length=24576).
function s124kSeries(name, data, color) {
  return { name, data, color: color || COLORS.s124k || "#0284c7", dash: [5, 2, 1, 2] };
}

// Ext easy-cont overlay: dash-dot (DAPO easy@150 → 300, same data).
function extEasySeries(name, data, color) {
  return { name, data, color: color || COLORS.extEasy || "#0e7490", dash: [4, 2, 1, 2] };
}

// Ext easy-cont-24K overlay: long dash-dot (easy@150 → 300, RESP_LEN=24576).
function extE24kSeries(name, data, color) {
  return { name, data, color: color || COLORS.extE24k || "#b45309", dash: [6, 2, 1, 2] };
}

// Ext S1-switch overlay: long dash (DAPO easy@150 → switch S1 → 300).
function extS1Series(name, data, color) {
  return { name, data, color: color || COLORS.extS1 || "#be123c", dash: [8, 3] };
}

// On-Policy Distillation overlay: 2B student ← frozen 4B teacher, easy × 24K.
function opdSeries(name, data, color) {
  return { name, data, color: color || COLORS.opd || "#ca8a04", dash: [2, 2] };
}

// On-Policy Self-Distillation overlay: 2B student ← frozen 2B teacher (same init), easy × 24K.
function opsdSeries(name, data, color) {
  return { name, data, color: color || COLORS.opsd || "#0891b2", dash: [1, 1] };
}

function makeStepCats(n) {
  const out = [];
  for (let s = 1; s <= n; s++) out.push(s === 1 || s % 10 === 0 ? String(s) : "");
  return out;
}

// Distinct S3 tint when Easy+S3 of the same exp share one chart (avoid same hue).
const S3_ALT = {
  e1: "#0891b2", // cyan    vs e1 blue
  e2: "#16a34a", // green   vs e2 amber (was dark rust)
  e3: "#84cc16", // lime    vs e3 emerald
  e4: "#c026d3", // fuchsia vs e4 purple
  e5: "#0d9488", // teal    vs e5 pink
};

// Distinct V2 tint vs Easy + S3 on the same chart.
const V2_ALT = {
  e1: "#ea580c", // orange  vs blue + cyan
  e2: "#e11d48", // rose    vs amber + green
  e3: "#ea580c", // orange  vs emerald + lime
  e4: "#ea580c", // orange  vs purple + fuchsia
  e5: "#2563eb", // blue    vs pink + teal
};

// Realign offline-eval series onto a longer step axis (e.g. Easy/S3 10–150 → V2 10–300).
function alignEvalSeries(vals, fromSteps, toSteps) {
  if (!toSteps || !toSteps.length) return vals || [];
  if (!vals || !fromSteps) return toSteps.map(() => null);
  if (fromSteps.length === toSteps.length && fromSteps.every((s, i) => String(s) === String(toSteps[i]))) {
    return vals;
  }
  const map = Object.create(null);
  fromSteps.forEach((s, i) => { map[String(s)] = vals[i]; });
  return toSteps.map((s) => (map[String(s)] !== undefined ? map[String(s)] : null));
}

function evalHasMetric(row, metric) {
  return !!(row && row[metric] && row[metric].some((v) => v != null));
}

// Pick the longest step axis among Easy/S3 (base) and any long-run overlays (V2 / Ext).
function pickEvalPlotSteps(baseSteps, overlays) {
  let best = baseSteps;
  let bestLen = (baseSteps && baseSteps.length) || 0;
  (overlays || []).forEach((o) => {
    if (!o || !o.steps || !o.row) return;
    const metrics = o.metrics || ["mmlu", "aime24", "aime25", "math500", "bfcl", "bfcl_mt", "tau"];
    if (!metrics.some((m) => evalHasMetric(o.row, m))) return;
    if (o.steps.length > bestLen) {
      best = o.steps;
      bestLen = o.steps.length;
    }
  });
  return best || baseSteps;
}

// Distinct Easy-24K tint vs Easy + S3 + V2 on the same chart.
const E24K_ALT = {
  e1: "#7c3aed", // violet  vs blue Easy + lime S3 + orange V2
  e2: "#7c3aed", // violet  vs amber + green + rose
};

// Distinct Easy-32K tint vs Easy-24K / Ext on the same chart.
const E32K_ALT = {
  e2: "#6366f1", // indigo  vs violet + teal + crimson
};

// Distinct Think32K tint vs Easy-32K.
const THINK32K_ALT = {
  e2: "#14b8a6", // teal    vs indigo Easy-32K
};

// Distinct S1-24K tint vs Easy-24K/32K / Ext on the same chart.
const S124K_ALT = {
  e2: "#0284c7", // sky     vs violet + indigo + teal + crimson
};

// Distinct Ext tints on E2 (easy-cont / easy-cont-24K / S1-switch from easy@150).
const EXT_EASY_ALT = { e2: "#0e7490" }; // teal
const EXT_E24K_ALT = { e2: "#b45309" }; // amber
const EXT_S1_ALT = { e2: "#be123c" };   // crimson
const OPD_ALT = { e2: "#ca8a04" };      // gold  vs violet Easy-24K + crimson Ext S1
const OPSD_ALT = { e2: "#0891b2" };     // cyan  vs gold OPD

// Fixed stage palette — never reuse e.color (collides with e2/e3/e5 on some pages).
const STAGE_COLORS = {
  gen: "#0d9488",          // teal (was near-black #0f172a)
  update_actor: "#2563eb",
  ref: "#dc2626",
  old_log_prob: "#d97706",
  update_weights: "#9333ea",
  adv: "#db2777",
  reward: "#94a3b8",
};

// Fallback pool for runtime collision repair inside one chart.
const SERIES_COLOR_FALLBACK = [
  "#2563eb", "#d97706", "#059669", "#9333ea", "#db2777",
  "#65a30d", "#e11d48", "#0891b2", "#c026d3", "#ea580c",
  "#6366f1", "#ca8a04", "#f97316", "#0e7490", "#7c3aed",
];

// Guarantee every series in one chart has a unique color (exact hex match).
function dedupeSeriesColors(series) {
  const used = new Set();
  let fi = 0;
  return series.map((s) => {
    let c = (s.color || "").toLowerCase();
    if (!c || used.has(c)) {
      while (fi < SERIES_COLOR_FALLBACK.length && used.has(SERIES_COLOR_FALLBACK[fi].toLowerCase())) fi++;
      c = (SERIES_COLOR_FALLBACK[fi++] || "#111827").toLowerCase();
      return { ...s, color: c };
    }
    used.add(c);
    return s;
  });
}

function dedupeBarColors(colors) {
  const used = new Set();
  let fi = 0;
  return (colors || []).map((raw) => {
    let c = (raw || "").toLowerCase();
    if (!c || used.has(c)) {
      while (fi < SERIES_COLOR_FALLBACK.length && used.has(SERIES_COLOR_FALLBACK[fi].toLowerCase())) fi++;
      c = (SERIES_COLOR_FALLBACK[fi++] || "#111827").toLowerCase();
    }
    used.add(c);
    return c;
  });
}

function getCssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (_e) {
    return fallback;
  }
}

// Renders a clickable legend bound to a chart: clicking a series name toggles
// it on/off and redraws with only the still-selected series (ECharts-style
// legend select). A leading "隐藏全部/显示全部" button toggles every series
// at once. `draw(visibleSeries)` is called once up front and again on every
// toggle.
function renderLegend(el, series, draw) {
  series = dedupeSeriesColors(series || []);
  const hidden = new Set();
  const itemsHtml = series.map(s => {
    const swatch = s.dash
      ? `<span class="dot dash" style="border-color:${s.color}"></span>`
      : `<span class="dot" style="background:${s.color}"></span>`;
    return `<span class="legend-item">${swatch}${s.name}</span>`;
  }).join("");
  el.innerHTML = `<span class="legend-toggle-all"></span>${itemsHtml}`;

  const toggleAllBtn = el.querySelector(".legend-toggle-all");
  const itemSpans = el.querySelectorAll(".legend-item");

  const syncToggleAllLabel = () => {
    toggleAllBtn.textContent = hidden.size >= series.length ? "显示全部" : "隐藏全部";
  };

  itemSpans.forEach((span, i) => {
    span.addEventListener("click", () => {
      const name = series[i].name;
      if (hidden.has(name)) hidden.delete(name); else hidden.add(name);
      span.classList.toggle("legend-off", hidden.has(name));
      syncToggleAllLabel();
      draw(series.filter(s => !hidden.has(s.name)));
    });
  });

  toggleAllBtn.addEventListener("click", () => {
    const shouldHideAll = hidden.size < series.length;
    hidden.clear();
    itemSpans.forEach((span, i) => {
      if (shouldHideAll) hidden.add(series[i].name);
      span.classList.toggle("legend-off", shouldHideAll);
    });
    syncToggleAllLabel();
    draw(series.filter(s => !hidden.has(s.name)));
  });

  syncToggleAllLabel();
  draw(series.slice());
}

// If a legend element exists, bind hide/show controls; otherwise draw all series.
function bindSeriesLegend(legendId, items, draw) {
  const el = document.getElementById(legendId);
  if (el) renderLegend(el, items, draw);
  else draw(items);
}

// Bar-chart legend: categories act as series names; hidden bars become null.
function bindBarLegend(legendId, categories, data, colors, drawFilteredData) {
  const items = categories.map((name, i) => ({
    name,
    color: (colors && colors[i]) || COLORS.neutral,
  }));
  bindSeriesLegend(legendId, items, (visible) => {
    const keep = new Set(visible.map((s) => s.name));
    drawFilteredData(data.map((v, i) => (keep.has(categories[i]) ? v : null)));
  });
}

// Padded [yMin, yMax] from series so points never sit outside the plot.
// Rounds outward to integers; optional floor/ceil clamp (e.g. floor: 0 for %).
function yRangeFromSeries(series, { padRatio = 0.1, floor = 0, ceil = null } = {}) {
  const vals = series.flatMap((s) => s.data).filter((v) => v != null);
  if (!vals.length) return [floor ?? 0, ceil ?? 1];
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const pad = (max - min) * padRatio || 1;
  min = Math.floor(min - pad);
  max = Math.ceil(max + pad);
  if (floor != null) min = Math.max(min, floor);
  if (ceil != null) max = Math.min(max, ceil);
  if (max <= min) max = min + 1;
  return [min, max];
}

// Offline eval % axes: locked so legend toggles / new checkpoints do not rescale.
const EVAL_Y = {
  mmlu:    { yMin: 70, yMax: 90 },
  math500: { yMin: 50, yMax: 100 },
  aime24:  { yMin: 0,  yMax: 50 },
  aime25:  { yMin: 0,  yMax: 50 },
};

const AGENT_Y = {
  bfcl:    { yMin: 0, yMax: 60 },
  bfcl_mt: { yMin: 0, yMax: 20 },
  tau:     { yMin: 0, yMax: 100 },
};

function drawLineChart(canvasId, tipId, { categories, series, yMin, yMax, valueSuffix = "", height = 260, referenceLines = [] }) {
  const canvas = document.getElementById(canvasId);
  const tip = document.getElementById(tipId);
  if (!canvas) return;
  series = dedupeSeriesColors(series || []);
  const dpr = window.devicePixelRatio || 1;
  let cssWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  if (cssWidth < 8) cssWidth = canvas.clientWidth || 320;
  canvas.style.height = height + "px";
  canvas.width = cssWidth * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, height);

  let allVals = series.flatMap(s => s.data).filter(v => v != null);
  referenceLines.forEach(r => allVals.push(r.value));
  const min = yMin !== undefined ? yMin : Math.min(...allVals);
  const max = yMax !== undefined ? yMax : Math.max(...allVals);
  const range = (max - min) || 1;
  const labelDecimals = range >= 100 ? 0 : range >= 5 ? 1 : range >= 0.5 ? 2 : 3;
  const labelScale = Math.pow(10, labelDecimals);
  const maxAbsLabel = Math.max(Math.abs(min), Math.abs(max));
  const labelWidth = (Math.round(maxAbsLabel * labelScale) / labelScale + valueSuffix).length;
  const padL = Math.max(40, labelWidth * 6.5 + 12), padR = 12, padT = 10, padB = 26;
  const plotW = cssWidth - padL - padR;
  const plotH = height - padT - padB;

  const xStep = categories.length > 1 ? plotW / (categories.length - 1) : 0;
  const xAt = i => padL + i * xStep;
  const yAt = v => padT + plotH - ((v - min) / range) * plotH;

  // grid + y labels
  ctx.strokeStyle = COLORS.grid;
  ctx.fillStyle = COLORS.axis;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const ticks = 5;
  for (let t = 0; t <= ticks; t++) {
    const v = min + (range * t) / ticks;
    const y = yAt(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(Math.round(v * labelScale) / labelScale + valueSuffix, padL - 6, y);
  }

  // reference lines
  referenceLines.forEach(r => {
    const y = yAt(r.value);
    ctx.save();
    ctx.strokeStyle = COLORS[r.tone] || COLORS.neutral;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.restore();
    if (r.label) {
      ctx.save();
      ctx.fillStyle = COLORS[r.tone] || COLORS.neutral;
      ctx.textAlign = "right";
      ctx.font = "10.5px -apple-system, sans-serif";
      ctx.fillText(r.label, padL + plotW, y - 4);
      ctx.restore();
    }
  });

  // x labels (skip overlapping ticks; hover still shows every step)
  ctx.fillStyle = COLORS.axis;
  ctx.font = "11px -apple-system, sans-serif";
  ChartAxis.drawSparseXLabels(ctx, categories, xAt, padT + plotH + 6);

  // series lines (optional s.dash = [6, 4] for dashed overlay, e.g. S3)
  series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.setLineDash(s.dash || []);
    ctx.beginPath();
    let penDown = false;
    s.data.forEach((v, i) => {
      if (v == null) { penDown = false; return; }
      const x = xAt(i), y = yAt(v);
      if (!penDown) { ctx.moveTo(x, y); penDown = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    // markers so isolated points (surrounded by gaps) stay visible
    s.data.forEach((v, i) => {
      if (v == null) return;
      ctx.beginPath();
      ctx.fillStyle = s.color;
      ctx.arc(xAt(i), yAt(v), s.dash ? 2.0 : 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // hover interaction
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let idx = Math.round((mx - padL) / (xStep || 1));
    idx = Math.max(0, Math.min(categories.length - 1, idx));
    const x = xAt(idx);
    // redraw + guide line (drawLineChart already resets + scales the context)
    drawLineChart(canvasId, tipId, { categories, series: series.map(s => ({...s})), yMin: min, yMax: max, valueSuffix, height, referenceLines });
    const c2 = document.getElementById(canvasId).getContext("2d");
    c2.save();
    c2.strokeStyle = COLORS.axis;
    c2.setLineDash([3, 3]);
    c2.beginPath();
    c2.moveTo(x, padT);
    c2.lineTo(x, padT + plotH);
    c2.stroke();
    c2.restore();
    const present = ChartTooltip.seriesPresentAtIndex(series, idx);
    const lines = ChartTooltip.seriesTooltipLines(present, idx, valueSuffix);
    tip.innerHTML = `step ${categories[idx] || idx + 1}${lines ? "<br>" + lines : ""}`;
    tip.style.left = x + "px";
    const valsAtIdx = present.map(s => s.data[idx]);
    tip.style.top = ((valsAtIdx.length ? yAt(Math.max(...valsAtIdx)) : padT) - 6) + "px";
    tip.style.opacity = 1;
  };
  canvas.onmouseleave = () => { tip.style.opacity = 0; };
}

function drawBarChart(canvasId, tipId, { categories, data, colors, valueSuffix = "", height = 220 }) {
  const canvas = document.getElementById(canvasId);
  const tip = document.getElementById(tipId);
  colors = dedupeBarColors(colors);
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth;
  canvas.style.height = height + "px";
  canvas.width = cssWidth * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, height);

  const padL = 40, padR = 12, padT = 10, padB = 26;
  const plotW = cssWidth - padL - padR;
  const plotH = height - padT - padB;
  const safeData = data.map((v) => (v == null || isNaN(v) ? 0 : v));
  const max = Math.max(...safeData) * 1.15 || 1;

  const bandW = plotW / categories.length;
  const barW = bandW * 0.5;

  ctx.strokeStyle = COLORS.grid;
  ctx.fillStyle = COLORS.axis;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let t = 0; t <= 4; t++) {
    const v = (max * t) / 4;
    const y = padT + plotH - (v / max) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(Math.round(v * 10) / 10 + valueSuffix, padL - 6, y);
  }

  categories.forEach((c, i) => {
    const bx = padL + i * bandW + (bandW - barW) / 2;
    const v = safeData[i];
    const h = (v / max) * plotH;
    const y = padT + plotH - h;
    ctx.fillStyle = colors[i];
    ctx.fillRect(bx, y, barW, h);
    ctx.fillStyle = COLORS.axis;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(c, padL + i * bandW + bandW / 2, padT + plotH + 6);
    ctx.fillStyle = "#111827";
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(v + valueSuffix, padL + i * bandW + bandW / 2, y - 4);
    ctx.font = "11px -apple-system, sans-serif";
  });

  if (tip) {
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const lines = ChartTooltip.barTooltipLines(categories, data, colors, valueSuffix);
      tip.innerHTML = lines || "—";
      tip.style.left = Math.min(cssWidth - 160, Math.max(8, x)) + "px";
      tip.style.top = "8px";
      tip.style.opacity = 1;
    };
    canvas.onmouseleave = () => { tip.style.opacity = 0; };
  }
}


function render() {
  // ---- Easy-Boxed E1–E5 ----
  renderLegend(document.getElementById("legend-pass"), [
    { name: "E1 GRPO", data: EXP.e1.pass, color: COLORS.e1 },
    { name: "E2 DAPO", data: EXP.e2.pass, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: EXP.e3.pass, color: COLORS.e3 },
    { name: "E4 RLOO", data: EXP.e4.pass, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: EXP.e5.pass, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-pass", "tip-pass", {
    categories: STEP_CATS,
    series: visible,
    yMin: 0, yMax: 90, valueSuffix: "%", height: 280,
  }));

  renderLegend(document.getElementById("legend-len"), [
    { name: "E1 GRPO", data: EASY_BOXED_E1_LEN, color: COLORS.e1 },
    { name: "E2 DAPO", data: EASY_BOXED_E2_LEN, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: EASY_BOXED_E3_LEN, color: COLORS.e3 },
    { name: "E4 RLOO", data: EASY_BOXED_E4_LEN, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: EASY_BOXED_E5_LEN, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-len", "tip-len", {
    categories: STEP_CATS,
    series: visible,
    valueSuffix: " tok", height: 240,
    referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
  }));

  renderLegend(document.getElementById("legend-ent"), [
    { name: "E1 GRPO", data: EASY_BOXED_E1_ENTROPY, color: COLORS.e1 },
    { name: "E2 DAPO", data: EASY_BOXED_E2_ENTROPY, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: EASY_BOXED_E3_ENTROPY, color: COLORS.e3 },
    { name: "E4 RLOO", data: EASY_BOXED_E4_ENTROPY, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: EASY_BOXED_E5_ENTROPY, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-ent", "tip-ent", {
    categories: STEP_CATS,
    series: visible,
    height: 240,
  }));

  renderLegend(document.getElementById("legend-grad"), [
    { name: "E1 GRPO", data: EASY_BOXED_E1_GRAD, color: COLORS.e1 },
    { name: "E2 DAPO", data: EASY_BOXED_E2_GRAD, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: EASY_BOXED_E3_GRAD, color: COLORS.e3 },
    { name: "E4 RLOO", data: EASY_BOXED_E4_GRAD, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: EASY_BOXED_E5_GRAD, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-grad", "tip-grad", {
    categories: STEP_CATS,
    series: visible,
    height: 220,
  }));

  {
    const durColors = [COLORS.e1, COLORS.e2, COLORS.e3, COLORS.e4, COLORS.e5];
    bindBarLegend("legend-dur", EASY_BOXED_DURATION_CATS, EASY_BOXED_DURATION_H, durColors, (data) => {
      drawBarChart("chart-dur", "tip-dur", {
        categories: EASY_BOXED_DURATION_CATS, data, colors: durColors,
        valueSuffix: "h", height: 220,
      });
    });
  }

  // ---- S3 E1–E5（独立图，不与 Easy-Boxed 叠加；逐 step 原始 pass，不做移动平均）----
  const s3PassLegend = document.getElementById("legend-s3-pass");
  if (s3PassLegend && EXP.s3_e1 && EXP.s3_e1.pass) {
    const s3Pass = [
      { name: "S3 E1 GRPO", data: EXP.s3_e1.pass, color: COLORS.e1 },
      { name: "S3 E2 DAPO", data: EXP.s3_e2.pass, color: COLORS.e2 },
      { name: "S3 E3 Dr.GRPO", data: EXP.s3_e3.pass, color: COLORS.e3 },
    ];
    if (EXP.s3_e4 && EXP.s3_e4.pass) s3Pass.push({ name: "S3 E4 RLOO", data: EXP.s3_e4.pass, color: COLORS.e4 });
    if (EXP.s3_e5 && EXP.s3_e5.pass) s3Pass.push({ name: "S3 E5 REINFORCE++", data: EXP.s3_e5.pass, color: COLORS.e5 });
    renderLegend(s3PassLegend, s3Pass, (visible) => drawLineChart("chart-s3-pass", "tip-s3-pass", {
      categories: STEP_CATS,
      series: visible,
      yMin: 0, yMax: 90, valueSuffix: "%", height: 280,
    }));

    const s3Len = [
      { name: "S3 E1 GRPO", data: S3_E1_LEN, color: COLORS.e1 },
      { name: "S3 E2 DAPO", data: S3_E2_LEN, color: COLORS.e2 },
      { name: "S3 E3 Dr.GRPO", data: S3_E3_LEN, color: COLORS.e3 },
    ];
    if (typeof S3_E4_LEN !== "undefined") s3Len.push({ name: "S3 E4 RLOO", data: S3_E4_LEN, color: COLORS.e4 });
    if (typeof S3_E5_LEN !== "undefined") s3Len.push({ name: "S3 E5 REINFORCE++", data: S3_E5_LEN, color: COLORS.e5 });
    renderLegend(document.getElementById("legend-s3-len"), s3Len, (visible) => drawLineChart("chart-s3-len", "tip-s3-len", {
      categories: STEP_CATS,
      series: visible,
      valueSuffix: " tok", height: 240,
      referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
    }));

    const s3Ent = [
      { name: "S3 E1 GRPO", data: S3_E1_ENTROPY, color: COLORS.e1 },
      { name: "S3 E2 DAPO", data: S3_E2_ENTROPY, color: COLORS.e2 },
      { name: "S3 E3 Dr.GRPO", data: S3_E3_ENTROPY, color: COLORS.e3 },
    ];
    if (typeof S3_E4_ENTROPY !== "undefined") s3Ent.push({ name: "S3 E4 RLOO", data: S3_E4_ENTROPY, color: COLORS.e4 });
    if (typeof S3_E5_ENTROPY !== "undefined") s3Ent.push({ name: "S3 E5 REINFORCE++", data: S3_E5_ENTROPY, color: COLORS.e5 });
    renderLegend(document.getElementById("legend-s3-ent"), s3Ent, (visible) => drawLineChart("chart-s3-ent", "tip-s3-ent", {
      categories: STEP_CATS,
      series: visible,
      height: 240,
    }));

    const s3Grad = [
      { name: "S3 E1 GRPO", data: S3_E1_GRAD, color: COLORS.e1 },
      { name: "S3 E2 DAPO", data: S3_E2_GRAD, color: COLORS.e2 },
      { name: "S3 E3 Dr.GRPO", data: S3_E3_GRAD, color: COLORS.e3 },
    ];
    if (typeof S3_E4_GRAD !== "undefined") s3Grad.push({ name: "S3 E4 RLOO", data: S3_E4_GRAD, color: COLORS.e4 });
    if (typeof S3_E5_GRAD !== "undefined") s3Grad.push({ name: "S3 E5 REINFORCE++", data: S3_E5_GRAD, color: COLORS.e5 });
    renderLegend(document.getElementById("legend-s3-grad"), s3Grad, (visible) => drawLineChart("chart-s3-grad", "tip-s3-grad", {
      categories: STEP_CATS,
      series: visible,
      height: 220,
    }));

    if (typeof S3_DURATION_CATS !== "undefined") {
      bindBarLegend("legend-s3-dur", S3_DURATION_CATS, S3_DURATION_H, S3_DURATION_COLORS, (data) => {
        drawBarChart("chart-s3-dur", "tip-s3-dur", {
          categories: S3_DURATION_CATS, data, colors: S3_DURATION_COLORS,
          valueSuffix: "h", height: 220,
        });
      });
    }
  }

  // ---- V2（难度池 + 统一 shaped overlong + KL=none；有日志的实验自动出现）----
  const v2PassLegend = document.getElementById("legend-v2-pass");
  if (v2PassLegend) {
  const v2Cats = (typeof V2_STEP_CATS !== "undefined") ? V2_STEP_CATS : STEP_CATS;
  const v2Pass = [];
  if (EXP.v2_e1 && EXP.v2_e1.pass) v2Pass.push({ name: "V2 E1 GRPO", data: EXP.v2_e1.pass, color: COLORS.e1 });
  if (EXP.v2_e2 && EXP.v2_e2.pass) v2Pass.push({ name: "V2 E2 DAPO", data: EXP.v2_e2.pass, color: COLORS.e2 });
  if (EXP.v2_e3 && EXP.v2_e3.pass) v2Pass.push({ name: "V2 E3 Dr.GRPO", data: EXP.v2_e3.pass, color: COLORS.e3 });
  if (EXP.v2_e4 && EXP.v2_e4.pass) v2Pass.push({ name: "V2 E4 RLOO", data: EXP.v2_e4.pass, color: COLORS.e4 });
  if (EXP.v2_e5 && EXP.v2_e5.pass) v2Pass.push({ name: "V2 E5 REINFORCE++", data: EXP.v2_e5.pass, color: COLORS.e5 });
  if (v2Pass.length) {
    renderLegend(v2PassLegend, v2Pass, (visible) => drawLineChart("chart-v2-pass", "tip-v2-pass", {
      categories: v2Cats,
      series: visible,
      yMin: 0, yMax: 90, valueSuffix: "%", height: 280,
    }));
  }
  const v2Len = [];
  if (typeof V2_E1_LEN !== "undefined") v2Len.push({ name: "V2 E1 GRPO", data: V2_E1_LEN, color: COLORS.e1 });
  if (typeof V2_E2_LEN !== "undefined") v2Len.push({ name: "V2 E2 DAPO", data: V2_E2_LEN, color: COLORS.e2 });
  if (typeof V2_E3_LEN !== "undefined") v2Len.push({ name: "V2 E3 Dr.GRPO", data: V2_E3_LEN, color: COLORS.e3 });
  if (typeof V2_E4_LEN !== "undefined") v2Len.push({ name: "V2 E4 RLOO", data: V2_E4_LEN, color: COLORS.e4 });
  if (typeof V2_E5_LEN !== "undefined") v2Len.push({ name: "V2 E5 REINFORCE++", data: V2_E5_LEN, color: COLORS.e5 });
  if (v2Len.length && document.getElementById("legend-v2-len")) {
    renderLegend(document.getElementById("legend-v2-len"), v2Len, (visible) => drawLineChart("chart-v2-len", "tip-v2-len", {
      categories: v2Cats,
      series: visible,
      valueSuffix: " tok", height: 240,
      referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
    }));
  }
  const v2Ent = [];
  if (typeof V2_E1_ENTROPY !== "undefined") v2Ent.push({ name: "V2 E1 GRPO", data: V2_E1_ENTROPY, color: COLORS.e1 });
  if (typeof V2_E2_ENTROPY !== "undefined") v2Ent.push({ name: "V2 E2 DAPO", data: V2_E2_ENTROPY, color: COLORS.e2 });
  if (typeof V2_E3_ENTROPY !== "undefined") v2Ent.push({ name: "V2 E3 Dr.GRPO", data: V2_E3_ENTROPY, color: COLORS.e3 });
  if (typeof V2_E4_ENTROPY !== "undefined") v2Ent.push({ name: "V2 E4 RLOO", data: V2_E4_ENTROPY, color: COLORS.e4 });
  if (typeof V2_E5_ENTROPY !== "undefined") v2Ent.push({ name: "V2 E5 REINFORCE++", data: V2_E5_ENTROPY, color: COLORS.e5 });
  if (v2Ent.length && document.getElementById("legend-v2-ent")) {
    renderLegend(document.getElementById("legend-v2-ent"), v2Ent, (visible) => drawLineChart("chart-v2-ent", "tip-v2-ent", {
      categories: v2Cats,
      series: visible,
      height: 240,
    }));
  }
  const v2Grad = [];
  if (typeof V2_E1_GRAD !== "undefined") v2Grad.push({ name: "V2 E1 GRPO", data: V2_E1_GRAD, color: COLORS.e1 });
  if (typeof V2_E2_GRAD !== "undefined") v2Grad.push({ name: "V2 E2 DAPO", data: V2_E2_GRAD, color: COLORS.e2 });
  if (typeof V2_E3_GRAD !== "undefined") v2Grad.push({ name: "V2 E3 Dr.GRPO", data: V2_E3_GRAD, color: COLORS.e3 });
  if (typeof V2_E4_GRAD !== "undefined") v2Grad.push({ name: "V2 E4 RLOO", data: V2_E4_GRAD, color: COLORS.e4 });
  if (typeof V2_E5_GRAD !== "undefined") v2Grad.push({ name: "V2 E5 REINFORCE++", data: V2_E5_GRAD, color: COLORS.e5 });
  if (v2Grad.length && document.getElementById("legend-v2-grad")) {
    renderLegend(document.getElementById("legend-v2-grad"), v2Grad, (visible) => drawLineChart("chart-v2-grad", "tip-v2-grad", {
      categories: v2Cats,
      series: visible,
      height: 220,
    }));
  }
  if (typeof V2_DURATION_CATS !== "undefined" && document.getElementById("chart-v2-dur")) {
    bindBarLegend("legend-v2-dur", V2_DURATION_CATS, V2_DURATION_H, V2_DURATION_COLORS, (data) => {
      drawBarChart("chart-v2-dur", "tip-v2-dur", {
        categories: V2_DURATION_CATS, data, colors: V2_DURATION_COLORS,
        valueSuffix: "h", height: 220,
      });
    });
  }
  }

  // ---- OPD / OPSD training (easy × 24K; overlay also lives on E2) ----
  const opdPassLegend = document.getElementById("legend-opd-pass");
  if (opdPassLegend) {
    const opd = EXP.opd_e2 || null;
    const opsd = EXP.opsd_e2 || null;
    const e24 = EXP.e24k_e2 || null;
    const opdCatsSrc = [opd, opsd, e24].filter((e) => e && e.cats && e.cats.length);
    const opdCats = opdCatsSrc.reduce((best, e) => (e.cats.length > best.length ? e.cats : best), []);
    const opdPass = [];
    if (e24 && e24.pass) opdPass.push(e24kSeries("Easy-24K E2", movingAvg(e24.pass, 5)));
    if (opd && opd.pass) opdPass.push(opdSeries("OPD 2B←4B", movingAvg(opd.pass, 5)));
    if (opsd && opsd.pass) opdPass.push(opsdSeries("OPSD 2B←2B", movingAvg(opsd.pass, 5)));
    if (opdPass.length && opdCats.length) {
      renderLegend(opdPassLegend, opdPass, (visible) => drawLineChart("chart-opd-pass", "tip-opd-pass", {
        categories: opdCats,
        series: visible,
        yMin: 0, yMax: 90, valueSuffix: "%", height: 280,
      }));
    }
    const opdLen = [];
    if (e24 && e24.len) opdLen.push(e24kSeries("Easy-24K E2", e24.len));
    if (opd && opd.len) opdLen.push(opdSeries("OPD 2B←4B", opd.len));
    if (opsd && opsd.len) opdLen.push(opsdSeries("OPSD 2B←2B", opsd.len));
    if (opdLen.length && document.getElementById("legend-opd-len")) {
      renderLegend(document.getElementById("legend-opd-len"), opdLen, (visible) => drawLineChart("chart-opd-len", "tip-opd-len", {
        categories: opdCats,
        series: visible,
        valueSuffix: " tok", height: 240,
        referenceLines: [{ value: 24576, label: "24K cap", tone: "neutral" }],
      }));
    }
    const opdEnt = [];
    if (e24 && e24.ent) opdEnt.push(e24kSeries("Easy-24K E2", e24.ent));
    if (opd && opd.ent) opdEnt.push(opdSeries("OPD 2B←4B", opd.ent));
    if (opsd && opsd.ent) opdEnt.push(opsdSeries("OPSD 2B←2B", opsd.ent));
    if (opdEnt.length && document.getElementById("legend-opd-ent")) {
      renderLegend(document.getElementById("legend-opd-ent"), opdEnt, (visible) => drawLineChart("chart-opd-ent", "tip-opd-ent", {
        categories: opdCats,
        series: visible,
        height: 240,
      }));
    }
    const opdGrad = [];
    if (e24 && e24.grad) opdGrad.push(e24kSeries("Easy-24K E2", e24.grad));
    if (opd && opd.grad) opdGrad.push(opdSeries("OPD 2B←4B", opd.grad));
    if (opsd && opsd.grad) opdGrad.push(opsdSeries("OPSD 2B←2B", opsd.grad));
    if (opdGrad.length && document.getElementById("legend-opd-grad")) {
      renderLegend(document.getElementById("legend-opd-grad"), opdGrad, (visible) => drawLineChart("chart-opd-grad", "tip-opd-grad", {
        categories: opdCats,
        series: visible,
        height: 220,
      }));
    }
  }
}

function movingAvg(xs, w) {
  return xs.map((_, i) => {
    const lo = Math.max(0, i - (w - 1));
    const win = xs.slice(lo, i + 1).filter((v) => v != null);
    if (!win.length) return null;
    return Math.round((win.reduce((a, b) => a + b, 0) / win.length) * 10) / 10;
  });
}

function meanOf(xs) {
  const v = xs.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function fillExpStats(key, e) {
  const el = document.getElementById(`${key}-stats`);
  if (!el || !e.pass) return;
  const n = e.pass.length;
  const target = (key === "opd" || key === "opsd") ? 500 : 150;
  const last10 = e.pass.slice(-10);
  const first5 = e.pass.slice(0, 5);
  const peak = e.pass.reduce((best, v, i) => (v != null && (best.v == null || v > best.v) ? { v, i: i + 1 } : best), { v: null, i: 0 });
  const avgStepMin = meanOf(e.stepMin || []);
  const fmt = (v, d = 1) => (v == null ? "—" : Number(v).toFixed(d));
  el.innerHTML = [
    `<div class="stat"><div class="stat-val">${n}/${target}</div><div class="stat-label">训练步数</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(meanOf(last10))}%</div><div class="stat-label">末 10 步 pass 均值</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(peak.v)}%</div><div class="stat-label">峰值（step ${peak.i}）</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(meanOf(first5))}%</div><div class="stat-label">首 5 步 pass 均值</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(avgStepMin)} min</div><div class="stat-label">平均单步耗时</div></div>`,
  ].join("");
}

function renderExpPanel(key) {
  const isDistill = key === "opd" || key === "opsd";
  let e = EXP[key];
  if (key === "opd") e = EXP.opd_e2 || e;
  if (key === "opsd") e = EXP.opsd_e2 || e;
  if (!e) return;
  const s3Key = "s3_" + key;
  const s = isDistill ? null : (EXP[s3Key] || null);
  const v = isDistill ? null : (EXP["v2_" + key] || null);
  const e24 = isDistill ? (EXP.e24k_e2 || null) : (EXP["e24k_" + key] || null);
  const e32 = isDistill ? null : (EXP["e32k_" + key] || null);
  const think32 = isDistill ? null : (EXP["think32k_" + key] || null);
  const s124 = isDistill ? null : (EXP["s124k_" + key] || null);
  const extEasy = isDistill ? null : (EXP["ext_easy_" + key] || null);
  const extE24k = isDistill ? null : (EXP["ext_e24k_" + key] || null);
  const extS1 = isDistill ? null : (EXP["ext_s1_" + key] || null);
  const opd = key === "opd" ? null : (isDistill ? (EXP.opd_e2 || null) : (EXP["opd_" + key] || null));
  const opsd = key === "opsd" ? null : (isDistill ? (EXP.opsd_e2 || null) : (EXP["opsd_" + key] || null));
  const srcKey = isDistill ? "e2" : key;
  const primName = key === "opd" ? (e.label || "OPD 2B←4B")
    : key === "opsd" ? (e.label || "OPSD 2B←2B")
    : "Easy-Boxed";
  const s3c = S3_ALT[key] || COLORS.s3;
  const v2c = V2_ALT[key] || COLORS.v2;
  const e24c = E24K_ALT[srcKey] || COLORS.e24k || "#7c3aed";
  const e32c = E32K_ALT[key] || COLORS.e32k || "#6366f1";
  const think32c = THINK32K_ALT[key] || COLORS.think32k || "#14b8a6";
  const s124c = S124K_ALT[key] || COLORS.s124k || "#0284c7";
  const extEc = EXT_EASY_ALT[key] || COLORS.extEasy || "#0e7490";
  const extE24c = EXT_E24K_ALT[key] || COLORS.extE24k || "#b45309";
  const extSc = EXT_S1_ALT[key] || COLORS.extS1 || "#be123c";
  const opdc = OPD_ALT[srcKey] || COLORS.opd || "#ca8a04";
  const opsdc = OPSD_ALT[srcKey] || COLORS.opsd || "#0891b2";
  const axisN = Math.max(
    (e.pass || []).length,
    s ? (s.pass || []).length : 0,
    v ? (v.pass || []).length : 0,
    e24 ? (e24.pass || []).length : 0,
    e32 ? (e32.pass || []).length : 0,
    think32 ? (think32.pass || []).length : 0,
    s124 ? (s124.pass || []).length : 0,
    extEasy ? (extEasy.pass || []).length : 0,
    extE24k ? (extE24k.pass || []).length : 0,
    extS1 ? (extS1.pass || []).length : 0,
    opd ? (opd.pass || []).length : 0,
    opsd ? (opsd.pass || []).length : 0,
  );
  const cats = makeStepCats(axisN);
  const s3o = (name, data) => s3Series(name, data, s3c);
  const v2o = (name, data) => v2Series(name, data, v2c);
  const e24o = (name, data) => e24kSeries(name, data, e24c);
  const e32o = (name, data) => e32kSeries(name, data, e32c);
  const think32o = (name, data) => think32kSeries(name, data, think32c);
  const s124o = (name, data) => s124kSeries(name, data, s124c);
  const extEo = (name, data) => extEasySeries(name, data, extEc);
  const extE24o = (name, data) => extE24kSeries(name, data, extE24c);
  const extSo = (name, data) => extS1Series(name, data, extSc);
  const opdo = (name, data) => opdSeries(name, data, opdc);
  const opsdo = (name, data) => opsdSeries(name, data, opsdc);
  fillExpStats(key, e);

  const passLegend = document.getElementById(`legend-${key}-pass`);
  const passMA = movingAvg(e.pass, 5);
  const allPass = e.pass.filter(x => x != null);
  if (s) allPass.push(...s.pass.filter(x => x != null));
  if (v) allPass.push(...v.pass.filter(x => x != null));
  if (e24) allPass.push(...e24.pass.filter(x => x != null));
  if (e32) allPass.push(...e32.pass.filter(x => x != null));
  if (think32) allPass.push(...think32.pass.filter(x => x != null));
  if (s124) allPass.push(...s124.pass.filter(x => x != null));
  if (extEasy) allPass.push(...extEasy.pass.filter(x => x != null));
  if (extE24k) allPass.push(...extE24k.pass.filter(x => x != null));
  if (extS1) allPass.push(...extS1.pass.filter(x => x != null));
  if (opd) allPass.push(...opd.pass.filter(x => x != null));
  if (opsd) allPass.push(...opsd.pass.filter(x => x != null));
  const passMax = Math.max(...allPass);
  const passYMax = Math.min(100, Math.ceil((passMax + 10) / 10) * 10);
  if (passLegend) {
    const items = [
      { name: primName, data: passMA, color: e.color },
    ];
    if (s) items.push(s3o("S3", movingAvg(s.pass, 5)));
    if (v) items.push(v2o("V2", movingAvg(v.pass, 5)));
    if (e24) items.push(e24o("Easy-24K", movingAvg(e24.pass, 5)));
    if (e32) items.push(e32o("Easy-32K", movingAvg(e32.pass, 5)));
    if (think32) items.push(think32o("Think32K", movingAvg(think32.pass, 5)));
    if (s124) items.push(s124o("S1-24K", movingAvg(s124.pass, 5)));
    if (extEasy) items.push(extEo("Ext easy-cont", movingAvg(extEasy.pass, 5)));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K", movingAvg(extE24k.pass, 5)));
    if (extS1) items.push(extSo("Ext S1-switch", movingAvg(extS1.pass, 5)));
    if (opd) items.push(opdo("OPD 2B←4B", movingAvg(opd.pass, 5)));
    if (opsd) items.push(opsdo("OPSD 2B←2B", movingAvg(opsd.pass, 5)));
    renderLegend(passLegend, items, (visible) => drawLineChart(`chart-${key}-pass`, `tip-${key}-pass`, {
      categories: cats,
      series: visible,
      yMin: 0, yMax: passYMax, valueSuffix: "%", height: 240,
    }));
  } else {
    const items = [{ name: primName + " pass", data: e.pass, color: e.color }];
    if (s) items.push(s3o("S3 pass", s.pass));
    if (v) items.push(v2o("V2 pass", v.pass));
    if (e24) items.push(e24o("Easy-24K pass", e24.pass));
    if (e32) items.push(e32o("Easy-32K pass", e32.pass));
    if (think32) items.push(think32o("Think32K pass", think32.pass));
    if (s124) items.push(s124o("S1-24K pass", s124.pass));
    if (extEasy) items.push(extEo("Ext easy-cont pass", extEasy.pass));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K pass", extE24k.pass));
    if (extS1) items.push(extSo("Ext S1-switch pass", extS1.pass));
    if (opd) items.push(opdo("OPD 2B←4B pass", opd.pass));
    if (opsd) items.push(opsdo("OPSD 2B←2B pass", opsd.pass));
    drawLineChart(`chart-${key}-pass`, `tip-${key}-pass`, {
      categories: cats, series: items,
      yMin: 0, yMax: passYMax, valueSuffix: "%", height: 200,
    });
  }

  if (e.rolloutAcc && e.rolloutAcc.length && document.getElementById(`chart-${key}-racc`)) {
    const raccMA = movingAvg(e.rolloutAcc, 5);
    const raccItems = [{ name: primName, data: raccMA, color: e.color }];
    if (s && s.rolloutAcc) raccItems.push(s3o("S3", movingAvg(s.rolloutAcc, 5)));
    if (v && v.rolloutAcc) raccItems.push(v2o("V2", movingAvg(v.rolloutAcc, 5)));
    if (e24 && e24.rolloutAcc) raccItems.push(e24o("Easy-24K", movingAvg(e24.rolloutAcc, 5)));
    if (e32 && e32.rolloutAcc) raccItems.push(e32o("Easy-32K", movingAvg(e32.rolloutAcc, 5)));
    if (think32 && think32.rolloutAcc) raccItems.push(think32o("Think32K", movingAvg(think32.rolloutAcc, 5)));
    if (s124 && s124.rolloutAcc) raccItems.push(s124o("S1-24K", movingAvg(s124.rolloutAcc, 5)));
    if (extEasy && extEasy.rolloutAcc) raccItems.push(extEo("Ext easy-cont", movingAvg(extEasy.rolloutAcc, 5)));
    if (extE24k && extE24k.rolloutAcc) raccItems.push(extE24o("Ext easy-cont-24K", movingAvg(extE24k.rolloutAcc, 5)));
    if (extS1 && extS1.rolloutAcc) raccItems.push(extSo("Ext S1-switch", movingAvg(extS1.rolloutAcc, 5)));
    if (opd && opd.rolloutAcc) raccItems.push(opdo("OPD 2B←4B", movingAvg(opd.rolloutAcc, 5)));
    if (opsd && opsd.rolloutAcc) raccItems.push(opsdo("OPSD 2B←2B", movingAvg(opsd.rolloutAcc, 5)));
    const allRacc = e.rolloutAcc.filter(v => v != null);
    if (s && s.rolloutAcc) allRacc.push(...s.rolloutAcc.filter(v => v != null));
    if (e24 && e24.rolloutAcc) allRacc.push(...e24.rolloutAcc.filter(v => v != null));
    if (e32 && e32.rolloutAcc) allRacc.push(...e32.rolloutAcc.filter(v => v != null));
    if (think32 && think32.rolloutAcc) allRacc.push(...think32.rolloutAcc.filter(v => v != null));
    if (s124 && s124.rolloutAcc) allRacc.push(...s124.rolloutAcc.filter(v => v != null));
    if (extEasy && extEasy.rolloutAcc) allRacc.push(...extEasy.rolloutAcc.filter(v => v != null));
    if (extE24k && extE24k.rolloutAcc) allRacc.push(...extE24k.rolloutAcc.filter(v => v != null));
    if (extS1 && extS1.rolloutAcc) allRacc.push(...extS1.rolloutAcc.filter(v => v != null));
    if (opd && opd.rolloutAcc) allRacc.push(...opd.rolloutAcc.filter(v => v != null));
    if (opsd && opsd.rolloutAcc) allRacc.push(...opsd.rolloutAcc.filter(v => v != null));
    const raccYMax = Math.min(100, Math.ceil((Math.max(...allRacc) + 10) / 10) * 10);
    const raccLegend = document.getElementById(`legend-${key}-racc`);
    if (raccLegend) {
      renderLegend(raccLegend, raccItems, (visible) => drawLineChart(`chart-${key}-racc`, `tip-${key}-racc`, {
        categories: cats, series: visible,
        yMin: 0, yMax: raccYMax, valueSuffix: "%", height: 240,
      }));
    } else {
      drawLineChart(`chart-${key}-racc`, `tip-${key}-racc`, {
        categories: cats, series: raccItems,
        yMin: 0, yMax: raccYMax, valueSuffix: "%", height: 240,
      });
    }
  }

  {
    const items = [{ name: primName, data: e.len, color: e.color }];
    if (s) items.push(s3o("S3", s.len));
    if (v) items.push(v2o("V2", v.len));
    if (e24) items.push(e24o("Easy-24K", e24.len));
    if (e32) items.push(e32o("Easy-32K", e32.len));
    if (think32) items.push(think32o("Think32K", think32.len));
    if (s124) items.push(s124o("S1-24K", s124.len));
    if (extEasy) items.push(extEo("Ext easy-cont", extEasy.len));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K", extE24k.len));
    if (extS1) items.push(extSo("Ext S1-switch", extS1.len));
    if (opd) items.push(opdo("OPD 2B←4B", opd.len));
    if (opsd) items.push(opsdo("OPSD 2B←2B", opsd.len));
    const lenRefs = [{ value: 16384, label: "16K cap", tone: "danger" }];
    if (e24 || s124 || extE24k || opd || opsd) lenRefs.push({ value: 24576, label: "24K cap", tone: "neutral" });
    if (e32 || think32) lenRefs.push({ value: 32768, label: "32K cap", tone: "neutral" });
    const lenLegend = document.getElementById(`legend-${key}-len`);
    if (lenLegend) {
      renderLegend(lenLegend, items, (visible) => drawLineChart(`chart-${key}-len`, `tip-${key}-len`, {
        categories: cats, series: visible,
        valueSuffix: " tok", height: 200,
        referenceLines: lenRefs,
      }));
    } else {
      drawLineChart(`chart-${key}-len`, `tip-${key}-len`, {
        categories: cats, series: items,
        valueSuffix: " tok", height: 200,
        referenceLines: lenRefs,
      });
    }
  }

  if (e.trunc && document.getElementById(`chart-${key}-trunc`)) {
    const items = [{ name: isDistill ? primName + " clip@24K" : "Easy-Boxed clip@16K", data: e.trunc, color: e.color }];
    if (s && s.trunc) items.push(s3o("S3 clip@16K", s.trunc));
    if (v && v.trunc) items.push(v2o("V2 clip@16K", v.trunc));
    if (e24 && e24.trunc) items.push(e24o("Easy-24K clip@24K", e24.trunc));
    if (e32 && e32.trunc) items.push(e32o("Easy-32K clip@32K", e32.trunc));
    if (think32 && think32.trunc) items.push(think32o("Think32K clip@32K", think32.trunc));
    if (s124 && s124.trunc) items.push(s124o("S1-24K clip@24K", s124.trunc));
    if (extEasy && extEasy.trunc) items.push(extEo("Ext easy-cont clip@16K", extEasy.trunc));
    if (extE24k && extE24k.trunc) items.push(extE24o("Ext easy-cont-24K clip@24K", extE24k.trunc));
    if (extS1 && extS1.trunc) items.push(extSo("Ext S1-switch clip@16K", extS1.trunc));
    if (opd && opd.trunc) items.push(opdo("OPD 2B←4B clip@24K", opd.trunc));
    if (opsd && opsd.trunc) items.push(opsdo("OPSD 2B←2B clip@24K", opsd.trunc));
    bindSeriesLegend(`legend-${key}-trunc`, items, (visible) => drawLineChart(`chart-${key}-trunc`, `tip-${key}-trunc`, {
      categories: cats, series: visible,
      valueSuffix: "%", height: 200, yMin: 0,
    }));
  }

  if (e.promptLen && document.getElementById(`chart-${key}-promptlen`)) {
    const items = [{ name: primName, data: e.promptLen, color: e.color }];
    if (s && s.promptLen) items.push(s3o("S3", s.promptLen));
    if (v && v.promptLen) items.push(v2o("V2", v.promptLen));
    if (e24 && e24.promptLen) items.push(e24o("Easy-24K", e24.promptLen));
    if (e32 && e32.promptLen) items.push(e32o("Easy-32K", e32.promptLen));
    if (think32 && think32.promptLen) items.push(think32o("Think32K", think32.promptLen));
    if (s124 && s124.promptLen) items.push(s124o("S1-24K", s124.promptLen));
    if (extEasy && extEasy.promptLen) items.push(extEo("Ext easy-cont", extEasy.promptLen));
    if (extE24k && extE24k.promptLen) items.push(extE24o("Ext easy-cont-24K", extE24k.promptLen));
    if (extS1 && extS1.promptLen) items.push(extSo("Ext S1-switch", extS1.promptLen));
    if (opd && opd.promptLen) items.push(opdo("OPD 2B←4B", opd.promptLen));
    if (opsd && opsd.promptLen) items.push(opsdo("OPSD 2B←2B", opsd.promptLen));
    bindSeriesLegend(`legend-${key}-promptlen`, items, (visible) => drawLineChart(`chart-${key}-promptlen`, `tip-${key}-promptlen`, {
      categories: cats, series: visible,
      valueSuffix: " tok", height: 200,
    }));
  }

  const lossLegend = document.getElementById(`legend-${key}-loss`);
  {
    const items = [
      { name: primName + " loss", data: e.loss, color: e.color },
    ];
    if (s) items.push(s3o("S3 loss", s.loss));
    if (v) items.push(v2o("V2 loss", v.loss));
    if (e24) items.push(e24o("Easy-24K loss", e24.loss));
    if (e32) items.push(e32o("Easy-32K loss", e32.loss));
    if (think32) items.push(think32o("Think32K loss", think32.loss));
    if (s124) items.push(s124o("S1-24K loss", s124.loss));
    if (extEasy) items.push(extEo("Ext easy-cont loss", extEasy.loss));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K loss", extE24k.loss));
    if (extS1) items.push(extSo("Ext S1-switch loss", extS1.loss));
    if (opd) items.push(opdo("OPD 2B←4B loss", opd.loss));
    if (opsd) items.push(opsdo("OPSD 2B←2B loss", opsd.loss));
    if (lossLegend) {
      renderLegend(lossLegend, items, (visible) => drawLineChart(`chart-${key}-loss`, `tip-${key}-loss`, {
        categories: cats, series: visible, height: 220,
      }));
    } else {
      drawLineChart(`chart-${key}-loss`, `tip-${key}-loss`, {
        categories: cats, series: items, height: 200,
      });
    }
  }

  {
    const items = [{ name: primName + " entropy", data: e.ent, color: e.color }];
    if (s) items.push(s3o("S3 entropy", s.ent));
    if (v) items.push(v2o("V2 entropy", v.ent));
    if (e24) items.push(e24o("Easy-24K entropy", e24.ent));
    if (e32) items.push(e32o("Easy-32K entropy", e32.ent));
    if (think32) items.push(think32o("Think32K entropy", think32.ent));
    if (s124) items.push(s124o("S1-24K entropy", s124.ent));
    if (extEasy) items.push(extEo("Ext easy-cont entropy", extEasy.ent));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K entropy", extE24k.ent));
    if (extS1) items.push(extSo("Ext S1-switch entropy", extS1.ent));
    if (opd) items.push(opdo("OPD 2B←4B entropy", opd.ent));
    if (opsd) items.push(opsdo("OPSD 2B←2B entropy", opsd.ent));
    bindSeriesLegend(`legend-${key}-ent`, items, (visible) => drawLineChart(`chart-${key}-ent`, `tip-${key}-ent`, {
      categories: cats, series: visible, height: 200,
    }));
  }

  if (e.klLoss && e.klLoss.some((x) => x != null) && document.getElementById(`chart-${key}-klloss`)) {
    const items = [{ name: primName + " kl_loss ×100", data: e.klLoss, color: e.color }];
    if (s && s.klLoss && s.klLoss.some(x => x != null)) items.push(s3o("S3 kl_loss ×100", s.klLoss));
    if (v && v.klLoss && v.klLoss.some(x => x != null)) items.push(v2o("V2 kl_loss ×100", v.klLoss));
    if (e24 && e24.klLoss && e24.klLoss.some(x => x != null)) items.push(e24o("Easy-24K kl_loss ×100", e24.klLoss));
    if (e32 && e32.klLoss && e32.klLoss.some(x => x != null)) items.push(e32o("Easy-32K kl_loss ×100", e32.klLoss));
    if (think32 && think32.klLoss && think32.klLoss.some(x => x != null)) items.push(think32o("Think32K kl_loss ×100", think32.klLoss));
    if (s124 && s124.klLoss && s124.klLoss.some(x => x != null)) items.push(s124o("S1-24K kl_loss ×100", s124.klLoss));
    if (extEasy && extEasy.klLoss && extEasy.klLoss.some(x => x != null)) items.push(extEo("Ext easy-cont kl_loss ×100", extEasy.klLoss));
    if (extE24k && extE24k.klLoss && extE24k.klLoss.some(x => x != null)) items.push(extE24o("Ext easy-cont-24K kl_loss ×100", extE24k.klLoss));
    if (extS1 && extS1.klLoss && extS1.klLoss.some(x => x != null)) items.push(extSo("Ext S1-switch kl_loss ×100", extS1.klLoss));
    if (opd && opd.klLoss && opd.klLoss.some(x => x != null)) items.push(opdo("OPD 2B←4B kl_loss ×100", opd.klLoss));
    if (opsd && opsd.klLoss && opsd.klLoss.some(x => x != null)) items.push(opsdo("OPSD 2B←2B kl_loss ×100", opsd.klLoss));
    bindSeriesLegend(`legend-${key}-klloss`, items, (visible) => drawLineChart(`chart-${key}-klloss`, `tip-${key}-klloss`, {
      categories: cats, series: visible, height: 200, yMin: 0,
    }));
  }

  {
    const items = [{ name: primName + " grad_norm", data: e.grad, color: e.color }];
    if (s) items.push(s3o("S3 grad_norm", s.grad));
    if (v) items.push(v2o("V2 grad_norm", v.grad));
    if (e24) items.push(e24o("Easy-24K grad_norm", e24.grad));
    if (e32) items.push(e32o("Easy-32K grad_norm", e32.grad));
    if (think32) items.push(think32o("Think32K grad_norm", think32.grad));
    if (s124) items.push(s124o("S1-24K grad_norm", s124.grad));
    if (extEasy) items.push(extEo("Ext easy-cont grad_norm", extEasy.grad));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K grad_norm", extE24k.grad));
    if (extS1) items.push(extSo("Ext S1-switch grad_norm", extS1.grad));
    if (opd) items.push(opdo("OPD 2B←4B grad_norm", opd.grad));
    if (opsd) items.push(opsdo("OPSD 2B←2B grad_norm", opsd.grad));
    const gradLegend = document.getElementById(`legend-${key}-grad`);
    if (gradLegend) {
      renderLegend(gradLegend, items, (visible) => drawLineChart(`chart-${key}-grad`, `tip-${key}-grad`, {
        categories: cats, series: visible, height: 200,
      }));
    } else {
      drawLineChart(`chart-${key}-grad`, `tip-${key}-grad`, {
        categories: cats, series: items, height: 200,
      });
    }
  }
  {
    const items = [{ name: primName + " ppo_kl ×1e5", data: e.ppokl, color: e.color }];
    if (s) items.push(s3o("S3 ppo_kl ×1e5", s.ppokl));
    if (v) items.push(v2o("V2 ppo_kl ×1e5", v.ppokl));
    if (e24) items.push(e24o("Easy-24K ppo_kl ×1e5", e24.ppokl));
    if (e32) items.push(e32o("Easy-32K ppo_kl ×1e5", e32.ppokl));
    if (think32) items.push(think32o("Think32K ppo_kl ×1e5", think32.ppokl));
    if (s124) items.push(s124o("S1-24K ppo_kl ×1e5", s124.ppokl));
    if (extEasy) items.push(extEo("Ext easy-cont ppo_kl ×1e5", extEasy.ppokl));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K ppo_kl ×1e5", extE24k.ppokl));
    if (extS1) items.push(extSo("Ext S1-switch ppo_kl ×1e5", extS1.ppokl));
    if (opd) items.push(opdo("OPD 2B←4B ppo_kl ×1e5", opd.ppokl));
    if (opsd) items.push(opsdo("OPSD 2B←2B ppo_kl ×1e5", opsd.ppokl));
    bindSeriesLegend(`legend-${key}-ppokl`, items, (visible) => drawLineChart(`chart-${key}-ppokl`, `tip-${key}-ppokl`, {
      categories: cats, series: visible, height: 200,
      referenceLines: [{ value: 0, label: "0", tone: "neutral" }],
    }));
  }
  {
    const clipItems = [{ name: primName + " clipfrac", data: e.clip, color: e.color }];
    // amber (not danger red) — avoids collision with E5 pink clipfrac
    if (e.clipLower) clipItems.push({ name: primName + " clipfrac_lower", data: e.clipLower, color: "#c2410c" });
    if (s) clipItems.push(s3o("S3 clipfrac", s.clip));
    if (v) clipItems.push(v2o("V2 clipfrac", v.clip));
    if (e24) clipItems.push(e24o("Easy-24K clipfrac", e24.clip));
    if (e32) clipItems.push(e32o("Easy-32K clipfrac", e32.clip));
    if (think32) clipItems.push(think32o("Think32K clipfrac", think32.clip));
    if (s124) clipItems.push(s124o("S1-24K clipfrac", s124.clip));
    if (extEasy) clipItems.push(extEo("Ext easy-cont clipfrac", extEasy.clip));
    if (extE24k) clipItems.push(extE24o("Ext easy-cont-24K clipfrac", extE24k.clip));
    if (extS1) clipItems.push(extSo("Ext S1-switch clipfrac", extS1.clip));
    if (opd) clipItems.push(opdo("OPD 2B←4B clipfrac", opd.clip));
    if (opsd) clipItems.push(opsdo("OPSD 2B←2B clipfrac", opsd.clip));
    if (s && s.clipLower) clipItems.push({ name: "S3 clipfrac_lower", data: s.clipLower, color: "#c026d3", dash: [6, 4] });
    if (v && v.clipLower) clipItems.push({ name: "V2 clipfrac_lower", data: v.clipLower, color: "#0284c7", dash: [2, 3] });
    if (e24 && e24.clipLower) clipItems.push({ name: "Easy-24K clipfrac_lower", data: e24.clipLower, color: "#a21caf", dash: [1, 3] });
    if (e32 && e32.clipLower) clipItems.push({ name: "Easy-32K clipfrac_lower", data: e32.clipLower, color: "#4338ca", dash: [3, 1, 1, 1] });
    if (think32 && think32.clipLower) clipItems.push({ name: "Think32K clipfrac_lower", data: think32.clipLower, color: think32c, dash: [6, 2, 1, 2] });
    if (s124 && s124.clipLower) clipItems.push({ name: "S1-24K clipfrac_lower", data: s124.clipLower, color: "#0369a1", dash: [5, 2, 1, 2] });
    if (extEasy && extEasy.clipLower) clipItems.push({ name: "Ext easy-cont clipfrac_lower", data: extEasy.clipLower, color: "#155e75", dash: [4, 2, 1, 2] });
    if (extE24k && extE24k.clipLower) clipItems.push({ name: "Ext easy-cont-24K clipfrac_lower", data: extE24k.clipLower, color: "#92400e", dash: [6, 2, 1, 2] });
    if (extS1 && extS1.clipLower) clipItems.push({ name: "Ext S1-switch clipfrac_lower", data: extS1.clipLower, color: "#9f1239", dash: [8, 3] });
    if (opd && opd.clipLower) clipItems.push({ name: "OPD 2B←4B clipfrac_lower", data: opd.clipLower, color: "#a16207", dash: [2, 2] });
    if (opsd && opsd.clipLower) clipItems.push({ name: "OPSD 2B←2B clipfrac_lower", data: opsd.clipLower, color: "#0e7490", dash: [1, 1] });
    bindSeriesLegend(`legend-${key}-clip`, clipItems, (visible) => drawLineChart(`chart-${key}-clip`, `tip-${key}-clip`, {
      categories: cats, series: visible,
      valueSuffix: "%", height: 200, yMin: 0,
    }));
  }
  {
    const items = [{ name: primName + " (1−corr)×1e4", data: e.pearsonDev, color: e.color }];
    if (s) items.push(s3o("S3 (1−corr)×1e4", s.pearsonDev));
    if (v) items.push(v2o("V2 (1−corr)×1e4", v.pearsonDev));
    if (e24) items.push(e24o("Easy-24K (1−corr)×1e4", e24.pearsonDev));
    if (e32) items.push(e32o("Easy-32K (1−corr)×1e4", e32.pearsonDev));
    if (think32) items.push(think32o("Think32K (1−corr)×1e4", think32.pearsonDev));
    if (s124) items.push(s124o("S1-24K (1−corr)×1e4", s124.pearsonDev));
    if (extEasy) items.push(extEo("Ext easy-cont (1−corr)×1e4", extEasy.pearsonDev));
    if (extE24k) items.push(extE24o("Ext easy-cont-24K (1−corr)×1e4", extE24k.pearsonDev));
    if (extS1) items.push(extSo("Ext S1-switch (1−corr)×1e4", extS1.pearsonDev));
    if (opd) items.push(opdo("OPD 2B←4B (1−corr)×1e4", opd.pearsonDev));
    if (opsd) items.push(opsdo("OPSD 2B←2B (1−corr)×1e4", opsd.pearsonDev));
    const corrLegend = document.getElementById(`legend-${key}-corr`);
    if (corrLegend) {
      renderLegend(corrLegend, items, (visible) => drawLineChart(`chart-${key}-corr`, `tip-${key}-corr`, {
        categories: cats, series: visible, height: 200, yMin: 0,
      }));
    } else {
      drawLineChart(`chart-${key}-corr`, `tip-${key}-corr`, {
        categories: cats, series: items, height: 200, yMin: 0,
      });
    }
  }

  if (e.rolloutKl && document.getElementById(`chart-${key}-rollkl`)) {
    const items = [{ name: primName + " rollout_kl ×1e4", data: e.rolloutKl, color: e.color }];
    if (s && s.rolloutKl) items.push(s3o("S3 rollout_kl ×1e4", s.rolloutKl));
    if (v && v.rolloutKl) items.push(v2o("V2 rollout_kl ×1e4", v.rolloutKl));
    if (e24 && e24.rolloutKl) items.push(e24o("Easy-24K rollout_kl ×1e4", e24.rolloutKl));
    if (e32 && e32.rolloutKl) items.push(e32o("Easy-32K rollout_kl ×1e4", e32.rolloutKl));
    if (think32 && think32.rolloutKl) items.push(think32o("Think32K rollout_kl ×1e4", think32.rolloutKl));
    if (s124 && s124.rolloutKl) items.push(s124o("S1-24K rollout_kl ×1e4", s124.rolloutKl));
    if (extEasy && extEasy.rolloutKl) items.push(extEo("Ext easy-cont rollout_kl ×1e4", extEasy.rolloutKl));
    if (extE24k && extE24k.rolloutKl) items.push(extE24o("Ext easy-cont-24K rollout_kl ×1e4", extE24k.rolloutKl));
    if (extS1 && extS1.rolloutKl) items.push(extSo("Ext S1-switch rollout_kl ×1e4", extS1.rolloutKl));
    if (opd && opd.rolloutKl) items.push(opdo("OPD 2B←4B rollout_kl ×1e4", opd.rolloutKl));
    if (opsd && opsd.rolloutKl) items.push(opsdo("OPSD 2B←2B rollout_kl ×1e4", opsd.rolloutKl));
    bindSeriesLegend(`legend-${key}-rollkl`, items, (visible) => drawLineChart(`chart-${key}-rollkl`, `tip-${key}-rollkl`, {
      categories: cats, series: visible, height: 200, yMin: 0,
    }));
  }
  if (e.stepMin && document.getElementById(`chart-${key}-stepmin`)) {
    const items = [{ name: primName, data: e.stepMin, color: e.color }];
    if (s && s.stepMin) items.push(s3o("S3", s.stepMin));
    if (v && v.stepMin) items.push(v2o("V2", v.stepMin));
    if (e24 && e24.stepMin) items.push(e24o("Easy-24K", e24.stepMin));
    if (e32 && e32.stepMin) items.push(e32o("Easy-32K", e32.stepMin));
    if (think32 && think32.stepMin) items.push(think32o("Think32K", think32.stepMin));
    if (s124 && s124.stepMin) items.push(s124o("S1-24K", s124.stepMin));
    if (extEasy && extEasy.stepMin) items.push(extEo("Ext easy-cont", extEasy.stepMin));
    if (extE24k && extE24k.stepMin) items.push(extE24o("Ext easy-cont-24K", extE24k.stepMin));
    if (extS1 && extS1.stepMin) items.push(extSo("Ext S1-switch", extS1.stepMin));
    if (opd && opd.stepMin) items.push(opdo("OPD 2B←4B", opd.stepMin));
    if (opsd && opsd.stepMin) items.push(opsdo("OPSD 2B←2B", opsd.stepMin));
    bindSeriesLegend(`legend-${key}-stepmin`, items, (visible) => drawLineChart(`chart-${key}-stepmin`, `tip-${key}-stepmin`, {
      categories: cats, series: visible,
      valueSuffix: " min", height: 200, yMin: 0,
    }));
  }
  if (e.mfu && document.getElementById(`chart-${key}-mfu`)) {
    const items = [{ name: primName + " MFU", data: e.mfu, color: e.color }];
    if (s && s.mfu) items.push(s3o("S3 MFU", s.mfu));
    if (v && v.mfu) items.push(v2o("V2 MFU", v.mfu));
    if (e24 && e24.mfu) items.push(e24o("Easy-24K MFU", e24.mfu));
    if (e32 && e32.mfu) items.push(e32o("Easy-32K MFU", e32.mfu));
    if (think32 && think32.mfu) items.push(think32o("Think32K MFU", think32.mfu));
    if (s124 && s124.mfu) items.push(s124o("S1-24K MFU", s124.mfu));
    if (extEasy && extEasy.mfu) items.push(extEo("Ext easy-cont MFU", extEasy.mfu));
    if (extE24k && extE24k.mfu) items.push(extE24o("Ext easy-cont-24K MFU", extE24k.mfu));
    if (extS1 && extS1.mfu) items.push(extSo("Ext S1-switch MFU", extS1.mfu));
    if (opd && opd.mfu) items.push(opdo("OPD 2B←4B MFU", opd.mfu));
    if (opsd && opsd.mfu) items.push(opsdo("OPSD 2B←2B MFU", opsd.mfu));
    bindSeriesLegend(`legend-${key}-mfu`, items, (visible) => drawLineChart(`chart-${key}-mfu`, `tip-${key}-mfu`, {
      categories: cats, series: visible,
      valueSuffix: "%", height: 200,
    }));
  }
  if (e.throughput && document.getElementById(`chart-${key}-thru`)) {
    const items = [{ name: primName + " throughput", data: e.throughput, color: e.color }];
    if (s && s.throughput) items.push(s3o("S3 throughput", s.throughput));
    if (v && v.throughput) items.push(v2o("V2 throughput", v.throughput));
    if (e24 && e24.throughput) items.push(e24o("Easy-24K throughput", e24.throughput));
    if (e32 && e32.throughput) items.push(e32o("Easy-32K throughput", e32.throughput));
    if (think32 && think32.throughput) items.push(think32o("Think32K throughput", think32.throughput));
    if (s124 && s124.throughput) items.push(s124o("S1-24K throughput", s124.throughput));
    if (extEasy && extEasy.throughput) items.push(extEo("Ext easy-cont throughput", extEasy.throughput));
    if (extE24k && extE24k.throughput) items.push(extE24o("Ext easy-cont-24K throughput", extE24k.throughput));
    if (extS1 && extS1.throughput) items.push(extSo("Ext S1-switch throughput", extS1.throughput));
    if (opd && opd.throughput) items.push(opdo("OPD 2B←4B throughput", opd.throughput));
    if (opsd && opsd.throughput) items.push(opsdo("OPSD 2B←2B throughput", opsd.throughput));
    bindSeriesLegend(`legend-${key}-thru`, items, (visible) => drawLineChart(`chart-${key}-thru`, `tip-${key}-thru`, {
      categories: cats, series: visible,
      valueSuffix: " tok/s", height: 200,
    }));
  }

  // ---- Stage timing (timing_s/*) ----
  if (e.timing && document.getElementById(`chart-${key}-timing`)) {
    const t = e.timing;
    const tm = e.timingMean || {};
    const summaryEl = document.getElementById(`${key}-timing-summary`);
    if (summaryEl) {
      const fmtNum = (v) => {
        if (v == null) return "—";
        const n = Number(v);
        if (n === 0) return "0s";
        return n >= 10 ? `${Math.round(n)}s` : `${n.toFixed(1)}s`;
      };
      const pctHtml = (v) => {
        if (v == null || !tm.step) return "";
        return `<span class="t-pct">${((v / tm.step) * 100).toFixed(1)}%</span>`;
      };
      const cell = (label, value, opts = {}) => {
        const cls = ["t-metric"];
        if (opts.major) cls.push("is-major");
        if (opts.step) cls.push("is-step");
        if (opts.muted || value == null) cls.push("is-muted");
        return (
          `<div class="${cls.join(" ")}">` +
          `<div class="t-val">${fmtNum(value)}${opts.showPct ? pctHtml(value) : ""}</div>` +
          `<div class="t-label">${label}</div>` +
          `</div>`
        );
      };
      const titleEl = summaryEl.querySelector(".title");
      const metricsEl = summaryEl.querySelector(".timing-metrics");
      const titleText = `${e.label} 平均 stage 耗时（${e.cats.length} 步均值）`;
      const metricsHtml =
        cell("step · 整步墙钟", tm.step, { step: true }) +
        `<div class="t-row t-row-major">` +
        cell("gen (rollout)", tm.gen, { major: true, showPct: true }) +
        cell("update_actor", tm.update_actor, { major: true, showPct: true }) +
        `</div>` +
        `<div class="t-row t-row-minor">` +
        cell("ref", tm.ref, { showPct: true, muted: tm.ref == null }) +
        cell("old_log_prob", tm.old_log_prob, { showPct: true }) +
        cell("update_weights", tm.update_weights) +
        cell("adv", tm.adv) +
        cell("reward", tm.reward, { muted: !tm.reward }) +
        `</div>`;
      if (titleEl && metricsEl) {
        titleEl.textContent = titleText;
        metricsEl.innerHTML = metricsHtml;
      } else {
        const gloss = summaryEl.querySelector("details.stage-gloss");
        summaryEl.innerHTML =
          `<div class="title">${titleText}</div>` +
          `<div class="timing-metrics">${metricsHtml}</div>`;
        if (gloss) summaryEl.appendChild(gloss);
      }
    }
    const majorLegend = document.getElementById(`legend-${key}-timing`);
    if (majorLegend) {
      const hasVals = (xs) => Array.isArray(xs) && xs.some((x) => x != null);
      const majorItems = [
        { name: "gen (rollout)", data: t.gen, color: STAGE_COLORS.gen },
        { name: "update_actor", data: t.update_actor, color: STAGE_COLORS.update_actor },
        { name: "ref", data: t.ref, color: STAGE_COLORS.ref },
        { name: "old_log_prob", data: t.old_log_prob, color: STAGE_COLORS.old_log_prob },
      ].filter((s) => hasVals(s.data));
      renderLegend(majorLegend, majorItems, (visible) => drawLineChart(`chart-${key}-timing`, `tip-${key}-timing`, {
        categories: cats,
        series: visible,
        valueSuffix: " s", height: 240, yMin: 0,
      }));
    }
    if (document.getElementById(`chart-${key}-timing-step`)) {
      const items = [{ name: primName + " step", data: t.step, color: e.color }];
      if (s && s.timing) items.push(s3o("S3 step", s.timing.step));
      if (v && v.timing) items.push(v2o("V2 step", v.timing.step));
      if (e24 && e24.timing) items.push(e24o("Easy-24K step", e24.timing.step));
      if (e32 && e32.timing) items.push(e32o("Easy-32K step", e32.timing.step));
      if (think32 && think32.timing) items.push(think32o("Think32K step", think32.timing.step));
      if (s124 && s124.timing) items.push(s124o("S1-24K step", s124.timing.step));
      if (extEasy && extEasy.timing) items.push(extEo("Ext easy-cont step", extEasy.timing.step));
      if (extE24k && extE24k.timing) items.push(extE24o("Ext easy-cont-24K step", extE24k.timing.step));
      if (extS1 && extS1.timing) items.push(extSo("Ext S1-switch step", extS1.timing.step));
      if (opd && opd.timing) items.push(opdo("OPD 2B←4B step", opd.timing.step));
      if (opsd && opsd.timing) items.push(opsdo("OPSD 2B←2B step", opsd.timing.step));
      bindSeriesLegend(`legend-${key}-timing-step`, items, (visible) => drawLineChart(`chart-${key}-timing-step`, `tip-${key}-timing-step`, {
        categories: cats, series: visible,
        valueSuffix: " s", height: 240, yMin: 0,
      }));
    }
    const minorLegend = document.getElementById(`legend-${key}-timing-minor`);
    if (minorLegend) {
      renderLegend(minorLegend, [
        { name: "update_weights", data: t.update_weights, color: STAGE_COLORS.update_weights },
        { name: "adv", data: t.adv, color: STAGE_COLORS.adv },
        { name: "reward", data: t.reward, color: STAGE_COLORS.reward },
      ], (visible) => drawLineChart(`chart-${key}-timing-minor`, `tip-${key}-timing-minor`, {
        categories: cats,
        series: visible,
        valueSuffix: " s", height: 200, yMin: 0,
      }));
    }
    if (document.getElementById(`chart-${key}-timing-mean`)) {
      const meanCats = ["gen", "update_actor", "ref", "old_log_prob", "update_weights", "adv"];
      const meanVals = meanCats.map((k) => tm[k] ?? 0);
      const meanColors = meanCats.map((k) => STAGE_COLORS[k]);
      bindBarLegend(`legend-${key}-timing-mean`, meanCats, meanVals, meanColors, (data) => {
        drawBarChart(`chart-${key}-timing-mean`, `tip-${key}-timing-mean`, {
          categories: meanCats, data, colors: meanColors,
          valueSuffix: " s", height: 200,
        });
      });
    }
  }

  // ---- Evalscope 评测结果（Easy dense + S3/V2/Easy-24K/32K/Ext overlays；长跑可扩到 10–300）----
  const evalEl = document.getElementById(`chart-${key}-eval-mmlu`);
  if (evalEl) {
    let steps = null, ev = null;
    if (key === "opd") {
      if (typeof EVAL_FULL_OPD !== "undefined" && EVAL_FULL_OPD.e2) {
        steps = (typeof EVAL_OPD_STEPS !== "undefined") ? EVAL_OPD_STEPS : null;
        ev = EVAL_FULL_OPD.e2;
      }
    } else if (key === "opsd") {
      if (typeof EVAL_FULL_OPSD !== "undefined" && EVAL_FULL_OPSD.e2) {
        steps = (typeof EVAL_OPSD_STEPS !== "undefined") ? EVAL_OPSD_STEPS
          : ((typeof EVAL_OPD_STEPS !== "undefined") ? EVAL_OPD_STEPS : null);
        ev = EVAL_FULL_OPSD.e2;
      } else if (typeof EVAL_FULL_OPD !== "undefined" && EVAL_FULL_OPD.e2) {
        steps = (typeof EVAL_OPD_STEPS !== "undefined") ? EVAL_OPD_STEPS : null;
        ev = { label: e.label || "OPSD 2B←2B", color: COLORS.opsd || "#0891b2" };
      }
    } else if (typeof EVAL_EASY_BOXED_FULL !== "undefined" && EVAL_EASY_BOXED_FULL[key]) {
      steps = EVAL_EASY_BOXED_FULL_STEPS; ev = EVAL_EASY_BOXED_FULL[key];
    } else if (typeof EVAL_EASY_BOXED !== "undefined" && EVAL_EASY_BOXED[key]) {
      steps = EVAL_EASY_BOXED_STEPS; ev = EVAL_EASY_BOXED[key];
    }
    const s3ev = isDistill ? null : ((typeof EVAL_FULL_S3 !== "undefined" && EVAL_FULL_S3[key]) ? EVAL_FULL_S3[key] : null);
    const v2ev = isDistill ? null : ((typeof EVAL_FULL_V2 !== "undefined" && EVAL_FULL_V2[key]) ? EVAL_FULL_V2[key] : null);
    const e24ev = (typeof EVAL_FULL_E24K !== "undefined" && EVAL_FULL_E24K[srcKey]) ? EVAL_FULL_E24K[srcKey] : null;
    const e32ev = isDistill ? null : ((typeof EVAL_FULL_E32K !== "undefined" && EVAL_FULL_E32K[key]) ? EVAL_FULL_E32K[key] : null);
    const s124ev = isDistill ? null : ((typeof EVAL_FULL_S124K !== "undefined" && EVAL_FULL_S124K[key]) ? EVAL_FULL_S124K[key] : null);
    const extEasyEv = isDistill ? null : ((typeof EVAL_FULL_EXT_EASY !== "undefined" && EVAL_FULL_EXT_EASY[key]) ? EVAL_FULL_EXT_EASY[key] : null);
    const extE24Ev = isDistill ? null : ((typeof EVAL_FULL_EXT_E24K !== "undefined" && EVAL_FULL_EXT_E24K[key]) ? EVAL_FULL_EXT_E24K[key] : null);
    const extS1Ev = isDistill ? null : ((typeof EVAL_FULL_EXT_S1 !== "undefined" && EVAL_FULL_EXT_S1[key]) ? EVAL_FULL_EXT_S1[key] : null);
    const opdev = key === "opd" ? null : ((typeof EVAL_FULL_OPD !== "undefined" && EVAL_FULL_OPD[srcKey]) ? EVAL_FULL_OPD[srcKey] : null);
    const opsdev = key === "opsd" ? null : ((typeof EVAL_FULL_OPSD !== "undefined" && EVAL_FULL_OPSD[srcKey]) ? EVAL_FULL_OPSD[srcKey] : null);
    if (ev && steps) {
      const baseSteps = steps;
      const e32Steps = (typeof EVAL_E32K_STEPS !== "undefined") ? EVAL_E32K_STEPS : baseSteps;
      const s124Steps = (typeof EVAL_S124K_STEPS !== "undefined") ? EVAL_S124K_STEPS : e32Steps;
      const e24Steps = (typeof EVAL_E24K_STEPS !== "undefined") ? EVAL_E24K_STEPS : e32Steps;
      const extE24Steps = (typeof EVAL_EXT_E24K_STEPS !== "undefined") ? EVAL_EXT_E24K_STEPS : e24Steps;
      const opdSteps = (typeof EVAL_OPD_STEPS !== "undefined") ? EVAL_OPD_STEPS : e24Steps;
      const opsdSteps = (typeof EVAL_OPSD_STEPS !== "undefined") ? EVAL_OPSD_STEPS : opdSteps;
      const plotSteps = pickEvalPlotSteps(baseSteps, [
        { row: v2ev, steps: (typeof EVAL_V2_STEPS !== "undefined") ? EVAL_V2_STEPS : null },
        { row: e24ev, steps: e24Steps },
        { row: e32ev, steps: e32Steps },
        { row: s124ev, steps: s124Steps },
        { row: extEasyEv, steps: (typeof EVAL_EXT_EASY_STEPS !== "undefined") ? EVAL_EXT_EASY_STEPS : null },
        { row: extE24Ev, steps: extE24Steps },
        { row: extS1Ev, steps: (typeof EVAL_EXT_S1_STEPS !== "undefined") ? EVAL_EXT_S1_STEPS : null },
        { row: opdev, steps: opdSteps },
        { row: opsdev, steps: opsdSteps },
      ]);
      const pushAligned = (items, name, row, metric, fromSteps, seriesFn, color) => {
        if (!evalHasMetric(row, metric)) return;
        const data = alignEvalSeries(row[metric], fromSteps, plotSteps);
        items.push(seriesFn(name, data, color));
      };
      const easyMmlu = alignEvalSeries(ev.mmlu, baseSteps, plotSteps);
      const easyAime24 = alignEvalSeries(ev.aime24, baseSteps, plotSteps);
      const easyAime25 = alignEvalSeries(ev.aime25, baseSteps, plotSteps);
      const easyMath = alignEvalSeries(ev.math500, baseSteps, plotSteps);
      const s3Mmlu = s3ev ? alignEvalSeries(s3ev.mmlu, baseSteps, plotSteps) : null;
      const s3Aime24 = s3ev ? alignEvalSeries(s3ev.aime24, baseSteps, plotSteps) : null;
      const s3Aime25 = s3ev ? alignEvalSeries(s3ev.aime25, baseSteps, plotSteps) : null;
      const s3Math = s3ev ? alignEvalSeries(s3ev.math500, baseSteps, plotSteps) : null;
      const hasExtra = !!(e24ev || e32ev || s124ev || extEasyEv || extE24Ev || extS1Ev || opdev || opsdev);

      const mmluItems = [{ name: primName, data: easyMmlu, color: ev.color }];
      if (s3Mmlu) mmluItems.push(s3o("S3", s3Mmlu));
      if (evalHasMetric(v2ev, "mmlu")) mmluItems.push(v2o("V2", v2ev.mmlu));
      pushAligned(mmluItems, "Easy-24K", e24ev, "mmlu", e24Steps, e24kSeries, e24c);
      pushAligned(mmluItems, "Easy-32K", e32ev, "mmlu", e32Steps, e32kSeries, e32c);
      pushAligned(mmluItems, "S1-24K", s124ev, "mmlu", s124Steps, s124kSeries, S124K_ALT[key] || COLORS.s124k);
      pushAligned(mmluItems, "Ext easy-cont", extEasyEv, "mmlu",
        (typeof EVAL_EXT_EASY_STEPS !== "undefined") ? EVAL_EXT_EASY_STEPS : plotSteps,
        extEasySeries, EXT_EASY_ALT[key] || COLORS.extEasy);
      pushAligned(mmluItems, "Ext easy-cont-24K", extE24Ev, "mmlu", extE24Steps,
        extE24kSeries, EXT_E24K_ALT[key] || COLORS.extE24k);
      pushAligned(mmluItems, "Ext S1-switch", extS1Ev, "mmlu",
        (typeof EVAL_EXT_S1_STEPS !== "undefined") ? EVAL_EXT_S1_STEPS : plotSteps,
        extS1Series, EXT_S1_ALT[key] || COLORS.extS1);
      pushAligned(mmluItems, "OPD 2B←4B", opdev, "mmlu", opdSteps,
        opdSeries, OPD_ALT[key] || COLORS.opd);
      pushAligned(mmluItems, "OPSD 2B←2B", opsdev, "mmlu", opsdSteps,
        opsdSeries, OPSD_ALT[key] || COLORS.opsd);
      const mmluLegendEl = document.getElementById(`legend-${key}-eval-mmlu`);
      const drawMmlu = (visible) => {
        drawLineChart(`chart-${key}-eval-mmlu`, `tip-${key}-eval-mmlu`, {
          categories: plotSteps, series: visible,
          valueSuffix: "%", ...EVAL_Y.mmlu, height: 200,
        });
      };
      if (mmluLegendEl) {
        renderLegend(mmluLegendEl, mmluItems, drawMmlu);
      } else {
        drawMmlu(mmluItems);
      }
      const bindAimeMetric = (metric, easyData, s3Data, color) => {
        const legendEl = document.getElementById(`legend-${key}-eval-${metric}`);
        if (!legendEl) return;
        const hasOverlay = !!(s3ev || v2ev || hasExtra);
        const items = [
          { name: hasOverlay ? primName : metric, data: easyData, color },
        ];
        if (s3ev && s3Data) {
          items.push(metric === "aime24"
            ? { name: "S3", data: s3Data, color: "#c026d3", dash: [6, 4] }
            : s3Series("S3", s3Data, COLORS.s3));
        }
        if (evalHasMetric(v2ev, metric)) {
          items.push(metric === "aime24"
            ? v2o("V2", v2ev[metric])
            : { name: "V2", data: v2ev[metric], color: "#c2410c", dash: [2, 3] });
        }
        pushAligned(items, "Easy-24K", e24ev, metric, e24Steps, e24kSeries, e24c);
        pushAligned(items, "Easy-32K", e32ev, metric, e32Steps, e32kSeries, e32c);
        pushAligned(items, "S1-24K", s124ev, metric, s124Steps, s124kSeries, S124K_ALT[key] || COLORS.s124k);
        pushAligned(items, "Ext easy-cont", extEasyEv, metric,
          (typeof EVAL_EXT_EASY_STEPS !== "undefined") ? EVAL_EXT_EASY_STEPS : plotSteps,
          extEasySeries, EXT_EASY_ALT[key] || COLORS.extEasy);
        pushAligned(items, "Ext easy-cont-24K", extE24Ev, metric, extE24Steps,
          extE24kSeries, EXT_E24K_ALT[key] || COLORS.extE24k);
        pushAligned(items, "Ext S1-switch", extS1Ev, metric,
          (typeof EVAL_EXT_S1_STEPS !== "undefined") ? EVAL_EXT_S1_STEPS : plotSteps,
          extS1Series, EXT_S1_ALT[key] || COLORS.extS1);
        pushAligned(items, "OPD 2B←4B", opdev, metric, opdSteps,
          opdSeries, OPD_ALT[key] || COLORS.opd);
        pushAligned(items, "OPSD 2B←2B", opsdev, metric, opsdSteps,
          opsdSeries, OPSD_ALT[key] || COLORS.opsd);
        renderLegend(legendEl, items, (visible) => {
          drawLineChart(`chart-${key}-eval-${metric}`, `tip-${key}-eval-${metric}`, {
            categories: plotSteps,
            series: visible,
            valueSuffix: "%", ...EVAL_Y[metric], height: 200,
          });
        });
      };
      // aime24 uses blue; aime25 uses experiment color (E1 → e5 pink so it stays distinct)
      bindAimeMetric("aime24", easyAime24, s3Aime24, COLORS.e1);
      bindAimeMetric("aime25", easyAime25, s3Aime25, ev.color === COLORS.e1 ? COLORS.e5 : ev.color);
      const mathEl = document.getElementById(`chart-${key}-eval-math500`);
      if (mathEl && (ev.math500 || evalHasMetric(v2ev, "math500") || evalHasMetric(e32ev, "math500") || evalHasMetric(extS1Ev, "math500") || evalHasMetric(extE24Ev, "math500") || evalHasMetric(opdev, "math500") || evalHasMetric(opsdev, "math500"))) {
        const mathItems = [{ name: primName, data: easyMath, color: ev.color }];
        if (s3Math && s3Math.some((v) => v != null)) mathItems.push(s3o("S3", s3Math));
        if (evalHasMetric(v2ev, "math500")) mathItems.push(v2o("V2", v2ev.math500));
        pushAligned(mathItems, "Easy-24K", e24ev, "math500", e24Steps, e24kSeries, e24c);
        pushAligned(mathItems, "Easy-32K", e32ev, "math500", e32Steps, e32kSeries, e32c);
        pushAligned(mathItems, "S1-24K", s124ev, "math500", s124Steps, s124kSeries, S124K_ALT[key] || COLORS.s124k);
        pushAligned(mathItems, "Ext easy-cont", extEasyEv, "math500",
          (typeof EVAL_EXT_EASY_STEPS !== "undefined") ? EVAL_EXT_EASY_STEPS : plotSteps,
          extEasySeries, EXT_EASY_ALT[key] || COLORS.extEasy);
        pushAligned(mathItems, "Ext easy-cont-24K", extE24Ev, "math500", extE24Steps,
          extE24kSeries, EXT_E24K_ALT[key] || COLORS.extE24k);
        pushAligned(mathItems, "Ext S1-switch", extS1Ev, "math500",
          (typeof EVAL_EXT_S1_STEPS !== "undefined") ? EVAL_EXT_S1_STEPS : plotSteps,
          extS1Series, EXT_S1_ALT[key] || COLORS.extS1);
        pushAligned(mathItems, "OPD 2B←4B", opdev, "math500", opdSteps,
          opdSeries, OPD_ALT[key] || COLORS.opd);
        pushAligned(mathItems, "OPSD 2B←2B", opsdev, "math500", opsdSteps,
          opsdSeries, OPSD_ALT[key] || COLORS.opsd);
        const mathLegendEl = document.getElementById(`legend-${key}-eval-math500`);
        const drawMath = (visible) => {
          drawLineChart(`chart-${key}-eval-math500`, `tip-${key}-eval-math500`, {
            categories: plotSteps, series: visible,
            valueSuffix: "%", ...EVAL_Y.math500, height: 200,
          });
        };
        if (mathLegendEl) {
          renderLegend(mathLegendEl, mathItems, drawMath);
        } else {
          drawMath(mathItems);
        }
      }
    }
  }

  // ---- Agent / 工具调用（本实验 Easy/S3/V2/Easy-32K/Ext/OPD/OPSD：BFCL-v3 + tau-bench）----
  const agentEl = document.getElementById(`chart-${key}-agent-bfcl`);
  if (agentEl && (typeof AGENT_EASY !== "undefined" || typeof AGENT_S3 !== "undefined" || typeof AGENT_V2 !== "undefined"
      || typeof AGENT_E32K !== "undefined" || typeof AGENT_EXT_S1 !== "undefined"
      || typeof AGENT_OPD !== "undefined" || typeof AGENT_OPSD !== "undefined")) {
    const baseAgSteps = key === "opd" && typeof AGENT_OPD_STEPS !== "undefined"
      ? AGENT_OPD_STEPS
      : (key === "opsd" && typeof AGENT_OPSD_STEPS !== "undefined"
        ? AGENT_OPSD_STEPS
        : (key === "opsd" && typeof AGENT_OPD_STEPS !== "undefined"
          ? AGENT_OPD_STEPS
          : ((typeof AGENT_S3_STEPS !== "undefined")
            ? AGENT_S3_STEPS
            : (typeof AGENT_EASY_STEPS !== "undefined" ? AGENT_EASY_STEPS : EVAL_EASY_BOXED_FULL_STEPS))));
    const easy = key === "opd"
      ? ((typeof AGENT_OPD !== "undefined") ? AGENT_OPD.e2 : null)
      : (key === "opsd"
        ? ((typeof AGENT_OPSD !== "undefined") ? AGENT_OPSD.e2 : null)
        : ((typeof AGENT_EASY !== "undefined") ? AGENT_EASY[key] : null));
    const s3 = isDistill ? null : ((typeof AGENT_S3 !== "undefined") ? AGENT_S3[key] : null);
    const v2ag = isDistill ? null : ((typeof AGENT_V2 !== "undefined") ? AGENT_V2[key] : null);
    const e24ag = (typeof AGENT_E24K !== "undefined") ? AGENT_E24K[srcKey] : null;
    const e32ag = isDistill ? null : ((typeof AGENT_E32K !== "undefined") ? AGENT_E32K[key] : null);
    const s124ag = isDistill ? null : ((typeof AGENT_S124K !== "undefined") ? AGENT_S124K[key] : null);
    const extEasyAg = isDistill ? null : ((typeof AGENT_EXT_EASY !== "undefined") ? AGENT_EXT_EASY[key] : null);
    const extE24Ag = isDistill ? null : ((typeof AGENT_EXT_E24K !== "undefined") ? AGENT_EXT_E24K[key] : null);
    const extS1Ag = isDistill ? null : ((typeof AGENT_EXT_S1 !== "undefined") ? AGENT_EXT_S1[key] : null);
    const opdag = key === "opd" ? null : ((typeof AGENT_OPD !== "undefined") ? AGENT_OPD[srcKey] : null);
    const opsdag = key === "opsd" ? null : ((typeof AGENT_OPSD !== "undefined") ? AGENT_OPSD[srcKey] : null);
    const e24AgSteps = (typeof AGENT_E24K_STEPS !== "undefined") ? AGENT_E24K_STEPS : baseAgSteps;
    const extE24AgSteps = (typeof AGENT_EXT_E24K_STEPS !== "undefined") ? AGENT_EXT_E24K_STEPS : e24AgSteps;
    const e32AgSteps = (typeof AGENT_E32K_STEPS !== "undefined") ? AGENT_E32K_STEPS : baseAgSteps;
    const s124AgSteps = (typeof AGENT_S124K_STEPS !== "undefined") ? AGENT_S124K_STEPS : e32AgSteps;
    const opdAgSteps = (typeof AGENT_OPD_STEPS !== "undefined") ? AGENT_OPD_STEPS : e24AgSteps;
    const opsdAgSteps = (typeof AGENT_OPSD_STEPS !== "undefined") ? AGENT_OPSD_STEPS : opdAgSteps;
    const agSteps = pickEvalPlotSteps(baseAgSteps, [
      { row: v2ag, steps: (typeof AGENT_V2_STEPS !== "undefined") ? AGENT_V2_STEPS : null, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: e24ag, steps: e24AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: e32ag, steps: e32AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: s124ag, steps: s124AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: extEasyAg, steps: (typeof AGENT_EXT_EASY_STEPS !== "undefined") ? AGENT_EXT_EASY_STEPS : null, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: extE24Ag, steps: extE24AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: extS1Ag, steps: (typeof AGENT_EXT_S1_STEPS !== "undefined") ? AGENT_EXT_S1_STEPS : null, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: opdag, steps: opdAgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] },
      { row: opsdag, steps: opsdAgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] },
    ]);
    const drawAgent = (metric, suffix) => {
      const legendEl = document.getElementById(`legend-${key}-agent-${suffix}`);
      if (!document.getElementById(`chart-${key}-agent-${suffix}`)) return;
      const items = [];
      // Per-exp page: short names (Easy / S3 / Easy-24K…), matching MMLU/AIME
      // legends. AGENT_*.label still keeps "E2 DAPO Easy" for the multi-exp eval tab.
      if (evalHasMetric(easy, metric)) {
        items.push({
          name: isDistill ? primName : "Easy",
          data: alignEvalSeries(easy[metric], baseAgSteps, agSteps),
          color: isDistill ? (e.color || (key === "opsd" ? COLORS.opsd : COLORS.opd)) : (easy.color || COLORS[key]),
        });
      }
      if (evalHasMetric(s3, metric)) {
        items.push({
          name: "S3",
          data: alignEvalSeries(s3[metric], baseAgSteps, agSteps),
          color: S3_ALT[key] || COLORS.s3,
          dash: [6, 4],
        });
      }
      if (evalHasMetric(v2ag, metric)) {
        items.push(v2o("V2", v2ag[metric]));
      }
      if (evalHasMetric(e24ag, metric)) {
        items.push(e24kSeries("Easy-24K",
          alignEvalSeries(e24ag[metric], e24AgSteps, agSteps), e24c));
      }
      if (evalHasMetric(e32ag, metric)) {
        items.push(e32kSeries("Easy-32K",
          alignEvalSeries(e32ag[metric], e32AgSteps, agSteps), e32c));
      }
      if (evalHasMetric(s124ag, metric)) {
        items.push(s124kSeries("S1-24K",
          alignEvalSeries(s124ag[metric], s124AgSteps, agSteps), S124K_ALT[key] || COLORS.s124k));
      }
      if (evalHasMetric(extEasyAg, metric)) {
        items.push(extEasySeries("Ext easy-cont",
          alignEvalSeries(extEasyAg[metric],
            (typeof AGENT_EXT_EASY_STEPS !== "undefined") ? AGENT_EXT_EASY_STEPS : agSteps, agSteps),
          EXT_EASY_ALT[key] || COLORS.extEasy));
      }
      if (evalHasMetric(extE24Ag, metric)) {
        items.push(extE24kSeries("Ext Easy-24K",
          alignEvalSeries(extE24Ag[metric], extE24AgSteps, agSteps),
          EXT_E24K_ALT[key] || COLORS.extE24k));
      }
      if (evalHasMetric(extS1Ag, metric)) {
        items.push(extS1Series("Ext S1-switch",
          alignEvalSeries(extS1Ag[metric],
            (typeof AGENT_EXT_S1_STEPS !== "undefined") ? AGENT_EXT_S1_STEPS : agSteps, agSteps),
          EXT_S1_ALT[key] || COLORS.extS1));
      }
      if (evalHasMetric(opdag, metric)) {
        items.push(opdSeries("OPD 2B←4B",
          alignEvalSeries(opdag[metric], opdAgSteps, agSteps),
          OPD_ALT[key] || COLORS.opd));
      }
      if (evalHasMetric(opsdag, metric)) {
        items.push(opsdSeries("OPSD 2B←2B",
          alignEvalSeries(opsdag[metric], opsdAgSteps, agSteps),
          OPSD_ALT[key] || COLORS.opsd));
      }
      if (!items.length) return;
      const draw = (visible) => {
        drawLineChart(`chart-${key}-agent-${suffix}`, `tip-${key}-agent-${suffix}`, {
          categories: agSteps, series: visible,
          valueSuffix: "%", ...AGENT_Y[metric], height: 200,
        });
      };
      if (legendEl) renderLegend(legendEl, items, draw);
      else draw(items);
    };
    drawAgent("bfcl", "bfcl");
    drawAgent("bfcl_mt", "mt");
    drawAgent("tau", "tau");
  }
}

function evalAtStep150(arr) {
  // EVAL_EASY_BOXED_STEPS last index = step 150
  const i = (typeof EVAL_EASY_BOXED_STEPS !== "undefined" ? EVAL_EASY_BOXED_STEPS.length : 15) - 1;
  return arr && arr[i] != null ? arr[i] : null;
}

function agentS3AtStep150(metricKey) {
  if (typeof AGENT_S3 === "undefined" || typeof AGENT_S3_ORDER === "undefined") return [];
  return AGENT_S3_ORDER.map((k) => {
    const row = AGENT_S3[k];
    const arr = row && row[metricKey];
    if (!arr || !arr.length) return null;
    const v = arr[arr.length - 1];
    return v != null ? v : null;
  });
}

function renderEvalPanel() {
  const baseSteps = (typeof EVAL_EASY_BOXED_FULL_STEPS !== "undefined") ? EVAL_EASY_BOXED_FULL_STEPS : EVAL_EASY_BOXED_STEPS;
  const src = (typeof EVAL_EASY_BOXED_FULL !== "undefined") ? EVAL_EASY_BOXED_FULL : EVAL_EASY_BOXED;
  const s3src = (typeof EVAL_FULL_S3 !== "undefined") ? EVAL_FULL_S3 : {};
  const v2src = (typeof EVAL_FULL_V2 !== "undefined") ? EVAL_FULL_V2 : {};
  const e24src = (typeof EVAL_FULL_E24K !== "undefined") ? EVAL_FULL_E24K : {};
  const e32src = (typeof EVAL_FULL_E32K !== "undefined") ? EVAL_FULL_E32K : {};
  const s124src = (typeof EVAL_FULL_S124K !== "undefined") ? EVAL_FULL_S124K : {};
  const extEasySrc = (typeof EVAL_FULL_EXT_EASY !== "undefined") ? EVAL_FULL_EXT_EASY : {};
  const extE24Src = (typeof EVAL_FULL_EXT_E24K !== "undefined") ? EVAL_FULL_EXT_E24K : {};
  const extS1Src = (typeof EVAL_FULL_EXT_S1 !== "undefined") ? EVAL_FULL_EXT_S1 : {};
  const opdSrc = (typeof EVAL_FULL_OPD !== "undefined") ? EVAL_FULL_OPD : {};
  const opsdSrc = (typeof EVAL_FULL_OPSD !== "undefined") ? EVAL_FULL_OPSD : {};
  const e32Steps = (typeof EVAL_E32K_STEPS !== "undefined") ? EVAL_E32K_STEPS : baseSteps;
  const s124Steps = (typeof EVAL_S124K_STEPS !== "undefined") ? EVAL_S124K_STEPS : e32Steps;
  const e24Steps = (typeof EVAL_E24K_STEPS !== "undefined") ? EVAL_E24K_STEPS : e32Steps;
  const extE24Steps = (typeof EVAL_EXT_E24K_STEPS !== "undefined") ? EVAL_EXT_E24K_STEPS : e24Steps;
  const opdSteps = (typeof EVAL_OPD_STEPS !== "undefined") ? EVAL_OPD_STEPS : e24Steps;
  const opsdSteps = (typeof EVAL_OPSD_STEPS !== "undefined") ? EVAL_OPSD_STEPS : opdSteps;
  const steps = pickEvalPlotSteps(baseSteps, [
    ...Object.keys(v2src).map((k) => ({ row: v2src[k], steps: (typeof EVAL_V2_STEPS !== "undefined") ? EVAL_V2_STEPS : null })),
    ...Object.keys(e24src).map((k) => ({ row: e24src[k], steps: e24Steps })),
    ...Object.keys(e32src).map((k) => ({ row: e32src[k], steps: e32Steps })),
    ...Object.keys(s124src).map((k) => ({ row: s124src[k], steps: s124Steps })),
    ...Object.keys(extEasySrc).map((k) => ({ row: extEasySrc[k], steps: (typeof EVAL_EXT_EASY_STEPS !== "undefined") ? EVAL_EXT_EASY_STEPS : null })),
    ...Object.keys(extE24Src).map((k) => ({ row: extE24Src[k], steps: extE24Steps })),
    ...Object.keys(extS1Src).map((k) => ({ row: extS1Src[k], steps: (typeof EVAL_EXT_S1_STEPS !== "undefined") ? EVAL_EXT_S1_STEPS : null })),
    ...Object.keys(opdSrc).map((k) => ({ row: opdSrc[k], steps: opdSteps })),
    ...Object.keys(opsdSrc).map((k) => ({ row: opsdSrc[k], steps: opsdSteps })),
  ]);

  // Easy-Boxed 实线 / S3 虚线 / V2 短虚线 / Easy-24K·32K·Ext overlays（长跑存在时 X 轴扩到 10–300）。
  function seriesWithOverlays(metric) {
    const items = [];
    EVAL_EASY_BOXED_ORDER.forEach((k) => {
      const s3ev = s3src[k];
      const v2ev = v2src[k];
      const e24ev = e24src[k];
      const e32ev = e32src[k];
      const s124ev = s124src[k];
      const extEasyEv = extEasySrc[k];
      const extE24Ev = extE24Src[k];
      const extS1Ev = extS1Src[k];
      const opdev = opdSrc[k];
      const opsdev = opsdSrc[k];
      const hasS3 = evalHasMetric(s3ev, metric);
      const hasV2k = evalHasMetric(v2ev, metric);
      const hasExtra = [e24ev, e32ev, s124ev, extEasyEv, extE24Ev, extS1Ev, opdev, opsdev].some((r) => evalHasMetric(r, metric));
      const easyData = alignEvalSeries(src[k][metric], baseSteps, steps);
      const labelBase = (hasS3 || hasV2k || hasExtra) ? `${src[k].label} (Easy-Boxed)` : src[k].label;
      items.push({ name: labelBase, data: easyData, color: src[k].color });
      if (hasS3) {
        items.push(s3Series(
          `${src[k].label} (S3)`,
          alignEvalSeries(s3ev[metric], baseSteps, steps),
          S3_ALT[k] || COLORS.s3,
        ));
      }
      if (hasV2k) {
        items.push(v2Series(
          `${v2ev.label || src[k].label + " V2"}`,
          v2ev[metric],
          V2_ALT[k] || COLORS.v2,
        ));
      }
      if (evalHasMetric(e24ev, metric)) {
        items.push(e24kSeries(e24ev.label || `${src[k].label} Easy-24K`,
          alignEvalSeries(e24ev[metric], e24Steps, steps), E24K_ALT[k] || COLORS.e24k));
      }
      if (evalHasMetric(e32ev, metric)) {
        items.push(e32kSeries(e32ev.label || `${src[k].label} Easy-32K`,
          alignEvalSeries(e32ev[metric], e32Steps, steps), E32K_ALT[k] || COLORS.e32k));
      }
      if (evalHasMetric(s124ev, metric)) {
        items.push(s124kSeries(s124ev.label || `${src[k].label} S1-24K`,
          alignEvalSeries(s124ev[metric], s124Steps, steps), S124K_ALT[k] || COLORS.s124k));
      }
      if (evalHasMetric(extEasyEv, metric)) {
        items.push(extEasySeries(extEasyEv.label || `${src[k].label} Ext easy-cont`,
          alignEvalSeries(extEasyEv[metric],
            (typeof EVAL_EXT_EASY_STEPS !== "undefined") ? EVAL_EXT_EASY_STEPS : steps, steps),
          EXT_EASY_ALT[k] || COLORS.extEasy));
      }
      if (evalHasMetric(extE24Ev, metric)) {
        items.push(extE24kSeries(extE24Ev.label || `${src[k].label} Ext easy-cont-24K`,
          alignEvalSeries(extE24Ev[metric], extE24Steps, steps),
          EXT_E24K_ALT[k] || COLORS.extE24k));
      }
      if (evalHasMetric(extS1Ev, metric)) {
        items.push(extS1Series(extS1Ev.label || `${src[k].label} Ext S1-switch`,
          alignEvalSeries(extS1Ev[metric],
            (typeof EVAL_EXT_S1_STEPS !== "undefined") ? EVAL_EXT_S1_STEPS : steps, steps),
          EXT_S1_ALT[k] || COLORS.extS1));
      }
      if (evalHasMetric(opdev, metric)) {
        items.push(opdSeries(opdev.label || `${src[k].label} OPD 2B←4B`,
          alignEvalSeries(opdev[metric], opdSteps, steps),
          OPD_ALT[k] || COLORS.opd));
      }
      if (evalHasMetric(opsdev, metric)) {
        items.push(opsdSeries(opsdev.label || `${src[k].label} OPSD 2B←2B`,
          alignEvalSeries(opsdev[metric], opsdSteps, steps),
          OPSD_ALT[k] || COLORS.opsd));
      }
    });
    return items;
  }

  renderLegend(document.getElementById("legend-eval-mmlu"), seriesWithOverlays("mmlu"),
    (visible) => {
      drawLineChart("chart-eval-mmlu", "tip-eval-mmlu", {
        categories: steps,
        series: visible,
        valueSuffix: "%", ...EVAL_Y.mmlu, height: 240,
      });
    });

  if (document.getElementById("legend-eval-math500")) {
    renderLegend(document.getElementById("legend-eval-math500"), seriesWithOverlays("math500"),
      (visible) => {
        drawLineChart("chart-eval-math500", "tip-eval-math500", {
          categories: steps,
          series: visible,
          valueSuffix: "%", ...EVAL_Y.math500, height: 240,
        });
      });
  }

  if (document.getElementById("legend-eval-aime24")) {
    renderLegend(document.getElementById("legend-eval-aime24"), seriesWithOverlays("aime24"),
      (visible) => {
        drawLineChart("chart-eval-aime24", "tip-eval-aime24", {
          categories: steps,
          series: visible,
          valueSuffix: "%", ...EVAL_Y.aime24, height: 240,
        });
      });
  }

  renderLegend(document.getElementById("legend-eval-aime25"), seriesWithOverlays("aime25"),
    (visible) => {
      drawLineChart("chart-eval-aime25", "tip-eval-aime25", {
        categories: steps,
        series: visible,
        valueSuffix: "%", ...EVAL_Y.aime25, height: 240,
      });
    });

  {
    const evalCats = EVAL_EASY_BOXED_ORDER.map(k => src[k].label);
    const evalColors = EVAL_EASY_BOXED_ORDER.map(k => src[k].color);
    const bindEvalBar = (legendId, chartId, tipId, metric) => {
      if (!document.getElementById(chartId)) return;
      const vals = EVAL_EASY_BOXED_ORDER.map(k => evalAtStep150(src[k][metric]));
      bindBarLegend(legendId, evalCats, vals, evalColors, (data) => {
        drawBarChart(chartId, tipId, {
          categories: evalCats, data, colors: evalColors,
          valueSuffix: "%", height: 200,
        });
      });
    };
    bindEvalBar("legend-eval-mmlu150", "chart-eval-mmlu150", "tip-eval-mmlu150", "mmlu");
    bindEvalBar("legend-eval-math500-150", "chart-eval-math500-150", "tip-eval-math500-150", "math500");
    bindEvalBar("legend-eval-aime24-150", "chart-eval-aime24-150", "tip-eval-aime24-150", "aime24");
    bindEvalBar("legend-eval-aime25-150", "chart-eval-aime25-150", "tip-eval-aime25-150", "aime25");
  }

  if (typeof AGENT_S3 !== "undefined" && document.getElementById("chart-agent-bfcl-150")) {
    const agentOrder = (typeof AGENT_S3_ORDER !== "undefined") ? AGENT_S3_ORDER : EVAL_EASY_BOXED_ORDER;
    const agentLabels = agentOrder.map((k) => AGENT_S3[k].label);
    const agentColors = agentOrder.map((k) => AGENT_S3[k].color);
    bindBarLegend("legend-agent-bfcl-150", agentLabels, agentS3AtStep150("bfcl"), agentColors, (data) => {
      drawBarChart("chart-agent-bfcl-150", "tip-agent-bfcl-150", {
        categories: agentLabels, data, colors: agentColors,
        valueSuffix: "%", height: 200,
      });
    });
    bindBarLegend("legend-agent-tau-150", agentLabels, agentS3AtStep150("tau"), agentColors, (data) => {
      drawBarChart("chart-agent-tau-150", "tip-agent-tau-150", {
        categories: agentLabels, data, colors: agentColors,
        valueSuffix: "%", height: 200,
      });
    });
  }

  // ---- Agent（BFCL-v3 + tau-bench；Easy / S3 / V2 / Easy-32K / Ext / OPD / OPSD overlays）----
  if ((typeof AGENT_S3 !== "undefined" || typeof AGENT_V2 !== "undefined"
      || typeof AGENT_E32K !== "undefined" || typeof AGENT_EXT_S1 !== "undefined"
      || typeof AGENT_OPD !== "undefined" || typeof AGENT_OPSD !== "undefined")
      && document.getElementById("chart-agent-bfcl")) {
    const order = (typeof AGENT_S3_ORDER !== "undefined")
      ? AGENT_S3_ORDER
      : (typeof AGENT_EASY_ORDER !== "undefined" ? AGENT_EASY_ORDER : ["e1", "e2", "e3", "e4", "e5"]);
    const baseSteps = (typeof AGENT_S3_STEPS !== "undefined")
      ? AGENT_S3_STEPS
      : (typeof AGENT_EASY_STEPS !== "undefined" ? AGENT_EASY_STEPS : EVAL_EASY_BOXED_FULL_STEPS);
    const easySrc = (typeof AGENT_EASY !== "undefined") ? AGENT_EASY : null;
    const v2Src = (typeof AGENT_V2 !== "undefined") ? AGENT_V2 : null;
    const e24Src = (typeof AGENT_E24K !== "undefined") ? AGENT_E24K : null;
    const e32Src = (typeof AGENT_E32K !== "undefined") ? AGENT_E32K : null;
    const s124Src = (typeof AGENT_S124K !== "undefined") ? AGENT_S124K : null;
    const extEasySrcAg = (typeof AGENT_EXT_EASY !== "undefined") ? AGENT_EXT_EASY : null;
    const extE24SrcAg = (typeof AGENT_EXT_E24K !== "undefined") ? AGENT_EXT_E24K : null;
    const extS1SrcAg = (typeof AGENT_EXT_S1 !== "undefined") ? AGENT_EXT_S1 : null;
    const opdSrcAg = (typeof AGENT_OPD !== "undefined") ? AGENT_OPD : null;
    const opsdSrcAg = (typeof AGENT_OPSD !== "undefined") ? AGENT_OPSD : null;
    const e24AgSteps = (typeof AGENT_E24K_STEPS !== "undefined") ? AGENT_E24K_STEPS : baseSteps;
    const extE24AgSteps = (typeof AGENT_EXT_E24K_STEPS !== "undefined") ? AGENT_EXT_E24K_STEPS : e24AgSteps;
    const e32AgSteps = (typeof AGENT_E32K_STEPS !== "undefined") ? AGENT_E32K_STEPS : baseSteps;
    const s124AgSteps = (typeof AGENT_S124K_STEPS !== "undefined") ? AGENT_S124K_STEPS : e32AgSteps;
    const opdAgSteps = (typeof AGENT_OPD_STEPS !== "undefined") ? AGENT_OPD_STEPS : e24AgSteps;
    const opsdAgSteps = (typeof AGENT_OPSD_STEPS !== "undefined") ? AGENT_OPSD_STEPS : opdAgSteps;
    const steps = pickEvalPlotSteps(baseSteps, [
      ...Object.keys(v2Src || {}).map((k) => ({ row: v2Src[k], steps: (typeof AGENT_V2_STEPS !== "undefined") ? AGENT_V2_STEPS : null, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(e24Src || {}).map((k) => ({ row: e24Src[k], steps: e24AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(e32Src || {}).map((k) => ({ row: e32Src[k], steps: e32AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(s124Src || {}).map((k) => ({ row: s124Src[k], steps: s124AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(extEasySrcAg || {}).map((k) => ({ row: extEasySrcAg[k], steps: (typeof AGENT_EXT_EASY_STEPS !== "undefined") ? AGENT_EXT_EASY_STEPS : null, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(extE24SrcAg || {}).map((k) => ({ row: extE24SrcAg[k], steps: extE24AgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(extS1SrcAg || {}).map((k) => ({ row: extS1SrcAg[k], steps: (typeof AGENT_EXT_S1_STEPS !== "undefined") ? AGENT_EXT_S1_STEPS : null, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(opdSrcAg || {}).map((k) => ({ row: opdSrcAg[k], steps: opdAgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] })),
      ...Object.keys(opsdSrcAg || {}).map((k) => ({ row: opsdSrcAg[k], steps: opsdAgSteps, metrics: ["bfcl", "bfcl_mt", "tau"] })),
    ]);
    const hasValues = (series) => series && series.some((v) => v != null);
    const items = (dataKey) => {
      const out = [];
      order.forEach((k) => {
        const easy = easySrc && easySrc[k];
        const s3 = (typeof AGENT_S3 !== "undefined") ? AGENT_S3[k] : null;
        const v2 = v2Src && v2Src[k];
        const e24 = e24Src && e24Src[k];
        const e32 = e32Src && e32Src[k];
        const s124 = s124Src && s124Src[k];
        const extEasy = extEasySrcAg && extEasySrcAg[k];
        const extE24 = extE24SrcAg && extE24SrcAg[k];
        const extS1 = extS1SrcAg && extS1SrcAg[k];
        const opd = opdSrcAg && opdSrcAg[k];
        const opsd = opsdSrcAg && opsdSrcAg[k];
        const easyHas = easy && hasValues(easy[dataKey]);
        const s3Has = s3 && hasValues(s3[dataKey]);
        const v2Has = v2 && hasValues(v2[dataKey]);
        // Easy keeps per-exp color; overlays use distinct alt hues.
        if (easyHas) {
          out.push({
            name: easy.label,
            data: alignEvalSeries(easy[dataKey], baseSteps, steps),
            color: easy.color,
          });
        }
        if (s3Has) {
          out.push({
            name: s3.label,
            data: alignEvalSeries(s3[dataKey], baseSteps, steps),
            color: (easyHas || v2Has) ? (S3_ALT[k] || COLORS.s3) : (s3.color || COLORS[k] || COLORS.s3),
            dash: [6, 5],
          });
        }
        if (v2Has) {
          out.push(v2Series(
            v2.label || `${k.toUpperCase()} V2`,
            v2[dataKey],
            V2_ALT[k] || COLORS.v2,
          ));
        }
        if (e24 && hasValues(e24[dataKey])) {
          out.push(e24kSeries(e24.label || `${k.toUpperCase()} Easy-24K`,
            alignEvalSeries(e24[dataKey], e24AgSteps, steps), E24K_ALT[k] || COLORS.e24k));
        }
        if (e32 && hasValues(e32[dataKey])) {
          out.push(e32kSeries(e32.label || `${k.toUpperCase()} Easy-32K`,
            alignEvalSeries(e32[dataKey], e32AgSteps, steps), E32K_ALT[k] || COLORS.e32k));
        }
        if (s124 && hasValues(s124[dataKey])) {
          out.push(s124kSeries(s124.label || `${k.toUpperCase()} S1-24K`,
            alignEvalSeries(s124[dataKey], s124AgSteps, steps), S124K_ALT[k] || COLORS.s124k));
        }
        if (extEasy && hasValues(extEasy[dataKey])) {
          out.push(extEasySeries(extEasy.label || `${k.toUpperCase()} Ext easy-cont`,
            alignEvalSeries(extEasy[dataKey],
              (typeof AGENT_EXT_EASY_STEPS !== "undefined") ? AGENT_EXT_EASY_STEPS : steps, steps),
            EXT_EASY_ALT[k] || COLORS.extEasy));
        }
        if (extE24 && hasValues(extE24[dataKey])) {
          out.push(extE24kSeries(extE24.label || `${k.toUpperCase()} Ext easy-cont-24K`,
            alignEvalSeries(extE24[dataKey], extE24AgSteps, steps),
            EXT_E24K_ALT[k] || COLORS.extE24k));
        }
        if (extS1 && hasValues(extS1[dataKey])) {
          out.push(extS1Series(extS1.label || `${k.toUpperCase()} Ext S1-switch`,
            alignEvalSeries(extS1[dataKey],
              (typeof AGENT_EXT_S1_STEPS !== "undefined") ? AGENT_EXT_S1_STEPS : steps, steps),
            EXT_S1_ALT[k] || COLORS.extS1));
        }
        if (opd && hasValues(opd[dataKey])) {
          out.push(opdSeries(opd.label || `${k.toUpperCase()} OPD 2B←4B`,
            alignEvalSeries(opd[dataKey], opdAgSteps, steps),
            OPD_ALT[k] || COLORS.opd));
        }
        if (opsd && hasValues(opsd[dataKey])) {
          out.push(opsdSeries(opsd.label || `${k.toUpperCase()} OPSD 2B←2B`,
            alignEvalSeries(opsd[dataKey], opsdAgSteps, steps),
            OPSD_ALT[k] || COLORS.opsd));
        }
      });
      return out;
    };
    const bfclItems = items("bfcl");
    if (bfclItems.length && document.getElementById("legend-agent-bfcl")) {
    renderLegend(document.getElementById("legend-agent-bfcl"), bfclItems,
      (visible) => {
        drawLineChart("chart-agent-bfcl", "tip-agent-bfcl", {
          categories: steps, series: visible,
          valueSuffix: "%", ...AGENT_Y.bfcl, height: 240,
        });
      });
    }
    const mtItems = items("bfcl_mt");
    if (document.getElementById("legend-agent-mt")) {
      renderLegend(document.getElementById("legend-agent-mt"), mtItems,
        (visible) => {
          drawLineChart("chart-agent-mt", "tip-agent-mt", {
            categories: steps, series: visible,
            valueSuffix: "%", ...AGENT_Y.bfcl_mt, height: 240,
          });
        });
    }
    const tauItems = items("tau");
    if (document.getElementById("legend-agent-tau")) {
      renderLegend(document.getElementById("legend-agent-tau"), tauItems,
        (visible) => {
          drawLineChart("chart-agent-tau", "tip-agent-tau", {
            categories: steps, series: visible,
            valueSuffix: "%", ...AGENT_Y.tau, height: 240,
          });
        });
    }
  }
}


// Tab switching and initial render are handled by js/tab-loader.js
