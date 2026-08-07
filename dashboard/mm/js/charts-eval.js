// Multimodal dashboard charts: bar compare + 4B-E1-style mid-step line curves.
(function () {
  const COLORS = {
    grid: "#eef0f2",
    axis: "#9ca3af",
    text: "#111827",
    neutral: "#6b7280",
    m0: "#2563eb",
    m1: "#d97706", // amber — matches train data
    m2: "#059669", // green
    m3: "#0891b2", // cyan
  };
  // gen / trunc must not collide with train colors on shared charts
  const GEN_COLORS = { m1: "#dc2626", m2: "#7c3aed", m3: "#e11d48" };
  const TRUNC_COLORS = { m1: "#9f1239", m2: "#c026d3", m3: "#4338ca" };
  const SERIES_COLOR_FALLBACK = [
    "#2563eb", "#d97706", "#059669", "#9333ea", "#db2777",
    "#65a30d", "#e11d48", "#0891b2", "#c026d3", "#ea580c",
    "#6366f1", "#ca8a04", "#f97316", "#0e7490", "#7c3aed",
  ];
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

  function renderLegend(el, series, draw) {
    series = dedupeSeriesColors(series || []);
    if (!el) { draw(series.slice()); return; }
    const hidden = new Set();
    const itemsHtml = series.map((s) => {
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
        draw(series.filter((s) => !hidden.has(s.name)));
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
      draw(series.filter((s) => !hidden.has(s.name)));
    });
    syncToggleAllLabel();
    draw(series.slice());
  }

  function bindSeriesLegend(legendId, items, draw) {
    const el = document.getElementById(legendId);
    if (el) renderLegend(el, items, draw);
    else draw(items);
  }

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

  function drawBarChart(canvasId, tipId, { categories, data, colors, valueSuffix = "", height = 220 }) {
    const canvas = document.getElementById(canvasId);
    const tip = tipId ? document.getElementById(tipId) : null;
    if (!canvas) return;
    colors = dedupeBarColors(colors);
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.parentElement.clientWidth || 320;
    canvas.style.height = height + "px";
    canvas.width = cssWidth * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, height);

    const vals = data.map((v) => (v == null ? 0 : v));
    const padL = 40, padR = 12, padT = 18, padB = 28;
    const plotW = cssWidth - padL - padR;
    const plotH = height - padT - padB;
    const max = Math.max(1, ...vals) * 1.18;

    const bandW = plotW / Math.max(categories.length, 1);
    const barW = bandW * 0.48;

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
      const v = data[i];
      const bx = padL + i * bandW + (bandW - barW) / 2;
      if (v == null) {
        ctx.fillStyle = COLORS.axis;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(c, padL + i * bandW + bandW / 2, padT + plotH + 6);
        ctx.fillText("—", padL + i * bandW + bandW / 2, padT + plotH / 2);
        return;
      }
      const h = (v / max) * plotH;
      const y = padT + plotH - h;
      ctx.fillStyle = colors[i] || COLORS.neutral;
      ctx.fillRect(bx, y, barW, h);
      ctx.fillStyle = COLORS.axis;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(c, padL + i * bandW + bandW / 2, padT + plotH + 6);
      ctx.fillStyle = COLORS.text;
      ctx.font = "12px -apple-system, sans-serif";
      ctx.textBaseline = "bottom";
      ctx.fillText(v + valueSuffix, padL + i * bandW + bandW / 2, y - 4);
      ctx.font = "11px -apple-system, sans-serif";
    });

    if (tip) {
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const idx = Math.min(categories.length - 1, Math.max(0, Math.floor((x - padL) / bandW)));
        const v = data[idx];
        tip.style.left = Math.min(cssWidth - 120, Math.max(8, x + 10)) + "px";
        tip.style.top = "8px";
        tip.style.opacity = 1;
        tip.innerHTML = `<strong>${categories[idx]}</strong><br>${v == null ? "暂无" : v + valueSuffix}`;
      };
      canvas.onmouseleave = () => { tip.style.opacity = 0; };
    }
  }

  function drawLineChart(canvasId, tipId, {
    categories, series, yMin, yMax, valueSuffix = "", height = 240, referenceLines = [],
  }) {
    const canvas = document.getElementById(canvasId);
    const tip = tipId ? document.getElementById(tipId) : null;
    if (!canvas) return;
    series = dedupeSeriesColors(series || []);
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.parentElement.clientWidth || 320;
    canvas.style.height = height + "px";
    canvas.width = cssWidth * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, height);

    let allVals = series.flatMap((s) => s.data).filter((v) => v != null);
    referenceLines.forEach((r) => allVals.push(r.value));
    if (!allVals.length) allVals = [0, 1];
    const min = yMin !== undefined ? yMin : Math.min(...allVals);
    const max = yMax !== undefined ? yMax : Math.max(...allVals);
    const range = (max - min) || 1;
    const labelDecimals = range >= 100 ? 0 : range >= 5 ? 1 : range >= 0.5 ? 2 : 3;
    const labelScale = Math.pow(10, labelDecimals);
    const padL = 44, padR = 12, padT = 12, padB = 28;
    const plotW = cssWidth - padL - padR;
    const plotH = height - padT - padB;
    const xStep = categories.length > 1 ? plotW / (categories.length - 1) : 0;
    const xAt = (i) => padL + i * xStep;
    const yAt = (v) => padT + plotH - ((v - min) / range) * plotH;

    ctx.strokeStyle = COLORS.grid;
    ctx.fillStyle = COLORS.axis;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let t = 0; t <= 4; t++) {
      const v = min + (range * t) / 4;
      const y = yAt(v);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillText(Math.round(v * labelScale) / labelScale + valueSuffix, padL - 6, y);
    }

    referenceLines.forEach((r) => {
      const y = yAt(r.value);
      ctx.save();
      ctx.strokeStyle = r.color || COLORS.neutral;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.restore();
      if (r.label) {
        ctx.fillStyle = r.color || COLORS.neutral;
        ctx.textAlign = "right";
        ctx.font = "10.5px -apple-system, sans-serif";
        ctx.fillText(r.label, padL + plotW, y - 4);
      }
    });

    ctx.fillStyle = COLORS.axis;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "11px -apple-system, sans-serif";
    categories.forEach((c, i) => {
      if (c) ctx.fillText(c, xAt(i), padT + plotH + 6);
    });

    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let penDown = false;
      s.data.forEach((v, i) => {
        if (v == null) { penDown = false; return; }
        const x = xAt(i), y = yAt(v);
        if (!penDown) { ctx.moveTo(x, y); penDown = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      s.data.forEach((v, i) => {
        if (v == null) return;
        ctx.beginPath();
        ctx.fillStyle = s.color;
        ctx.arc(xAt(i), yAt(v), 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    if (!tip) return;
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      let idx = Math.round((mx - padL) / (xStep || 1));
      idx = Math.max(0, Math.min(categories.length - 1, idx));
      const lines = series.slice().sort((a, b) => {
        const va = a.data[idx];
        const vb = b.data[idx];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return vb - va;
      }).map((s) => {
        const v = s.data[idx];
        return `<span style="color:${s.color}">●</span> ${s.name}: ${v == null ? "—" : v + valueSuffix}`;
      }).join("<br>");
      tip.innerHTML = `step ${categories[idx] || idx + 1}<br>${lines}`;
      tip.style.left = Math.min(cssWidth - 140, Math.max(8, xAt(idx))) + "px";
      tip.style.top = "8px";
      tip.style.opacity = 1;
    };
    canvas.onmouseleave = () => { tip.style.opacity = 0; };
  }

  function movingAverage(arr, window = 5) {
    return arr.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = arr.slice(start, i + 1).filter((v) => v != null);
      if (!slice.length) return null;
      return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 1000) / 1000;
    });
  }

  function fmt(v) {
    return v == null ? "—" : Number(v).toFixed(2) + "%";
  }

  function metricValue(group, key) {
    if (key === "geo3kAcc") return group.geo3k ? group.geo3k.sampleAccuracy : null;
    if (key === "geo3kPass") return group.geo3k ? group.geo3k.passAtN : null;
    return (group.text || {})[key] ?? null;
  }

  function fullSeries(metric) {
    const evalData = window.MM_EVAL;
    if (!evalData?.full) return [];
    return (evalData.fullOrder || []).map((key) => {
      const g = evalData.full[key];
      return {
        name: g.shortLabel || g.label,
        color: g.color,
        data: g[metric] || [],
      };
    }).filter((s) => s.data.some((v) => v != null));
  }

  function renderEval() {
    const evalData = window.MM_EVAL;
    if (!evalData) return;
    const groups = evalData.groups || [];
    const ready = groups.filter((g) => g.geo3k || Object.values(g.text || {}).some((v) => v != null));

    const caption = document.getElementById("mm-eval-caption");
    if (caption) {
      caption.innerHTML =
        `生成于 <span class="mono">${evalData.generatedAt}</span> · ` +
        `<span class="mono">${evalData.generatedBy}</span>。${evalData.note}`;
    }

    const stats = document.getElementById("mm-eval-stats");
    if (stats) {
      stats.innerHTML = ready.map((g) => {
        const geo = g.geo3k ? fmt(g.geo3k.sampleAccuracy) : "—";
        const math = fmt((g.text || {}).math500);
        return `
          <div class="stat">
            <div class="stat-val" style="color:${g.color}">${g.shortLabel}</div>
            <div class="stat-label">Geo3K ${geo} · MATH-500 ${math}</div>
          </div>`;
      }).join("");
    }

    const tbody = document.getElementById("mm-eval-table-body");
    if (tbody) {
      tbody.innerHTML = groups.map((g) => {
        const geo = g.geo3k || {};
        const cfgBadge = g.config === "formal"
          ? '<span class="badge"><span class="sdot" style="background:var(--e3)"></span>formal</span>'
          : g.config === "light"
            ? '<span class="badge"><span class="sdot" style="background:var(--e2)"></span>light</span>'
            : '<span class="badge"><span class="sdot" style="background:#9ca3af"></span>pending</span>';
        return `
          <tr>
            <td><strong style="color:${g.color}">${g.label}</strong></td>
            <td>${cfgBadge}</td>
            <td>${g.step == null ? "—" : g.step}</td>
            <td>${fmt(geo.sampleAccuracy)}</td>
            <td>${fmt(geo.passAtN)}</td>
            <td>${fmt((g.text || {}).math500)}</td>
            <td>${fmt((g.text || {}).mmlu)}</td>
            <td>${fmt((g.text || {}).aime24)}</td>
            <td>${fmt((g.text || {}).aime25)}</td>
          </tr>`;
      }).join("");
    }

    const notes = document.getElementById("mm-eval-notes");
    if (notes) {
      notes.innerHTML = groups
        .filter((g) => g.configNote)
        .map((g) => `<li><strong style="color:${g.color}">${g.shortLabel}</strong>：${g.configNote}</li>`)
        .join("");
    }

    const cats = groups.map((g) => g.shortLabel);
    const colors = groups.map((g) => g.color);
    const bindMmBar = (id, metric) => {
      bindBarLegend(id.replace("chart-", "legend-"), cats, groups.map((g) => metricValue(g, metric)), colors, (data) => {
        drawBarChart(id, id.replace("chart-", "tip-"), {
          categories: cats, data, colors, valueSuffix: "%",
        });
      });
    };
    bindMmBar("chart-mm-geo3k", "geo3kAcc");
    bindMmBar("chart-mm-math500", "math500");
    bindMmBar("chart-mm-mmlu", "mmlu");
    bindMmBar("chart-mm-aime", "aime25");

    // Mid-step offline curves: only draw when a series has ≥2 points; otherwise show checkpoint cards.
    const fullSteps = evalData.fullSteps || [];
    const geoSeries = fullSeries("geo3kAcc");
    const maxPts = Math.max(0, ...geoSeries.map((s) => s.data.filter((v) => v != null).length));
    const canDrawCurves = maxPts >= 2;

    const sparseEl = document.getElementById("mm-eval-mid-sparse");
    const curvesEl = document.getElementById("mm-eval-mid-curves");
    const midCaption = document.getElementById("mm-eval-mid-caption");
    if (midCaption) {
      midCaption.innerHTML = canDrawCurves
        ? "与 4B「E1 GRPO」离线曲线同一套 step 轴（10–150 /10）；缺测为断点。"
        : "当前每组只有 <strong>1 个</strong>离线点，画不出曲线。上方柱状图 / 对照表是主视图；下面列出已完成 checkpoint。";
    }
    if (sparseEl) {
      if (!canDrawCurves && ready.length) {
        sparseEl.style.display = "block";
        sparseEl.innerHTML = ready.map((g) => {
          const t = g.text || {};
          const geo = g.geo3k || {};
          return `
            <div style="margin-bottom:14px">
              <div style="font-weight:700; color:${g.color}; margin-bottom:4px">${g.label}</div>
              <div style="font-size:13px; line-height:1.7; color:var(--text)">
                Geo3K <strong>${fmt(geo.sampleAccuracy)}</strong>
                · pass@n <strong>${fmt(geo.passAtN)}</strong>
                · MATH-500 <strong>${fmt(t.math500)}</strong>
                · MMLU <strong>${fmt(t.mmlu)}</strong>
                · AIME24 <strong>${fmt(t.aime24)}</strong>
                · AIME25 <strong>${fmt(t.aime25)}</strong>
              </div>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:2px">${g.configNote || ""}</div>
            </div>`;
        }).join("") +
          `<div style="font-size:12.5px; color:var(--text-secondary); border-top:1px dashed var(--border); padding-top:12px; margin-top:4px">
            同组再补 ≥1 个 mid ckpt（如 M1@100 / M1@150）后，这里会自动切换成 4B 风格全 step 曲线。
          </div>`;
      } else {
        sparseEl.style.display = "none";
        sparseEl.innerHTML = "";
      }
    }
    if (curvesEl) curvesEl.style.display = canDrawCurves ? "block" : "none";

    if (canDrawCurves && fullSteps.length) {
      const bindFull = (id, series, height = 240) => {
        bindSeriesLegend(id.replace("chart-", "legend-"), series, (visible) => {
          drawLineChart(id, id.replace("chart-", "tip-"), {
            categories: fullSteps, series: visible,
            valueSuffix: "%", height, yMin: 0, yMax: 100,
          });
        });
      };
      bindFull("chart-mm-full-geo3k", geoSeries, 240);
      bindFull("chart-mm-full-math500", fullSeries("math500"), 240);
      bindFull("chart-mm-full-mmlu", fullSeries("mmlu"), 220);
      bindFull("chart-mm-full-aime25", fullSeries("aime25"), 220);
    }

    const midBody = document.getElementById("mm-eval-mid-body");
    if (midBody) {
      const rows = ready
        .slice()
        .sort((a, b) => (a.step ?? 1e9) - (b.step ?? 1e9));
      midBody.innerHTML = rows.length
        ? rows.map((g) => {
            const t = g.text || {};
            const geo = g.geo3k || {};
            const cfg = g.config || "—";
            return `
              <tr>
                <td><strong style="color:${g.color}">${g.shortLabel}</strong></td>
                <td class="mono">${g.step == null ? "—" : g.step}</td>
                <td>${cfg}</td>
                <td>${fmt(geo.sampleAccuracy)}</td>
                <td>${fmt(t.math500)}</td>
                <td>${fmt(t.mmlu)}</td>
                <td>${fmt(t.aime24)}</td>
                <td>${fmt(t.aime25)}</td>
              </tr>`;
          }).join("")
        : `<tr><td colspan="8" style="color:#9ca3af">尚无离线评测结果</td></tr>`;
    }
  }

  function stepCats(n) {
    return Array.from({ length: n }, (_, i) => {
      const s = i + 1;
      return s === 1 || s % 10 === 0 ? String(s) : "";
    });
  }

  function padTo(arr, n) {
    const out = (arr || []).slice(0, n);
    while (out.length < n) out.push(null);
    return out;
  }

  function rolloutBySource(summary, source) {
    const byStep = new Map();
    for (const r of summary?.rows || []) {
      if (source && r.source && r.source !== source) continue;
      byStep.set(r.step, r);
    }
    if (!byStep.size) return null;
    const maxStep = Math.max(...byStep.keys());
    const acc = [];
    const score = [];
    const chars = [];
    for (let s = 1; s <= maxStep; s++) {
      const r = byStep.get(s);
      acc.push(r ? Math.round(r.accuracy * 10000) / 100 : null);
      score.push(r ? Math.round(r.meanScore * 10000) / 10000 : null);
      chars.push(r ? Math.round(r.meanOutputChars) : null);
    }
    return { n: maxStep, acc, score, chars };
  }

  function trainRuns() {
    return [
      window.MM_M1_TRAIN && { key: "m1", t: window.MM_M1_TRAIN, dash: null },
      window.MM_M2_TRAIN && { key: "m2", t: window.MM_M2_TRAIN, dash: [6, 4] },
      window.MM_M3_TRAIN && { key: "m3", t: window.MM_M3_TRAIN, dash: [2, 3] },
    ].filter(Boolean);
  }

  function renderRollouts() {
    const m1 = rolloutBySource(window.MM_M1_ROLLOUT_SUMMARY, "geo3k")
      || rolloutBySource(window.MM_M1_ROLLOUT_SUMMARY, null);
    const m2geo = rolloutBySource(window.MM_M2_ROLLOUT_SUMMARY, "geo3k");
    const m2text = rolloutBySource(window.MM_M2_ROLLOUT_SUMMARY, "text");
    const m3all = rolloutBySource(window.MM_M3_ROLLOUT_SUMMARY, "all")
      || rolloutBySource(window.MM_M3_ROLLOUT_SUMMARY, null);
    if (!m1 && !m2geo && !m3all) return;

    const n = Math.max(m1?.n || 0, m2geo?.n || 0, m2text?.n || 0, m3all?.n || 0, 150);
    const cats = stepCats(n);
    const seriesAcc = [];
    const seriesScore = [];
    const seriesChars = [];

    if (m1) {
      seriesAcc.push({ name: "M1 Geo3K acc", data: padTo(m1.acc, n), color: COLORS.m1 });
      seriesScore.push({ name: "M1 mean score", data: padTo(m1.score, n), color: COLORS.m1 });
      seriesChars.push({ name: "M1 chars", data: padTo(m1.chars, n), color: COLORS.m1 });
    }
    if (m2geo) {
      seriesAcc.push({ name: "M2 Geo3K acc", data: padTo(m2geo.acc, n), color: COLORS.m2, dash: [6, 4] });
      seriesScore.push({ name: "M2 Geo3K score", data: padTo(m2geo.score, n), color: COLORS.m2, dash: [6, 4] });
      seriesChars.push({ name: "M2 Geo3K chars", data: padTo(m2geo.chars, n), color: COLORS.m2, dash: [6, 4] });
    }
    if (m2text) {
      seriesScore.push({ name: "M2 text score", data: padTo(m2text.score, n), color: "#c026d3", dash: [2, 3] });
    }
    if (m3all) {
      seriesAcc.push({ name: "M3 mixed acc", data: padTo(m3all.acc, n), color: COLORS.m3, dash: [2, 3] });
      seriesScore.push({ name: "M3 mixed score", data: padTo(m3all.score, n), color: COLORS.m3, dash: [2, 3] });
      seriesChars.push({ name: "M3 chars", data: padTo(m3all.chars, n), color: COLORS.m3, dash: [2, 3] });
    }

    bindSeriesLegend("legend-mm-roll-acc", seriesAcc, (visible) => {
      drawLineChart("chart-mm-roll-acc", "tip-mm-roll-acc", {
        categories: cats, series: visible,
        valueSuffix: "%", height: 260, yMin: 0, yMax: 100,
      });
    });
    bindSeriesLegend("legend-mm-roll-score", seriesScore, (visible) => {
      drawLineChart("chart-mm-roll-score", "tip-mm-roll-score", {
        categories: cats, series: visible, height: 220,
      });
    });
    bindSeriesLegend("legend-mm-roll-chars", seriesChars, (visible) => {
      drawLineChart("chart-mm-roll-chars", "tip-mm-roll-chars", {
        categories: cats, series: visible, height: 220,
      });
    });
  }

  function renderTrain() {
    const runs = trainRuns();
    if (!runs.length) return;
    const n = Math.max(...runs.map((r) => r.t.nSteps || 0), 150);
    const cats = stepCats(n);

    const stats = document.getElementById("mm-train-stats");
    if (stats) {
      stats.innerHTML = runs.map(({ t }) => {
        const s = t.summary || {};
        const prog = t.progressDone != null ? `${t.progressDone}/${t.progressTotal}` : `${t.lastStep}/${t.nSteps}`;
        return `
          <div class="stat"><div class="stat-val" style="color:${t.color || COLORS.neutral}">${t.shortLabel || "?"}</div><div class="stat-label">${t.label || ""} · ${prog}</div></div>
          <div class="stat"><div class="stat-val">${t.elapsedStr || "—"}</div><div class="stat-label">${t.shortLabel} 墙钟（末段 progress）</div></div>
          <div class="stat"><div class="stat-val">${s.stepMinMean != null ? s.stepMinMean + " min" : "—"}</div><div class="stat-label">${t.shortLabel} mean step</div></div>
          <div class="stat"><div class="stat-val">${s.mfuMean != null ? s.mfuMean + "%" : "—"}</div><div class="stat-label">${t.shortLabel} mean MFU</div></div>`;
      }).join("");
    }

    const cap = document.getElementById("mm-train-caption");
    if (cap) {
      cap.innerHTML = runs.map(({ t }) => {
        const tm = t.timingMean || {};
        const prog = t.progressDone != null ? `${t.progressDone}/${t.progressTotal}` : `${t.lastStep}/${t.nSteps}`;
        return `<strong style="color:${t.color}">${t.shortLabel}</strong>：` +
          `${t.firstStep}–${t.lastStep}（${prog}）· ` +
          `gen ${tm.gen ?? "—"}s / update_actor ${tm.update_actor ?? "—"}s / ref ${tm.ref ?? "—"}s`;
      }).join("<br>") +
        `<br>实线 = M1，虚线 = M2，点虚线 = M3。生成 <span class="mono">${runs[0].t.generatedAt}</span> / <span class="mono">gen_mm_train_dashboard_data.py</span>。`;
    }

    const seriesOf = (picker) => runs.map(({ t, dash }) => ({
      name: t.shortLabel,
      data: padTo(picker(t) || [], n),
      color: t.color || COLORS.neutral,
      dash,
    }));

    const bindLine = (id, series, opts = {}) => {
      bindSeriesLegend(id.replace("chart-", "legend-"), series, (visible) => {
        drawLineChart(id, id.replace("chart-", "tip-"), {
          categories: cats, series: visible, ...opts,
        });
      });
    };

    // ---- time cost ----
    bindLine("chart-mm-stepmin", seriesOf((t) => t.stepMin), { valueSuffix: " min", height: 220 });
    bindLine("chart-mm-timing", runs.flatMap(({ t, dash, key }) => ([
      { name: `${t.shortLabel} gen`, data: padTo(t.timing?.gen || [], n), color: GEN_COLORS[key] || "#dc2626", dash },
      { name: `${t.shortLabel} update_actor`, data: padTo(t.timing?.update_actor || [], n), color: t.color, dash },
    ])), { valueSuffix: "s", height: 240 });
    {
      const meanCats = runs.flatMap(({ t }) => [`${t.shortLabel} gen`, `${t.shortLabel} actor`]);
      const meanData = runs.flatMap(({ t }) => [t.timingMean?.gen ?? null, t.timingMean?.update_actor ?? null]);
      const meanColors = runs.flatMap(({ t, key }) => [GEN_COLORS[key] || "#dc2626", t.color]);
      bindBarLegend("legend-mm-timing-mean", meanCats, meanData, meanColors, (data) => {
        drawBarChart("chart-mm-timing-mean", "tip-mm-timing-mean", {
          categories: meanCats, data, colors: meanColors,
          valueSuffix: "s", height: 220,
        });
      });
    }

    // ---- stability ----
    bindLine("chart-mm-grad", seriesOf((t) => t.grad), { height: 200 });
    bindLine("chart-mm-ent", seriesOf((t) => t.ent), { height: 200 });
    bindLine("chart-mm-ppokl", seriesOf((t) => t.ppokl), {
      height: 200,
      referenceLines: [{ value: 0, label: "0", color: COLORS.neutral }],
    });
    bindLine("chart-mm-clip", runs.flatMap(({ t, dash, key }) => ([
      { name: `${t.shortLabel} clipfrac`, data: padTo(t.clip || [], n), color: t.color, dash },
      { name: `${t.shortLabel} trunc@16K`, data: padTo(t.trunc || [], n), color: TRUNC_COLORS[key] || "#dc2626", dash: dash || [2, 3] },
    ])), { valueSuffix: "%", height: 200 });
    bindLine("chart-mm-corr", seriesOf((t) => t.pearsonDev), { height: 200 });

    // ---- efficiency ----
    bindLine("chart-mm-mfu", seriesOf((t) => t.mfu), { valueSuffix: "%", height: 200 });
    bindLine("chart-mm-thru", seriesOf((t) => t.throughput), { height: 200 });
    bindLine("chart-mm-len", seriesOf((t) => t.len), {
      height: 200,
      referenceLines: [{ value: 16384, label: "16K cap", color: "#dc2626" }],
    });
  }

  function renderTrainPanel() {
    renderRollouts();
    renderTrain();
  }

  function renderAll() {
    renderEval();
    renderTrainPanel();
  }

  window.renderMmEval = renderEval;
  window.renderMmRollouts = renderRollouts;
  window.renderMmTrain = renderTrain;
  window.renderMmTrainPanel = renderTrainPanel;
  window.renderMmCharts = renderAll;

  window.addEventListener("resize", () => {
    const evalActive = document.getElementById("panel-eval")?.classList.contains("active");
    const chartsActive = document.getElementById("panel-charts")?.classList.contains("active");
    if (evalActive) renderEval();
    if (chartsActive) renderTrainPanel();
  });
})();
