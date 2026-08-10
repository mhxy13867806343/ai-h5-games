/* ============================================================
   AI H5 游戏大厅 (main.html) - 外部独立 JS 交互逻辑
   ============================================================ */

// Games Catalog Data by Folders
const GAMES_DATA = [
    // antigravity-game 专区
    {
        id: 'metal-slug-2', name: '合金弹头 2', url: 'metal-slug-2.html', icon: '💥', tag: '📂 antigravity-game · 动作射击', desc: 'SNK 经典射击...',
        htmlUrl: 'metal-slug-2.html', cssUrl: 'metal-slug-2/style.css', jsUrl: 'metal-slug-2/game.js', folder: 'antigravity-game'
    },
    {
        id: 'fruit-ninja', name: '水果忍者', url: 'fruit-ninja.html', icon: '🍉', tag: '📂 antigravity-game · 敏捷解压', desc: '炫彩光刃...',
        htmlUrl: 'fruit-ninja.html', cssUrl: 'fruit-ninja/style.css', jsUrl: 'fruit-ninja/game.js', folder: 'antigravity-game'
    },
    {
        id: 'golden-sun', name: '黄金太阳', url: 'golden-sun.html', icon: '☀️', tag: '📂 antigravity-game · GBA JRPG', desc: '精神力解谜...',
        htmlUrl: 'golden-sun.html', cssUrl: 'golden-sun/style.css', jsUrl: 'golden-sun/game.js', folder: 'antigravity-game'
    },
    {
        id: 'ff-editor', name: 'FF1-6 属性修改器', url: 'ff-editor.html', icon: '💎', tag: '📂 antigravity-game · JRPG工具', desc: '全员 99 级...',
        htmlUrl: 'ff-editor.html', cssUrl: 'ff-editor/style.css', jsUrl: 'ff-editor/editor.js', folder: 'antigravity-game'
    },

    // hy3-game 专区
    {
        id: 'dou-di-zhu', name: '斗地主经典版', url: 'dou-di-zhu.html', icon: '🎴', tag: '📂 hy3-game · 棋牌对战', desc: '三人经典斗地主...',
        htmlUrl: 'dou-di-zhu.html', cssUrl: 'dou-di-zhu/style.css', jsUrl: 'dou-di-zhu/game.js', folder: 'hy3-game'
    },
    {
        id: 'ninja-bomb', name: '忍者拆炸弹', url: 'ninja-bomb.html', icon: '🥷', tag: '📂 hy3-game · 动作拆弹', desc: '暗部忍者拆弹...',
        htmlUrl: 'ninja-bomb.html', cssUrl: 'ninja-bomb/style.css', jsUrl: 'ninja-bomb/game.js', folder: 'hy3-game'
    },
    {
        id: 'happy-farm', name: '开心农场', url: 'happy-farm.html', icon: '👨‍🌾', tag: '📂 hy3-game · 模拟经营', desc: '田园耕作...',
        htmlUrl: 'happy-farm.html', cssUrl: 'happy-farm/style.css', jsUrl: 'happy-farm/game.js', folder: 'hy3-game'
    },
    {
        id: 'samurai-shodown', name: '真侍魂：武士道列传', url: 'samurai-shodown.html', icon: '⚔️', tag: '📂 hy3-game · 动作 RPG', desc: '侍魂传世 RPG...',
        htmlUrl: 'samurai-shodown.html', cssUrl: 'samurai-shodown/style.css', jsUrl: 'samurai-shodown/game.js', folder: 'hy3-game'
    },
    {
        id: 'cao-cao-chuan', name: '三国志：曹操传', url: 'cao-cao-chuan.html', icon: '🚩', tag: '📂 hy3-game · 策略 SLG', desc: '光荣战棋 SLG...',
        htmlUrl: 'cao-cao-chuan.html', cssUrl: 'cao-cao-chuan/style.css', jsUrl: 'cao-cao-chuan/game.js', folder: 'hy3-game'
    },
    {
        id: 'spiral-bubble-2', name: '螺旋泡泡柱 2', url: 'spiral-bubble-2.html', icon: '🔮', tag: '📂 hy3-game · 3D 消除', desc: '六边形蜂巢...',
        htmlUrl: 'spiral-bubble-2/spiral-bubble-2.html', cssUrl: 'spiral-bubble-2/spiral-bubble-2.css', jsUrl: 'spiral-bubble-2/spiral-bubble-2.js', folder: 'hy3-game'
    },

    // traeWork-game 专区
    {
        id: 'minesweeper', name: '经典扫雷', url: 'traeWork-game/minesweeper.html', icon: '💣', tag: '📂 traeWork-game · 经典益智', desc: '扫雷数字推导...',
        htmlUrl: 'traeWork-game/minesweeper.html', folder: 'traeWork-game'
    }
];

let currentGame = GAMES_DATA[0];

$(document).ready(function () {
    // Render Game List Items
    renderGameList(GAMES_DATA);

    // Check URL Hash to load specific game on launch
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const target = GAMES_DATA.find(g => g.id === hash);
        if (target) selectGame(target);
    }

    // Search Filter Listener (jQuery keyup)
    $('#search-input').on('keyup', function () {
        const query = $(this).val().toLowerCase();
        const filtered = GAMES_DATA.filter(g =>
            g.name.toLowerCase().includes(query) ||
            g.tag.toLowerCase().includes(query) ||
            g.desc.toLowerCase().includes(query)
        );
        renderGameList(filtered);
    });

    // Action Buttons
    $('#btn-share-game').on('click', function () {
        if (window.ShareHelper) {
            ShareHelper.open(currentGame);
        } else {
            alert(`快来玩《${currentGame.name}》！\n${window.location.origin}/${currentGame.url}`);
        }
    });

    $('#btn-view-code').on('click', function () {
        if (window.CodeViewerDownloader) {
            CodeViewerDownloader.open(currentGame);
        }
    });

    $('#btn-download-zip').on('click', function () {
        if (window.CodeViewerDownloader) {
            CodeViewerDownloader.downloadZip(currentGame);
        }
    });

    $('#btn-reload').on('click', function () {
        const $iframe = $('#game-iframe');
        $iframe.attr('src', $iframe.attr('src'));
        showNotification('刷新游戏成功');
    });

    $('#btn-open-tab').on('click', function () {
        window.open(currentGame.url, '_blank');
    });

    $('#btn-fullscreen').on('click', function () {
        const iframe = document.getElementById('game-iframe');
        if (iframe.requestFullscreen) iframe.requestFullscreen();
        else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
    });
});

function renderGameList(list) {
    const $container = $('#game-list');
    $container.empty();

    if (list.length === 0) {
        $container.html('<div style="text-align:center; padding:20px; color:#94a3b8; font-size:13px;">未找到匹配游戏</div>');
        return;
    }

    list.forEach(game => {
        const isActive = game.id === currentGame.id ? 'active' : '';
        const $item = $(`
            <div class="game-item ${isActive}" data-id="${game.id}">
                <div class="icon">${game.icon}</div>
                <div class="info">
                    <div class="title">${game.name}</div>
                    <div class="tag">${game.tag}</div>
                </div>
            </div>
        `);

        $item.on('click', function () {
            selectGame(game);
        });

        $container.append($item);
    });
}

function selectGame(game) {
    currentGame = game;

    // Update UI Active States
    $('.game-item').removeClass('active');
    $(`.game-item[data-id="${game.id}"]`).addClass('active');

    // Update Top Bar Header
    $('#current-title').html(`<span>${game.icon}</span> ${game.name}`);

    // Load iframe
    $('#game-iframe').attr('src', game.url);

    // Update URL hash
    window.location.hash = game.id;

    showNotification(`已切换至《${game.name}》`);
}

function showNotification(msg) {
    const $notif = $('#notif');
    $notif.text(msg).addClass('show');
    setTimeout(() => {
        $notif.removeClass('show');
    }, 2000);
}
