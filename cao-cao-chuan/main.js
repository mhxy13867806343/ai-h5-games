/* ============================================================
   三国志：曹操传 (Cao Cao Chuan) 页面启动初始化逻辑
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
    if (window.CaoCaoGame) {
        const game = new CaoCaoGame();
        game.init();

        const fsBtn = document.getElementById('btn-fullscreen');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                const container = document.getElementById('canvas-container');
                if (container.requestFullscreen) container.requestFullscreen();
                else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            });
        }

        const restartBtn = document.getElementById('btn-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => game.restart());
        }
    }
});
