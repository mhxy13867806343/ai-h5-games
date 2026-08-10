/* ============================================================
   NES 游戏大厅列表 - 搜索过滤交互逻辑
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            document.querySelectorAll(".game-card").forEach(card => {
                const titleAttr = card.dataset.title || card.getAttribute('data-title') || '';
                const t = titleAttr.toLowerCase();
                card.style.display = t.includes(q) ? "" : "none";
            });
        });
    }
});
