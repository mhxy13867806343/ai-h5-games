// indienova GameDB - 游戏列表渲染 + 翻页 + 搜索
(function () {
  const PER_PAGE = 40;
  const grid = document.getElementById("gameGrid");
  const pag = document.getElementById("pagination");
  const search = document.getElementById("quickSearch");

  if (!grid || typeof GAMES === "undefined") return;

  function ratingClass(r) {
    if (r == null) return "";
    if (r >= 75) return "mc-good";
    if (r >= 60) return "mc-mid";
    return "mc-bad";
  }
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function getQuery() {
    const url = new URL(window.location.href);
    return {
      page: Math.max(1, parseInt(url.searchParams.get("p") || "1", 10)),
      q: (url.searchParams.get("q") || "").toLowerCase(),
    };
  }
  function setQuery(p, q) {
    const url = new URL(window.location.href);
    if (p && p > 1) url.searchParams.set("p", p); else url.searchParams.remove("p");
    if (q) url.searchParams.set("q", q); else url.searchParams.remove("q");
    window.history.replaceState({}, "", url);
  }

  function filtered() {
    const { q } = getQuery();
    if (!q) return GAMES;
    return GAMES.filter(g =>
      (g.name || "").toLowerCase().includes(q) ||
      (g.name_en || "").toLowerCase().includes(q) ||
      (g.slug || "").toLowerCase().includes(q)
    );
  }

  function render() {
    const { page } = getQuery();
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (page > totalPages) {
      setQuery(1, getQuery().q);
      return render();
    }
    const start = (page - 1) * PER_PAGE;
    const slice = list.slice(start, start + PER_PAGE);

    grid.innerHTML = slice.map(g => {
      const rcls = ratingClass(g.rating);
      const rtxt = g.rating != null ? g.rating : "";
      return `
        <a class="game-card" href="game.html?slug=${encodeURIComponent(g.slug)}">
          <div class="game-cover-wrap">
            <img src="covers/${encodeURIComponent(g.slug)}.jpg"
                 alt="${escapeHtml(g.name)}"
                 loading="lazy"
                 onerror="this.src='covers/_placeholder.png'">
            ${rtxt !== "" ? `<div class="rating ${rcls}">${rtxt}</div>` : ""}
          </div>
          <div class="game-meta">
            <div class="game-name">${escapeHtml(g.name)}</div>
            <div class="game-name-en">${escapeHtml(g.name_en || g.slug)}</div>
          </div>
        </a>
      `;
    }).join("");

    // pagination
    let pagHtml = "";
    if (page > 1) pagHtml += `<a href="#" data-p="${page - 1}">«</a>`;
    for (let p = 1; p <= totalPages; p++) {
      pagHtml += p === page
        ? `<span class="active">${p}</span>`
        : `<a href="#" data-p="${p}">${p}</a>`;
    }
    if (page < totalPages) pagHtml += `<a href="#" data-p="${page + 1}">»</a>`;
    pag.innerHTML = pagHtml;
    pag.querySelectorAll("a[data-p]").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        setQuery(parseInt(a.dataset.p, 10), getQuery().q);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  if (search) {
    search.addEventListener("input", () => {
      setQuery(1, search.value.trim().toLowerCase());
      render();
    });
    const { q } = getQuery();
    if (q) search.value = q;
  }

  // year
  const y = document.getElementById("curYear");
  if (y) y.textContent = new Date().getFullYear();

  render();
})();
