/* ============================================================
   AI H5 游戏大厅 - 查看源码、一键复制、全量下载与社交分享器
   ============================================================ */

class CodeViewerDownloader {
    static initModal() {
        if (document.getElementById('cvd-modal')) return;

        const modalHtml = `
            <div id="cvd-modal" class="cvd-overlay" style="display:none;">
                <div class="cvd-box">
                    <div class="cvd-header">
                        <div class="cvd-title" id="cvd-title">📄 查看游戏源码</div>
                        <button class="cvd-close" onclick="CodeViewerDownloader.closeModal()">✕</button>
                    </div>
                    <div class="cvd-tabs" id="cvd-tabs">
                        <button class="cvd-tab active" data-file="html">HTML 文件</button>
                        <button class="cvd-tab" data-file="css">CSS 样式</button>
                        <button class="cvd-tab" data-file="js">JS 引擎</button>
                    </div>
                    <div class="cvd-code-container">
                        <textarea id="cvd-code-view" readonly spellcheck="false"></textarea>
                    </div>
                    <div class="cvd-footer">
                        <button class="cvd-btn primary" id="cvd-btn-copy">📋 一键复制当前代码</button>
                        <button class="cvd-btn success" id="cvd-btn-zip">💾 打包下载全量资源 (.zip)</button>
                        <a href="#" target="_blank" class="cvd-btn outline" id="cvd-btn-github">🔗 GitHub 查看</a>
                    </div>
                </div>
            </div>
        `;

        const styleHtml = `
            <style>
                .cvd-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
                }
                .cvd-box {
                    width: 90%; max-width: 920px; height: 80vh;
                    background: #111827; border: 1px solid #374151; border-radius: 12px;
                    display: flex; flex-direction: column; overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.8); color: #f3f4f6;
                }
                .cvd-header {
                    padding: 16px 20px; background: #1f2937; border-bottom: 1px solid #374151;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .cvd-title { font-size: 16px; font-weight: 700; color: #ffb703; }
                .cvd-close {
                    background: none; border: none; color: #9ca3af; font-size: 20px;
                    cursor: pointer; padding: 4px 8px; transition: color 0.2s;
                }
                .cvd-close:hover { color: #ef4444; }
                .cvd-tabs {
                    display: flex; background: #111827; border-bottom: 1px solid #374151; padding: 0 10px;
                }
                .cvd-tab {
                    padding: 10px 18px; background: transparent; border: none;
                    border-bottom: 2px solid transparent; color: #9ca3af; font-size: 13px;
                    font-weight: 700; cursor: pointer; transition: all 0.2s;
                }
                .cvd-tab.active { color: #38bdf8; border-bottom-color: #38bdf8; background: rgba(56,189,248,0.1); }
                .cvd-code-container { flex: 1; padding: 10px; background: #0b0f19; display: flex; }
                #cvd-code-view {
                    width: 100%; height: 100%; background: transparent; border: none;
                    color: #e5e7eb; font-family: "Courier New", monospace; font-size: 13px;
                    line-height: 1.5; resize: none; outline: none; white-space: pre;
                }
                .cvd-footer {
                    padding: 14px 20px; background: #1f2937; border-top: 1px solid #374151;
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                }
                .cvd-btn {
                    padding: 8px 18px; border: none; border-radius: 6px; font-size: 13px;
                    font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none;
                    display: inline-flex; align-items: center; gap: 6px;
                }
                .cvd-btn.primary { background: #3b82f6; color: #fff; }
                .cvd-btn.primary:hover { background: #2563eb; }
                .cvd-btn.success { background: #10b981; color: #fff; }
                .cvd-btn.success:hover { background: #059669; }
                .cvd-btn.outline { background: rgba(255,255,255,0.08); border: 1px solid #4b5563; color: #d1d5db; }
                .cvd-btn.outline:hover { background: rgba(255,255,255,0.15); color: #fff; }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml + styleHtml);
    }

    static async open(gameConfig) {
        this.initModal();
        this.currentConfig = gameConfig;

        document.getElementById('cvd-title').textContent = `📄 源码查看器 · 《${gameConfig.name}》`;
        document.getElementById('cvd-modal').style.display = 'flex';

        const githubUrl = `https://github.com/mhxy13867806343/ai-h5-games/tree/main/${gameConfig.folder || ''}`;
        document.getElementById('cvd-btn-github').href = githubUrl;

        this.sources = { html: '', css: '', js: '' };

        try {
            if (gameConfig.htmlUrl) {
                const res = await fetch(gameConfig.htmlUrl);
                this.sources.html = await res.text();
            }
            if (gameConfig.cssUrl) {
                const res = await fetch(gameConfig.cssUrl);
                this.sources.css = await res.text();
            }
            if (gameConfig.jsUrl) {
                const res = await fetch(gameConfig.jsUrl);
                this.sources.js = await res.text();
            }
        } catch (e) {
            console.error('Fetch code error:', e);
        }

        const tabs = document.querySelectorAll('.cvd-tab');
        tabs.forEach(t => {
            t.onclick = () => {
                tabs.forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                const fileType = t.dataset.file;
                document.getElementById('cvd-code-view').value = this.sources[fileType] || '// 无单独代码文件';
            };
        });

        tabs[0].click();

        document.getElementById('cvd-btn-copy').onclick = () => {
            const code = document.getElementById('cvd-code-view').value;
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.getElementById('cvd-btn-copy');
                btn.textContent = '✅ 已成功复制到剪贴板！';
                setTimeout(() => btn.textContent = '📋 一键复制当前代码', 2000);
            });
        };

        document.getElementById('cvd-btn-zip').onclick = () => {
            this.downloadZip(gameConfig);
        };
    }

    static closeModal() {
        const modal = document.getElementById('cvd-modal');
        if (modal) modal.style.display = 'none';
    }

    static async downloadZip(gameConfig) {
        if (!window.JSZip) {
            alert('正在加载 Zip 打包组件，请稍后重新尝试...');
            return;
        }

        const zip = new JSZip();
        const folderName = gameConfig.id || 'game';
        const folder = zip.folder(folderName);

        try {
            if (gameConfig.htmlUrl) {
                const rHtml = await fetch(gameConfig.htmlUrl);
                folder.file(`${gameConfig.id}.html`, await rHtml.text());
            }
            if (gameConfig.cssUrl) {
                const rCss = await fetch(gameConfig.cssUrl);
                folder.file(`style.css`, await rCss.text());
            }
            if (gameConfig.jsUrl) {
                const rJs = await fetch(gameConfig.jsUrl);
                folder.file(`game.js`, await rJs.text());
            }
            folder.file('README.txt', `《${gameConfig.name}》纯前端 HTML5 源码包\n直接在浏览器中打开 ${gameConfig.id}.html 即可直接游玩！`);

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${gameConfig.id}_source_bundle.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('打包下载时遇到错误，将直接下载主 HTML 文件。');
            if (gameConfig.htmlUrl) {
                const a = document.createElement('a');
                a.href = gameConfig.htmlUrl;
                a.download = `${gameConfig.id}.html`;
                a.click();
            }
        }
    }
}


/* ============================================================
   一键社交分享器 (ShareHelper)
   ============================================================ */
class ShareHelper {
    static initModal() {
        if (document.getElementById('share-modal')) return;

        const modalHtml = `
            <div id="share-modal" class="cvd-overlay" style="display:none;">
                <div class="share-box">
                    <div class="cvd-header">
                        <div class="cvd-title" id="share-modal-title">🔗 一键分享游戏</div>
                        <button class="cvd-close" onclick="ShareHelper.closeModal()">✕</button>
                    </div>
                    <div class="share-body">
                        <div class="share-card-info">
                            <div class="share-game-title" id="share-game-name">🎮 游戏名称</div>
                            <div class="share-sub-text">快来重温经典网页复刻游戏，浏览器即开即玩！</div>
                        </div>

                        <div class="share-field">
                            <label>分享链接 (Share Link)：</label>
                            <div class="share-input-group">
                                <input type="text" id="share-link-input" readonly />
                                <button class="share-btn-copy" id="share-btn-copy-link">📋 复制链接</button>
                            </div>
                        </div>

                        <div class="share-qr-section">
                            <div class="qr-title">📱 手机扫码即刻游玩：</div>
                            <img id="share-qr-img" src="" alt="QR Code" />
                        </div>
                    </div>
                    <div class="cvd-footer" style="justify-content: flex-end;">
                        <button class="cvd-btn primary" id="share-btn-native" style="display:none;">🚀 调用手机原生分享</button>
                        <button class="cvd-btn outline" onclick="ShareHelper.closeModal()">关闭窗口</button>
                    </div>
                </div>
            </div>
        `;

        const styleHtml = `
            <style>
                .share-box {
                    width: 90%; max-width: 480px;
                    background: #111827; border: 1px solid #374151; border-radius: 12px;
                    display: flex; flex-direction: column; overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.9); color: #f3f4f6;
                }
                .share-body { padding: 20px; display: flex; flex-direction: column; gap: 18px; }
                .share-card-info { background: rgba(255, 183, 3, 0.1); border: 1px solid rgba(255, 183, 3, 0.25); padding: 14px; border-radius: 8px; text-align: center; }
                .share-game-title { font-size: 18px; font-weight: 800; color: #ffb703; margin-bottom: 4px; }
                .share-sub-text { font-size: 12px; color: #9ca3af; }
                .share-field { display: flex; flex-direction: column; gap: 6px; }
                .share-field label { font-size: 12px; font-weight: bold; color: #d1d5db; }
                .share-input-group { display: flex; gap: 8px; }
                #share-link-input {
                    flex: 1; padding: 8px 12px; background: #0b0f19; border: 1px solid #374151;
                    border-radius: 6px; color: #38bdf8; font-size: 13px; font-family: monospace; outline: none;
                }
                .share-btn-copy {
                    padding: 8px 14px; background: #ffb703; border: none; border-radius: 6px;
                    color: #000; font-weight: bold; font-size: 13px; cursor: pointer; transition: background 0.2s;
                }
                .share-btn-copy:hover { background: #fb8500; color: #fff; }
                .share-qr-section { display: flex; flex-direction: column; align-items: center; gap: 8px; background: #1f2937; padding: 14px; border-radius: 8px; border: 1px solid #374151; }
                .qr-title { font-size: 12px; color: #9ca3af; font-weight: bold; }
                #share-qr-img { width: 140px; height: 140px; background: #fff; padding: 6px; border-radius: 6px; }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml + styleHtml);
    }

    static open(gameConfig) {
        this.initModal();

        const fullUrl = gameConfig.url ? new URL(gameConfig.url, window.location.href).href : window.location.href;
        const shareTitle = `🎮 邀请你重温经典游戏《${gameConfig.name || 'AI H5 游戏大厅'}》！`;

        document.getElementById('share-game-name').textContent = gameConfig.name ? `🎮 《${gameConfig.name}》` : '🎮 AI H5 游戏大厅';
        document.getElementById('share-link-input').value = fullUrl;

        // Generate QR code using QR server API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(fullUrl)}`;
        document.getElementById('share-qr-img').src = qrUrl;

        document.getElementById('share-modal').style.display = 'flex';

        // Copy button
        document.getElementById('share-btn-copy-link').onclick = () => {
            const shareMsg = `${shareTitle}\n1:1 在线纯前端 HTML5 复刻，浏览器即开即玩：\n${fullUrl}`;
            navigator.clipboard.writeText(shareMsg).then(() => {
                const btn = document.getElementById('share-btn-copy-link');
                btn.textContent = '✅ 已复制分享链接！';
                setTimeout(() => btn.textContent = '📋 复制链接', 2000);
            });
        };

        // Native share if supported
        const nativeBtn = document.getElementById('share-btn-native');
        if (navigator.share) {
            nativeBtn.style.display = 'inline-flex';
            nativeBtn.onclick = () => {
                navigator.share({ title: gameConfig.name || 'AI H5 游戏大厅', text: shareTitle, url: fullUrl });
            };
        } else {
            nativeBtn.style.display = 'none';
        }
    }

    static closeModal() {
        const modal = document.getElementById('share-modal');
        if (modal) modal.style.display = 'none';
    }
}

window.CodeViewerDownloader = CodeViewerDownloader;
window.ShareHelper = ShareHelper;
