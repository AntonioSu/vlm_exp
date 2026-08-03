// S3 overlay: dashed. Prefer the experiment color so multi-exp charts stay
// distinguishable; fall back to teal only when no per-exp color is given
// (single-exp detail pages overlay one Easy solid vs one S3 dashed).
function s3Series(name, data, color) {
  return { name, data, color: color || COLORS.s3, dash: [6, 4] };
}

function yRangeFromSeries(series, { padRatio = 0.1, floor = 0, ceil = null } = {}) {
  const vals = series.flatMap((s) => (s.data || [])).filter((v) => v != null);
  if (!vals.length) return [floor ?? 0, ceil ?? 1];
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const pad = (max - min) * padRatio || 1;
  min = Math.floor(min - pad);
  max = Math.ceil(max + pad);
  if (floor != null) min = Math.max(min, floor);
  if (ceil != null) max = Math.min(max, ceil);
  return [min, Math.max(min + 1, max)];
}

// Renders a clickable legend bound to a chart: clicking a series name toggles
// it on/off and redraws with only the still-selected series (ECharts-style
// legend select). `draw(visibleSeries)` is called once up front and again on
// every toggle.
function renderLegend(el, series, draw) {
  const hidden = new Set();
  el.innerHTML = series.map(s =>
    `<span class="legend-item"><span class="dot" style="background:${s.color}"></span>${s.name}</span>`
  ).join("");
  el.querySelectorAll(".legend-item").forEach((span, i) => {
    span.addEventListener("click", () => {
      const name = series[i].name;
      if (hidden.has(name)) hidden.delete(name); else hidden.add(name);
      span.classList.toggle("legend-off", hidden.has(name));
      draw(series.filter(s => !hidden.has(s.name)));
    });
  });
  draw(series.slice());
}

function drawLineChart(canvasId, tipId, { categories, series, yMin, yMax, valueSuffix = "", height = 260, referenceLines = [] }) {
  const canvas = document.getElementById(canvasId);
  const tip = document.getElementById(tipId);
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth;
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

  // x labels
  ctx.fillStyle = COLORS.axis;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  categories.forEach((c, i) => {
    if (c) ctx.fillText(c, xAt(i), padT + plotH + 6);
  });

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
    const lines = series.map(s => `<span style="color:${s.color}">●</span> ${s.name}: ${s.data[idx] == null ? "—" : s.data[idx] + valueSuffix}`).join("<br>");
    tip.innerHTML = `step ${categories[idx] || idx + 1}<br>${lines}`;
    tip.style.left = x + "px";
    const valsAtIdx = series.map(s => s.data[idx]).filter(v => v != null);
    tip.style.top = ((valsAtIdx.length ? yAt(Math.max(...valsAtIdx)) : padT) - 6) + "px";
    tip.style.opacity = 1;
  };
  canvas.onmouseleave = () => { tip.style.opacity = 0; };
}

function drawBarChart(canvasId, tipId, { categories, data, colors, valueSuffix = "", height = 220 }) {
  const canvas = document.getElementById(canvasId);
  const tip = document.getElementById(tipId);
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
}


function render() {
  renderLegend(document.getElementById("legend-pass"), [
    { name: "E1 GRPO", data: movingAvg(EXP.e1.pass, 5), color: COLORS.e1 },
    { name: "E2 DAPO", data: movingAvg(EXP.e2.pass, 5), color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: movingAvg(EXP.e3.pass, 5), color: COLORS.e3 },
    { name: "E4 RLOO", data: movingAvg(EXP.e4.pass, 5), color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: movingAvg(EXP.e5.pass, 5), color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-pass", "tip-pass", {
    categories: STEP_CATS,
    series: visible,
    yMin: 60, yMax: 100, valueSuffix: "%", height: 280,
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

  drawBarChart("chart-dur", "tip-dur", {
    categories: EASY_BOXED_DURATION_CATS,
    data: EASY_BOXED_DURATION_H,
    colors: [COLORS.e1, COLORS.e2, COLORS.e3, COLORS.e4, COLORS.e5],
    valueSuffix: "h", height: 220,
  });

  // ---- S3（独立对比图；逐 step 原始 pass，不做移动平均）----
  const s3PassLegend = document.getElementById("legend-s3-pass");
  if (!s3PassLegend) return;

  const s3Pass = [];
  if (EXP.s3_e1 && EXP.s3_e1.pass) s3Pass.push({ name: "S3 E1 GRPO", data: EXP.s3_e1.pass, color: COLORS.e1 });
  if (EXP.s3_e2 && EXP.s3_e2.pass) s3Pass.push({ name: "S3 E2 DAPO", data: EXP.s3_e2.pass, color: COLORS.e2 });
  if (EXP.s3_e3 && EXP.s3_e3.pass) s3Pass.push({ name: "S3 E3 Dr.GRPO", data: EXP.s3_e3.pass, color: COLORS.e3 });
  if (EXP.s3_e4 && EXP.s3_e4.pass) s3Pass.push({ name: "S3 E4 RLOO", data: EXP.s3_e4.pass, color: COLORS.e4 });
  if (EXP.s3_e5 && EXP.s3_e5.pass) s3Pass.push({ name: "S3 E5 REINFORCE++", data: EXP.s3_e5.pass, color: COLORS.e5 });
  if (s3Pass.length) {
    renderLegend(s3PassLegend, s3Pass, (visible) => drawLineChart("chart-s3-pass", "tip-s3-pass", {
      categories: STEP_CATS,
      series: visible,
      yMin: 0, yMax: 80, valueSuffix: "%", height: 280,
    }));
  }

  const s3Len = [];
  if (typeof S3_E1_LEN !== "undefined") s3Len.push({ name: "S3 E1 GRPO", data: S3_E1_LEN, color: COLORS.e1 });
  if (typeof S3_E2_LEN !== "undefined") s3Len.push({ name: "S3 E2 DAPO", data: S3_E2_LEN, color: COLORS.e2 });
  if (typeof S3_E3_LEN !== "undefined") s3Len.push({ name: "S3 E3 Dr.GRPO", data: S3_E3_LEN, color: COLORS.e3 });
  if (typeof S3_E4_LEN !== "undefined") s3Len.push({ name: "S3 E4 RLOO", data: S3_E4_LEN, color: COLORS.e4 });
  if (typeof S3_E5_LEN !== "undefined") s3Len.push({ name: "S3 E5 REINFORCE++", data: S3_E5_LEN, color: COLORS.e5 });
  if (s3Len.length && document.getElementById("legend-s3-len")) {
    renderLegend(document.getElementById("legend-s3-len"), s3Len, (visible) => drawLineChart("chart-s3-len", "tip-s3-len", {
      categories: STEP_CATS,
      series: visible,
      valueSuffix: " tok", height: 240,
      referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
    }));
  }

  const s3Ent = [];
  if (typeof S3_E1_ENTROPY !== "undefined") s3Ent.push({ name: "S3 E1 GRPO", data: S3_E1_ENTROPY, color: COLORS.e1 });
  if (typeof S3_E2_ENTROPY !== "undefined") s3Ent.push({ name: "S3 E2 DAPO", data: S3_E2_ENTROPY, color: COLORS.e2 });
  if (typeof S3_E3_ENTROPY !== "undefined") s3Ent.push({ name: "S3 E3 Dr.GRPO", data: S3_E3_ENTROPY, color: COLORS.e3 });
  if (typeof S3_E4_ENTROPY !== "undefined") s3Ent.push({ name: "S3 E4 RLOO", data: S3_E4_ENTROPY, color: COLORS.e4 });
  if (typeof S3_E5_ENTROPY !== "undefined") s3Ent.push({ name: "S3 E5 REINFORCE++", data: S3_E5_ENTROPY, color: COLORS.e5 });
  if (s3Ent.length && document.getElementById("legend-s3-ent")) {
    renderLegend(document.getElementById("legend-s3-ent"), s3Ent, (visible) => drawLineChart("chart-s3-ent", "tip-s3-ent", {
      categories: STEP_CATS,
      series: visible,
      height: 240,
    }));
  }

  const s3Grad = [];
  if (typeof S3_E1_GRAD !== "undefined") s3Grad.push({ name: "S3 E1 GRPO", data: S3_E1_GRAD, color: COLORS.e1 });
  if (typeof S3_E2_GRAD !== "undefined") s3Grad.push({ name: "S3 E2 DAPO", data: S3_E2_GRAD, color: COLORS.e2 });
  if (typeof S3_E3_GRAD !== "undefined") s3Grad.push({ name: "S3 E3 Dr.GRPO", data: S3_E3_GRAD, color: COLORS.e3 });
  if (typeof S3_E4_GRAD !== "undefined") s3Grad.push({ name: "S3 E4 RLOO", data: S3_E4_GRAD, color: COLORS.e4 });
  if (typeof S3_E5_GRAD !== "undefined") s3Grad.push({ name: "S3 E5 REINFORCE++", data: S3_E5_GRAD, color: COLORS.e5 });
  if (s3Grad.length && document.getElementById("legend-s3-grad")) {
    renderLegend(document.getElementById("legend-s3-grad"), s3Grad, (visible) => drawLineChart("chart-s3-grad", "tip-s3-grad", {
      categories: STEP_CATS,
      series: visible,
      height: 220,
    }));
  }

  if (typeof S3_DURATION_CATS !== "undefined") {
    drawBarChart("chart-s3-dur", "tip-s3-dur", {
      categories: S3_DURATION_CATS,
      data: S3_DURATION_H,
      colors: S3_DURATION_COLORS,
      valueSuffix: "h", height: 220,
    });
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
  const last10 = e.pass.slice(-10);
  const first5 = e.pass.slice(0, 5);
  const peak = e.pass.reduce((best, v, i) => (v != null && (best.v == null || v > best.v) ? { v, i: i + 1 } : best), { v: null, i: 0 });
  const avgStepMin = meanOf(e.stepMin || []);
  const fmt = (v, d = 1) => (v == null ? "—" : Number(v).toFixed(d));
  el.innerHTML = [
    `<div class="stat"><div class="stat-val">${n}/150</div><div class="stat-label">训练步数</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(meanOf(last10))}%</div><div class="stat-label">末 10 步 pass 均值</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(peak.v)}%</div><div class="stat-label">峰值（step ${peak.i}）</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(meanOf(first5))}%</div><div class="stat-label">首 5 步 pass 均值</div></div>`,
    `<div class="stat"><div class="stat-val">${fmt(avgStepMin)} min</div><div class="stat-label">平均单步耗时</div></div>`,
  ].join("");
}

function renderExpPanel(key) {
  const e = EXP[key];
  const s = EXP["s3_" + key] || null;
  fillExpStats(key, e);

  const passLegend = document.getElementById(`legend-${key}-pass`);
  const passMA = movingAvg(e.pass, 5);
  const allPass = e.pass.filter(v => v != null);
  if (s) allPass.push(...s.pass.filter(v => v != null));
  const passMax = allPass.length ? Math.max(...allPass) : 100;
  const passMin = allPass.length ? Math.min(...allPass) : 60;
  const passYMax = Math.min(100, Math.ceil((passMax + 5) / 5) * 5);
  const passYMin = s ? Math.max(0, Math.floor((passMin - 5) / 5) * 5) : 60;
  if (passLegend) {
    const items = [
      { name: "Easy-Boxed", data: passMA, color: e.color },
    ];
    if (s) items.push(s3Series("S3", movingAvg(s.pass, 5)));
    renderLegend(passLegend, items, (visible) => drawLineChart(`chart-${key}-pass`, `tip-${key}-pass`, {
      categories: e.cats,
      series: visible,
      yMin: passYMin, yMax: passYMax, valueSuffix: "%", height: 240,
    }));
  } else {
    const items = [{ name: e.label + " pass rate", data: e.pass, color: e.color }];
    if (s) items.push(s3Series("S3 pass", s.pass));
    drawLineChart(`chart-${key}-pass`, `tip-${key}-pass`, {
      categories: e.cats,
      series: items,
      yMin: passYMin, yMax: passYMax, valueSuffix: "%", height: 200,
    });
  }

  if (e.rolloutAcc && e.rolloutAcc.length && document.getElementById(`chart-${key}-racc`)) {
    const raccItems = [{ name: "Easy-Boxed", data: movingAvg(e.rolloutAcc, 5), color: e.color }];
    if (s && s.rolloutAcc) raccItems.push(s3Series("S3", movingAvg(s.rolloutAcc, 5)));
    drawLineChart(`chart-${key}-racc`, `tip-${key}-racc`, {
      categories: e.cats, series: raccItems,
      yMin: 0, yMax: 100, valueSuffix: "%", height: 240,
    });
  }

  {
    const items = [{ name: "Easy-Boxed", data: e.len, color: e.color }];
    if (s) items.push(s3Series("S3", s.len));
    drawLineChart(`chart-${key}-len`, `tip-${key}-len`, {
      categories: e.cats,
      series: items,
      valueSuffix: " tok", height: 200,
      referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
    });
  }

  if (e.trunc && document.getElementById(`chart-${key}-trunc`)) {
    const items = [{ name: "Easy-Boxed clip@16K", data: e.trunc, color: e.color }];
    if (s && s.trunc) items.push(s3Series("S3 clip@16K", s.trunc));
    drawLineChart(`chart-${key}-trunc`, `tip-${key}-trunc`, {
      categories: e.cats, series: items,
      valueSuffix: "%", height: 200, yMin: 0,
    });
  }

  if (e.promptLen && document.getElementById(`chart-${key}-promptlen`)) {
    const items = [{ name: "Easy-Boxed", data: e.promptLen, color: e.color }];
    if (s) items.push(s3Series("S3", s.promptLen));
    drawLineChart(`chart-${key}-promptlen`, `tip-${key}-promptlen`, {
      categories: e.cats, series: items,
      valueSuffix: " tok", height: 200,
    });
  }

  const lossLegend = document.getElementById(`legend-${key}-loss`);
  const lossMA = movingAvg(e.loss, 5);
  if (lossLegend) {
    const items = [
      { name: "actor/loss", data: e.loss, color: COLORS.neutral },
      { name: "5-step MA", data: lossMA, color: e.color },
    ];
    renderLegend(lossLegend, items, (visible) => drawLineChart(`chart-${key}-loss`, `tip-${key}-loss`, {
      categories: e.cats,
      series: visible,
      height: 220,
    }));
  } else {
    const items = [{ name: e.label + " actor/loss", data: e.loss, color: e.color }];
    if (s) items.push(s3Series("S3 loss", s.loss));
    drawLineChart(`chart-${key}-loss`, `tip-${key}-loss`, {
      categories: e.cats, series: items, height: 200,
    });
  }

  {
    const items = [{ name: "Easy-Boxed entropy", data: e.ent, color: e.color }];
    if (s) items.push(s3Series("S3 entropy", s.ent));
    drawLineChart(`chart-${key}-ent`, `tip-${key}-ent`, {
      categories: e.cats, series: items, height: 200,
    });
  }

  if (e.klLoss && e.klLoss.some((x) => x != null) && document.getElementById(`chart-${key}-klloss`)) {
    const items = [{ name: "kl_loss ×100", data: e.klLoss, color: COLORS.danger }];
    if (s && s.klLoss && s.klLoss.some(x => x != null)) items.push(s3Series("S3 kl_loss ×100", s.klLoss));
    drawLineChart(`chart-${key}-klloss`, `tip-${key}-klloss`, {
      categories: e.cats, series: items, height: 200, yMin: 0,
    });
  }

  {
    const items = [{ name: "Easy-Boxed grad_norm", data: e.grad, color: e.color }];
    if (s) items.push(s3Series("S3 grad_norm", s.grad));
    drawLineChart(`chart-${key}-grad`, `tip-${key}-grad`, {
      categories: e.cats, series: items, height: 200,
    });
  }
  {
    const items = [{ name: e.label + " ppo_kl ×1e5", data: e.ppokl, color: e.color }];
    if (s) items.push(s3Series("S3 ppo_kl ×1e5", s.ppokl));
    drawLineChart(`chart-${key}-ppokl`, `tip-${key}-ppokl`, {
      categories: e.cats, series: items, height: 200,
      referenceLines: [{ value: 0, label: "0", tone: "neutral" }],
    });
  }
  const clipSeries = [{ name: "pg_clipfrac", data: e.clip, color: e.color }];
  if (e.clipLower) clipSeries.push({ name: "pg_clipfrac_lower", data: e.clipLower, color: COLORS.danger });
  if (s) clipSeries.push(s3Series("S3 clipfrac", s.clip));
  if (s && s.clipLower) clipSeries.push({ name: "S3 clipfrac_lower", data: s.clipLower, color: "#2dd4bf", dash: [6, 4] });
  drawLineChart(`chart-${key}-clip`, `tip-${key}-clip`, {
    categories: e.cats,
    series: clipSeries,
    valueSuffix: "%", height: 200, yMin: 0,
  });
  {
    const items = [{ name: "(1−corr)×1e4", data: e.pearsonDev, color: e.color }];
    if (s) items.push(s3Series("S3 (1−corr)×1e4", s.pearsonDev));
    drawLineChart(`chart-${key}-corr`, `tip-${key}-corr`, {
      categories: e.cats, series: items, height: 200, yMin: 0,
    });
  }

  if (e.rolloutKl && document.getElementById(`chart-${key}-rollkl`)) {
    const items = [{ name: "rollout_corr/kl ×1e4", data: e.rolloutKl, color: COLORS.e3 }];
    if (s && s.rolloutKl) items.push(s3Series("S3 rollout_kl ×1e4", s.rolloutKl));
    drawLineChart(`chart-${key}-rollkl`, `tip-${key}-rollkl`, {
      categories: e.cats, series: items, height: 200, yMin: 0,
    });
  }
  if (e.stepMin && document.getElementById(`chart-${key}-stepmin`)) {
    const items = [{ name: "wall time / step", data: e.stepMin, color: COLORS.neutral }];
    if (s && s.stepMin) items.push(s3Series("S3", s.stepMin));
    drawLineChart(`chart-${key}-stepmin`, `tip-${key}-stepmin`, {
      categories: e.cats, series: items,
      valueSuffix: " min", height: 200, yMin: 0,
    });
  }
  if (e.mfu && document.getElementById(`chart-${key}-mfu`)) {
    const avgMfu = meanOf(e.mfu);
    const items = [{ name: "perf/mfu/actor", data: e.mfu, color: COLORS.e1 }];
    if (s && s.mfu) items.push(s3Series("S3 MFU", s.mfu));
    drawLineChart(`chart-${key}-mfu`, `tip-${key}-mfu`, {
      categories: e.cats, series: items,
      valueSuffix: "%", height: 200,
      referenceLines: avgMfu != null ? [{ value: avgMfu, label: `mean ${avgMfu.toFixed(1)}%`, tone: "neutral" }] : [],
    });
  }
  if (e.throughput && document.getElementById(`chart-${key}-thru`)) {
    const avgThru = meanOf(e.throughput);
    const items = [{ name: "perf/throughput", data: e.throughput, color: COLORS.neutral }];
    if (s && s.throughput) items.push(s3Series("S3 throughput", s.throughput));
    drawLineChart(`chart-${key}-thru`, `tip-${key}-thru`, {
      categories: e.cats, series: items,
      valueSuffix: " tok/s", height: 200,
      referenceLines: avgThru != null ? [{ value: avgThru, label: `mean ${Math.round(avgThru)}`, tone: "neutral" }] : [],
    });
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
        { name: "gen (rollout)", data: t.gen, color: COLORS.danger },
        { name: "update_actor", data: t.update_actor, color: e.color },
        { name: "ref", data: t.ref, color: COLORS.e3 },
        { name: "old_log_prob", data: t.old_log_prob, color: COLORS.e2 },
      ].filter((s) => hasVals(s.data));
      renderLegend(majorLegend, majorItems, (visible) => drawLineChart(`chart-${key}-timing`, `tip-${key}-timing`, {
        categories: e.cats,
        series: visible,
        valueSuffix: " s", height: 240, yMin: 0,
      }));
    }
    if (document.getElementById(`chart-${key}-timing-step`)) {
      drawLineChart(`chart-${key}-timing-step`, `tip-${key}-timing-step`, {
        categories: e.cats,
        series: [{ name: "timing_s/step", data: t.step, color: COLORS.neutral }],
        valueSuffix: " s", height: 240, yMin: 0,
      });
    }
    const minorLegend = document.getElementById(`legend-${key}-timing-minor`);
    if (minorLegend) {
      renderLegend(minorLegend, [
        { name: "update_weights", data: t.update_weights, color: COLORS.e4 },
        { name: "adv", data: t.adv, color: COLORS.e5 },
        { name: "reward", data: t.reward, color: COLORS.neutral },
      ], (visible) => drawLineChart(`chart-${key}-timing-minor`, `tip-${key}-timing-minor`, {
        categories: e.cats,
        series: visible,
        valueSuffix: " s", height: 200, yMin: 0,
      }));
    }
    if (document.getElementById(`chart-${key}-timing-mean`)) {
      const meanCats = ["gen", "update_actor", "ref", "old_log_prob", "update_weights", "adv"];
      const meanVals = meanCats.map((k) => tm[k] ?? 0);
      const meanColors = [COLORS.danger, e.color, COLORS.e3, COLORS.e2, COLORS.e4, COLORS.e5];
      drawBarChart(`chart-${key}-timing-mean`, `tip-${key}-timing-mean`, {
        categories: meanCats,
        data: meanVals,
        colors: meanColors,
        valueSuffix: " s", height: 200,
      });
    }
  }

  // ---- Evalscope 评测结果（Easy-Boxed 实线；有 S3 offline 时叠加同色虚线）----
  if (typeof EVAL_EASY_BOXED_FULL !== "undefined" && EVAL_EASY_BOXED_FULL[key] && document.getElementById(`chart-${key}-eval-mmlu`)) {
    const ev = EVAL_EASY_BOXED_FULL[key];
    const s3ev = (typeof EVAL_FULL_S3 !== "undefined" && EVAL_FULL_S3[key]) ? EVAL_FULL_S3[key] : null;
    const hasS3 = (metric) => s3ev && s3ev[metric] && s3ev[metric].some((v) => v != null);

    const mmluItems = [{ name: hasS3("mmlu") ? "mmlu_temp (Easy-Boxed)" : "mmlu_temp", data: ev.mmlu, color: ev.color }];
    if (hasS3("mmlu")) mmluItems.push(s3Series("mmlu_temp (S3)", s3ev.mmlu, ev.color));
    const mmluLegendEl = document.getElementById(`legend-${key}-eval-mmlu`);
    const drawMmlu = (visible) => {
      const [yMin, yMax] = yRangeFromSeries(visible, { floor: 80, ceil: 100 });
      drawLineChart(`chart-${key}-eval-mmlu`, `tip-${key}-eval-mmlu`, {
        categories: EVAL_EASY_BOXED_FULL_STEPS, series: visible,
        valueSuffix: "%", yMin, yMax, height: 200,
      });
    };
    if (mmluLegendEl) renderLegend(mmluLegendEl, mmluItems, drawMmlu);
    else drawMmlu(mmluItems);

    const aimeLegendEl = document.getElementById(`legend-${key}-eval-aime`);
    if (aimeLegendEl) {
      const aimeItems = [
        { name: hasS3("aime24") || hasS3("aime25") ? "aime24 (Easy-Boxed)" : "aime24", data: ev.aime24, color: COLORS.e1 },
        { name: hasS3("aime24") || hasS3("aime25") ? "aime25 (Easy-Boxed)" : "aime25", data: ev.aime25, color: ev.color },
      ];
      if (hasS3("aime24")) aimeItems.push({ name: "aime24 (S3)", data: s3ev.aime24, color: COLORS.e2, dash: [6, 4] });
      if (hasS3("aime25")) aimeItems.push(s3Series("aime25 (S3)", s3ev.aime25, ev.color));
      renderLegend(aimeLegendEl, aimeItems, (visible) => {
        const [yMin, yMax] = yRangeFromSeries(visible, { floor: 30, ceil: 90 });
        drawLineChart(`chart-${key}-eval-aime`, `tip-${key}-eval-aime`, {
          categories: EVAL_EASY_BOXED_FULL_STEPS, series: visible,
          valueSuffix: "%", yMin, yMax, height: 200,
        });
      });
    }
    const mathLegendEl = document.getElementById(`legend-${key}-eval-math500`);
    if (mathLegendEl && ev.math500) {
      const mathItems = [{ name: hasS3("math500") ? "math_500 (Easy-Boxed)" : "math_500", data: ev.math500, color: ev.color }];
      if (hasS3("math500")) mathItems.push(s3Series("math_500 (S3)", s3ev.math500, ev.color));
      renderLegend(mathLegendEl, mathItems, (visible) => {
        const [yMin, yMax] = yRangeFromSeries(visible, { floor: 0, ceil: 100 });
        drawLineChart(`chart-${key}-eval-math500`, `tip-${key}-eval-math500`, {
          categories: EVAL_EASY_BOXED_FULL_STEPS, series: visible,
          valueSuffix: "%", yMin, yMax, height: 200,
        });
      });
    }
  }

  // ---- Agent / 工具调用（本实验 Easy-Boxed：BFCL-v3 + tau-bench）----
  if (typeof AGENT !== "undefined" && AGENT[key] && document.getElementById(`chart-${key}-agent-bfcl`)) {
    const ag = AGENT[key];
    const agSteps = (typeof AGENT_STEPS !== "undefined") ? AGENT_STEPS : EVAL_EASY_BOXED_FULL_STEPS;
    const yPad = (series, loPad, hiPad, floor, ceil) => {
      const vals = series.flatMap((s) => (s.data || []).filter((v) => v != null));
      if (!vals.length) return [floor, ceil];
      const lo = Math.max(floor, Math.floor(Math.min(...vals) - loPad));
      const hi = Math.min(ceil, Math.ceil(Math.max(...vals) + hiPad));
      return [lo, Math.max(lo + 2, hi)];
    };
    const drawAgent = (metric, suffix, loPad, hiPad, floor, ceil) => {
      const canvasId = `chart-${key}-agent-${suffix}`;
      const tipId = `tip-${key}-agent-${suffix}`;
      const legendEl = document.getElementById(`legend-${key}-agent-${suffix}`);
      if (!document.getElementById(canvasId) || !ag[metric]) return;
      const s3ag = (typeof AGENT_S3 !== "undefined") ? AGENT_S3[key] : null;
      const items = [{ name: ag.label || key.toUpperCase(), data: ag[metric], color: ag.color || COLORS[key] }];
      if (s3ag && s3ag[metric] && s3ag[metric].some((v) => v != null)) {
        items.push(s3Series(s3ag.label || `${ag.label || key.toUpperCase()} S3`, s3ag[metric], ag.color || COLORS[key]));
      }
      const draw = (visible) => {
        const [yMin, yMax] = yPad(visible, loPad, hiPad, floor, ceil);
        drawLineChart(canvasId, tipId, {
          categories: agSteps, series: visible,
          valueSuffix: "%", yMin, yMax, height: 200,
        });
      };
      if (legendEl) renderLegend(legendEl, items, draw);
      else draw(items);
    };
    drawAgent("bfcl", "bfcl", 1, 2, 0, 60);
    drawAgent("bfcl_mt", "mt", 0.5, 1, 0, 20);
    drawAgent("tau", "tau", 5, 5, 0, 100);
  }
}

function renderEvalPanel() {
  drawBarChart("chart-eval-mmlu150", "tip-eval-mmlu150", {
    categories: EVAL_EASY_BOXED_ORDER.map(k => EVAL_EASY_BOXED[k].label),
    data: EVAL_EASY_BOXED_ORDER.map(k => EVAL_EASY_BOXED[k].mmlu[2]),
    colors: EVAL_EASY_BOXED_ORDER.map(k => EVAL_EASY_BOXED[k].color),
    valueSuffix: "%", height: 200,
  });
  drawBarChart("chart-eval-aime25-150", "tip-eval-aime25-150", {
    categories: EVAL_EASY_BOXED_ORDER.map(k => EVAL_EASY_BOXED[k].label),
    data: EVAL_EASY_BOXED_ORDER.map(k => EVAL_EASY_BOXED[k].aime25[2]),
    colors: EVAL_EASY_BOXED_ORDER.map(k => EVAL_EASY_BOXED[k].color),
    valueSuffix: "%", height: 200,
  });

  // ---- Easy-Boxed 全 step 明细 + S3 同色虚线叠加 ----
  if (typeof EVAL_EASY_BOXED_FULL !== "undefined" && document.getElementById("chart-evalfull-mmlu")) {
    const s3src = (typeof EVAL_FULL_S3 !== "undefined") ? EVAL_FULL_S3 : {};
    const seriesWithS3 = (metric) => {
      const items = [];
      EVAL_EASY_BOXED_FULL_ORDER.forEach((k) => {
        const row = EVAL_EASY_BOXED_FULL[k];
        const s3ev = s3src[k];
        const hasS3 = s3ev && s3ev[metric] && s3ev[metric].some((v) => v != null);
        items.push({
          name: hasS3 ? `${row.label} (Easy-Boxed)` : row.label,
          data: row[metric],
          color: row.color,
        });
        if (hasS3) items.push(s3Series(`${row.label} (S3)`, s3ev[metric], row.color));
      });
      return items;
    };
    const drawMetric = (legendId, chartId, tipId, metric, floor, ceil) => {
      const legendEl = document.getElementById(legendId);
      if (!legendEl) return;
      renderLegend(legendEl, seriesWithS3(metric), (visible) => {
        const [yMin, yMax] = yRangeFromSeries(visible, { floor, ceil });
        drawLineChart(chartId, tipId, {
          categories: EVAL_EASY_BOXED_FULL_STEPS,
          series: visible,
          valueSuffix: "%", yMin, yMax, height: 240,
        });
      });
    };
    drawMetric("legend-evalfull-mmlu", "chart-evalfull-mmlu", "tip-evalfull-mmlu", "mmlu", 80, 100);
    drawMetric("legend-evalfull-aime24", "chart-evalfull-aime24", "tip-evalfull-aime24", "aime24", 40, 90);
    drawMetric("legend-evalfull-aime25", "chart-evalfull-aime25", "tip-evalfull-aime25", "aime25", 30, 70);
    drawMetric("legend-evalfull-math500", "chart-evalfull-math500", "tip-evalfull-math500", "math500", 0, 100);
  }

  // ---- Agent / 工具调用能力（BFCL-v3 + tau-bench）：每个 index 一条曲线 ----
  if (typeof AGENT !== "undefined" && document.getElementById("chart-agent-bfcl")) {
    const items = (dataKey) => {
      const rows = [];
      AGENT_ORDER.forEach((k) => {
        rows.push({ name: AGENT[k].label, data: AGENT[k][dataKey], color: AGENT[k].color });
        const s3ag = (typeof AGENT_S3 !== "undefined") ? AGENT_S3[k] : null;
        if (s3ag && s3ag[dataKey] && s3ag[dataKey].some((v) => v != null)) {
          rows.push(s3Series(s3ag.label || `${AGENT[k].label} S3`, s3ag[dataKey], AGENT[k].color));
        }
      });
      return rows;
    };
    const yPad = (series, loPad, hiPad, floor, ceil) => {
      const vals = series.flatMap((s) => (s.data || []).filter((v) => v != null));
      if (!vals.length) return [floor, ceil];
      const lo = Math.max(floor, Math.floor(Math.min(...vals) - loPad));
      const hi = Math.min(ceil, Math.ceil(Math.max(...vals) + hiPad));
      return [lo, Math.max(lo + 2, hi)];
    };
    renderLegend(document.getElementById("legend-agent-bfcl"), items("bfcl"),
      (visible) => {
        const [yMin, yMax] = yPad(visible, 1, 2, 0, 60);
        drawLineChart("chart-agent-bfcl", "tip-agent-bfcl", {
          categories: AGENT_STEPS, series: visible,
          valueSuffix: "%", yMin, yMax, height: 240,
        });
      });
    renderLegend(document.getElementById("legend-agent-mt"), items("bfcl_mt"),
      (visible) => {
        const [yMin, yMax] = yPad(visible, 0.5, 1, 0, 20);
        drawLineChart("chart-agent-mt", "tip-agent-mt", {
          categories: AGENT_STEPS, series: visible,
          valueSuffix: "%", yMin, yMax, height: 240,
        });
      });
    renderLegend(document.getElementById("legend-agent-tau"), items("tau"),
      (visible) => {
        const [yMin, yMax] = yPad(visible, 5, 5, 0, 100);
        drawLineChart("chart-agent-tau", "tip-agent-tau", {
          categories: AGENT_STEPS, series: visible,
          valueSuffix: "%", yMin, yMax, height: 240,
        });
      });
  }
}

// Tab switching and initial render are handled by js/tab-loader.js
