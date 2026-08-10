/* ============================================================
   《忍者拆炸弹》 Ninja Bomb Defusal - HTML5 Canvas Engine
   ============================================================ */

class NinjaBombGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.W = 800;
        this.H = 600;

        this.state = 'LOADING'; // LOADING, MENU, PLAYING, DEFUSE_WIRE, PAUSED, GAME_OVER, LEVEL_WIN
        this.frame = 0;
        this.score = 0;
        this.levelIndex = 0;
        this.lives = 3;

        // Ninja player
        this.ninja = {
            x: 100, y: 480, vx: 0, vy: 0,
            w: 36, h: 54, dir: 1,
            isGrounded: true, state: 'IDLE', animFrame: 0,
            speed: 4.5, jumpVel: -12.5, gravity: 0.55
        };

        // Inputs
        this.keys = {};
        this.mouse = { x: 0, y: 0, clicked: false, down: false };

        // Entities
        this.platforms = [];
        this.bombs = [];
        this.particles = [];
        this.sakuraParticles = [];
        this.pickups = [];

        // Active Defuse State (Popup)
        this.activeDefuseBomb = null;
        this.wirePuzzle = null;
        this.comboPuzzle = null;

        // Audio synthesizer
        this.audioCtx = null;

        // Levels config
        this.levels = [
            { name: "第一关：木叶夜影", bombs: 4, wireComplexity: 1, timeLimit: 45, bgType: 'village' },
            { name: "第二关：稻荷神社", bombs: 6, wireComplexity: 2, timeLimit: 50, bgType: 'shrine' },
            { name: "第三关：竹林暗道", bombs: 8, wireComplexity: 3, timeLimit: 55, bgType: 'bamboo' },
            { name: "第四关：天守阁楼", bombs: 10, wireComplexity: 4, timeLimit: 60, bgType: 'castle' },
            { name: "第五关：终极尾兽弹", bombs: 1, isBoss: true, timeLimit: 70, bgType: 'boss' }
        ];

        this.levelTimer = 0;
        this.freezeTimer = 0;
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.setupInputs();
        this.initSakuraParticles();
        this.runLoadingSequence();
    }

    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.audioCtx = new AudioContext();
        }
    }

    playSound(type) {
        if (!this.audioCtx) return;
        try {
            const ctx = this.audioCtx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            if (type === 'jump') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
            } else if (type === 'defuse') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.08);
                osc.frequency.setValueAtTime(783, now + 0.16);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'cut') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
            } else if (type === 'explode') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now); osc.stop(now + 0.4);
            } else if (type === 'combo') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.start(now); osc.stop(now + 0.06);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.12);
                osc.frequency.setValueAtTime(783, now + 0.24);
                osc.frequency.setValueAtTime(1046, now + 0.36);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
            }
        } catch (e) {}
    }

    setupInputs() {
        window.addEventListener('keydown', e => {
            this.initAudio();
            this.keys[e.code] = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            if (this.state === 'DEFUSE_COMBO' && this.comboPuzzle) {
                this.handleComboInput(e.code);
            }

            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
            }

            if (e.code === 'Enter') {
                if (this.state === 'MENU' || this.state === 'GAME_OVER' || this.state === 'LEVEL_WIN') {
                    this.startLevel(this.state === 'LEVEL_WIN' ? this.levelIndex + 1 : 0);
                }
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });

        const getCanvasPos = e => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.W / rect.width;
            const scaleY = this.H / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };

        this.canvas.addEventListener('mousemove', e => {
            const pos = getCanvasPos(e);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
        });

        this.canvas.addEventListener('mousedown', e => {
            this.initAudio();
            const pos = getCanvasPos(e);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            this.mouse.down = true;
            this.mouse.clicked = true;

            this.handleMouseClick();
        });

        window.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
    }

    initSakuraParticles() {
        this.sakuraParticles = [];
        for (let i = 0; i < 35; i++) {
            this.sakuraParticles.push({
                x: Math.random() * this.W,
                y: Math.random() * this.H,
                size: 3 + Math.random() * 4,
                speedX: -0.5 - Math.random() * 1,
                speedY: 0.8 + Math.random() * 1.2,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.05
            });
        }
    }

    runLoadingSequence() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            const bar = document.querySelector('.loading-bar .progress');
            const txt = document.querySelector('.loading-text');
            if (bar) bar.style.width = `${progress}%`;
            if (txt) txt.textContent = `加载中... ${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    document.getElementById('loading-screen').classList.remove('active');
                    this.state = 'MENU';
                    this.startLoop();
                }, 200);
            }
        }, 30);
    }

    startLevel(index) {
        if (index >= this.levels.length) {
            index = 0; // wrap around or finish
        }
        this.levelIndex = index;
        const lvl = this.levels[this.levelIndex];

        if (index === 0) {
            this.score = 0;
            this.lives = 3;
        }

        this.levelTimer = lvl.timeLimit * 60;
        this.freezeTimer = 0;

        // Reset ninja
        this.ninja.x = 80;
        this.ninja.y = 480;
        this.ninja.vx = 0;
        this.ninja.vy = 0;
        this.ninja.isGrounded = true;
        this.ninja.state = 'IDLE';

        // Set up platforms
        this.platforms = [
            { x: 0, y: 530, w: 800, h: 70 }, // Ground
            { x: 120, y: 410, w: 160, h: 18 },
            { x: 350, y: 340, w: 180, h: 18 },
            { x: 100, y: 260, w: 160, h: 18 },
            { x: 550, y: 420, w: 170, h: 18 },
            { x: 570, y: 270, w: 160, h: 18 }
        ];

        // Spawn bombs
        this.bombs = [];
        if (lvl.isBoss) {
            // Boss Bomb
            this.bombs.push({
                id: 1,
                x: 400, y: 260,
                type: 'boss',
                fuse: 9999,
                defused: false,
                isBoss: true,
                bossPhase: 1,
                maxPhase: 3
            });
        } else {
            const platformIndices = [1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5];
            const bombTypes = ['standard', 'wire', 'combo', 'freeze', 'wire', 'combo'];

            for (let i = 0; i < lvl.bombs; i++) {
                const pIdx = platformIndices[i % platformIndices.length];
                const plat = this.platforms[pIdx];
                const bx = plat.x + 30 + Math.random() * (plat.w - 60);
                const by = plat.y - 30;
                const bType = bombTypes[i % bombTypes.length];

                this.bombs.push({
                    id: i + 1,
                    x: bx, y: by,
                    type: bType,
                    fuse: Math.floor((12 + Math.random() * 15) * 60),
                    maxFuse: 20 * 60,
                    defused: false,
                    pulse: Math.random() * Math.PI
                });
            }
        }

        this.particles = [];
        this.activeDefuseBomb = null;
        this.state = 'PLAYING';
    }

    restart() {
        this.startLevel(0);
    }

    startLoop() {
        const loop = () => {
            this.update();
            this.render();
            this.mouse.clicked = false;
            this.frame++;
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update() {
        this.updateSakura();

        if (this.state === 'PLAYING') {
            this.updatePlaying();
        } else if (this.state === 'DEFUSE_WIRE' || this.state === 'DEFUSE_COMBO') {
            // Defuse popup modal active
        }
    }

    updateSakura() {
        for (let p of this.sakuraParticles) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.rot += p.rotSpeed;
            if (p.y > this.H + 10) {
                p.y = -10;
                p.x = Math.random() * (this.W + 100);
            }
            if (p.x < -10) p.x = this.W + 10;
        }
    }

    updatePlaying() {
        // Level timer
        if (this.freezeTimer > 0) {
            this.freezeTimer--;
        } else {
            this.levelTimer--;
            if (this.levelTimer <= 0) {
                this.triggerExplosion(this.ninja.x, this.ninja.y);
                this.lives--;
                if (this.lives <= 0) {
                    this.state = 'GAME_OVER';
                } else {
                    this.startLevel(this.levelIndex);
                }
                return;
            }
        }

        // Ninja physics & movement
        let moveX = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            moveX = -1;
            this.ninja.dir = -1;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            moveX = 1;
            this.ninja.dir = 1;
        }

        this.ninja.vx = moveX * this.ninja.speed;

        if ((this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']) && this.ninja.isGrounded) {
            this.ninja.vy = this.ninja.jumpVel;
            this.ninja.isGrounded = false;
            this.ninja.state = 'JUMP';
            this.playSound('jump');
        }

        // Apply gravity
        this.ninja.vy += this.ninja.gravity;
        this.ninja.x += this.ninja.vx;
        this.ninja.y += this.ninja.vy;

        // Screen bounds
        if (this.ninja.x < 20) this.ninja.x = 20;
        if (this.ninja.x > this.W - 20) this.ninja.x = this.W - 20;

        // Platform collision
        this.ninja.isGrounded = false;
        for (let p of this.platforms) {
            if (this.ninja.x + 12 > p.x && this.ninja.x - 12 < p.x + p.w) {
                if (this.ninja.y >= p.y - this.ninja.h && this.ninja.y - this.ninja.vy <= p.y - this.ninja.h + 10 && this.ninja.vy >= 0) {
                    this.ninja.y = p.y - this.ninja.h;
                    this.ninja.vy = 0;
                    this.ninja.isGrounded = true;
                }
            }
        }

        if (this.ninja.isGrounded) {
            if (Math.abs(this.ninja.vx) > 0.5) {
                this.ninja.state = 'RUN';
            } else {
                this.ninja.state = 'IDLE';
            }
        } else {
            this.ninja.state = 'JUMP';
        }

        this.ninja.animFrame++;

        // Update bombs & fuse timers
        let remainingActive = 0;
        for (let b of this.bombs) {
            if (!b.defused) {
                remainingActive++;
                if (this.freezeTimer <= 0 && !b.isBoss) {
                    b.fuse--;
                    if (b.fuse <= 0) {
                        this.triggerExplosion(b.x, b.y);
                        this.lives--;
                        if (this.lives <= 0) {
                            this.state = 'GAME_OVER';
                        } else {
                            this.startLevel(this.levelIndex);
                        }
                        return;
                    }
                }
            }
        }

        // Check level win
        if (remainingActive === 0) {
            this.playSound('win');
            this.score += 2000 + Math.floor(this.levelTimer / 60) * 100;
            this.state = 'LEVEL_WIN';
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life--;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    handleMouseClick() {
        if (this.state === 'PLAYING') {
            // Check if player clicked near a bomb to defuse
            for (let b of this.bombs) {
                if (b.defused) continue;
                const distToNinja = Math.hypot(b.x - this.ninja.x, b.y - (this.ninja.y + 20));
                const distToMouse = Math.hypot(b.x - this.mouse.x, b.y - this.mouse.y);

                if (distToMouse < 45 || (distToNinja < 70 && this.mouse.clicked)) {
                    if (distToNinja < 120) {
                        this.startDefuse(b);
                        break;
                    }
                }
            }
        } else if (this.state === 'DEFUSE_WIRE') {
            this.handleWireClick();
        }
    }

    startDefuse(bomb) {
        this.activeDefuseBomb = bomb;

        if (bomb.type === 'standard') {
            // Direct disarm
            bomb.defused = true;
            this.score += 500;
            this.playSound('defuse');
            this.spawnDefuseParticles(bomb.x, bomb.y);
        } else if (bomb.type === 'freeze') {
            bomb.defused = true;
            this.freezeTimer = 300; // 5 seconds freeze
            this.score += 600;
            this.playSound('defuse');
            this.spawnDefuseParticles(bomb.x, bomb.y, '#00ffff');
        } else if (bomb.type === 'wire' || bomb.type === 'boss') {
            this.state = 'DEFUSE_WIRE';
            this.initWirePuzzle();
        } else if (bomb.type === 'combo') {
            this.state = 'DEFUSE_COMBO';
            this.initComboPuzzle();
        }
    }

    initWirePuzzle() {
        const colors = [
            { name: 'RED', hex: '#e63946', label: '红线' },
            { name: 'BLUE', hex: '#00b4d8', label: '蓝线' },
            { name: 'YELLOW', hex: '#ffb703', label: '黄线' },
            { name: 'GREEN', hex: '#2a9d8f', label: '绿线' }
        ];

        // Randomize target wire
        const correctIndex = Math.floor(Math.random() * colors.length);

        // Clue hint
        const hints = [
            `忍法诀：切勿剪断${colors[(correctIndex + 1) % 4].label}，剪断${colors[correctIndex].label}！`,
            `查克拉秘闻：解开引线为[${colors[correctIndex].label}]即可拆除！`,
            `拆弹指南：避开最上与最下，斩断第 ${correctIndex + 1} 根线！`
        ];

        this.wirePuzzle = {
            wires: colors.map((c, i) => ({ ...c, cut: false, index: i })),
            correctIndex: correctIndex,
            hintText: hints[Math.floor(Math.random() * hints.length)]
        };
    }

    handleWireClick() {
        if (!this.wirePuzzle) return;

        const mx = this.mouse.x;
        const my = this.mouse.y;

        // Modal dimensions
        const modalW = 440, modalH = 340;
        const modalX = (this.W - modalW) / 2;
        const modalY = (this.H - modalH) / 2;

        const startY = modalY + 120;
        const wireH = 35;

        for (let i = 0; i < 4; i++) {
            const wy = startY + i * 45;
            if (mx > modalX + 40 && mx < modalX + modalW - 40 && my > wy && my < wy + wireH) {
                if (i === this.wirePuzzle.correctIndex) {
                    // Success!
                    this.playSound('defuse');
                    this.playSound('cut');
                    this.activeDefuseBomb.defused = true;
                    this.score += 1000;
                    this.spawnDefuseParticles(this.activeDefuseBomb.x, this.activeDefuseBomb.y);

                    if (this.activeDefuseBomb.isBoss) {
                        this.activeDefuseBomb.bossPhase++;
                        if (this.activeDefuseBomb.bossPhase <= this.activeDefuseBomb.maxPhase) {
                            this.initWirePuzzle(); // Next boss phase
                            return;
                        }
                    }

                    this.state = 'PLAYING';
                    this.wirePuzzle = null;
                } else {
                    // Fail wire cut!
                    this.playSound('explode');
                    this.triggerExplosion(this.activeDefuseBomb.x, this.activeDefuseBomb.y);
                    this.lives--;
                    this.wirePuzzle = null;
                    if (this.lives <= 0) {
                        this.state = 'GAME_OVER';
                    } else {
                        this.startLevel(this.levelIndex);
                    }
                }
                break;
            }
        }
    }

    initComboPuzzle() {
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const dirSymbols = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };
        const seqLength = 4 + Math.min(this.levelIndex, 3);

        const sequence = [];
        for (let i = 0; i < seqLength; i++) {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            sequence.push({ dir, symbol: dirSymbols[dir] });
        }

        this.comboPuzzle = {
            sequence,
            currentIndex: 0
        };
    }

    handleComboInput(code) {
        if (!this.comboPuzzle) return;

        const codeMap = {
            'ArrowUp': 'UP', 'KeyW': 'UP',
            'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
            'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
            'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT'
        };

        const pressedDir = codeMap[code];
        if (!pressedDir) return;

        const currentReq = this.comboPuzzle.sequence[this.comboPuzzle.currentIndex];
        if (pressedDir === currentReq.dir) {
            this.comboPuzzle.currentIndex++;
            this.playSound('combo');

            if (this.comboPuzzle.currentIndex >= this.comboPuzzle.sequence.length) {
                // Combo completed!
                this.playSound('defuse');
                this.activeDefuseBomb.defused = true;
                this.score += 1200;
                this.spawnDefuseParticles(this.activeDefuseBomb.x, this.activeDefuseBomb.y);
                this.state = 'PLAYING';
                this.comboPuzzle = null;
            }
        } else {
            // Wrong key! Reset combo index
            this.comboPuzzle.currentIndex = 0;
            this.playSound('cut');
        }
    }

    spawnDefuseParticles(x, y, color = '#ffb703') {
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: i % 2 === 0 ? color : '#ffffff',
                size: 3 + Math.random() * 4,
                life: 20 + Math.random() * 20
            });
        }
    }

    triggerExplosion(x, y) {
        this.playSound('explode');
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 3 + Math.random() * 8;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: ['#e63946', '#ffb703', '#d90429', '#ffffff'][Math.floor(Math.random() * 4)],
                size: 5 + Math.random() * 6,
                life: 30 + Math.random() * 25
            });
        }
    }

    /* ============================================================
       RENDER METHODS
       ============================================================ */

    render() {
        this.ctx.fillStyle = '#050406';
        this.ctx.fillRect(0, 0, this.W, this.H);

        this.renderBackground();
        this.renderPlatforms();
        this.renderSakura();
        this.renderBombs();
        this.renderNinja();
        this.renderParticles();

        this.renderHUD();

        if (this.state === 'MENU') this.renderMenu();
        if (this.state === 'PAUSED') this.renderPausedModal();
        if (this.state === 'GAME_OVER') this.renderGameOverModal();
        if (this.state === 'LEVEL_WIN') this.renderLevelWinModal();
        if (this.state === 'DEFUSE_WIRE') this.renderWireModal();
        if (this.state === 'DEFUSE_COMBO') this.renderComboModal();
    }

    renderBackground() {
        const lvl = this.levels[this.levelIndex] || this.levels[0];
        const ctx = this.ctx;

        // Gradient Sky
        let skyGrad = ctx.createLinearGradient(0, 0, 0, this.H);
        if (lvl.bgType === 'shrine') {
            skyGrad.addColorStop(0, '#1d0c1f');
            skyGrad.addColorStop(0.6, '#3a152e');
            skyGrad.addColorStop(1, '#6b2d5c');
        } else if (lvl.bgType === 'bamboo') {
            skyGrad.addColorStop(0, '#0a1c14');
            skyGrad.addColorStop(0.6, '#18382b');
            skyGrad.addColorStop(1, '#2c5946');
        } else if (lvl.bgType === 'castle') {
            skyGrad.addColorStop(0, '#0c101d');
            skyGrad.addColorStop(0.6, '#1d2338');
            skyGrad.addColorStop(1, '#3b4566');
        } else {
            skyGrad.addColorStop(0, '#0b090a');
            skyGrad.addColorStop(0.6, '#1f132b');
            skyGrad.addColorStop(1, '#3b1842');
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.W, this.H);

        // Full Moon
        ctx.fillStyle = '#fff9e6';
        ctx.shadowColor = '#ffea9f';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(680, 120, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Silhouette Buildings / Tori Gate / Pagoda
        ctx.fillStyle = '#070509';
        if (lvl.bgType === 'shrine') {
            // Tori Gate silhouette
            ctx.fillRect(200, 360, 20, 170);
            ctx.fillRect(380, 360, 20, 170);
            ctx.fillRect(170, 360, 260, 18);
            ctx.fillRect(180, 390, 240, 14);
        } else if (lvl.bgType === 'bamboo') {
            // Bamboo stalks
            for (let i = 0; i < 15; i++) {
                const bx = i * 60 + 20;
                ctx.fillRect(bx, 150, 12, 380);
            }
        } else {
            // Ninja Pagoda Rooftops
            ctx.beginPath();
            ctx.moveTo(100, 530);
            ctx.lineTo(130, 420); ctx.lineTo(250, 420); ctx.lineTo(280, 530);
            ctx.moveTo(140, 420); ctx.lineTo(160, 350); ctx.lineTo(220, 350); ctx.lineTo(240, 420);
            ctx.fill();
        }
    }

    renderPlatforms() {
        const ctx = this.ctx;
        for (let p of this.platforms) {
            // Wooden Ninja Platform Style
            ctx.fillStyle = '#2b1e16';
            ctx.fillRect(p.x, p.y, p.w, p.h);

            // Red trim top edge
            ctx.fillStyle = '#e63946';
            ctx.fillRect(p.x, p.y, p.w, 4);

            // Metallic supports
            ctx.fillStyle = '#ffb703';
            ctx.fillRect(p.x + 10, p.y + 4, 6, p.h - 4);
            ctx.fillRect(p.x + p.w - 16, p.y + 4, 6, p.h - 4);
        }
    }

    renderSakura() {
        const ctx = this.ctx;
        ctx.fillStyle = '#ffb3c1';
        for (let p of this.sakuraParticles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderNinja() {
        const ctx = this.ctx;
        const n = this.ninja;

        ctx.save();
        ctx.translate(n.x, n.y);
        if (n.dir === -1) {
            ctx.scale(-1, 1);
        }

        const bob = n.state === 'RUN' ? Math.sin(this.frame * 0.4) * 3 : 0;

        // Ninja Body (Dark Blue/Black Garb)
        ctx.fillStyle = '#161a1d';
        ctx.fillRect(-14, 16 + bob, 28, 24);

        // Legs
        ctx.fillStyle = '#0b090a';
        if (n.state === 'RUN') {
            const step = Math.sin(this.frame * 0.4) * 8;
            ctx.fillRect(-12 + step, 40, 10, 14);
            ctx.fillRect(2 - step, 40, 10, 14);
        } else {
            ctx.fillRect(-12, 40, 10, 14);
            ctx.fillRect(2, 40, 10, 14);
        }

        // Ninja Mask & Head
        ctx.fillStyle = '#212529';
        ctx.fillRect(-12, -2 + bob, 24, 18);

        // White Mask Eyes
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(2, 2 + bob, 8, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(6, 3 + bob, 3, 2);

        // Red Headband & Fluttering Scarf
        ctx.fillStyle = '#e63946';
        ctx.fillRect(-14, -2 + bob, 28, 4);

        // Scarf Tails (Fluttering in wind)
        const scarfFlutter = Math.sin(this.frame * 0.3) * 6;
        ctx.beginPath();
        ctx.moveTo(-14, 0 + bob);
        ctx.lineTo(-26, 4 + bob + scarfFlutter);
        ctx.lineTo(-24, 12 + bob + scarfFlutter);
        ctx.lineTo(-14, 4 + bob);
        ctx.fill();

        // Katana Sword on Back
        ctx.fillStyle = '#ced4da';
        ctx.fillRect(-16, 6 + bob, 4, 30);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(-18, 30 + bob, 8, 4); // Hilt

        ctx.restore();
    }

    renderBombs() {
        const ctx = this.ctx;
        for (let b of this.bombs) {
            ctx.save();
            ctx.translate(b.x, b.y);

            if (b.defused) {
                // Defused Bomb (Greyed out + Smoke)
                ctx.fillStyle = '#495057';
                ctx.beginPath();
                ctx.arc(0, 0, b.isBoss ? 45 : 20, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#212529';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✓ 已安全', 0, 4);
            } else {
                // Active Bomb
                b.pulse += 0.08;
                const scale = 1 + Math.sin(b.pulse) * 0.05;
                ctx.scale(scale, scale);

                // Bomb sphere
                if (b.type === 'freeze') ctx.fillStyle = '#00b4d8';
                else if (b.type === 'combo') ctx.fillStyle = '#7209b7';
                else if (b.isBoss) ctx.fillStyle = '#d90429';
                else ctx.fillStyle = '#212529';

                ctx.beginPath();
                ctx.arc(0, 0, b.isBoss ? 45 : 22, 0, Math.PI * 2);
                ctx.fill();

                // Metallic Cap
                ctx.fillStyle = '#adb5bd';
                ctx.fillRect(-6, b.isBoss ? -52 : -27, 12, 8);

                // Lit Fuse & Sparks
                ctx.strokeStyle = '#ffb703';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, b.isBoss ? -52 : -27);
                ctx.quadraticCurveTo(15, b.isBoss ? -70 : -40, 20, b.isBoss ? -65 : -35);
                ctx.stroke();

                // Sparkles at fuse tip
                if (this.freezeTimer <= 0) {
                    ctx.fillStyle = Math.sin(this.frame * 0.5) > 0 ? '#ff0000' : '#ffff00';
                    ctx.beginPath();
                    ctx.arc(20, b.isBoss ? -65 : -35, 5 + Math.random() * 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Digital Timer overlay
                if (!b.isBoss) {
                    const seconds = Math.ceil(b.fuse / 60);
                    ctx.fillStyle = b.fuse < 180 ? '#e63946' : '#ffb703';
                    ctx.font = 'bold 13px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${seconds}s`, 0, 5);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 13px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`阶段 ${b.bossPhase}/${b.maxPhase}`, 0, 5);
                }

                // Bomb Icon Badge
                if (b.type === 'wire') {
                    ctx.fillStyle = '#e63946';
                    ctx.fillText('✂️', 0, -8);
                } else if (b.type === 'combo') {
                    ctx.fillStyle = '#7209b7';
                    ctx.fillText('⚡', 0, -8);
                }
            }

            ctx.restore();
        }
    }

    renderParticles() {
        const ctx = this.ctx;
        for (let p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderHUD() {
        const ctx = this.ctx;
        const lvl = this.levels[this.levelIndex] || this.levels[0];

        // Top Bar Background
        ctx.fillStyle = 'rgba(11, 9, 10, 0.75)';
        ctx.fillRect(0, 0, this.W, 44);
        ctx.fillStyle = '#e63946';
        ctx.fillRect(0, 42, this.W, 2);

        // Level Title
        ctx.fillStyle = '#f1faee';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(lvl.name, 16, 26);

        // Hearts / Lives
        ctx.fillStyle = '#e63946';
        ctx.font = '16px sans-serif';
        let hearts = '';
        for (let i = 0; i < this.lives; i++) hearts += '❤️ ';
        ctx.fillText(hearts, 220, 26);

        // Score
        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`得分: ${this.score}`, 380, 26);

        // Level Timer
        const sec = Math.ceil(this.levelTimer / 60);
        ctx.fillStyle = sec < 10 ? '#d90429' : '#2a9d8f';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`⏱️ 剩余时间: ${sec}s`, this.W - 20, 26);

        // Freeze Indicator
        if (this.freezeTimer > 0) {
            ctx.fillStyle = '#00b4d8';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('❄️ 引信冻结中！', this.W / 2, 70);
        }
    }

    /* ============================================================
       MODALS & OVERLAYS
       ============================================================ */

    renderMenu() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(11, 9, 10, 0.85)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#e63946';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('忍 者 拆 炸 弹', this.W / 2, 200);

        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('NINJA BOMB DEFUSAL', this.W / 2, 240);

        ctx.fillStyle = '#f1faee';
        ctx.font = '15px sans-serif';
        ctx.fillText('黑夜临近，拯救木叶村的火种！', this.W / 2, 310);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#e63946';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 开始任务', this.W / 2, 420);
        }
    }

    renderWireModal() {
        if (!this.wirePuzzle) return;
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, this.W, this.H);

        const modalW = 440, modalH = 340;
        const modalX = (this.W - modalW) / 2;
        const modalY = (this.H - modalH) / 2;

        // Modal Frame
        ctx.fillStyle = '#161a1d';
        ctx.fillRect(modalX, modalY, modalW, modalH);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 3;
        ctx.strokeRect(modalX, modalY, modalW, modalH);

        // Header
        ctx.fillStyle = '#e63946';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✂️ 忍法·剪线拆弹', this.W / 2, modalY + 36);

        // Scroll Hint
        ctx.fillStyle = '#ffb703';
        ctx.font = '14px sans-serif';
        ctx.fillText(this.wirePuzzle.hintText, this.W / 2, modalY + 80);

        // Render 4 Wires
        const startY = modalY + 120;
        for (let i = 0; i < 4; i++) {
            const w = this.wirePuzzle.wires[i];
            const wy = startY + i * 45;

            ctx.fillStyle = w.hex;
            ctx.fillRect(modalX + 40, wy, modalW - 80, 30);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`剪断 ${w.label}`, this.W / 2, wy + 20);
        }
    }

    renderComboModal() {
        if (!this.comboPuzzle) return;
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, this.W, this.H);

        const modalW = 440, modalH = 260;
        const modalX = (this.W - modalW) / 2;
        const modalY = (this.H - modalH) / 2;

        ctx.fillStyle = '#161a1d';
        ctx.fillRect(modalX, modalY, modalW, modalH);
        ctx.strokeStyle = '#7209b7';
        ctx.lineWidth = 3;
        ctx.strokeRect(modalX, modalY, modalW, modalH);

        ctx.fillStyle = '#7209b7';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ 忍印结印拆弹', this.W / 2, modalY + 36);

        ctx.fillStyle = '#f1faee';
        ctx.font = '14px sans-serif';
        ctx.fillText('请按照下方顺序依次按下方向键：', this.W / 2, modalY + 75);

        // Sequence display
        const seq = this.comboPuzzle.sequence;
        const curIdx = this.comboPuzzle.currentIndex;
        const startX = this.W / 2 - (seq.length * 45) / 2 + 20;

        for (let i = 0; i < seq.length; i++) {
            const item = seq[i];
            const ix = startX + i * 45;
            const iy = modalY + 140;

            if (i < curIdx) {
                ctx.fillStyle = '#2a9d8f'; // Done
            } else if (i === curIdx) {
                ctx.fillStyle = '#ffb703'; // Current target
            } else {
                ctx.fillStyle = '#495057';
            }

            ctx.fillRect(ix - 18, iy - 22, 36, 44);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(item.symbol, ix, iy + 8);
        }
    }

    renderPausedModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#f1faee';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('游 戏 暂 停', this.W / 2, this.H / 2 - 20);

        ctx.fillStyle = '#a8a29e';
        ctx.font = '15px sans-serif';
        ctx.fillText('按 P 键 继续游戏', this.W / 2, this.H / 2 + 30);
    }

    renderGameOverModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#d90429';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('任 务 失 败', this.W / 2, 220);

        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`最终得分: ${this.score}`, this.W / 2, 280);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#f1faee';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('按 Enter 键 重新挑战', this.W / 2, 400);
        }
    }

    renderLevelWinModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#2a9d8f';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('任 务 完 成！', this.W / 2, 200);

        const lvl = this.levels[this.levelIndex];
        ctx.fillStyle = '#f1faee';
        ctx.font = '18px sans-serif';
        ctx.fillText(`顺利拆除 ${lvl.name} 的所有炸弹！`, this.W / 2, 260);

        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`当前总得分: ${this.score}`, this.W / 2, 310);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#e63946';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 进入下一关', this.W / 2, 420);
        }
    }
}

window.NinjaBombGame = NinjaBombGame;
