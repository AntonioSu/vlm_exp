function renderLegend(el, items) {
  el.innerHTML = items.map(it => `<span><span class="dot" style="background:${it.color}"></span>${it.name}</span>`).join("");
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

  let allVals = series.flatMap(s => s.data);
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

  // series lines
  series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    s.data.forEach((v, i) => {
      const x = xAt(i), y = yAt(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
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
    const lines = series.map(s => `<span style="color:${s.color}">●</span> ${s.name}: ${s.data[idx]}${valueSuffix}`).join("<br>");
    tip.innerHTML = `step ${categories[idx] || idx + 1}<br>${lines}`;
    tip.style.left = x + "px";
    tip.style.top = (yAt(Math.max(...series.map(s => s.data[idx]))) - 6) + "px";
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
  const max = Math.max(...data) * 1.15;

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
    const v = data[i];
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
    { name: "E1 GRPO", color: COLORS.e1 }, { name: "E2 DAPO", color: COLORS.e2 }, { name: "E3 Dr.GRPO", color: COLORS.e3 }, { name: "E4 RLOO", color: COLORS.e4 },
  ]);
  drawLineChart("chart-pass", "tip-pass", {
    categories: STEP_CATS,
    series: [
      { name: "E1 GRPO", data: E1_PASS_MA, color: COLORS.e1 },
      { name: "E2 DAPO", data: E2_PASS_MA, color: COLORS.e2 },
      { name: "E3 Dr.GRPO", data: E3_PASS_MA, color: COLORS.e3 },
      { name: "E4 RLOO", data: E4_PASS_MA, color: COLORS.e4 },
    ],
    yMin: 60, yMax: 100, valueSuffix: "%", height: 280,
  });

  renderLegend(document.getElementById("legend-len"), [
    { name: "E1 GRPO", color: COLORS.e1 }, { name: "E2 DAPO", color: COLORS.e2 }, { name: "E3 Dr.GRPO", color: COLORS.e3 }, { name: "E4 RLOO", color: COLORS.e4 },
  ]);
  drawLineChart("chart-len", "tip-len", {
    categories: STEP_CATS,
    series: [
      { name: "E1 GRPO", data: E1_LEN, color: COLORS.e1 },
      { name: "E2 DAPO", data: E2_LEN, color: COLORS.e2 },
      { name: "E3 Dr.GRPO", data: E3_LEN, color: COLORS.e3 },
      { name: "E4 RLOO", data: E4_LEN, color: COLORS.e4 },
    ],
    valueSuffix: " tok", height: 240,
    referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
  });

  renderLegend(document.getElementById("legend-ent"), [
    { name: "E1 GRPO", color: COLORS.e1 }, { name: "E2 DAPO", color: COLORS.e2 }, { name: "E3 Dr.GRPO", color: COLORS.e3 }, { name: "E4 RLOO", color: COLORS.e4 },
  ]);
  drawLineChart("chart-ent", "tip-ent", {
    categories: STEP_CATS,
    series: [
      { name: "E1 GRPO", data: E1_ENTROPY, color: COLORS.e1 },
      { name: "E2 DAPO", data: E2_ENTROPY, color: COLORS.e2 },
      { name: "E3 Dr.GRPO", data: E3_ENTROPY, color: COLORS.e3 },
      { name: "E4 RLOO", data: E4_ENTROPY, color: COLORS.e4 },
    ],
    height: 240,
  });

  renderLegend(document.getElementById("legend-grad"), [
    { name: "E1 GRPO", color: COLORS.e1 }, { name: "E2 DAPO", color: COLORS.e2 }, { name: "E3 Dr.GRPO", color: COLORS.e3 }, { name: "E4 RLOO", color: COLORS.e4 },
  ]);
  drawLineChart("chart-grad", "tip-grad", {
    categories: STEP_CATS,
    series: [
      { name: "E1 GRPO", data: E1_GRAD, color: COLORS.e1 },
      { name: "E2 DAPO", data: E2_GRAD, color: COLORS.e2 },
      { name: "E3 Dr.GRPO", data: E3_GRAD, color: COLORS.e3 },
      { name: "E4 RLOO", data: E4_GRAD, color: COLORS.e4 },
    ],
    height: 220,
  });

  drawBarChart("chart-dur", "tip-dur", {
    categories: DURATION_CATS,
    data: DURATION_H,
    colors: [COLORS.e1, COLORS.e2, COLORS.e3, COLORS.e4],
    valueSuffix: "h", height: 220,
  });

  renderLegend(document.getElementById("legend-aime"), [
    { name: "E1 GRPO", color: COLORS.e1 }, { name: "E2 DAPO", color: COLORS.e2 }, { name: "E3 Dr.GRPO", color: COLORS.e3 }, { name: "E4 RLOO", color: COLORS.e4 },
  ]);
  drawLineChart("chart-aime", "tip-aime", {
    categories: AIME_CATS,
    series: [
      { name: "E1 GRPO", data: AIME_E1, color: COLORS.e1 },
      { name: "E2 DAPO", data: AIME_E2, color: COLORS.e2 },
      { name: "E3 Dr.GRPO", data: AIME_E3, color: COLORS.e3 },
      { name: "E4 RLOO", data: AIME_E4, color: COLORS.e4 },
    ],
    valueSuffix: "%", yMin: 0, yMax: 100, height: 260,
  });
}

function renderExpPanel(key) {
  const e = EXP[key];
  drawLineChart(`chart-${key}-pass`, `tip-${key}-pass`, {
    categories: e.cats,
    series: [{ name: e.label + " pass rate", data: e.pass, color: e.color }],
    yMin: 60, yMax: 100, valueSuffix: "%", height: 200,
  });
  drawLineChart(`chart-${key}-len`, `tip-${key}-len`, {
    categories: e.cats,
    series: [{ name: e.label + " length", data: e.len, color: e.color }],
    valueSuffix: " tok", height: 200,
    referenceLines: [{ value: 16384, label: "16K cap", tone: "danger" }],
  });
  drawLineChart(`chart-${key}-ent`, `tip-${key}-ent`, {
    categories: e.cats,
    series: [{ name: e.label + " entropy", data: e.ent, color: e.color }],
    height: 200,
  });
  drawLineChart(`chart-${key}-grad`, `tip-${key}-grad`, {
    categories: e.cats,
    series: [{ name: e.label + " grad_norm", data: e.grad, color: e.color }],
    height: 200,
  });
  drawLineChart(`chart-${key}-loss`, `tip-${key}-loss`, {
    categories: e.cats,
    series: [{ name: e.label + " actor/loss", data: e.loss, color: e.color }],
    height: 200,
  });
  drawLineChart(`chart-${key}-ppokl`, `tip-${key}-ppokl`, {
    categories: e.cats,
    series: [{ name: e.label + " ppo_kl \u00d71e5", data: e.ppokl, color: e.color }],
    height: 200,
    referenceLines: [{ value: 0, label: "0", tone: "neutral" }],
  });
  const clipSeries = [{ name: "pg_clipfrac", data: e.clip, color: e.color }];
  if (e.clipLower) clipSeries.push({ name: "pg_clipfrac_lower", data: e.clipLower, color: COLORS.danger });
  drawLineChart(`chart-${key}-clip`, `tip-${key}-clip`, {
    categories: e.cats,
    series: clipSeries,
    valueSuffix: "%", height: 200, yMin: 0,
  });
  drawLineChart(`chart-${key}-corr`, `tip-${key}-corr`, {
    categories: e.cats,
    series: [{ name: "(1\u2212corr)\u00d71e4", data: e.pearsonDev, color: e.color }],
    height: 200, yMin: 0,
  });
}

render();
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const activeSub = document.querySelector(".subtab-btn.active");
    if (!activeSub || activeSub.dataset.subtab === "compare") render();
    else renderExpPanel(activeSub.dataset.subtab);
  }, 120);
});

// ---- Sub-tab switching: 对比总览 vs 单组详细监控（含训练中的 E5） ----
const subtabBtns = document.querySelectorAll(".subtab-btn");
const subpanels = {
  compare: document.getElementById("subpanel-compare"),
  e1: document.getElementById("subpanel-e1"),
  e2: document.getElementById("subpanel-e2"),
  e3: document.getElementById("subpanel-e3"),
  e4: document.getElementById("subpanel-e4"),
  e5: document.getElementById("subpanel-e5"),
};
subtabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const sub = btn.dataset.subtab;
    subtabBtns.forEach((b) => b.classList.toggle("active", b === btn));
    Object.entries(subpanels).forEach(([k, el]) => {
      if (el) el.classList.toggle("active", k === sub);
    });
    sub === "compare" ? render() : renderExpPanel(sub);
  });
});
