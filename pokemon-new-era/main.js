/* ============================================================
   《口袋妖怪：新纪元 (Pokémon: New Era)》主逻辑与虚拟手柄绑定
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
    const engine = new PokemonNewEraEngine('game-canvas');

    // 1. Keyboard Controls
    const keyMap = {
        'ArrowUp': 'UP', 'w': 'UP', 'W': 'UP',
        'ArrowDown': 'DOWN', 's': 'DOWN', 'S': 'DOWN',
        'ArrowLeft': 'LEFT', 'a': 'LEFT', 'A': 'LEFT',
        'ArrowRight': 'RIGHT', 'd': 'RIGHT', 'D': 'RIGHT',
        'j': 'A', 'J': 'A', 'z': 'A', 'Z': 'A',
        'k': 'B', 'K': 'B', 'x': 'B', 'X': 'B',
        'l': 'L', 'L': 'L',
        'r': 'R', 'R': 'R',
        'Enter': 'START',
        'Shift': 'SELECT'
    };

    window.addEventListener('keydown', (e) => {
        const action = keyMap[e.key];
        if (action) {
            e.preventDefault();
            engine.handleInput(action);
            highlightButton(action);
        }
    });

    window.addEventListener('keyup', (e) => {
        const action = keyMap[e.key];
        if (action) unhighlightButton(action);
    });

    // 2. Virtual Gamepad Buttons
    const btnElements = {
        'UP': document.getElementById('btn-dpad-up'),
        'DOWN': document.getElementById('btn-dpad-down'),
        'LEFT': document.getElementById('btn-dpad-left'),
        'RIGHT': document.getElementById('btn-dpad-right'),
        'A': document.getElementById('btn-a'),
        'B': document.getElementById('btn-b'),
        'L': document.getElementById('btn-l'),
        'R': document.getElementById('btn-r'),
        'START': document.getElementById('btn-start'),
        'SELECT': document.getElementById('btn-select')
    };

    Object.keys(btnElements).forEach(act => {
        const btn = btnElements[act];
        if (btn) {
            const trigger = (e) => {
                e.preventDefault();
                engine.handleInput(act);
                highlightButton(act);
                setTimeout(() => unhighlightButton(act), 150);
            };
            btn.addEventListener('touchstart', trigger);
            btn.addEventListener('mousedown', trigger);
        }
    });

    function highlightButton(act) {
        const btn = btnElements[act];
        if (btn) btn.classList.add('pressed');
    }

    function unhighlightButton(act) {
        const btn = btnElements[act];
        if (btn) btn.classList.remove('pressed');
    }

    // 3. Reset & Fullscreen Handlers
    const restartBtn = document.getElementById('tool-restart');
    if (restartBtn) restartBtn.addEventListener('click', () => engine.restart());

    const fsBtn = document.getElementById('fullscreenBtn');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
            const wrap = document.getElementById('emulator-wrapper');
            if (wrap.requestFullscreen) wrap.requestFullscreen();
            else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
        });
    }

    // 4. Tab Navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const parent = tab.closest('.tabs');
            const target = tab.dataset.tab;
            parent.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
            parent.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === target));
        });
    });
});

// Lightbox modal for screenshots
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    if (lb && img) {
        img.src = src;
        lb.classList.add('show');
    }
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.classList.remove('show');
}
