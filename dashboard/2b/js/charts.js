// Renders a clickable legend bound to a chart: clicking a series name toggles
// it on/off and redraws with only the still-selected series (ECharts-style
// legend select). `draw(visibleSeries)` is called once up front and again on
// every toggle.
function renderLegend(el, series, draw) {
  const hidden = new Set();
  el.innerHTML = series.map(s => {
    const swatch = s.dash
      ? `<span class="dot dash" style="border-color:${s.color}"></span>`
      : `<span class="dot" style="background:${s.color}"></span>`;
    return `<span class="legend-item">${swatch}${s.name}</span>`;
  }).join("");
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
  // ---- Easy-Boxed E1–E5 ----
  renderLegend(document.getElementById("legend-pass"), [
    { name: "E1 GRPO", data: E1_PASS_MA, color: COLORS.e1 },
    { name: "E2 DAPO", data: E2_PASS_MA, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: E3_PASS_MA, color: COLORS.e3 },
    { name: "E4 RLOO", data: E4_PASS_MA, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: E5_PASS_MA, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-pass", "tip-pass", {
    categories: STEP_CATS,
    series: visible,
    yMin: 0, yMax: 80, valueSuffix: "%", height: 280,
  }));

  const raccLegend = document.getElementById("legend-racc");
  if (raccLegend && typeof E2_ROLLOUT_ACC_MA !== "undefined") {
    drawLineChart("chart-racc", "tip-racc", {
      categories: STEP_CATS,
      series: [{ name: "E2 DAPO", data: E2_ROLLOUT_ACC_MA, color: COLORS.e2 }],
      yMin: 0, yMax: 80, valueSuffix: "%", height: 280,
    });
  }

  renderLegend(document.getElementById("legend-len"), [
    { name: "E1 GRPO", data: E1_LEN, color: COLORS.e1 },
    { name: "E2 DAPO", data: E2_LEN, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: E3_LEN, color: COLORS.e3 },
    { name: "E4 RLOO", data: E4_LEN, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: E5_LEN, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-len", "tip-len", {
    categories: STEP_CATS,
    series: visible,
    valueSuffix: " tok", height: 240,
    referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
  }));

  renderLegend(document.getElementById("legend-ent"), [
    { name: "E1 GRPO", data: E1_ENTROPY, color: COLORS.e1 },
    { name: "E2 DAPO", data: E2_ENTROPY, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: E3_ENTROPY, color: COLORS.e3 },
    { name: "E4 RLOO", data: E4_ENTROPY, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: E5_ENTROPY, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-ent", "tip-ent", {
    categories: STEP_CATS,
    series: visible,
    height: 240,
  }));

  renderLegend(document.getElementById("legend-grad"), [
    { name: "E1 GRPO", data: E1_GRAD, color: COLORS.e1 },
    { name: "E2 DAPO", data: E2_GRAD, color: COLORS.e2 },
    { name: "E3 Dr.GRPO", data: E3_GRAD, color: COLORS.e3 },
    { name: "E4 RLOO", data: E4_GRAD, color: COLORS.e4 },
    { name: "E5 REINFORCE++", data: E5_GRAD, color: COLORS.e5 },
  ], (visible) => drawLineChart("chart-grad", "tip-grad", {
    categories: STEP_CATS,
    series: visible,
    height: 220,
  }));

  drawBarChart("chart-dur", "tip-dur", {
    categories: DURATION_CATS,
    data: DURATION_H,
    colors: [COLORS.e1, COLORS.e2, COLORS.e3, COLORS.e4, COLORS.e5],
    valueSuffix: "h", height: 220,
  });

  const aimeLegend = document.getElementById("legend-aime");
  if (aimeLegend && typeof AIME_E1 !== "undefined") {
    renderLegend(aimeLegend, [
      { name: "E1 GRPO", data: AIME_E1, color: COLORS.e1 },
      { name: "E2 DAPO", data: AIME_E2, color: COLORS.e2 },
      { name: "E3 Dr.GRPO", data: AIME_E3, color: COLORS.e3 },
      { name: "E4 RLOO", data: AIME_E4, color: COLORS.e4 },
      { name: "E5 REINFORCE++", data: AIME_E5, color: COLORS.e5 },
    ], (visible) => drawLineChart("chart-aime", "tip-aime", {
      categories: AIME_CATS,
      series: visible,
      valueSuffix: "%", yMin: 0, yMax: 50, height: 260,
    }));
  }

  // ---- S3 E1–E3（独立图，不与 Easy-Boxed 叠加）----
  const s3PassLegend = document.getElementById("legend-s3-pass");
  if (!s3PassLegend || typeof S3_E1_PASS_MA === "undefined") return;

  const s3Pass = [
    { name: "S3 E1 GRPO", data: S3_E1_PASS_MA, color: COLORS.e1 },
    { name: "S3 E2 DAPO", data: S3_E2_PASS_MA, color: COLORS.e2 },
    { name: "S3 E3 Dr.GRPO", data: S3_E3_PASS_MA, color: COLORS.e3 },
  ];
  renderLegend(s3PassLegend, s3Pass, (visible) => drawLineChart("chart-s3-pass", "tip-s3-pass", {
    categories: STEP_CATS,
    series: visible,
    yMin: 0, yMax: 80, valueSuffix: "%", height: 280,
  }));

  const s3RaccLegend = document.getElementById("legend-s3-racc");
  if (s3RaccLegend && typeof S3_E2_ROLLOUT_ACC_MA !== "undefined") {
    drawLineChart("chart-s3-racc", "tip-s3-racc", {
      categories: STEP_CATS,
      series: [{ name: "S3 E2 DAPO", data: S3_E2_ROLLOUT_ACC_MA, color: COLORS.e2 }],
      yMin: 0, yMax: 80, valueSuffix: "%", height: 280,
    });
  }

  renderLegend(document.getElementById("legend-s3-len"), [
    { name: "S3 E1 GRPO", data: S3_E1_LEN, color: COLORS.e1 },
    { name: "S3 E2 DAPO", data: S3_E2_LEN, color: COLORS.e2 },
    { name: "S3 E3 Dr.GRPO", data: S3_E3_LEN, color: COLORS.e3 },
  ], (visible) => drawLineChart("chart-s3-len", "tip-s3-len", {
    categories: STEP_CATS,
    series: visible,
    valueSuffix: " tok", height: 240,
    referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
  }));

  renderLegend(document.getElementById("legend-s3-ent"), [
    { name: "S3 E1 GRPO", data: S3_E1_ENTROPY, color: COLORS.e1 },
    { name: "S3 E2 DAPO", data: S3_E2_ENTROPY, color: COLORS.e2 },
    { name: "S3 E3 Dr.GRPO", data: S3_E3_ENTROPY, color: COLORS.e3 },
  ], (visible) => drawLineChart("chart-s3-ent", "tip-s3-ent", {
    categories: STEP_CATS,
    series: visible,
    height: 240,
  }));

  renderLegend(document.getElementById("legend-s3-grad"), [
    { name: "S3 E1 GRPO", data: S3_E1_GRAD, color: COLORS.e1 },
    { name: "S3 E2 DAPO", data: S3_E2_GRAD, color: COLORS.e2 },
    { name: "S3 E3 Dr.GRPO", data: S3_E3_GRAD, color: COLORS.e3 },
  ], (visible) => drawLineChart("chart-s3-grad", "tip-s3-grad", {
    categories: STEP_CATS,
    series: visible,
    height: 220,
  }));

  if (typeof S3_DURATION_CATS !== "undefined") {
    drawBarChart("chart-s3-dur", "tip-s3-dur", {
      categories: S3_DURATION_CATS,
      data: S3_DURATION_H,
      colors: S3_DURATION_COLORS,
      valueSuffix: "h", height: 220,
    });
  }

  const s3AimeLegend = document.getElementById("legend-s3-aime");
  if (s3AimeLegend && typeof AIME_S3_E1 !== "undefined") {
    renderLegend(s3AimeLegend, [
      { name: "S3 E1 GRPO", data: AIME_S3_E1, color: COLORS.e1 },
      { name: "S3 E2 DAPO", data: AIME_S3_E2, color: COLORS.e2 },
      { name: "S3 E3 Dr.GRPO", data: AIME_S3_E3, color: COLORS.e3 },
    ], (visible) => drawLineChart("chart-s3-aime", "tip-s3-aime", {
      categories: AIME_CATS,
      series: visible,
      valueSuffix: "%", yMin: 0, yMax: 50, height: 260,
    }));
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
  const s3Key = "s3_" + key;
  const s = EXP[s3Key] || null;
  fillExpStats(key, e);

  const passLegend = document.getElementById(`legend-${key}-pass`);
  const passMA = movingAvg(e.pass, 5);
  const allPass = e.pass.filter(v => v != null);
  if (s) allPass.push(...s.pass.filter(v => v != null));
  const passMax = Math.max(...allPass);
  const passYMax = Math.min(100, Math.ceil((passMax + 10) / 10) * 10);
  if (passLegend) {
    const items = [
      { name: "Easy-Boxed", data: passMA, color: e.color },
    ];
    if (s) items.push({ name: "S3", data: movingAvg(s.pass, 5), color: COLORS.s3 });
    renderLegend(passLegend, items, (visible) => drawLineChart(`chart-${key}-pass`, `tip-${key}-pass`, {
      categories: e.cats,
      series: visible,
      yMin: 0, yMax: passYMax, valueSuffix: "%", height: 240,
    }));
  } else {
    const items = [{ name: "Easy-Boxed pass", data: e.pass, color: e.color }];
    if (s) items.push({ name: "S3 pass", data: s.pass, color: COLORS.s3 });
    drawLineChart(`chart-${key}-pass`, `tip-${key}-pass`, {
      categories: e.cats, series: items,
      yMin: 0, yMax: passYMax, valueSuffix: "%", height: 200,
    });
  }

  if (e.rolloutAcc && e.rolloutAcc.length && document.getElementById(`chart-${key}-racc`)) {
    const raccMA = movingAvg(e.rolloutAcc, 5);
    const raccItems = [{ name: "Easy-Boxed", data: raccMA, color: e.color }];
    if (s && s.rolloutAcc) raccItems.push({ name: "S3", data: movingAvg(s.rolloutAcc, 5), color: COLORS.s3 });
    const allRacc = e.rolloutAcc.filter(v => v != null);
    if (s && s.rolloutAcc) allRacc.push(...s.rolloutAcc.filter(v => v != null));
    const raccYMax = Math.min(100, Math.ceil((Math.max(...allRacc) + 10) / 10) * 10);
    const raccLegend = document.getElementById(`legend-${key}-racc`);
    if (raccLegend) {
      renderLegend(raccLegend, raccItems, (visible) => drawLineChart(`chart-${key}-racc`, `tip-${key}-racc`, {
        categories: e.cats, series: visible,
        yMin: 0, yMax: raccYMax, valueSuffix: "%", height: 240,
      }));
    } else {
      drawLineChart(`chart-${key}-racc`, `tip-${key}-racc`, {
        categories: e.cats, series: raccItems,
        yMin: 0, yMax: raccYMax, valueSuffix: "%", height: 240,
      });
    }
  }

  {
    const items = [{ name: "Easy-Boxed", data: e.len, color: e.color }];
    if (s) items.push({ name: "S3", data: s.len, color: COLORS.s3 });
    const lenLegend = document.getElementById(`legend-${key}-len`);
    if (lenLegend) {
      renderLegend(lenLegend, items, (visible) => drawLineChart(`chart-${key}-len`, `tip-${key}-len`, {
        categories: e.cats, series: visible,
        valueSuffix: " tok", height: 200,
        referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
      }));
    } else {
      drawLineChart(`chart-${key}-len`, `tip-${key}-len`, {
        categories: e.cats, series: items,
        valueSuffix: " tok", height: 200,
        referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
      });
    }
  }

  if (e.trunc && document.getElementById(`chart-${key}-trunc`)) {
    const items = [{ name: "Easy-Boxed clip@16K", data: e.trunc, color: e.color }];
    if (s && s.trunc) items.push({ name: "S3 clip@16K", data: s.trunc, color: COLORS.s3 });
    drawLineChart(`chart-${key}-trunc`, `tip-${key}-trunc`, {
      categories: e.cats, series: items,
      valueSuffix: "%", height: 200, yMin: 0,
    });
  }

  if (e.promptLen && document.getElementById(`chart-${key}-promptlen`)) {
    const items = [{ name: "Easy-Boxed", data: e.promptLen, color: e.color }];
    if (s && s.promptLen) items.push({ name: "S3", data: s.promptLen, color: COLORS.s3 });
    const plLegend = document.getElementById(`legend-${key}-promptlen`);
    if (plLegend && items.length > 1) {
      renderLegend(plLegend, items, (visible) => drawLineChart(`chart-${key}-promptlen`, `tip-${key}-promptlen`, {
        categories: e.cats, series: visible,
        valueSuffix: " tok", height: 200,
      }));
    } else {
      drawLineChart(`chart-${key}-promptlen`, `tip-${key}-promptlen`, {
        categories: e.cats, series: items,
        valueSuffix: " tok", height: 200,
      });
    }
  }

  const lossLegend = document.getElementById(`legend-${key}-loss`);
  {
    const items = [
      { name: "Easy-Boxed loss", data: e.loss, color: e.color },
    ];
    if (s) items.push({ name: "S3 loss", data: s.loss, color: COLORS.s3 });
    if (lossLegend) {
      renderLegend(lossLegend, items, (visible) => drawLineChart(`chart-${key}-loss`, `tip-${key}-loss`, {
        categories: e.cats, series: visible, height: 220,
      }));
    } else {
      drawLineChart(`chart-${key}-loss`, `tip-${key}-loss`, {
        categories: e.cats, series: items, height: 200,
      });
    }
  }

  {
    const items = [{ name: "Easy-Boxed entropy", data: e.ent, color: e.color }];
    if (s) items.push({ name: "S3 entropy", data: s.ent, color: COLORS.s3 });
    drawLineChart(`chart-${key}-ent`, `tip-${key}-ent`, {
      categories: e.cats, series: items, height: 200,
    });
  }

  if (e.klLoss && e.klLoss.some((x) => x != null) && document.getElementById(`chart-${key}-klloss`)) {
    const items = [{ name: "Easy-Boxed kl_loss ×100", data: e.klLoss, color: e.color }];
    if (s && s.klLoss && s.klLoss.some(x => x != null)) items.push({ name: "S3 kl_loss ×100", data: s.klLoss, color: COLORS.s3 });
    drawLineChart(`chart-${key}-klloss`, `tip-${key}-klloss`, {
      categories: e.cats, series: items, height: 200, yMin: 0,
    });
  }

  {
    const items = [{ name: "Easy-Boxed grad_norm", data: e.grad, color: e.color }];
    if (s) items.push({ name: "S3 grad_norm", data: s.grad, color: COLORS.s3 });
    drawLineChart(`chart-${key}-grad`, `tip-${key}-grad`, {
      categories: e.cats, series: items, height: 200,
    });
  }
  {
    const items = [{ name: "Easy-Boxed ppo_kl ×1e5", data: e.ppokl, color: e.color }];
    if (s) items.push({ name: "S3 ppo_kl ×1e5", data: s.ppokl, color: COLORS.s3 });
    drawLineChart(`chart-${key}-ppokl`, `tip-${key}-ppokl`, {
      categories: e.cats, series: items, height: 200,
      referenceLines: [{ value: 0, label: "0", tone: "neutral" }],
    });
  }
  {
    const clipItems = [{ name: "Easy-Boxed clipfrac", data: e.clip, color: e.color }];
    if (e.clipLower) clipItems.push({ name: "Easy-Boxed clipfrac_lower", data: e.clipLower, color: COLORS.danger });
    if (s) clipItems.push({ name: "S3 clipfrac", data: s.clip, color: COLORS.s3 });
    if (s && s.clipLower) clipItems.push({ name: "S3 clipfrac_lower", data: s.clipLower, color: "#f472b6" });
    drawLineChart(`chart-${key}-clip`, `tip-${key}-clip`, {
      categories: e.cats, series: clipItems,
      valueSuffix: "%", height: 200, yMin: 0,
    });
  }
  {
    const items = [{ name: "Easy-Boxed (1−corr)×1e4", data: e.pearsonDev, color: e.color }];
    if (s) items.push({ name: "S3 (1−corr)×1e4", data: s.pearsonDev, color: COLORS.s3 });
    drawLineChart(`chart-${key}-corr`, `tip-${key}-corr`, {
      categories: e.cats, series: items, height: 200, yMin: 0,
    });
  }

  if (e.rolloutKl && document.getElementById(`chart-${key}-rollkl`)) {
    const items = [{ name: "Easy-Boxed rollout_kl ×1e4", data: e.rolloutKl, color: e.color }];
    if (s && s.rolloutKl) items.push({ name: "S3 rollout_kl ×1e4", data: s.rolloutKl, color: COLORS.s3 });
    drawLineChart(`chart-${key}-rollkl`, `tip-${key}-rollkl`, {
      categories: e.cats, series: items, height: 200, yMin: 0,
    });
  }
  if (e.stepMin && document.getElementById(`chart-${key}-stepmin`)) {
    const items = [{ name: "Easy-Boxed", data: e.stepMin, color: e.color }];
    if (s && s.stepMin) items.push({ name: "S3", data: s.stepMin, color: COLORS.s3 });
    drawLineChart(`chart-${key}-stepmin`, `tip-${key}-stepmin`, {
      categories: e.cats, series: items,
      valueSuffix: " min", height: 200, yMin: 0,
    });
  }
  if (e.mfu && document.getElementById(`chart-${key}-mfu`)) {
    const items = [{ name: "Easy-Boxed MFU", data: e.mfu, color: e.color }];
    if (s && s.mfu) items.push({ name: "S3 MFU", data: s.mfu, color: COLORS.s3 });
    drawLineChart(`chart-${key}-mfu`, `tip-${key}-mfu`, {
      categories: e.cats, series: items,
      valueSuffix: "%", height: 200,
    });
  }
  if (e.throughput && document.getElementById(`chart-${key}-thru`)) {
    const items = [{ name: "Easy-Boxed throughput", data: e.throughput, color: e.color }];
    if (s && s.throughput) items.push({ name: "S3 throughput", data: s.throughput, color: COLORS.s3 });
    drawLineChart(`chart-${key}-thru`, `tip-${key}-thru`, {
      categories: e.cats, series: items,
      valueSuffix: " tok/s", height: 200,
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
      const items = [{ name: "Easy-Boxed step", data: t.step, color: e.color }];
      if (s && s.timing) items.push({ name: "S3 step", data: s.timing.step, color: COLORS.s3 });
      drawLineChart(`chart-${key}-timing-step`, `tip-${key}-timing-step`, {
        categories: e.cats, series: items,
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

  // ---- Evalscope 评测结果（2B: EVAL 三 checkpoint；若有 EVAL_FULL 则用 dense）----
  const evalEl = document.getElementById(`chart-${key}-eval-mmlu`);
  if (evalEl) {
    let steps = null, ev = null, yMmlu = [75, 85], yAime = [20, 45];
    if (typeof EVAL_FULL !== "undefined" && EVAL_FULL[key]) {
      steps = EVAL_FULL_STEPS; ev = EVAL_FULL[key];
    } else if (typeof EVAL !== "undefined" && EVAL[key]) {
      steps = EVAL_STEPS; ev = EVAL[key];
    }
    if (ev && steps) {
      drawLineChart(`chart-${key}-eval-mmlu`, `tip-${key}-eval-mmlu`, {
        categories: steps,
        series: [{ name: "mmlu_temp", data: ev.mmlu, color: ev.color }],
        valueSuffix: "%", yMin: yMmlu[0], yMax: yMmlu[1], height: 200,
      });
      const aimeLegendEl = document.getElementById(`legend-${key}-eval-aime`);
      if (aimeLegendEl) {
        renderLegend(aimeLegendEl, [
          { name: "aime24", data: ev.aime24, color: COLORS.danger },
          { name: "aime25", data: ev.aime25, color: ev.color },
        ], (visible) => drawLineChart(`chart-${key}-eval-aime`, `tip-${key}-eval-aime`, {
          categories: steps,
          series: visible,
          valueSuffix: "%", yMin: yAime[0], yMax: yAime[1], height: 200,
        }));
      }
    }
  }
}

function renderEvalPanel() {
  renderLegend(document.getElementById("legend-eval-mmlu"), EVAL_ORDER.map(k => ({ name: EVAL[k].label, data: EVAL[k].mmlu, color: EVAL[k].color })),
    (visible) => drawLineChart("chart-eval-mmlu", "tip-eval-mmlu", {
      categories: EVAL_STEPS,
      series: visible,
      valueSuffix: "%", yMin: 75, yMax: 85, height: 240,
    }));

  renderLegend(document.getElementById("legend-eval-aime25"), EVAL_ORDER.map(k => ({ name: EVAL[k].label, data: EVAL[k].aime25, color: EVAL[k].color })),
    (visible) => drawLineChart("chart-eval-aime25", "tip-eval-aime25", {
      categories: EVAL_STEPS,
      series: visible,
      valueSuffix: "%", yMin: 20, yMax: 45, height: 240,
    }));

  drawBarChart("chart-eval-mmlu150", "tip-eval-mmlu150", {
    categories: EVAL_ORDER.map(k => EVAL[k].label),
    data: EVAL_ORDER.map(k => EVAL[k].mmlu[2]),
    colors: EVAL_ORDER.map(k => EVAL[k].color),
    valueSuffix: "%", height: 200,
  });
  drawBarChart("chart-eval-aime25-150", "tip-eval-aime25-150", {
    categories: EVAL_ORDER.map(k => EVAL[k].label),
    data: EVAL_ORDER.map(k => EVAL[k].aime25[2]),
    colors: EVAL_ORDER.map(k => EVAL[k].color),
    valueSuffix: "%", height: 200,
  });
}


// Tab switching and initial render are handled by js/tab-loader.js
