/* ============================================================
   合金弹头 2 (Metal Slug 2) 页面启动初始化逻辑
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
    if (window.MS2 && window.MS2.Game) {
        const game = new MS2.Game();
        game.init();

        const fsBtn = document.getElementById('btn-fullscreen');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                const c = document.getElementById('canvas-container');
                if (c.requestFullscreen) c.requestFullscreen();
                else if (c.webkitRequestFullscreen) c.webkitRequestFullscreen();
            });
        }

        const restartBtn = document.getElementById('btn-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => game.restart());
        }
    }
});
