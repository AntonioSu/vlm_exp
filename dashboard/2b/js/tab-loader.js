// Tab loader: fetches panel HTML fragments, injects into container, triggers render
(function () {
  const container = document.getElementById("panel-container");
  const subtabBtns = document.querySelectorAll(".subtab-btn");
  const cache = {};

  function initTocObserver() {
    document.querySelectorAll(".detail-toc").forEach((toc) => {
      const links = Array.from(toc.querySelectorAll("a[href^='#']"));
      if (!links.length) return;
      const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
      function setActive(id) {
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
      }
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      }, { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] });
      sections.forEach((s) => observer.observe(s));
      links.forEach((a) => {
        a.addEventListener("click", (ev) => {
          const id = a.getAttribute("href").slice(1);
          const el = document.getElementById(id);
          if (!el) return;
          ev.preventDefault();
          setActive(id);
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", "#" + id);
        });
      });
      if (sections[0]) setActive(sections[0].id);
    });
  }

  function renderForTab(tab) {
    if (tab === "compare") render();
    else if (tab === "eval") renderEvalPanel();
    else renderExpPanel(tab);
  }

  async function loadPanel(tab) {
    if (!cache[tab]) {
      const resp = await fetch("panels/" + tab + ".html?v=20260730035400");
      cache[tab] = await resp.text();
    }
    container.innerHTML = cache[tab];
    renderForTab(tab);
    initTocObserver();
  }

  subtabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.subtab;
      subtabBtns.forEach((b) => b.classList.toggle("active", b === btn));
      loadPanel(tab);
    });
  });

  // Handle resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const active = document.querySelector(".subtab-btn.active");
      if (active) renderForTab(active.dataset.subtab);
    }, 120);
  });

  // Initial load
  loadPanel("compare");
})();
