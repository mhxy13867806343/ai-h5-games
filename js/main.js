/* ============================================================
   AI H5 游戏大厅 (main.html) - Vue 3 响应式驱动主逻辑
   ============================================================ */

const { createApp, ref, computed, onMounted } = Vue;

const GAMES_DATA = [
    // antigravity-game 专区
    {
        id: 'pokemon-new-era', name: '口袋妖怪：新纪元', url: 'pokemon-new-era.html', icon: '⚡', tag: '📂 antigravity-game · GBA 宝可梦改版', desc: '冠军之路制作组原创 GBA 神作！全新的曙光地区与独创【共鸣进化】机制。',
        htmlUrl: 'pokemon-new-era.html', cssUrl: 'pokemon-new-era/style.css', jsUrl: 'pokemon-new-era/game.js', folder: 'antigravity-game'
    },
    {
        id: 'pokemon-dark-rising', name: '口袋妖怪：暗黑升起', url: 'pokemon-dark-rising.html', icon: '🐲', tag: '📂 antigravity-game · GBA 宝可梦', desc: '神级三大龙系初始宝可梦、暗黑修罗神剧情，内置预载 ROM 引擎。',
        htmlUrl: 'pokemon-dark-rising.html', cssUrl: 'pokemon-dark-rising/style.css', jsUrl: 'pokemon-dark-rising/game.js', folder: 'antigravity-game'
    },
    {
        id: 'fire-emblem-girls', name: '火焰纹章：圣魔之光石（女孩版）', url: 'fire-emblem-girls.html', icon: '⚔️', tag: '📂 antigravity-game · GBA 战棋', desc: 'gbarom.cn 1:1 在线复刻！GBA 史诗改版 FE Girls，全女性角色阵容、武器相克法则与策略战棋。',
        htmlUrl: 'fire-emblem-girls.html', cssUrl: 'fire-emblem-girls/style.css', jsUrl: 'fire-emblem-girls/game.js', folder: 'antigravity-game'
    },
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
        htmlUrl: 'happy-farm.html', cssUrl: 'happy-farm/style.css', jsUrl: 'happy-farm/game.js', folder: 'happy-farm'
    },
    {
        id: 'samurai-shodown', name: '真侍魂：武士道列传', url: 'samurai-shodown.html', icon: '⚔️', tag: '📂 hy3-game · 动作 RPG', desc: '侍魂传世 RPG...',
        htmlUrl: 'samurai-shodown.html', cssUrl: 'samurai-shodown/style.css', jsUrl: 'samurai-shodown/game.js', folder: 'samurai-shodown'
    },
    {
        id: 'cao-cao-chuan', name: '三国志：曹操传', url: 'cao-cao-chuan.html', icon: '🚩', tag: '📂 hy3-game · 策略 SLG', desc: '光荣战棋 SLG...',
        htmlUrl: 'cao-cao-chuan.html', cssUrl: 'cao-cao-chuan/style.css', jsUrl: 'cao-cao-chuan/game.js', folder: 'cao-cao-chuan'
    },
    {
        id: 'spiral-bubble-2', name: '螺旋泡泡柱 2', url: 'spiral-bubble-2.html', icon: '🔮', tag: '📂 hy3-game · 3D 消除', desc: '六边形蜂巢...',
        htmlUrl: 'spiral-bubble-2/spiral-bubble-2.html', cssUrl: 'spiral-bubble-2/spiral-bubble-2.css', jsUrl: 'spiral-bubble-2/spiral-bubble-2.js', folder: 'spiral-bubble-2'
    },

    // traeWork-game 专区
    {
        id: 'minesweeper', name: '经典扫雷', url: 'traeWork-game/minesweeper.html', icon: '💣', tag: '📂 traeWork-game · 经典益智', desc: '扫雷数字推导...',
        htmlUrl: 'traeWork-game/minesweeper.html', folder: 'traeWork-game'
    }
];

const layoutModes = [
    { mode: 'grid', label: '🎛️ 1. 经典网格模式' },
    { mode: 'list', label: '📜 2. 极简列表模式' },
    { mode: 'hero', label: '👑 3. 巨幕大卡模式' },
    { mode: 'compact', label: '📱 4. 紧凑小卡模式' },
    { mode: 'category', label: '🗂️ 5. 分类大厅模式' }
];

const app = createApp({
    setup() {
        const games = ref(GAMES_DATA);
        const searchQuery = ref('');
        const currentGame = ref(GAMES_DATA[0]);
        const showLayoutMenu = ref(false);
        const notificationMsg = ref('');
        const notificationShow = ref(false);

        // Filtered games based on search input v-model
        const filteredGames = computed(() => {
            const query = searchQuery.value.trim().toLowerCase();
            if (!query) return games.value;
            return games.value.filter(g =>
                g.name.toLowerCase().includes(query) ||
                g.tag.toLowerCase().includes(query) ||
                g.desc.toLowerCase().includes(query)
            );
        });

        // Event Handler Methods
        function selectGame(game) {
            currentGame.value = game;
            window.location.hash = game.id;
            showNotification(`已切换至《${game.name}》`);
        }

        function setLayoutMode(mode) {
            localStorage.setItem('h5_layout_mode', mode);
            showLayoutMenu.value = false;
            window.location.href = 'index.html';
        }

        function toggleLayoutMenu() {
            showLayoutMenu.value = !showLayoutMenu.value;
        }

        function shareGame() {
            if (window.ShareHelper) {
                ShareHelper.open(currentGame.value);
            }
        }

        function viewCode() {
            if (window.CodeViewerDownloader) {
                CodeViewerDownloader.open(currentGame.value);
            }
        }

        function downloadZip() {
            if (window.CodeViewerDownloader) {
                CodeViewerDownloader.downloadZip(currentGame.value);
            }
        }

        function reloadGame() {
            const iframe = document.getElementById('game-iframe');
            if (iframe) {
                iframe.src = iframe.src;
                showNotification('刷新游戏成功');
            }
        }

        function openNewTab() {
            window.open(currentGame.value.url, '_blank');
        }

        function toggleFullscreen() {
            const iframe = document.getElementById('game-iframe');
            if (!iframe) return;
            if (iframe.requestFullscreen) iframe.requestFullscreen();
            else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
        }

        function showNotification(msg) {
            notificationMsg.value = msg;
            notificationShow.value = true;
            setTimeout(() => {
                notificationShow.value = false;
            }, 2000);
        }

        onMounted(() => {
            const hash = window.location.hash.replace('#', '');
            if (hash) {
                const target = games.value.find(g => g.id === hash);
                if (target) currentGame.value = target;
            }
        });

        return {
            games,
            searchQuery,
            currentGame,
            showLayoutMenu,
            notificationMsg,
            notificationShow,
            filteredGames,
            layoutModes,
            selectGame,
            setLayoutMode,
            toggleLayoutMenu,
            shareGame,
            viewCode,
            downloadZip,
            reloadGame,
            openNewTab,
            toggleFullscreen
        };
    }
});

app.mount('#app');
