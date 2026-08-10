/* ============================================================
   《火焰纹章：圣魔之光石（女孩版）》主逻辑与虚拟手柄按键映射
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
    const engine = new FEGirlsEngine('game-canvas');

    // 1. Keyboard Event Listeners
    const keyMap = {
        'ArrowUp': 'UP', 'w': 'UP', 'W': 'UP',
        'ArrowDown': 'DOWN', 's': 'DOWN', 'S': 'DOWN',
        'ArrowLeft': 'LEFT', 'a': 'LEFT', 'A': 'LEFT',
        'ArrowRight': 'RIGHT', 'd': 'RIGHT', 'D': 'RIGHT',
        'j': 'A', 'J': 'A', 'z': 'A', 'Z': 'A',
        'k': 'B', 'K': 'B', 'x': 'B', 'X': 'B',
        'Enter': 'START',
        'Shift': 'SELECT',
        'l': 'L', 'L': 'L',
        'u': 'R', 'U': 'R'
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

    // 2. Virtual Gamepad Touch & Mouse Mapping
    const btnElements = {
        'UP': document.getElementById('btn-dpad-up'),
        'DOWN': document.getElementById('btn-dpad-down'),
        'LEFT': document.getElementById('btn-dpad-left'),
        'RIGHT': document.getElementById('btn-dpad-right'),
        'A': document.getElementById('btn-a'),
        'B': document.getElementById('btn-b'),
        'START': document.getElementById('btn-start'),
        'SELECT': document.getElementById('btn-select'),
        'L': document.getElementById('btn-l'),
        'R': document.getElementById('btn-r')
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

    // 3. Canvas Mouse Click to Position Cursor & Act
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        const col = Math.floor(clickX / engine.tileSize);
        const row = Math.floor(clickY / engine.tileSize);

        if (col >= 0 && col < engine.cols && row >= 0 && row < engine.rows) {
            engine.cursor.x = col;
            engine.cursor.y = row;
            engine.handleInput('A');
        }
    });

    // 4. Toolbar Controls
    const restartBtn = document.getElementById('tool-restart');
    if (restartBtn) restartBtn.addEventListener('click', () => engine.restart());

    const fsBtn = document.getElementById('tool-fullscreen');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
            const wrap = document.getElementById('emulator-wrapper');
            if (wrap.requestFullscreen) wrap.requestFullscreen();
            else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
        });
    }

    const speedBtn = document.getElementById('tool-speed');
    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            engine.speedMultiplier = engine.speedMultiplier === 1 ? 2 : 1;
            speedBtn.textContent = `⚡ 运行倍速 (${engine.speedMultiplier}x)`;
        });
    }
});
