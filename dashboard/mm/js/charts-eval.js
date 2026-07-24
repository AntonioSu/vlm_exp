// Multimodal dashboard charts: bar compare + 4B-E1-style mid-step line curves.
(function () {
  const COLORS = {
    grid: "#eef0f2",
    axis: "#9ca3af",
    text: "#111827",
    neutral: "#6b7280",
    m0: "#2563eb",
    m1: "#d97706",
  };

  function drawBarChart(canvasId, tipId, { categories, data, colors, valueSuffix = "", height = 220 }) {
    const canvas = document.getElementById(canvasId);
    const tip = tipId ? document.getElementById(tipId) : null;
    if (!canvas) return;
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
      ctx.beginPath();
      let penDown = false;
      s.data.forEach((v, i) => {
        if (v == null) { penDown = false; return; }
        const x = xAt(i), y = yAt(v);
        if (!penDown) { ctx.moveTo(x, y); penDown = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
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
      const lines = series.map((s) => {
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
    drawBarChart("chart-mm-geo3k", "tip-mm-geo3k", {
      categories: cats,
      data: groups.map((g) => metricValue(g, "geo3kAcc")),
      colors,
      valueSuffix: "%",
    });
    drawBarChart("chart-mm-math500", "tip-mm-math500", {
      categories: cats,
      data: groups.map((g) => metricValue(g, "math500")),
      colors,
      valueSuffix: "%",
    });
    drawBarChart("chart-mm-mmlu", "tip-mm-mmlu", {
      categories: cats,
      data: groups.map((g) => metricValue(g, "mmlu")),
      colors,
      valueSuffix: "%",
    });
    drawBarChart("chart-mm-aime", "tip-mm-aime", {
      categories: cats,
      data: groups.map((g) => metricValue(g, "aime25")),
      colors,
      valueSuffix: "%",
    });

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
      const legend = document.getElementById("mm-eval-mid-legend");
      if (legend) {
        legend.innerHTML = geoSeries.map((s) =>
          `<span style="margin-right:14px"><span style="color:${s.color}">●</span> ${s.name}</span>`
        ).join("");
      }
      drawLineChart("chart-mm-full-geo3k", "tip-mm-full-geo3k", {
        categories: fullSteps,
        series: geoSeries,
        valueSuffix: "%",
        height: 240,
        yMin: 0,
        yMax: 100,
      });
      drawLineChart("chart-mm-full-math500", "tip-mm-full-math500", {
        categories: fullSteps,
        series: fullSeries("math500"),
        valueSuffix: "%",
        height: 240,
        yMin: 0,
        yMax: 100,
      });
      drawLineChart("chart-mm-full-mmlu", "tip-mm-full-mmlu", {
        categories: fullSteps,
        series: fullSeries("mmlu"),
        valueSuffix: "%",
        height: 220,
        yMin: 0,
        yMax: 100,
      });
      drawLineChart("chart-mm-full-aime25", "tip-mm-full-aime25", {
        categories: fullSteps,
        series: fullSeries("aime25"),
        valueSuffix: "%",
        height: 220,
        yMin: 0,
        yMax: 100,
      });
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

  function renderRollouts() {
    const summary = window.MM_M1_ROLLOUT_SUMMARY;
    if (!summary?.rows?.length) return;

    const rows = summary.rows;
    const cats = rows.map((r, i) => (r.step % 10 === 0 || i === 0 || i === rows.length - 1 ? String(r.step) : ""));
    const accPct = rows.map((r) => Math.round(r.accuracy * 10000) / 100);
    const meanScore = rows.map((r) => Math.round(r.meanScore * 10000) / 10000);
    const chars = rows.map((r) => Math.round(r.meanOutputChars));
    const accMA = movingAverage(accPct, 5);

    drawLineChart("chart-mm-roll-acc", "tip-mm-roll-acc", {
      categories: cats,
      series: [
        { name: "Geo3K train acc", data: accPct, color: COLORS.m1 },
        { name: "5-step MA", data: accMA, color: COLORS.m0 },
      ],
      valueSuffix: "%",
      height: 260,
      yMin: 0,
      yMax: 100,
    });
    drawLineChart("chart-mm-roll-score", "tip-mm-roll-score", {
      categories: cats,
      series: [{ name: "mean score", data: meanScore, color: COLORS.m1 }],
      height: 220,
      yMin: 0,
      yMax: 1,
    });
    drawLineChart("chart-mm-roll-chars", "tip-mm-roll-chars", {
      categories: cats,
      series: [{ name: "mean output chars", data: chars, color: COLORS.neutral }],
      height: 220,
    });
  }

  function renderTrain() {
    const t = window.MM_M1_TRAIN;
    if (!t) return;
    const cats = t.cats || [];
    const color = t.color || COLORS.m1;
    const s = t.summary || {};
    const tm = t.timingMean || {};

    const stats = document.getElementById("mm-train-stats");
    if (stats) {
      stats.innerHTML = `
        <div class="stat"><div class="stat-val">${t.elapsedStr || "—"}</div><div class="stat-label">已跑墙钟（progress bar）</div></div>
        <div class="stat"><div class="stat-val">${s.stepMinMean != null ? s.stepMinMean + " min" : "—"}</div><div class="stat-label">mean step time</div></div>
        <div class="stat"><div class="stat-val">${s.mfuMean != null ? s.mfuMean + "%" : "—"}</div><div class="stat-label">mean MFU</div></div>
        <div class="stat"><div class="stat-val">${s.throughputMean != null ? s.throughputMean : "—"}</div><div class="stat-label">mean throughput tok/s</div></div>
        <div class="stat"><div class="stat-val">${s.gradMean != null ? s.gradMean : "—"}</div><div class="stat-label">mean grad_norm</div></div>
        <div class="stat"><div class="stat-val">${s.entLast != null ? s.entLast : "—"}</div><div class="stat-label">entropy @ last</div></div>`;
    }

    const cap = document.getElementById("mm-train-caption");
    if (cap) {
      const prog = t.progressDone != null ? `${t.progressDone}/${t.progressTotal}` : `${t.lastStep}/${t.nSteps}`;
      cap.innerHTML =
        `来源 <span class="mono">${t.source}</span> · 日志步 ${t.firstStep}–${t.lastStep}（progress ${prog}）· ` +
        `生成 <span class="mono">${t.generatedAt}</span> / <span class="mono">${t.generatedBy}</span>。` +
        `阶段均值：gen ${tm.gen ?? "—"}s · update_actor ${tm.update_actor ?? "—"}s · ref ${tm.ref ?? "—"}s · old_log_prob ${tm.old_log_prob ?? "—"}s。`;
    }

    // ---- time cost ----
    drawLineChart("chart-mm-stepmin", "tip-mm-stepmin", {
      categories: cats,
      series: [{ name: "wall time / step", data: t.stepMin || [], color }],
      valueSuffix: " min",
      height: 220,
      referenceLines: s.stepMinMean != null
        ? [{ value: s.stepMinMean, label: `mean ${s.stepMinMean}`, color: COLORS.m0 }]
        : [],
    });
    if (t.timing) {
      drawLineChart("chart-mm-timing", "tip-mm-timing", {
        categories: cats,
        series: [
          { name: "gen", data: t.timing.gen || [], color: "#dc2626" },
          { name: "update_actor", data: t.timing.update_actor || [], color },
          { name: "ref", data: t.timing.ref || [], color: "#059669" },
          { name: "old_log_prob", data: t.timing.old_log_prob || [], color: COLORS.m0 },
        ],
        valueSuffix: "s",
        height: 240,
      });
      drawBarChart("chart-mm-timing-mean", "tip-mm-timing-mean", {
        categories: ["gen", "update_actor", "ref", "old_log_prob", "update_weights", "adv"],
        data: [
          tm.gen, tm.update_actor, tm.ref, tm.old_log_prob, tm.update_weights, tm.adv,
        ],
        colors: ["#dc2626", color, "#059669", COLORS.m0, "#9333ea", COLORS.neutral],
        valueSuffix: "s",
        height: 220,
      });
    }

    // ---- stability ----
    drawLineChart("chart-mm-grad", "tip-mm-grad", {
      categories: cats,
      series: [{ name: "grad_norm", data: t.grad || [], color }],
      height: 200,
    });
    drawLineChart("chart-mm-ent", "tip-mm-ent", {
      categories: cats,
      series: [{ name: "entropy", data: t.ent || [], color: COLORS.m0 }],
      height: 200,
    });
    drawLineChart("chart-mm-ppokl", "tip-mm-ppokl", {
      categories: cats,
      series: [{ name: "ppo_kl ×1e5", data: t.ppokl || [], color }],
      height: 200,
      referenceLines: [{ value: 0, label: "0", color: COLORS.neutral }],
    });
    drawLineChart("chart-mm-clip", "tip-mm-clip", {
      categories: cats,
      series: [
        { name: "pg_clipfrac", data: t.clip || [], color },
        { name: "trunc@16K", data: t.trunc || [], color: "#dc2626" },
      ],
      valueSuffix: "%",
      height: 200,
    });
    drawLineChart("chart-mm-corr", "tip-mm-corr", {
      categories: cats,
      series: [{ name: "(1−corr)×1e4", data: t.pearsonDev || [], color: "#059669" }],
      height: 200,
    });

    // ---- efficiency ----
    drawLineChart("chart-mm-mfu", "tip-mm-mfu", {
      categories: cats,
      series: [{ name: "MFU actor", data: t.mfu || [], color }],
      valueSuffix: "%",
      height: 200,
      referenceLines: s.mfuMean != null
        ? [{ value: s.mfuMean, label: `mean ${s.mfuMean}%`, color: COLORS.m0 }]
        : [],
    });
    drawLineChart("chart-mm-thru", "tip-mm-thru", {
      categories: cats,
      series: [{ name: "throughput", data: t.throughput || [], color: COLORS.neutral }],
      height: 200,
      referenceLines: s.throughputMean != null
        ? [{ value: s.throughputMean, label: `mean ${s.throughputMean}`, color: COLORS.m0 }]
        : [],
    });
    drawLineChart("chart-mm-len", "tip-mm-len", {
      categories: cats,
      series: [{ name: "response_length", data: t.len || [], color }],
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
