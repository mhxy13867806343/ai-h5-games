/* ============================================================
   《水果忍者》 Fruit Ninja H5 - HTML5 Canvas Engine
   ============================================================ */

class FruitNinjaGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.W = 900;
        this.H = 650;

        this.state = 'LOADING'; // LOADING, MENU, PLAYING, PAUSED, GAME_OVER
        this.mode = 'CLASSIC';  // CLASSIC, ZEN
        this.frame = 0;

        // Score & Lives & Time
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('fn_high_score') || '0');
        this.lives = 3;
        this.zenTimer = 90 * 60; // 90 seconds in 60fps frames

        // Blade Trail (Mouse / Touch)
        this.bladePath = []; // { x, y, age }
        this.isMouseDown = false;
        this.lastSliceTime = 0;
        this.strokeSlices = 0; // Number of fruits sliced in current stroke

        // Game Entities
        this.fruits = [];        // Whole flying fruits
        this.halfFruits = [];    // Sliced halves
        this.splatters = [];     // Background juice stains
        this.particles = [];     // Sparks & droplets
        this.floatingTexts = []; // Combo & score popups

        // Spawner Control
        this.spawnTimer = 0;
        this.spawnInterval = 75; // frames between fruit waves

        // Bomb Explosion FX
        this.screenFlash = 0;
        this.screenShake = 0;

        // Audio Context
        this.audioCtx = null;

        // Mouse Tracker
        this.mouse = { x: 0, y: 0, px: 0, py: 0 };
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;

        this.setupInputs();
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

            if (type === 'swish') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
            } else if (type === 'splat') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
            } else if (type === 'combo') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.08);
                osc.frequency.setValueAtTime(783, now + 0.16);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'kaboom') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
            }
        } catch (e) {}
    }

    setupInputs() {
        const getCanvasPos = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left) * (this.W / rect.width),
                y: (clientY - rect.top) * (this.H / rect.height)
            };
        };

        const handleStart = (x, y) => {
            this.initAudio();
            this.isMouseDown = true;
            this.mouse.x = x;
            this.mouse.y = y;
            this.mouse.px = x;
            this.mouse.py = y;
            this.bladePath = [{ x, y, age: 0 }];
            this.strokeSlices = 0;

            if (this.state === 'MENU') {
                this.startGame('CLASSIC');
            }
        };

        const handleMove = (x, y) => {
            if (!this.isMouseDown) return;
            this.mouse.px = this.mouse.x;
            this.mouse.py = this.mouse.y;
            this.mouse.x = x;
            this.mouse.y = y;

            const dx = x - this.mouse.px;
            const dy = y - this.mouse.py;
            const dist = Math.hypot(dx, dy);

            if (dist > 8) {
                this.bladePath.push({ x, y, age: 0 });
                if (Math.random() < 0.3) this.playSound('swish');
            }

            if (this.state === 'PLAYING') {
                this.checkSliceCollisions(this.mouse.px, this.mouse.py, x, y);
            }
        };

        const handleEnd = () => {
            this.isMouseDown = false;
            // Check combo on stroke end
            if (this.strokeSlices >= 3) {
                this.playSound('combo');
                const bonus = this.strokeSlices;
                this.score += bonus;
                this.addFloat(`${this.strokeSlices}x COMBO! +${bonus}`, this.mouse.x, this.mouse.y - 20, '#ffbd00', 24);
            }
            this.strokeSlices = 0;
        };

        // Mouse Listeners
        this.canvas.addEventListener('mousedown', e => {
            const p = getCanvasPos(e.clientX, e.clientY);
            handleStart(p.x, p.y);
        });
        this.canvas.addEventListener('mousemove', e => {
            const p = getCanvasPos(e.clientX, e.clientY);
            handleMove(p.x, p.y);
        });
        window.addEventListener('mouseup', handleEnd);

        // Touch Listeners
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.touches[0];
            const p = getCanvasPos(t.clientX, t.clientY);
            handleStart(p.x, p.y);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const t = e.touches[0];
            const p = getCanvasPos(t.clientX, t.clientY);
            handleMove(p.x, p.y);
        }, { passive: false });

        window.addEventListener('touchend', handleEnd);

        // Keyboard
        window.addEventListener('keydown', e => {
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
            }
            if (e.code === 'Enter') {
                if (this.state === 'MENU' || this.state === 'GAME_OVER') {
                    this.startGame('CLASSIC');
                }
            }
        });
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

    startGame(mode = 'CLASSIC') {
        this.mode = mode;
        this.score = 0;
        this.lives = 3;
        this.zenTimer = 90 * 60;
        this.fruits = [];
        this.halfFruits = [];
        this.splatters = [];
        this.particles = [];
        this.floatingTexts = [];
        this.bladePath = [];
        this.spawnTimer = 0;
        this.screenFlash = 0;
        this.screenShake = 0;
        this.state = 'PLAYING';
    }

    restart() {
        this.startGame(this.mode);
    }

    startLoop() {
        const loop = () => {
            this.update();
            this.render();
            this.frame++;
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    /* ============================================================
       UPDATE LOGIC & PHYSICS
       ============================================================ */

    update() {
        if (this.screenShake > 0) this.screenShake--;
        if (this.screenFlash > 0) this.screenFlash--;

        // Fade Blade Trail Path
        for (let i = this.bladePath.length - 1; i >= 0; i--) {
            this.bladePath[i].age += 1;
            if (this.bladePath[i].age > 10) {
                this.bladePath.splice(i, 1);
            }
        }

        if (this.state !== 'PLAYING') return;

        // Zen Timer
        if (this.mode === 'ZEN') {
            this.zenTimer--;
            if (this.zenTimer <= 0) {
                this.triggerGameOver('时间耗尽！');
                return;
            }
        }

        // Spawn Fruit Waves
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnWave();
        }

        // Update Flying Fruits
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            let f = this.fruits[i];
            f.x += f.vx;
            f.y += f.vy;
            f.vy += f.gravity;
            f.rotation += f.vr;

            // Check dropped un-sliced fruit (Classic Mode lost life)
            if (f.y > this.H + 50 && f.vy > 0) {
                if (this.mode === 'CLASSIC' && !f.isBomb) {
                    this.lives--;
                    this.addFloat('❌', f.x, this.H - 40, '#d90429', 30);
                    if (this.lives <= 0) {
                        this.triggerGameOver('丢球过半！');
                        return;
                    }
                }
                this.fruits.splice(i, 1);
            }
        }

        // Update Cut Halves
        for (let i = this.halfFruits.length - 1; i >= 0; i--) {
            let h = this.halfFruits[i];
            h.x += h.vx;
            h.y += h.vy;
            h.vy += h.gravity;
            h.rotation += h.vr;
            h.alpha -= 0.008;

            if (h.y > this.H + 80 || h.alpha <= 0) {
                this.halfFruits.splice(i, 1);
            }
        }

        // Update Juice Splatters (fade over long time)
        for (let i = this.splatters.length - 1; i >= 0; i--) {
            this.splatters[i].alpha -= 0.001;
            if (this.splatters[i].alpha <= 0) this.splatters.splice(i, 1);
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.y -= 1.2;
            ft.life--;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    spawnWave() {
        const count = 1 + Math.floor(Math.random() * 3);
        const types = ['watermelon', 'apple', 'banana', 'orange', 'pineapple', 'strawberry', 'coconut'];

        for (let i = 0; i < count; i++) {
            // Spawn Bomb (15% chance in Classic Mode, 0% in Zen Mode)
            const isBomb = (this.mode === 'CLASSIC' && Math.random() < 0.18);
            const type = isBomb ? 'bomb' : types[Math.floor(Math.random() * types.length)];

            const startX = 120 + Math.random() * (this.W - 240);
            const vx = (this.W / 2 - startX) * 0.012 + (Math.random() - 0.5) * 3;
            const vy = -(13 + Math.random() * 4);
            const radius = isBomb ? 32 : (type === 'watermelon' ? 38 : (type === 'pineapple' ? 40 : 28));

            this.fruits.push({
                type, isBomb,
                x: startX, y: this.H + 40,
                vx, vy, gravity: 0.38,
                radius, rotation: 0,
                vr: (Math.random() - 0.5) * 0.1
            });
        }
    }

    checkSliceCollisions(x1, y1, x2, y2) {
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            let f = this.fruits[i];
            const dist = this.distToSegment({ x: f.x, y: f.y }, { x: x1, y: y1 }, { x: x2, y: y2 });

            if (dist < f.radius) {
                // Sliced fruit or bomb!
                if (f.isBomb) {
                    this.playSound('kaboom');
                    this.screenFlash = 15;
                    this.screenShake = 20;
                    this.triggerGameOver('爆炸！');
                    return;
                } else {
                    this.sliceFruit(f, i, x1, y1, x2, y2);
                }
            }
        }
    }

    sliceFruit(f, index, x1, y1, x2, y2) {
        this.playSound('splat');
        this.fruits.splice(index, 1);

        // Score & Stroke Combo
        const isCritical = Math.random() < 0.1;
        const pts = isCritical ? 10 : 1;
        this.score += pts;
        this.strokeSlices++;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('fn_high_score', this.highScore.toString());
        }

        if (isCritical) {
            this.addFloat('暴击! +10', f.x, f.y - 25, '#ffbd00', 22);
        } else {
            this.addFloat(`+${pts}`, f.x, f.y - 15, '#ffffff', 18);
        }

        // Compute cut angle slope
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Spawn Juice Splatter Stain on background
        this.splatters.push({
            x: f.x, y: f.y,
            radius: f.radius * (1.2 + Math.random() * 0.6),
            color: this.getFruitJuiceColor(f.type),
            alpha: 0.6
        });

        // Spawn 2 Sliced Halves
        const perpX = Math.cos(angle + Math.PI / 2) * 5;
        const perpY = Math.sin(angle + Math.PI / 2) * 5;

        // Left Half
        this.halfFruits.push({
            type: f.type, side: 'left',
            x: f.x - perpX, y: f.y - perpY,
            vx: f.vx - 3 - Math.random() * 2, vy: f.vy - 2,
            gravity: 0.4, rotation: f.rotation, vr: -0.15,
            radius: f.radius, angle, alpha: 1
        });

        // Right Half
        this.halfFruits.push({
            type: f.type, side: 'right',
            x: f.x + perpX, y: f.y + perpY,
            vx: f.vx + 3 + Math.random() * 2, vy: f.vy - 2,
            gravity: 0.4, rotation: f.rotation, vr: +0.15,
            radius: f.radius, angle, alpha: 1
        });

        // Spawn Juice Particle Droplets
        for (let k = 0; k < 16; k++) {
            const spd = 2 + Math.random() * 6;
            const pAngle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: f.x, y: f.y,
                vx: Math.cos(pAngle) * spd,
                vy: Math.sin(pAngle) * spd,
                color: this.getFruitJuiceColor(f.type),
                size: 3 + Math.random() * 4,
                life: 20 + Math.random() * 20
            });
        }
    }

    triggerGameOver(reason) {
        this.state = 'GAME_OVER';
        this.gameOverReason = reason;
    }

    getFruitJuiceColor(type) {
        switch (type) {
            case 'watermelon': return '#e63946';
            case 'apple': return '#ffccd5';
            case 'banana': return '#ffb703';
            case 'orange': return '#fb8500';
            case 'pineapple': return '#e9c46a';
            case 'strawberry': return '#d90429';
            case 'coconut': return '#f4f1de';
            default: return '#ff5400';
        }
    }

    distToSegment(p, v, w) {
        const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    addFloat(text, x, y, color = '#ffbd00', size = 20) {
        this.floatingTexts.push({ text, x, y, color, size, life: 50 });
    }

    /* ============================================================
       RENDER LOGIC (DOJO WOODEN WALL & FRUIT GRAPHICS)
       ============================================================ */

    render() {
        const ctx = this.ctx;

        // Apply Screen Shake / Flash FX
        ctx.save();
        if (this.screenShake > 0) {
            const rx = (Math.random() - 0.5) * 16;
            const ry = (Math.random() - 0.5) * 16;
            ctx.translate(rx, ry);
        }

        // Draw Wooden Dojo Wall Background
        this.renderDojoBackground();

        // Draw Juice Splatters
        for (let s of this.splatters) {
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        if (this.state === 'MENU') {
            this.renderMenu();
        } else {
            // Draw Sliced Halves
            for (let h of this.halfFruits) this.renderHalfFruit(h);

            // Draw Whole Flying Fruits
            for (let f of this.fruits) this.renderFruit(f);

            // Draw Particles & Droplets
            for (let p of this.particles) {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Glowing Blade Trail
            this.renderBladeTrail();

            // Draw Floating Texts
            for (let ft of this.floatingTexts) {
                ctx.fillStyle = ft.color;
                ctx.font = `bold ${ft.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(ft.text, ft.x, ft.y);
            }

            // Draw HUD
            this.renderHUD();

            if (this.state === 'PAUSED') this.renderPauseModal();
            if (this.state === 'GAME_OVER') this.renderGameOverModal();
        }

        // Flash FX
        if (this.screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlash / 15})`;
            ctx.fillRect(0, 0, this.W, this.H);
        }

        ctx.restore();
    }

    renderDojoBackground() {
        const ctx = this.ctx;
        // Dark mahogany wooden dojo texture
        ctx.fillStyle = '#26170d';
        ctx.fillRect(0, 0, this.W, this.H);

        // Wood Planks Grid
        ctx.strokeStyle = '#1a0e07';
        ctx.lineWidth = 4;
        for (let y = 0; y < this.H; y += 80) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.W, y);
            ctx.stroke();
        }
    }

    renderFruit(f) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        if (f.isBomb) {
            // Render Shiny Metal Bomb 💣
            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Fuse Spark
            ctx.fillStyle = '#ffbd00';
            ctx.beginPath();
            ctx.arc(0, -f.radius - 4, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Render Fruit Circle & Outer Skin
            let skinColor = '#2a9d8f';
            if (f.type === 'watermelon') skinColor = '#2a9d8f';
            else if (f.type === 'apple') skinColor = '#d90429';
            else if (f.type === 'banana') skinColor = '#ffb703';
            else if (f.type === 'orange') skinColor = '#fb8500';
            else if (f.type === 'pineapple') skinColor = '#e9c46a';
            else if (f.type === 'strawberry') skinColor = '#e63946';
            else if (f.type === 'coconut') skinColor = '#540b0e';

            ctx.fillStyle = skinColor;
            ctx.beginPath();
            ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }

    renderHalfFruit(h) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = h.alpha;
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);

        const fleshColor = this.getFruitJuiceColor(h.type);

        ctx.beginPath();
        if (h.side === 'left') {
            ctx.arc(0, 0, h.radius, Math.PI * 0.5, Math.PI * 1.5);
        } else {
            ctx.arc(0, 0, h.radius, Math.PI * 1.5, Math.PI * 0.5);
        }
        ctx.closePath();

        ctx.fillStyle = fleshColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    renderBladeTrail() {
        if (this.bladePath.length < 2) return;
        const ctx = this.ctx;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer Glow Trail
        ctx.strokeStyle = 'rgba(255, 189, 0, 0.6)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(this.bladePath[0].x, this.bladePath[0].y);
        for (let i = 1; i < this.bladePath.length; i++) {
            ctx.lineTo(this.bladePath[i].x, this.bladePath[i].y);
        }
        ctx.stroke();

        // Inner White Laser Core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.restore();
    }

    renderHUD() {
        const ctx = this.ctx;

        // Top Bar Header
        ctx.fillStyle = 'rgba(28, 21, 16, 0.85)';
        ctx.fillRect(0, 0, this.W, 50);

        ctx.fillStyle = '#ffbd00';
        ctx.font = 'bold 22px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🍉 得分: ${this.score}`, 20, 34);

        ctx.fillStyle = '#d4a373';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`最高纪录: ${this.highScore}`, 200, 33);

        if (this.mode === 'CLASSIC') {
            // Render Lives (❌❌❌)
            ctx.textAlign = 'right';
            let livesStr = '';
            for (let i = 0; i < 3; i++) {
                livesStr += (i < this.lives) ? '🔴 ' : '❌ ';
            }
            ctx.fillText(`生命: ${livesStr}`, this.W - 20, 33);
        } else {
            // Render Zen Timer
            ctx.textAlign = 'right';
            const sec = Math.ceil(this.zenTimer / 60);
            ctx.fillText(`⏱️ 倒计时: ${sec} 秒`, this.W - 20, 33);
        }
    }

    renderMenu() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(15, 11, 8, 0.85)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#ff5400';
        ctx.font = '900 52px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FRUIT NINJA', this.W / 2, 200);

        ctx.fillStyle = '#ffbd00';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('水 果 忍 者', this.W / 2, 255);

        ctx.fillStyle = '#fff3b0';
        ctx.font = '16px sans-serif';
        ctx.fillText('挥舞光刃，切开飞舞的水果！', this.W / 2, 330);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#ffbd00';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 或 拖拽鼠标 开始切水果！', this.W / 2, 450);
        }
    }

    renderPauseModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#ffbd00';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已 暂 停', this.W / 2, 300);

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.fillText('按 P 键 继续游戏', this.W / 2, 360);
    }

    renderGameOverModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#d90429';
        ctx.font = '900 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('游 戏 结 束', this.W / 2, 220);

        ctx.fillStyle = '#ffbd00';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`最终得分: ${this.score}`, this.W / 2, 290);

        ctx.fillStyle = '#d4a373';
        ctx.font = '16px sans-serif';
        ctx.fillText(`最高纪录: ${this.highScore}`, this.W / 2, 330);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#ff5400';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 重新挑战！', this.W / 2, 440);
        }
    }
}

window.FruitNinjaGame = FruitNinjaGame;
