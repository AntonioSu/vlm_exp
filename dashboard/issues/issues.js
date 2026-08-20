(function () {
  const CAT_LABEL = {
    silent: "静默失败",
    env: "环境 / CUDA",
    signal: "训练信号",
    runtime: "运行时",
    eval: "评测链路",
    science: "实验设计",
  };
  const STATUS_LABEL = {
    live: "仍会踩",
    ops: "运维未解",
    partial: "部分兜底",
    science: "科学债",
    mitigated: "已兜底",
  };

  const issues = window.ISSUES || [];
  let cat = "all";
  let status = "all";

  function count(pred) {
    return issues.filter(pred).length;
  }

  function visible() {
    return issues.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (status !== "all" && i.status !== status) return false;
      return true;
    });
  }

  function chipRow(items, selected, attr) {
    return items
      .map((c) => {
        const extra =
          attr === "data-cat"
            ? c.id === "all"
              ? ` ${issues.length}`
              : ` ${count((i) => i.category === c.id)}`
            : "";
        const active = selected === c.id ? " active" : "";
        return `<button type="button" class="iss-chip${active}" ${attr}="${c.id}">${c.label}${extra}</button>`;
      })
      .join("");
  }

  function render() {
    const n = (s) => count((i) => i.status === s);
    const total = issues.length;
    const rows = visible();

    document.getElementById("iss-stats").innerHTML = `
      <div class="iss-stat"><div class="n">${total}</div><div class="l">记录问题</div></div>
      <div class="iss-stat live"><div class="n">${n("live")}</div><div class="l">仍会踩</div></div>
      <div class="iss-stat ops"><div class="n">${n("ops")}</div><div class="l">运维未解</div></div>
      <div class="iss-stat science"><div class="n">${n("science")}</div><div class="l">科学债</div></div>
      <div class="iss-stat mitigated"><div class="n">${n("mitigated")}</div><div class="l">脚本已兜底</div></div>
    `;

    const segs = [
      ["live", n("live")],
      ["ops", n("ops")],
      ["partial", n("partial")],
      ["science", n("science")],
      ["mitigated", n("mitigated")],
    ];
    document.getElementById("iss-bar").innerHTML = segs
      .map(([k, v]) => `<span class="${k}" style="width:${(v / total) * 100}%"></span>`)
      .join("");
    document.getElementById("iss-bar-legend").innerHTML = segs
      .map(([k, v]) => `<span><i class="${k}"></i>${STATUS_LABEL[k]} ${v}</span>`)
      .join("");

    document.getElementById("iss-cat-chips").innerHTML = chipRow(window.ISSUE_CATS, cat, "data-cat");
    document.getElementById("iss-status-chips").innerHTML = chipRow(window.ISSUE_STATUSES, status, "data-status");
    document.getElementById("iss-count").textContent = `问题表 · ${rows.length} 条`;

    document.getElementById("iss-table-body").innerHTML = rows
      .map(
        (i) => `<tr>
          <td class="id">${i.id}</td>
          <td class="title-cell">${i.title}</td>
          <td>${CAT_LABEL[i.category]}</td>
          <td><span class="iss-dot ${i.status}"></span>${STATUS_LABEL[i.status]}</td>
          <td>${i.impact}</td>
        </tr>`
      )
      .join("");

    const openLive = new Set(["live", "ops"]);
    document.getElementById("iss-list").innerHTML = rows
      .map(
        (i) => `<details class="iss-item"${openLive.has(i.status) ? " open" : ""}>
          <summary>
            <span class="iss-id">${i.id}</span>
            <span class="iss-main">
              <div class="iss-title">${i.title}</div>
              <div class="iss-meta">${CAT_LABEL[i.category]} · 影响：${i.impact}</div>
            </span>
            <span class="iss-status"><span class="iss-dot ${i.status}"></span>${STATUS_LABEL[i.status]}</span>
          </summary>
          <div class="iss-body">
            <p><strong>症状</strong> ${i.symptom}</p>
            <p><strong>根因</strong> ${i.cause}</p>
            <p><strong>处理</strong> ${i.action}</p>
          </div>
        </details>`
      )
      .join("");

    bind();
  }

  function bind() {
    document.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.onclick = () => {
        cat = btn.getAttribute("data-cat");
        render();
      };
    });
    document.querySelectorAll("[data-status]").forEach((btn) => {
      btn.onclick = () => {
        status = btn.getAttribute("data-status");
        render();
      };
    });
  }

  document.getElementById("iss-updated").textContent = window.ISSUE_META.updated;
  render();
})();
