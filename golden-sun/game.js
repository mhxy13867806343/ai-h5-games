/* ============================================================
   《黄金太阳》 Golden Sun RPG - HTML5 Canvas Engine
   ============================================================ */

class GoldenSunGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.W = 900;
        this.H = 650;

        this.state = 'LOADING'; // LOADING, MENU, DUNGEON_EXPLORE, BATTLE, DIALOGUE, GAME_OVER, BATTLE_WIN
        this.frame = 0;

        // Player Party (4 Element Adepts)
        this.party = [];

        // Djinni Collection Count (地水火风)
        this.djinnCount = { venus: 2, mars: 2, jupiter: 1, mercury: 1 };

        // Story Chapters / Dungeons
        this.chapters = [
            {
                id: 1,
                name: '第一章：阿尔法山索力遗迹',
                mapName: 'Sol Sanctum',
                bgType: 'temple',
                puzzleSolved: false,
                pillarX: 420, pillarY: 280,
                targetX: 580, targetY: 280,
                enemies: [
                    { name: '神殿高木精', hp: 260, maxHp: 260, atk: 45, def: 18, icon: '🌿' },
                    { name: '岩石守卫', hp: 320, maxHp: 320, atk: 52, def: 25, icon: '🗿' }
                ]
            },
            {
                id: 2,
                name: '第二章：水之灯塔决战',
                mapName: 'Mercury Lighthouse',
                bgType: 'water_tower',
                puzzleSolved: true,
                enemies: [
                    { name: '萨图罗斯 (Saturos)', hp: 950, maxHp: 950, atk: 95, def: 36, isBoss: true, icon: '👹' },
                    { name: '墨诺斯 (Menardi)', hp: 780, maxHp: 780, atk: 85, def: 30, icon: '🧙‍♀️' }
                ]
            },
            {
                id: 3,
                name: '第三章：黄金太阳古之祭坛',
                mapName: 'Golden Sun Altar',
                bgType: 'golden_shrine',
                puzzleSolved: true,
                enemies: [
                    { name: '双头巨龙萨图罗斯', hp: 1600, maxHp: 1600, atk: 120, def: 42, isBoss: true, icon: '🐉' }
                ]
            }
        ];

        this.chapterIndex = 0;

        // Player Position in Dungeon Exploration
        this.playerMapPos = { x: 220, y: 320, vx: 0, vy: 0, speed: 4 };

        // Battle State
        this.currentEnemies = [];
        this.selectedPartyMember = 0;
        this.battleAction = null; // 'ATTACK', 'PSYNERGY', 'SUMMON', 'HEAL'

        // FX & Animations
        this.particles = [];
        this.floatingTexts = [];
        this.screenShake = 0;
        this.screenFlash = 0;

        // Web Audio Synth
        this.audioCtx = null;

        // Keys & Inputs
        this.keys = {};
        this.mouse = { x: 0, y: 0, clicked: false };
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.setupInputs();
        this.runLoadingSequence();
    }

    initParty() {
        this.party = [
            {
                id: 1, name: '罗宾 (Robin)', element: '地 (Venus)', icon: '🗡️',
                hp: 480, maxHp: 480, pp: 120, maxPp: 120, atk: 78, def: 32,
                skills: [
                    { name: '盖亚岩击', ppCost: 15, dmg: 1.6, type: 'venus', icon: '🪨' },
                    { name: '索力 (Move)', ppCost: 5, type: 'utility', icon: '🖐️' }
                ]
            },
            {
                id: 2, name: '杰拉德 (Gerald)', element: '火 (Mars)', icon: '⚔️',
                hp: 520, maxHp: 520, pp: 90, maxPp: 90, atk: 88, def: 28,
                skills: [
                    { name: '爆炎火龙', ppCost: 20, dmg: 1.9, type: 'mars', icon: '🔥' }
                ]
            },
            {
                id: 3, name: '伊万 (Ivan)', element: '风 (Jupiter)', icon: '🪶',
                hp: 360, maxHp: 360, pp: 160, maxPp: 160, atk: 62, def: 20,
                skills: [
                    { name: '狂雷电闪', ppCost: 25, dmg: 2.2, type: 'jupiter', icon: '⚡' },
                    { name: '读心术', ppCost: 5, type: 'utility', icon: '🧠' }
                ]
            },
            {
                id: 4, name: '米雅莉 (Mia)', element: '水 (Mercury)', icon: '💧',
                hp: 400, maxHp: 400, pp: 180, maxPp: 180, atk: 55, def: 24,
                skills: [
                    { name: '祈祷治愈', ppCost: 18, heal: 180, type: 'heal', icon: '💊' },
                    { name: '冰棱封印', ppCost: 22, dmg: 1.7, type: 'mercury', icon: '❄️' }
                ]
            }
        ];
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

            if (type === 'hit') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (type === 'psynergy') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(350, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
            } else if (type === 'summon') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.1);
                osc.frequency.setValueAtTime(659, now + 0.2);
                osc.frequency.setValueAtTime(880, now + 0.3);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                osc.start(now); osc.stop(now + 0.45);
            }
        } catch (e) {}
    }

    setupInputs() {
        window.addEventListener('keydown', e => {
            this.initAudio();
            this.keys[e.code] = true;

            if (e.code === 'Enter') {
                if (this.state === 'MENU') {
                    this.startChapter(0);
                } else if (this.state === 'DUNGEON_EXPLORE') {
                    // Trigger Puzzle or Encounter
                    this.tryTriggerPsynergy();
                } else if (this.state === 'GAME_OVER' || this.state === 'BATTLE_WIN') {
                    this.startChapter(0);
                }
            }

            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === 'DUNGEON_EXPLORE' || this.state === 'BATTLE') {
                    this.state = (this.state === 'PAUSED') ? 'DUNGEON_EXPLORE' : 'PAUSED';
                }
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });

        const getPos = e => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (this.W / rect.width),
                y: (e.clientY - rect.top) * (this.H / rect.height)
            };
        };

        this.canvas.addEventListener('mousedown', e => {
            this.initAudio();
            const pos = getPos(e);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            this.mouse.clicked = true;
            this.handleCanvasClick();
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

    startChapter(index) {
        this.chapterIndex = index;
        this.initParty();
        this.playerMapPos = { x: 180, y: 320, vx: 0, vy: 0, speed: 4 };

        const chap = this.chapters[this.chapterIndex];
        this.currentEnemies = JSON.parse(JSON.stringify(chap.enemies));
        this.state = 'DUNGEON_EXPLORE';
    }

    restart() {
        this.startChapter(0);
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

    /* ============================================================
       UPDATE & GAME LOGIC
       ============================================================ */

    update() {
        if (this.screenShake > 0) this.screenShake--;
        if (this.screenFlash > 0) this.screenFlash--;

        // Floating texts update
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.y -= 1.2;
            ft.life--;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // Particles update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life--;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }

        // Dungeon Player Movement (WASD / Arrows)
        if (this.state === 'DUNGEON_EXPLORE') {
            let dx = 0, dy = 0;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
            if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;

            if (dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                this.playerMapPos.x += (dx / len) * this.playerMapPos.speed;
                this.playerMapPos.y += (dy / len) * this.playerMapPos.speed;

                // Clamp to canvas bounds
                this.playerMapPos.x = Math.max(60, Math.min(this.W - 60, this.playerMapPos.x));
                this.playerMapPos.y = Math.max(120, Math.min(this.H - 80, this.playerMapPos.y));

                // Random encounter check in wild (5% chance when moving)
                if (Math.random() < 0.006) {
                    this.startBattle();
                }
            }

            // Check if player reached right sanctuary exit
            const chap = this.chapters[this.chapterIndex];
            if (chap.puzzleSolved && this.playerMapPos.x > this.W - 100) {
                this.startBattle();
            }
        }
    }

    tryTriggerPsynergy() {
        const chap = this.chapters[this.chapterIndex];
        if (!chap.puzzleSolved) {
            // Check if player near stone pillar
            const dist = Math.hypot(this.playerMapPos.x - chap.pillarX, this.playerMapPos.y - chap.pillarY);
            if (dist < 120) {
                this.playSound('psynergy');
                chap.pillarX = chap.targetX;
                chap.puzzleSolved = true;
                this.addFloat('精神力：索力 (Move) 推开巨石！', chap.pillarX, chap.pillarY - 30, '#fef08a', 20);
                this.spawnParticles(chap.pillarX, chap.pillarY, '#f59e0b');
            }
        }
    }

    startBattle() {
        this.state = 'BATTLE';
        this.selectedPartyMember = 0;
        this.addFloat('进入战斗！战歌响起！', this.W / 2, 200, '#fef08a', 24);
    }

    handleCanvasClick() {
        if (this.state === 'MENU') {
            this.startChapter(0);
            return;
        }

        if (this.state === 'DUNGEON_EXPLORE') {
            this.tryTriggerPsynergy();
            return;
        }

        if (this.state === 'BATTLE') {
            this.handleBattleMenuClick();
        }
    }

    handleBattleMenuClick() {
        const mx = this.mouse.x;
        const my = this.mouse.y;

        // Command Buttons: [⚔️ 普通物理斩击, 🔮 精神力魔法, 🧞 元素精灵召唤, 💊 全员恢复]
        const btnY = this.H - 90;
        const btnW = 180, btnH = 46;
        const startX = 70;

        for (let i = 0; i < 4; i++) {
            const bx = startX + i * 200;
            if (mx >= bx && mx <= bx + btnW && my >= btnY && my <= btnY + btnH) {
                if (i === 0) this.executePartyAction('ATTACK');
                else if (i === 1) this.executePartyAction('PSYNERGY');
                else if (i === 2) this.executePartyAction('SUMMON');
                else if (i === 3) this.executePartyAction('HEAL');
                return;
            }
        }
    }

    executePartyAction(actionType) {
        const attacker = this.party[this.selectedPartyMember];
        const aliveEnemies = this.currentEnemies.filter(e => e.hp > 0);
        if (aliveEnemies.length === 0) return;

        const target = aliveEnemies[0];

        if (actionType === 'ATTACK') {
            this.playSound('hit');
            let dmg = Math.floor(attacker.atk * (0.9 + Math.random() * 0.3));
            target.hp -= dmg;
            this.addFloat(`-${dmg}`, 600, 240, '#ef4444', 22);
            this.spawnParticles(600, 240, '#ef4444');
        } else if (actionType === 'PSYNERGY') {
            if (attacker.pp >= 15) {
                attacker.pp -= 15;
                this.playSound('psynergy');
                this.screenShake = 8;
                let dmg = Math.floor(attacker.atk * 1.8);
                target.hp -= dmg;
                this.addFloat(`-${dmg} (盖亚/爆炎/狂雷)`, 600, 240, '#fef08a', 24);
                this.spawnParticles(600, 240, '#f59e0b');
            } else {
                this.addFloat('PP不足！', 600, 240, '#a8a29e', 18);
            }
        } else if (actionType === 'SUMMON') {
            // Summon Judgement / Asura Magic
            this.playSound('summon');
            this.screenShake = 15;
            this.screenFlash = 10;
            for (let e of aliveEnemies) {
                let dmg = 380;
                e.hp -= dmg;
                this.addFloat(`-${dmg} 审判巨神召唤!`, 600, 200, '#eab308', 26);
                this.spawnParticles(600, 200, '#eab308');
            }
        } else if (actionType === 'HEAL') {
            this.playSound('psynergy');
            for (let p of this.party) {
                p.hp = Math.min(p.maxHp, p.hp + 150);
            }
            this.addFloat('+150 HP 元素祈祷', 250, 300, '#22c55e', 22);
        }

        // Check enemies dead
        const allEnemiesDead = this.currentEnemies.every(e => e.hp <= 0);
        if (allEnemiesDead) {
            this.playSound('summon');
            setTimeout(() => {
                this.chapterIndex++;
                if (this.chapterIndex >= this.chapters.length) {
                    this.state = 'BATTLE_WIN';
                } else {
                    this.startChapter(this.chapterIndex);
                }
            }, 800);
            return;
        }

        // Enemy Counterattack
        setTimeout(() => {
            this.enemyCounterattack();
        }, 600);
    }

    enemyCounterattack() {
        const aliveEnemies = this.currentEnemies.filter(e => e.hp > 0);
        const aliveParty = this.party.filter(p => p.hp > 0);
        if (aliveEnemies.length === 0 || aliveParty.length === 0) return;

        const enemy = aliveEnemies[0];
        const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

        this.playSound('hit');
        let dmg = Math.floor(enemy.atk * (0.8 + Math.random() * 0.4));
        target.hp -= dmg;
        if (target.hp <= 0) target.hp = 0;

        this.addFloat(`-${dmg}`, 250, 260, '#ef4444', 20);
        this.spawnParticles(250, 260, '#ef4444');

        const allPartyDead = this.party.every(p => p.hp <= 0);
        if (allPartyDead) {
            this.state = 'GAME_OVER';
        }
    }

    addFloat(text, x, y, color = '#fef08a', size = 20) {
        this.floatingTexts.push({ text, x, y, color, size, life: 60 });
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color,
                size: 3 + Math.random() * 4,
                life: 15 + Math.random() * 15
            });
        }
    }

    /* ============================================================
       RENDER LOGIC
       ============================================================ */

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(0, 0, this.W, this.H);

        if (this.state === 'MENU') {
            this.renderMenu();
            return;
        }

        if (this.state === 'DUNGEON_EXPLORE') {
            this.renderDungeonMap();
            this.renderDungeonHUD();
        } else if (this.state === 'BATTLE') {
            this.renderBattleScreen();
        }

        if (this.state === 'GAME_OVER') this.renderGameOverModal();
        if (this.state === 'BATTLE_WIN') this.renderWinModal();

        this.renderParticles();
        this.renderFloats();

        if (this.screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 240, 138, ${this.screenFlash / 10})`;
            ctx.fillRect(0, 0, this.W, this.H);
        }
    }

    renderMenu() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(12, 10, 9, 0.9)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 48px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('黄 金 太 阳', this.W / 2, 200);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('GOLDEN SUN - THE BROKEN SEAL', this.W / 2, 245);

        ctx.fillStyle = '#a8a29e';
        ctx.font = '15px sans-serif';
        ctx.fillText('踏上四大元素精神力拯救之旅，唤醒封印的古之召唤！', this.W / 2, 320);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 或 点击 进入阿尔法山遗迹', this.W / 2, 440);
        }
    }

    renderDungeonMap() {
        const ctx = this.ctx;
        const chap = this.chapters[this.chapterIndex];

        // Draw Ancient Sanctuary Floor Tiles
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(40, 80, this.W - 80, this.H - 140);
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 80, this.W - 80, this.H - 140);

        // Draw Stone Pillars & Puzzle Mechanism
        if (chap.id === 1) {
            ctx.fillStyle = chap.puzzleSolved ? '#22c55e' : '#f59e0b';
            ctx.fillRect(chap.pillarX - 25, chap.pillarY - 35, 50, 70);
            ctx.strokeStyle = '#fef08a';
            ctx.strokeRect(chap.pillarX - 25, chap.pillarY - 35, 50, 70);

            ctx.fillStyle = '#ffffff';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('巨石柱', chap.pillarX, chap.pillarY);

            // Target Door
            ctx.strokeStyle = chap.puzzleSolved ? '#22c55e' : '#ef4444';
            ctx.lineWidth = 4;
            ctx.strokeRect(this.W - 110, 240, 60, 100);
            ctx.fillStyle = chap.puzzleSolved ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
            ctx.fillRect(this.W - 110, 240, 60, 100);
        }

        // Draw Player Robin Sprite Icon
        const p = this.playerMapPos;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🗡️', p.x, p.y + 7);
    }

    renderDungeonHUD() {
        const ctx = this.ctx;
        const chap = this.chapters[this.chapterIndex];

        ctx.fillStyle = 'rgba(28, 25, 23, 0.9)';
        ctx.fillRect(0, 0, this.W, 50);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 16px "Noto Serif SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🗺️ ${chap.name} (${chap.mapName})`, 20, 30);

        ctx.fillStyle = '#a8a29e';
        ctx.font = '14px sans-serif';
        ctx.fillText('提示: 靠近石柱按 Enter 释放【索力 Move】解谜', 360, 30);
    }

    renderBattleScreen() {
        const ctx = this.ctx;

        // Battle Stage Background
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, this.W, this.H - 120);

        // Render Party Members (Left)
        for (let i = 0; i < this.party.length; i++) {
            const p = this.party[i];
            const px = 140;
            const py = 140 + i * 85;

            ctx.fillStyle = p.hp > 0 ? '#44403c' : '#1c1917';
            ctx.fillRect(px - 40, py - 30, 200, 65);
            ctx.strokeStyle = '#f59e0b';
            ctx.strokeRect(px - 40, py - 30, 200, 65);

            ctx.font = '24px sans-serif';
            ctx.fillText(p.icon, px - 20, py + 10);

            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(p.name, px + 10, py - 10);

            // HP / PP Bars
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(px + 10, py, 130 * (p.hp / p.maxHp), 6);

            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(px + 10, py + 10, 130 * (p.pp / p.maxPp), 6);
        }

        // Render Enemies (Right)
        for (let i = 0; i < this.currentEnemies.length; i++) {
            const e = this.currentEnemies[i];
            if (e.hp <= 0) continue;
            const ex = 620;
            const ey = 180 + i * 140;

            ctx.fillStyle = e.isBoss ? '#ef4444' : '#b45309';
            ctx.beginPath();
            ctx.arc(ex, ey, e.isBoss ? 45 : 32, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.font = e.isBoss ? '40px sans-serif' : '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(e.icon, ex, ey + 12);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(e.name, ex, ey - 50);

            // Enemy HP Bar
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(ex - 50, ey + 45, 100, 6);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(ex - 50, ey + 45, 100 * (e.hp / e.maxHp), 6);
        }

        // Bottom Action Menu Panel
        const menuY = this.H - 110;
        ctx.fillStyle = 'rgba(12, 10, 9, 0.95)';
        ctx.fillRect(0, menuY, this.W, 110);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, menuY, this.W, 110);

        const opts = ['⚔️ 普通物理斩击', '🔮 精神力魔法', '🧞 元素精灵召唤', '💊 全员恢复'];
        const btnW = 180, btnH = 46;
        const startX = 70;

        for (let i = 0; i < 4; i++) {
            const bx = startX + i * 200;
            const by = menuY + 30;

            ctx.fillStyle = '#b45309';
            ctx.fillRect(bx, by, btnW, btnH);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, btnW, btnH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Noto Serif SC", serif';
            ctx.textAlign = 'center';
            ctx.fillText(opts[i], bx + btnW / 2, by + 28);
        }
    }

    renderGameOverModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('全 员 战 败', this.W / 2, 240);

        ctx.fillStyle = '#a8a29e';
        ctx.font = '16px sans-serif';
        ctx.fillText('精神力耗尽，四大元素陷入黑暗...', this.W / 2, 300);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('按 Enter 键 重新挑战', this.W / 2, 420);
        }
    }

    renderWinModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('黄 金 太 阳·光 辉 拯救！', this.W / 2, 220);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '16px sans-serif';
        ctx.fillText('罗宾与四大元素战士守护了封印，世界重获光明！', this.W / 2, 290);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 重温史诗篇章', this.W / 2, 420);
        }
    }

    renderParticles() {
        const ctx = this.ctx;
        for (let pt of this.particles) {
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderFloats() {
        const ctx = this.ctx;
        for (let f of this.floatingTexts) {
            ctx.fillStyle = f.color;
            ctx.font = `bold ${f.size}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(f.text, f.x, f.y);
        }
    }
}

window.GoldenSunGame = GoldenSunGame;
