// indienova GameDB - 游戏详情页逻辑 + mGBA 在线试玩
(function () {
  if (typeof GAMES === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) { window.location.href = "index.html"; return; }

  const game = GAMES.find(g => g.slug === slug);
  if (!game) {
    document.querySelector(".detail-main").innerHTML =
      '<div class="detail-inner"><p style="text-align:center;padding:60px;color:#999;">未找到该游戏: ' +
      escapeHtml(slug) +
      ' · <a href="index.html" style="color:#ff5a2e;">返回列表</a></p></div>';
    return;
  }

  // 基础元数据填充
  document.title = game.name + " - indienova GameDB 游戏库";
  document.getElementById("bcName").textContent = game.name;
  document.getElementById("pageTitle").textContent = game.name + " - indienova GameDB 游戏库";

  document.getElementById("coverImg").src =
    "covers/" + encodeURIComponent(game.slug) + ".jpg";
  document.getElementById("coverImg").alt = game.name;
  document.getElementById("coverImg").onerror = function () {
    this.src = "covers/_placeholder.png";
  };

  document.getElementById("detailTitle").textContent = game.name;
  const enEl = document.getElementById("detailTitleEn");
  if (game.name_en) {
    enEl.textContent = game.name_en.split(" / ")[0];
    enEl.style.display = "block";
  } else {
    enEl.style.display = "none";
  }

  if (game.rating != null) {
    const metaR = document.getElementById("metaRating");
    metaR.hidden = false;
    metaR.querySelector(".value").textContent = game.rating + " / 100";
  }

  // === 试玩区 ===
  const playSection = document.getElementById("playSection");
  const playBtn = document.getElementById("playBtn");
  const closePlayBtn = document.getElementById("closePlayBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  playBtn.addEventListener("click", () => {
    playSection.hidden = false;
    playSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  closePlayBtn.addEventListener("click", () => {
    playSection.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen();
  });
  fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (playSection.requestFullscreen) {
      playSection.requestFullscreen();
    }
  });

  // === mGBA 模拟器加载 ===
  const romFile = document.getElementById("romFile");
  const placeholder = document.getElementById("playPlaceholder");
  const gameBox = document.getElementById("game");
  const resetBtn = document.getElementById("resetBtn");

  let currentROM = null;
  let emulator = null;

  romFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentROM = file;
    placeholder.innerHTML =
      '<span class="icon">⏳</span>' +
      '<div>正在加载 ROM: ' + escapeHtml(file.name) + ' ...</div>';
    placeholder.style.display = "block";
    gameBox.style.display = "none";

    try {
      await loadEmulator(file);
    } catch (err) {
      placeholder.innerHTML =
        '<span class="icon">❌</span>' +
        '<div>加载失败: ' + escapeHtml(err.message) + '</div>' +
        '<div class="hint">请确认 ROM 格式为 GBA 并重新加载。</div>';
    }
  });

  async function loadEmulator(file) {
    const buf = new Uint8Array(await file.arrayBuffer());

    if (typeof Mgba === "undefined") {
      await loadScript("https://cdn.jsdelivr.net/npm/mgba-wasm@0.2.0/mgba.js");
    }

    placeholder.style.display = "none";
    gameBox.style.display = "block";

    if (emulator) {
      try { emulator.exit && emulator.exit(); } catch (e) {}
    }

    emulator = new Mgba(gameBox);
    emulator.loadRom(buf, file.name);
    emulator.start();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("无法加载模拟器脚本: " + src));
      document.head.appendChild(s);
    });
  }

  resetBtn.addEventListener("click", () => {
    if (currentROM) loadEmulator(currentROM);
  });

  // === 收藏 / 分享（演示） ===
  document.getElementById("favoriteBtn").addEventListener("click", function () {
    this.textContent = this.textContent.includes("★") && !this.classList.contains("active")
      ? "★ 已收藏" : "★ 收藏游戏";
    this.classList.toggle("active");
  });

  document.getElementById("shareBtn").addEventListener("click", function () {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.textContent = "✓ 已复制链接";
        setTimeout(() => (this.textContent = "🔗 分享"), 2000);
      });
    } else {
      alert(window.location.href);
    }
  });

  // === 相关推荐：取同评分段的 6 款游戏 ===
  const relatedGrid = document.getElementById("relatedGrid");
  const others = GAMES.filter(g => g.slug !== game.slug);
  // 简单洗牌
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const related = others.slice(0, 6);
  relatedGrid.innerHTML = related.map(g => `
    <a class="related-card" href="game.html?slug=${encodeURIComponent(g.slug)}">
      <div class="rel-cover">
        <img src="covers/${encodeURIComponent(g.slug)}.jpg" alt="${escapeHtml(g.name)}"
             loading="lazy" onerror="this.src='covers/_placeholder.png'">
      </div>
      <div class="rel-name">${escapeHtml(g.name)}</div>
    </a>
  `).join("");

  // === 游戏介绍：基于现有字段合成 ===
  const descBody = document.getElementById("descBody");
  const descSection = document.getElementById("descSection");
  if (game) {
    const intro = [
      "<p><strong>《" + escapeHtml(game.name) + "》</strong> 是一款 Game Boy Advance 平台游戏。" +
      (game.name_en ? "英文名：<em>" + escapeHtml(game.name_en.split(" / ")[0]) + "</em>。" : "") +
      "</p>",
      "<p>本页提供该游戏的详细信息，以及 <strong>mGBA 浏览器模拟器</strong> 在线试玩功能。" +
      "点击页面顶部「▶ 在线试玩」展开试玩区，然后上传 GBA ROM 文件（.gba）即可在浏览器中直接体验游戏。" +
      "本地服务器已配置 SharedArrayBuffer 所需的 COOP/COEP 响应头，确保 mGBA-WASM 可正常运行。</p>",
      game.rating != null
        ? "<p>📊 <strong>媒体评分</strong>：" + game.rating + " / 100</p>"
        : "<p>📊 <strong>媒体评分</strong>：暂无</p>",
    ].join("");
    descBody.innerHTML = intro;
    descSection.hidden = false;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // year
  const y = document.getElementById("curYear");
  if (y) y.textContent = new Date().getFullYear();
})();
