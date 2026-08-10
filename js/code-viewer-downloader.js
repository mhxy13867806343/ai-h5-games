/* ============================================================
   AI H5 游戏大厅 - 查看源码、一键复制、全量下载与 CSS+jQuery 分享器
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
        this.currentConfig = gameConfig || {};

        const name = this.currentConfig.name || 'H5 游戏';
        document.getElementById('cvd-title').textContent = `📄 源码查看器 · 《${name}》`;
        document.getElementById('cvd-modal').style.display = 'flex';

        const githubUrl = `https://github.com/mhxy13867806343/ai-h5-games/tree/main/${this.currentConfig.folder || ''}`;
        document.getElementById('cvd-btn-github').href = githubUrl;

        this.sources = { html: '', css: '', js: '' };

        try {
            if (this.currentConfig.htmlUrl) {
                const res = await fetch(this.currentConfig.htmlUrl);
                this.sources.html = await res.text();
            }
            if (this.currentConfig.cssUrl) {
                const res = await fetch(this.currentConfig.cssUrl);
                this.sources.css = await res.text();
            }
            if (this.currentConfig.jsUrl) {
                const res = await fetch(this.currentConfig.jsUrl);
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
            ShareHelper.copyText(code).then(() => {
                const btn = document.getElementById('cvd-btn-copy');
                btn.textContent = '✅ 已成功复制到剪贴板！';
                setTimeout(() => btn.textContent = '📋 一键复制当前代码', 2000);
            });
        };

        document.getElementById('cvd-btn-zip').onclick = () => {
            this.downloadZip(this.currentConfig);
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

        const config = gameConfig || {};
        const zip = new JSZip();
        const folderName = config.id || 'game';
        const folder = zip.folder(folderName);

        try {
            if (config.htmlUrl) {
                const rHtml = await fetch(config.htmlUrl);
                folder.file(`${folderName}.html`, await rHtml.text());
            }
            if (config.cssUrl) {
                const rCss = await fetch(config.cssUrl);
                folder.file(`style.css`, await rCss.text());
            }
            if (config.jsUrl) {
                const rJs = await fetch(config.jsUrl);
                folder.file(`game.js`, await rJs.text());
            }
            folder.file('README.txt', `《${config.name || folderName}》纯前端 HTML5 源码包\n直接在浏览器中打开 ${folderName}.html 即可直接游玩！`);

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderName}_source_bundle.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('打包下载时遇到错误，将直接下载主 HTML 文件。');
            if (config.htmlUrl) {
                const a = document.createElement('a');
                a.href = config.htmlUrl;
                a.download = `${config.id || 'game'}.html`;
                a.click();
            }
        }
    }
}


/* ============================================================
   CSS + jQuery 浏览器绝对居中分享弹窗系统 (ShareHelper v3)
   ============================================================ */
class ShareHelper {
    static initModal() {
        // Remove any outdated modal elements from DOM
        const oldShareBox = document.getElementById('share-modal');
        if (oldShareBox) oldShareBox.remove();
        const oldOverlay = document.getElementById('share-modal-overlay');
        if (oldOverlay) oldOverlay.remove();

        const modalHtml = `
            <div id="share-modal-overlay">
                <div id="share-modal-dialog">
                    <!-- Header -->
                    <div class="s-modal-header">
                        <div class="s-modal-title">
                            <span>🔗</span> 一键分享游戏
                        </div>
                        <button class="s-modal-close-btn" id="s-btn-close-x">✕</button>
                    </div>

                    <!-- Body -->
                    <div class="s-modal-body">
                        <!-- Toast Alert -->
                        <div class="s-toast-bar" id="s-toast-bar">
                            ✅ 已成功复制分享链接与邀请文案到剪贴板！
                        </div>

                        <!-- Card Info -->
                        <div class="s-game-card">
                            <div class="s-game-name" id="s-game-name">🎮 游戏名称</div>
                            <div class="s-game-desc">纯前端 HTML5 复刻，免安装浏览器即开即玩！</div>
                        </div>

                        <!-- Link Input Box -->
                        <div>
                            <label class="s-input-label">分享链接 (Share Link)：</label>
                            <div class="s-input-group">
                                <input type="text" id="s-link-input" class="s-link-input" readonly onclick="this.select()" />
                                <button class="s-btn-copy" id="s-btn-copy">📋 复制链接</button>
                            </div>
                        </div>

                        <!-- QR Code -->
                        <div class="s-qr-box">
                            <div class="s-qr-title">📱 手机微信 / 相机扫码即刻游玩：</div>
                            <img id="s-qr-img" class="s-qr-img" src="" alt="QR Code" />
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="s-modal-footer">
                        <button class="s-footer-btn native" id="s-btn-native" style="display:none;">🚀 调用系统分享</button>
                        <button class="s-footer-btn close" id="s-btn-close-footer">关闭窗口</button>
                    </div>
                </div>
            </div>
        `;

        const styleHtml = `
            <style id="share-modal-styles">
                #share-modal-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(10, 15, 29, 0.85) !important;
                    backdrop-filter: blur(12px) !important;
                    -webkit-backdrop-filter: blur(12px) !important;
                    display: none;
                    z-index: 99999999 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                #share-modal-dialog {
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 90% !important;
                    max-width: 460px !important;
                    background: #111827 !important;
                    border: 1px solid #374151 !important;
                    border-radius: 16px !important;
                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 50px rgba(56, 189, 248, 0.2) !important;
                    overflow: hidden !important;
                    display: flex !important;
                    flex-direction: column !important;
                    color: #f3f4f6 !important;
                    box-sizing: border-box !important;
                    z-index: 100000000 !important;
                    animation: jqueryModalZoom 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                @keyframes jqueryModalZoom {
                    from { transform: translate(-50%, -50%) scale(0.85); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }

                .s-modal-header {
                    padding: 16px 20px !important;
                    background: #1f2937 !important;
                    border-bottom: 1px solid #374151 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                }

                .s-modal-title {
                    font-size: 16px !important;
                    font-weight: 800 !important;
                    color: #38bdf8 !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }

                .s-modal-close-btn {
                    background: rgba(255, 255, 255, 0.1) !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    color: #9ca3af !important;
                    font-size: 16px !important;
                    width: 32px !important;
                    height: 32px !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    transition: all 0.2s !important;
                    outline: none !important;
                }

                .s-modal-close-btn:hover {
                    background: #ef4444 !important;
                    border-color: #ef4444 !important;
                    color: #fff !important;
                    transform: rotate(90deg) !important;
                }

                .s-modal-body {
                    padding: 20px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 16px !important;
                }

                .s-toast-bar {
                    background: linear-gradient(90deg, #10b981, #059669) !important;
                    color: #fff !important;
                    text-align: center !important;
                    padding: 10px 14px !important;
                    border-radius: 8px !important;
                    font-size: 13px !important;
                    font-weight: bold !important;
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
                    display: none;
                }

                .s-game-card {
                    background: rgba(255, 183, 3, 0.08) !important;
                    border: 1px solid rgba(255, 183, 3, 0.3) !important;
                    padding: 14px !important;
                    border-radius: 10px !important;
                    text-align: center !important;
                }

                .s-game-name {
                    font-size: 18px !important;
                    font-weight: 900 !important;
                    color: #ffb703 !important;
                    margin-bottom: 4px !important;
                }

                .s-game-desc {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                }

                .s-input-label {
                    font-size: 12px !important;
                    font-weight: bold !important;
                    color: #d1d5db !important;
                    margin-bottom: 6px !important;
                    display: block !important;
                    text-align: left !important;
                }

                .s-input-group {
                    display: flex !important;
                    gap: 8px !important;
                }

                .s-link-input {
                    flex: 1 !important;
                    padding: 9px 12px !important;
                    background: #0b0f19 !important;
                    border: 1px solid #374151 !important;
                    border-radius: 8px !important;
                    color: #38bdf8 !important;
                    font-size: 13px !important;
                    font-family: monospace !important;
                    outline: none !important;
                    box-sizing: border-box !important;
                }

                .s-link-input:focus {
                    border-color: #38bdf8 !important;
                }

                .s-btn-copy {
                    padding: 9px 16px !important;
                    background: linear-gradient(135deg, #ffb703 0%, #fb8500 100%) !important;
                    border: none !important;
                    border-radius: 8px !important;
                    color: #000 !important;
                    font-weight: 800 !important;
                    font-size: 13px !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    white-space: nowrap !important;
                    box-shadow: 0 4px 15px rgba(255, 183, 3, 0.3) !important;
                    outline: none !important;
                }

                .s-btn-copy:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 20px rgba(255, 183, 3, 0.5) !important;
                }

                .s-qr-box {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 8px !important;
                    background: #1f2937 !important;
                    padding: 14px !important;
                    border-radius: 10px !important;
                    border: 1px solid #374151 !important;
                }

                .s-qr-title {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    font-weight: bold !important;
                }

                .s-qr-img {
                    width: 150px !important;
                    height: 150px !important;
                    background: #fff !important;
                    padding: 6px !important;
                    border-radius: 8px !important;
                    border: 1px solid #4b5563 !important;
                }

                .s-modal-footer {
                    padding: 14px 20px !important;
                    background: #1f2937 !important;
                    border-top: 1px solid #374151 !important;
                    display: flex !important;
                    gap: 12px !important;
                    justify-content: flex-end !important;
                    align-items: center !important;
                }

                .s-footer-btn {
                    padding: 8px 18px !important;
                    border-radius: 8px !important;
                    font-size: 13px !important;
                    font-weight: 700 !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    outline: none !important;
                    border: 1px solid transparent !important;
                }

                .s-footer-btn.close {
                    background: rgba(255, 255, 255, 0.08) !important;
                    border-color: #4b5563 !important;
                    color: #d1d5db !important;
                }

                .s-footer-btn.close:hover {
                    background: rgba(255, 255, 255, 0.15) !important;
                    color: #fff !important;
                }

                .s-footer-btn.native {
                    background: #3b82f6 !important;
                    color: #fff !important;
                }

                .s-footer-btn.native:hover {
                    background: #2563eb !important;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml + styleHtml);

        // Bind jQuery close events
        if (window.$) {
            $('#s-btn-close-x, #s-btn-close-footer').off('click').on('click', function () {
                ShareHelper.closeModal();
            });

            $('#share-modal-overlay').off('click').on('click', function (e) {
                if (e.target === this) ShareHelper.closeModal();
            });
        }
    }

    // Universal Copy Text Helper with Fallback
    static copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).catch(() => {
                return this.fallbackCopyText(text);
            });
        } else {
            return this.fallbackCopyText(text);
        }
    }

    static fallbackCopyText(text) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve();
        } catch (err) {
            console.error('Fallback copy failed', err);
            return Promise.reject(err);
        }
    }

    // Main Open Handler with jQuery Animations
    static open(param) {
        this.initModal();

        let gameName = 'AI H5 游戏大厅';
        let targetUrl = window.location.href;

        if (param instanceof HTMLElement) {
            const card = param.closest('.card') || param.closest('[data-url]');
            if (card) {
                gameName = card.dataset.name || card.getAttribute('data-name') || gameName;
                targetUrl = card.dataset.url || card.getAttribute('data-url') || targetUrl;
            }
        } else if (typeof param === 'string') {
            targetUrl = param;
        } else if (typeof param === 'object' && param !== null) {
            gameName = param.name || gameName;
            targetUrl = param.url || targetUrl;
        }

        try {
            targetUrl = new URL(targetUrl, window.location.href).href;
        } catch (e) {
            targetUrl = window.location.href;
        }

        const shareMsg = `🎮 邀请你重温经典网页复刻游戏《${gameName}》！\n1:1 在线纯前端 HTML5 复刻，浏览器即开即玩：\n${targetUrl}`;

        // Auto copy to clipboard
        this.copyText(shareMsg).then(() => {
            if (window.$) {
                $('#s-toast-bar').stop(true, true).slideDown(200).delay(2500).slideUp(200);
            }
        });

        // Set UI values
        document.getElementById('s-game-name').textContent = `🎮 《${gameName}》`;
        document.getElementById('s-link-input').value = targetUrl;

        // Set QR Code
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(targetUrl)}`;
        document.getElementById('s-qr-img').src = qrUrl;

        // jQuery fadeIn animation for centered popup!
        if (window.$) {
            $('#share-modal-overlay').stop(true, true).fadeIn(250);
        } else {
            const overlay = document.getElementById('share-modal-overlay');
            if (overlay) overlay.style.display = 'block';
        }

        // Bind copy button with jQuery
        if (window.$) {
            $('#s-btn-copy').off('click').on('click', () => {
                this.copyText(shareMsg).then(() => {
                    $('#s-btn-copy').text('✅ 已成功复制！');
                    setTimeout(() => { $('#s-btn-copy').text('📋 复制链接'); }, 2000);
                });
            });
        }

        // Native share binding
        const nativeBtn = document.getElementById('s-btn-native');
        if (navigator.share) {
            nativeBtn.style.display = 'inline-flex';
            nativeBtn.onclick = () => {
                navigator.share({ title: gameName, text: shareMsg, url: targetUrl }).catch(() => {});
            };
        } else {
            nativeBtn.style.display = 'none';
        }
    }

    static openShareModal(param) {
        this.open(param);
    }

    static share(param) {
        this.open(param);
    }

    static closeModal() {
        if (window.$) {
            $('#share-modal-overlay').fadeOut(200);
        } else {
            const overlay = document.getElementById('share-modal-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }
}

// Global Exports
window.CodeViewerDownloader = CodeViewerDownloader;
window.ShareHelper = ShareHelper;
window.openShareModal = function(param) { ShareHelper.open(param); };
