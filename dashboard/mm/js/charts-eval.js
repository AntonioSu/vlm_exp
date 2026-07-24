// Lightweight bar charts for multimodal offline eval (M0–M3).
(function () {
  const COLORS = {
    grid: "#eef0f2",
    axis: "#9ca3af",
    text: "#111827",
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
      ctx.fillStyle = colors[i] || "#6b7280";
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

  function fmt(v) {
    return v == null ? "—" : Number(v).toFixed(2) + "%";
  }

  function metricValue(group, key) {
    if (key === "geo3kAcc") return group.geo3k ? group.geo3k.sampleAccuracy : null;
    if (key === "geo3kPass") return group.geo3k ? group.geo3k.passAtN : null;
    return (group.text || {})[key] ?? null;
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
  }

  window.renderMmEval = renderEval;
  window.addEventListener("resize", () => {
    if (document.getElementById("panel-eval")?.classList.contains("active")) renderEval();
  });
})();
