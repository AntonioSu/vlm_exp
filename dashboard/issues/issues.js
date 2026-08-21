(function () {
  const chapters = window.ISSUE_CHAPTERS || [];
  const issues = window.ISSUES || [];
  const statusLabel = window.ISSUE_STATUS_LABEL || {};
  const byId = Object.fromEntries(issues.map((i) => [i.id, i]));
  const openByDefault = new Set(["live", "ops"]);

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderToc() {
    document.getElementById("iss-toc-list").innerHTML = chapters
      .map(
        (ch) => `<li>
          <a href="#sec-${ch.id}" data-watch="sec-${ch.id}" title="${esc(ch.when)}">
            <span class="toc-num">${ch.num}</span>
            <span>${esc(ch.title)}</span>
            <span class="toc-count">${ch.items.length}</span>
          </a>
        </li>`
      )
      .join("");
  }

  function renderChapters() {
    document.getElementById("iss-chapters").innerHTML = chapters
      .map((ch) => {
        const rows = ch.items
          .map((it) => {
            const iss = byId[it.id];
            if (!iss) return "";
            const open = openByDefault.has(iss.status) ? " open" : "";
            const st = statusLabel[iss.status] || iss.status;
            return `<details class="iss-item" id="${iss.id}"${open}>
              <summary>
                <span class="iss-id">${iss.id}</span>
                <span>
                  <span class="iss-title">${esc(iss.title)}</span>
                  <span class="iss-impact-inline">${esc(iss.impact)}</span>
                </span>
                <span class="iss-pill ${iss.status}">${esc(st)}</span>
              </summary>
              <div class="iss-body">
                <dl class="iss-dl">
                  <dt>症状</dt><dd>${esc(iss.symptom)}</dd>
                  <dt>根因</dt><dd>${esc(iss.cause)}</dd>
                  <dt>处理</dt><dd>${esc(iss.action)}</dd>
                </dl>
              </div>
            </details>`;
          })
          .join("");
        return `<section id="sec-${ch.id}">
          <p class="sec-kicker">${ch.num} / ${chapters.length}</p>
          <h2 class="sec-title">${esc(ch.title)}</h2>
          <p class="sec-sub">${esc(ch.when)}。${esc(ch.blurb)}</p>
          <div class="iss-list">${rows}</div>
        </section>`;
      })
      .join("");
  }

  function spy() {
    const links = [...document.querySelectorAll(".iss-toc a[data-watch]")];
    const targets = links
      .map((a) => document.getElementById(a.getAttribute("data-watch")))
      .filter(Boolean);
    if (!targets.length) return;

    const setActive = (id) => {
      links.forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("data-watch") === id);
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: 0.01 }
    );
    targets.forEach((el) => io.observe(el));

    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === "DETAILS") el.open = true;
        el.scrollIntoView({ block: "start" });
        setActive(id.startsWith("sec-") ? id : (el.closest("section") || {}).id);
      }
    }
  }

  document.getElementById("iss-updated").textContent = (window.ISSUE_META || {}).updated || "";
  renderToc();
  renderChapters();
  spy();
})();
