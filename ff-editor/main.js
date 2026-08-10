/* ============================================================
   FF1-6 修改器 (FF Editor) 页面启动初始化逻辑
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
    if (window.FFEditor) {
        const editor = new FFEditor();
        editor.init();
    }
});
