/* ============================================================
   经典扫雷 (Minesweeper) - traeWork-game 专区 JS 引擎逻辑
   ============================================================ */

const ROWS = 10, COLS = 10, MINES = 10;
let board = [], revealedCount = 0, gameOver = false, timer = 0, timerInterval = null;

function initGame() {
    clearInterval(timerInterval);
    timer = 0; gameOver = false; revealedCount = 0;
    document.getElementById('timer').textContent = '000';
    document.getElementById('mine-count').textContent = '010';
    document.getElementById('face-btn').textContent = '🙂';

    board = Array(ROWS).fill().map(() => Array(COLS).fill().map(() => ({
        isMine: false, revealed: false, flagged: false, count: 0
    })));

    let placed = 0;
    while (placed < MINES) {
        let r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
        if (!board[r][c].isMine) {
            board[r][c].isMine = true;
            placed++;
        }
    }

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine) continue;
            let cnt = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) cnt++;
                }
            }
            board[r][c].count = cnt;
        }
    }
    renderBoard();
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellData = board[r][c];

            if (cellData.revealed) {
                cell.classList.add('revealed');
                if (cellData.isMine) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (cellData.count > 0) {
                    cell.textContent = cellData.count;
                    cell.classList.add('c-' + cellData.count);
                }
            } else if (cellData.flagged) {
                cell.textContent = '🚩';
            }

            cell.onclick = () => reveal(r, c);
            cell.oncontextmenu = (e) => { e.preventDefault(); flag(r, c); };
            boardEl.appendChild(cell);
        }
    }
}

function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            timer++;
            document.getElementById('timer').textContent = String(Math.min(999, timer)).padStart(3, '0');
        }, 1000);
    }
}

function reveal(r, c) {
    if (gameOver || board[r][c].revealed || board[r][c].flagged) return;
    startTimer();
    board[r][c].revealed = true;

    if (board[r][c].isMine) {
        gameOver = true;
        clearInterval(timerInterval);
        document.getElementById('face-btn').textContent = '😵';
        revealAllMines();
        renderBoard();
        return;
    }

    revealedCount++;
    if (board[r][c].count === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) reveal(nr, nc);
            }
        }
    }

    if (revealedCount === ROWS * COLS - MINES) {
        gameOver = true;
        clearInterval(timerInterval);
        document.getElementById('face-btn').textContent = '😎';
    }
    renderBoard();
}

function flag(r, c) {
    if (gameOver || board[r][c].revealed) return;
    board[r][c].flagged = !board[r][c].flagged;
    renderBoard();
}

function revealAllMines() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine) board[r][c].revealed = true;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initGame();
});
