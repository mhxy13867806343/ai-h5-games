/* ============================================================
   《三国志：曹操传》 Legend of Cao Cao SLG - HTML5 Canvas Engine
   ============================================================ */

class CaoCaoGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.W = 900;
        this.H = 650;

        this.state = 'LOADING'; // LOADING, MENU, MAP_BATTLE, ACTION_MENU, SKILL_SELECT, DIALOGUE, BATTLE_WIN, GAME_OVER
        this.frame = 0;

        // Grid Dimensions (12 cols x 9 rows)
        this.cols = 12;
        this.rows = 9;
        this.tileSize = 64;
        this.offsetX = 65;
        this.offsetY = 60;

        // Alignment Morality (0 = Neutral, +100 = Red Overlord, -100 = Blue Hero)
        this.alignment = 20;

        // Campaign Chapters
        this.chapters = [
            {
                id: 1, name: '第一战：颍川平定战',
                mapType: 'plain',
                desc: '黄巾贼妖术作乱颍川，曹操引骑兵围歼贼寇！',
                enemies: [
                    { name: '波才', class: '黄巾头领', hp: 280, maxHp: 280, atk: 45, def: 18, gx: 9, gy: 2, icon: '👹', isLeader: true },
                    { name: '黄巾兵A', class: '步兵', hp: 180, maxHp: 180, atk: 35, def: 12, gx: 8, gy: 4, icon: '🥷' },
                    { name: '黄巾兵B', class: '弓兵', hp: 160, maxHp: 160, atk: 38, def: 10, gx: 10, gy: 6, icon: '🏹' }
                ]
            },
            {
                id: 2, name: '第二战：虎牢关迎击战',
                mapType: 'castle',
                desc: '联军讨伐董卓，虎牢关前鬼神吕布横刀立马！',
                enemies: [
                    { name: '吕布', class: '飞将骑兵', hp: 650, maxHp: 650, atk: 95, def: 35, gx: 10, gy: 4, icon: '🐎', isLeader: true },
                    { name: '张辽', class: '重骑兵', hp: 420, maxHp: 420, atk: 70, def: 28, gx: 9, gy: 2, icon: '⚔️' },
                    { name: '高顺', class: '陷阵步兵', hp: 380, maxHp: 380, atk: 60, def: 30, gx: 9, gy: 6, icon: '🛡️' }
                ]
            },
            {
                id: 3, name: '第三战：官渡大战',
                mapType: 'plain',
                desc: '曹操奇袭乌巢粮仓，决战袁绍七十万河北大军！',
                enemies: [
                    { name: '袁绍', class: '主公', hp: 800, maxHp: 800, atk: 75, def: 32, gx: 10, gy: 4, icon: '👑', isLeader: true },
                    { name: '颜良', class: '狂暴骑兵', hp: 520, maxHp: 520, atk: 85, def: 24, gx: 8, gy: 2, icon: '⚔️' },
                    { name: '文丑', class: '重锤步兵', hp: 500, maxHp: 500, atk: 80, def: 26, gx: 8, gy: 6, icon: '🔨' }
                ]
            },
            {
                id: 4, name: '第四战：赤壁火攻决战',
                mapType: 'river',
                desc: '战船连环受阻，周瑜借东风赤壁大火决战！',
                enemies: [
                    { name: '周瑜', class: '大都督策士', hp: 900, maxHp: 900, atk: 90, def: 35, gx: 10, gy: 4, icon: '🔥', isLeader: true },
                    { name: '诸葛亮', class: '卧龙奇门', hp: 850, maxHp: 850, atk: 95, def: 30, gx: 10, gy: 1, icon: '🪶' },
                    { name: '甘宁', class: '水军先锋', hp: 600, maxHp: 600, atk: 85, def: 25, gx: 8, gy: 7, icon: '⚓' }
                ]
            }
        ];

        this.chapterIndex = 0;

        // Player Officers List
        this.playerUnits = [];

        // Grid Map Data
        this.mapGrid = [];

        // Turn Management
        this.phase = 'PLAYER_TURN'; // 'PLAYER_TURN', 'ENEMY_TURN'
        this.selectedUnit = null;
        this.moveRangeTiles = [];
        this.attackRangeTiles = [];
        this.activeMenu = null; // null or { gx, gy, options }

        // FX & Animations
        this.particles = [];
        this.floatingTexts = [];
        this.screenShake = 0;
        this.screenFlash = null;

        // Web Audio Synth
        this.audioCtx = null;

        // Mouse & Input
        this.mouse = { gx: 0, gy: 0, px: 0, py: 0, clicked: false };
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.setupInputs();
        this.runLoadingSequence();
    }

    initUnits() {
        // Init Player Wei Generals
        this.playerUnits = [
            {
                id: 1, name: '曹操', class: '霸王主公', icon: '👑',
                hp: 450, maxHp: 450, atk: 65, def: 28, mov: 4, range: 1,
                gx: 1, gy: 4, done: false,
                skills: [
                    { name: '霸者之剑', mpCost: 15, dmg: 1.5, type: 'atk', icon: '⚔️' },
                    { name: '三军鼓舞', mpCost: 20, buff: 'atk', icon: '🚩' }
                ]
            },
            {
                id: 2, name: '夏侯惇', class: '重骑兵', icon: '🐎',
                hp: 500, maxHp: 500, atk: 78, def: 22, mov: 5, range: 1,
                gx: 1, gy: 2, done: false,
                skills: [
                    { name: '奔袭连斩', mpCost: 20, dmg: 1.8, type: 'atk', icon: '⚡' }
                ]
            },
            {
                id: 3, name: '曹仁', class: '铁壁步兵', icon: '🛡️',
                hp: 520, maxHp: 520, atk: 55, def: 38, mov: 3, range: 1,
                gx: 1, gy: 6, done: false,
                skills: [
                    { name: '铁壁防守', mpCost: 15, buff: 'def', icon: '🛡️' }
                ]
            },
            {
                id: 4, name: '荀彧', class: '火策士', icon: '🔥',
                hp: 320, maxHp: 320, atk: 82, def: 15, mov: 3, range: 2,
                gx: 0, gy: 3, done: false,
                skills: [
                    { name: '焦热术', mpCost: 15, dmg: 1.6, type: 'fire', icon: '🔥' },
                    { name: '爆炎火龙', mpCost: 35, dmg: 2.4, type: 'fire', icon: '🐉' }
                ]
            },
            {
                id: 5, name: '郭嘉', class: '水乐策士', icon: '🌊',
                hp: 340, maxHp: 340, atk: 75, def: 16, mov: 3, range: 2,
                gx: 0, gy: 5, done: false,
                skills: [
                    { name: '水龙波', mpCost: 25, dmg: 1.8, type: 'water', icon: '🌊' },
                    { name: '补给术', mpCost: 20, heal: 150, type: 'heal', icon: '💊' }
                ]
            }
        ];
    }

    initMapGrid() {
        this.mapGrid = [];
        const chap = this.chapters[this.chapterIndex] || this.chapters[0];

        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.cols; c++) {
                let terrain = 'plain'; // plain, forest, mountain, castle, river
                if (chap.mapType === 'castle' && (c === 8 || c === 9) && r > 1 && r < 7) {
                    terrain = 'castle';
                } else if (chap.mapType === 'river' && (r === 4 || r === 5)) {
                    terrain = 'river';
                } else if ((r === 1 || r === 7) && c > 3 && c < 8) {
                    terrain = 'forest';
                } else if (c === 11 || (r === 0 && c > 6)) {
                    terrain = 'mountain';
                }
                row.push({ gx: c, gy: r, terrain });
            }
            this.mapGrid.push(row);
        }
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

            if (type === 'clash') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
            } else if (type === 'magic') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'march') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.setValueAtTime(293, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (type === 'win') {
                osc.type = 'sine';
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

            if (e.code === 'KeyP' || e.code === 'Escape') {
                this.selectedUnit = null;
                this.activeMenu = null;
                this.moveRangeTiles = [];
                this.attackRangeTiles = [];
            }

            if (e.code === 'Enter' || e.code === 'Digit4') {
                if (this.state === 'MAP_BATTLE' && this.phase === 'PLAYER_TURN') {
                    this.endPlayerTurn();
                }
            }
        });

        const getPos = e => {
            const rect = this.canvas.getBoundingClientRect();
            const px = (e.clientX - rect.left) * (this.W / rect.width);
            const py = (e.clientY - rect.top) * (this.H / rect.height);
            const gx = Math.floor((px - this.offsetX) / this.tileSize);
            const gy = Math.floor((py - this.offsetY) / this.tileSize);
            return { px, py, gx, gy };
        };

        this.canvas.addEventListener('mousemove', e => {
            const pos = getPos(e);
            this.mouse = pos;
        });

        this.canvas.addEventListener('mousedown', e => {
            this.initAudio();
            const pos = getPos(e);
            this.mouse = pos;
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
        this.initUnits();
        this.initMapGrid();
        this.phase = 'PLAYER_TURN';
        this.selectedUnit = null;
        this.activeMenu = null;
        this.moveRangeTiles = [];
        this.attackRangeTiles = [];
        this.state = 'MAP_BATTLE';
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
    }

    handleCanvasClick() {
        const gx = this.mouse.gx;
        const gy = this.mouse.gy;

        if (this.state === 'MENU') {
            this.startChapter(0);
            return;
        }

        if (this.state === 'MAP_BATTLE' && this.phase === 'PLAYER_TURN') {
            // Check if active menu open
            if (this.activeMenu) {
                this.handleMenuClick();
                return;
            }

            // Clicked inside grid map
            if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
                // If a unit is currently selected
                if (this.selectedUnit) {
                    // Check if clicked valid move tile
                    const isMoveTile = this.moveRangeTiles.some(t => t.gx === gx && t.gy === gy);
                    if (isMoveTile) {
                        this.selectedUnit.gx = gx;
                        this.selectedUnit.gy = gy;
                        this.playSound('march');
                        this.openActionMenu(gx, gy);
                        return;
                    }

                    // Check if clicked enemy in attack range
                    const targetEnemy = this.getEnemyAt(gx, gy);
                    if (targetEnemy) {
                        this.playerAttackEnemy(this.selectedUnit, targetEnemy);
                        return;
                    }

                    // Clicked elsewhere -> deselect
                    this.deselectUnit();
                } else {
                    // Select a player unit
                    const unit = this.getPlayerUnitAt(gx, gy);
                    if (unit && !unit.done) {
                        this.selectedUnit = unit;
                        this.playSound('march');
                        this.calculateMoveRange(unit);
                    }
                }
            }
        }
    }

    calculateMoveRange(unit) {
        this.moveRangeTiles = [];
        const mov = unit.mov;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const dist = Math.abs(c - unit.gx) + Math.abs(r - unit.gy);
                if (dist <= mov) {
                    // Check terrain impassable / occupied by enemy
                    const enemyOnTile = this.getEnemyAt(c, r);
                    if (!enemyOnTile) {
                        this.moveRangeTiles.push({ gx: c, gy: r });
                    }
                }
            }
        }
    }

    openActionMenu(gx, gy) {
        this.activeMenu = {
            gx, gy,
            options: ['普通攻击', '释放计谋', '原地待命']
        };
    }

    handleMenuClick() {
        const mx = this.mouse.px;
        const my = this.mouse.py;
        const menuX = this.offsetX + this.activeMenu.gx * this.tileSize + 30;
        const menuY = this.offsetY + this.activeMenu.gy * this.tileSize;

        for (let i = 0; i < this.activeMenu.options.length; i++) {
            const oy = menuY + i * 36;
            if (mx >= menuX && mx <= menuX + 110 && my >= oy && my <= oy + 32) {
                const choice = this.activeMenu.options[i];

                if (choice === '普通攻击') {
                    this.highlightAttackTargets();
                    this.activeMenu = null;
                } else if (choice === '释放计谋') {
                    this.useUnitSkill(this.selectedUnit);
                    this.activeMenu = null;
                } else if (choice === '原地待命') {
                    this.selectedUnit.done = true;
                    this.deselectUnit();
                    this.checkPlayerTurnEnd();
                }
                return;
            }
        }
    }

    highlightAttackTargets() {
        this.attackRangeTiles = [];
        const u = this.selectedUnit;
        const rng = u.range;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const dist = Math.abs(c - u.gx) + Math.abs(r - u.gy);
                if (dist <= rng && dist > 0) {
                    this.attackRangeTiles.push({ gx: c, gy: r });
                }
            }
        }
    }

    playerAttackEnemy(attacker, targetEnemy) {
        this.playSound('clash');
        this.screenShake = 6;

        // Terrain defense buff
        const terrain = this.mapGrid[targetEnemy.gy][targetEnemy.gx].terrain;
        let defBuff = terrain === 'castle' ? 1.3 : (terrain === 'forest' ? 1.15 : 1.0);

        let dmg = Math.floor((attacker.atk - targetEnemy.def * defBuff * 0.5) * (0.9 + Math.random() * 0.3));
        if (dmg < 10) dmg = 10;

        targetEnemy.hp -= dmg;
        this.addFloat(`-${dmg}`, this.offsetX + targetEnemy.gx * this.tileSize + 30, this.offsetY + targetEnemy.gy * this.tileSize, '#d90429');
        this.spawnParticles(this.offsetX + targetEnemy.gx * this.tileSize + 32, this.offsetY + targetEnemy.gy * this.tileSize + 32, '#d90429');

        attacker.done = true;
        this.deselectUnit();

        // Check enemy defeated
        const chap = this.chapters[this.chapterIndex];
        if (targetEnemy.hp <= 0) {
            targetEnemy.hp = 0;
            this.addFloat('击杀伏诛！', this.offsetX + targetEnemy.gx * this.tileSize + 30, this.offsetY + targetEnemy.gy * this.tileSize - 20, '#d4af37');

            if (targetEnemy.isLeader) {
                // Chapter Win!
                this.playSound('win');
                setTimeout(() => {
                    this.chapterIndex++;
                    if (this.chapterIndex >= this.chapters.length) {
                        this.state = 'BATTLE_WIN';
                    } else {
                        this.triggerMoralityDialogue();
                    }
                }, 1000);
            }
        }

        this.checkPlayerTurnEnd();
    }

    useUnitSkill(unit) {
        const skill = unit.skills[0];
        const chap = this.chapters[this.chapterIndex];

        if (skill.type === 'heal') {
            unit.hp = Math.min(unit.maxHp, unit.hp + skill.heal);
            this.playSound('magic');
            this.addFloat(`+${skill.heal} HP`, this.offsetX + unit.gx * this.tileSize + 30, this.offsetY + unit.gy * this.tileSize, '#38b000');
            this.spawnParticles(this.offsetX + unit.gx * this.tileSize + 32, this.offsetY + unit.gy * this.tileSize + 32, '#38b000');
        } else {
            // Find closest enemy to attack with magic
            let target = chap.enemies.find(e => e.hp > 0);
            if (target) {
                this.playSound('magic');
                let dmg = Math.floor(unit.atk * skill.dmg);
                target.hp -= dmg;
                this.addFloat(`-${dmg} (${skill.name})`, this.offsetX + target.gx * this.tileSize + 30, this.offsetY + target.gy * this.tileSize, '#e9c46a');
                this.spawnParticles(this.offsetX + target.gx * this.tileSize + 32, this.offsetY + target.gy * this.tileSize + 32, '#e9c46a');

                if (target.hp <= 0 && target.isLeader) {
                    this.playSound('win');
                    setTimeout(() => {
                        this.chapterIndex++;
                        if (this.chapterIndex >= this.chapters.length) {
                            this.state = 'BATTLE_WIN';
                        } else {
                            this.triggerMoralityDialogue();
                        }
                    }, 1000);
                }
            }
        }

        unit.done = true;
        this.deselectUnit();
        this.checkPlayerTurnEnd();
    }

    checkPlayerTurnEnd() {
        const allDone = this.playerUnits.every(u => u.done || u.hp <= 0);
        if (allDone) {
            this.endPlayerTurn();
        }
    }

    endPlayerTurn() {
        this.phase = 'ENEMY_TURN';
        this.deselectUnit();

        // Run enemy AI actions
        setTimeout(() => {
            this.runEnemyTurnAI();
        }, 800);
    }

    runEnemyTurnAI() {
        const chap = this.chapters[this.chapterIndex];
        const aliveEnemies = chap.enemies.filter(e => e.hp > 0);

        for (let enemy of aliveEnemies) {
            // Find closest active player unit
            const alivePlayers = this.playerUnits.filter(u => u.hp > 0);
            if (alivePlayers.length === 0) break;

            let closest = alivePlayers[0];
            let minDist = 999;
            for (let pu of alivePlayers) {
                const dist = Math.abs(pu.gx - enemy.gx) + Math.abs(pu.gy - enemy.gy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = pu;
                }
            }

            // Attack or move closer
            if (minDist <= 2) {
                this.playSound('clash');
                let dmg = Math.floor(enemy.atk * (0.8 + Math.random() * 0.4));
                closest.hp -= dmg;
                this.addFloat(`-${dmg}`, this.offsetX + closest.gx * this.tileSize + 30, this.offsetY + closest.gy * this.tileSize, '#d90429');
                this.spawnParticles(this.offsetX + closest.gx * this.tileSize + 32, this.offsetY + closest.gy * this.tileSize + 32, '#d90429');

                if (closest.hp <= 0) closest.hp = 0;
            }
        }

        // Check if all players dead
        const allPlayersDead = this.playerUnits.every(u => u.hp <= 0);
        if (allPlayersDead) {
            this.state = 'GAME_OVER';
            return;
        }

        // Reset player turn
        setTimeout(() => {
            this.phase = 'PLAYER_TURN';
            for (let u of this.playerUnits) u.done = false;
            this.addFloat('我军回合！', this.W / 2, 200, '#d4af37');
        }, 1000);
    }

    triggerMoralityDialogue() {
        this.activeChoiceModal = {
            title: '霸王与英雄之抉择',
            question: '面对投降的敌将与溃兵，曹操该当如何处置？',
            options: [
                { label: '【霸王】斩草除根，树立威严 (红色霸王路线 +20)', align: 20 },
                { label: '【英雄】宽厚纳降，招贤纳士 (蓝色英雄路线 -20)', align: -20 }
            ]
        };
        this.state = 'DIALOGUE';
    }

    deselectUnit() {
        this.selectedUnit = null;
        this.activeMenu = null;
        this.moveRangeTiles = [];
        this.attackRangeTiles = [];
    }

    getPlayerUnitAt(gx, gy) {
        return this.playerUnits.find(u => u.gx === gx && u.gy === gy && u.hp > 0);
    }

    getEnemyAt(gx, gy) {
        const chap = this.chapters[this.chapterIndex];
        return chap ? chap.enemies.find(e => e.gx === gx && e.gy === gy && e.hp > 0) : null;
    }

    addFloat(text, x, y, color = '#d4af37') {
        this.floatingTexts.push({ text, x, y, color, life: 60 });
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 5;
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
        ctx.fillStyle = '#100f10';
        ctx.fillRect(0, 0, this.W, this.H);

        if (this.state === 'MENU') {
            this.renderMenu();
            return;
        }

        if (this.state === 'MAP_BATTLE' || this.state === 'DIALOGUE') {
            this.renderMapGrid();
            this.renderMoveAndAttackRanges();
            this.renderUnitsAndEnemies();
            this.renderActionMenu();
            this.renderHUD();

            if (this.state === 'DIALOGUE') this.renderDialogueModal();
        }

        if (this.state === 'GAME_OVER') this.renderGameOverModal();
        if (this.state === 'BATTLE_WIN') this.renderWinModal();

        this.renderParticles();
        this.renderFloats();
    }

    renderMenu() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(16, 15, 16, 0.85)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('三国志：曹操传', this.W / 2, 200);

        ctx.fillStyle = '#9e2a2b';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('LEGEND OF CAO CAO - STRATEGY SLG', this.W / 2, 245);

        ctx.fillStyle = '#f4f1de';
        ctx.font = '15px sans-serif';
        ctx.fillText('运筹帷幄，统领魏国名将雄霸天下！', this.W / 2, 320);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 或 点击 开始颍川首战', this.W / 2, 440);
        }
    }

    renderMapGrid() {
        const ctx = this.ctx;
        const chap = this.chapters[this.chapterIndex] || this.chapters[0];

        // Background terrain colors
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.mapGrid[r][c];
                const tx = this.offsetX + c * this.tileSize;
                const ty = this.offsetY + r * this.tileSize;

                if (cell.terrain === 'castle') ctx.fillStyle = '#4a3e3d';
                else if (cell.terrain === 'forest') ctx.fillStyle = '#1b4332';
                else if (cell.terrain === 'river') ctx.fillStyle = '#0077b6';
                else if (cell.terrain === 'mountain') ctx.fillStyle = '#540b0e';
                else ctx.fillStyle = '#2d6a4f';

                ctx.fillRect(tx, ty, this.tileSize - 2, this.tileSize - 2);

                // Grid border lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.strokeRect(tx, ty, this.tileSize - 2, this.tileSize - 2);
            }
        }
    }

    renderMoveAndAttackRanges() {
        const ctx = this.ctx;

        // Move Range (Blue Tiles)
        ctx.fillStyle = 'rgba(0, 119, 182, 0.45)';
        for (let t of this.moveRangeTiles) {
            const tx = this.offsetX + t.gx * this.tileSize;
            const ty = this.offsetY + t.gy * this.tileSize;
            ctx.fillRect(tx, ty, this.tileSize - 2, this.tileSize - 2);
        }

        // Attack Range (Red Tiles)
        ctx.fillStyle = 'rgba(217, 4, 41, 0.55)';
        for (let t of this.attackRangeTiles) {
            const tx = this.offsetX + t.gx * this.tileSize;
            const ty = this.offsetY + t.gy * this.tileSize;
            ctx.fillRect(tx, ty, this.tileSize - 2, this.tileSize - 2);
        }
    }

    renderUnitsAndEnemies() {
        const ctx = this.ctx;
        const chap = this.chapters[this.chapterIndex];

        // Render Player Units (Wei Blue Badges)
        for (let u of this.playerUnits) {
            if (u.hp <= 0) continue;
            const tx = this.offsetX + u.gx * this.tileSize;
            const ty = this.offsetY + u.gy * this.tileSize;

            ctx.save();
            ctx.translate(tx, ty);

            // Unit Box
            ctx.fillStyle = u.done ? '#4a3e3d' : '#0077b6';
            ctx.fillRect(4, 4, 56, 56);
            ctx.strokeStyle = u === this.selectedUnit ? '#ffb703' : '#ffffff';
            ctx.lineWidth = u === this.selectedUnit ? 3 : 1;
            ctx.strokeRect(4, 4, 56, 56);

            // Icon & Name
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(u.icon, 32, 34);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(u.name, 32, 52);

            // HP Bar mini
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(6, 6, 52, 4);
            ctx.fillStyle = '#38b000';
            ctx.fillRect(6, 6, 52 * (u.hp / u.maxHp), 4);

            ctx.restore();
        }

        // Render Enemies (Red Badges)
        if (chap) {
            for (let e of chap.enemies) {
                if (e.hp <= 0) continue;
                const tx = this.offsetX + e.gx * this.tileSize;
                const ty = this.offsetY + e.gy * this.tileSize;

                ctx.save();
                ctx.translate(tx, ty);

                ctx.fillStyle = e.isLeader ? '#9e2a2b' : '#6b1111';
                ctx.fillRect(4, 4, 56, 56);
                ctx.strokeStyle = '#e9c46a';
                ctx.lineWidth = e.isLeader ? 3 : 1;
                ctx.strokeRect(4, 4, 56, 56);

                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(e.icon, 32, 34);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText(e.name, 32, 52);

                // HP Bar mini
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(6, 6, 52, 4);
                ctx.fillStyle = '#d90429';
                ctx.fillRect(6, 6, 52 * (e.hp / e.maxHp), 4);

                ctx.restore();
            }
        }
    }

    renderActionMenu() {
        if (!this.activeMenu) return;
        const ctx = this.ctx;

        const menuX = this.offsetX + this.activeMenu.gx * this.tileSize + 30;
        const menuY = this.offsetY + this.activeMenu.gy * this.tileSize;

        ctx.fillStyle = '#1c1a1b';
        ctx.fillRect(menuX, menuY, 110, 115);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(menuX, menuY, 110, 115);

        for (let i = 0; i < this.activeMenu.options.length; i++) {
            const opt = this.activeMenu.options[i];
            const oy = menuY + i * 36 + 6;

            ctx.fillStyle = '#9e2a2b';
            ctx.fillRect(menuX + 5, oy, 100, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Noto Serif SC", serif';
            ctx.textAlign = 'center';
            ctx.fillText(opt, menuX + 55, oy + 20);
        }
    }

    renderHUD() {
        const ctx = this.ctx;
        const chap = this.chapters[this.chapterIndex] || this.chapters[0];

        // Top Bar
        ctx.fillStyle = 'rgba(28, 26, 27, 0.9)';
        ctx.fillRect(0, 0, this.W, 44);
        ctx.fillStyle = '#9e2a2b';
        ctx.fillRect(0, 42, this.W, 2);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 16px "Noto Serif SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText(chap.name, 20, 26);

        ctx.fillStyle = this.phase === 'PLAYER_TURN' ? '#38b000' : '#d90429';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(this.phase === 'PLAYER_TURN' ? '【我军回合】(按 Enter 结束)' : '【敌军回合中...】', 300, 26);

        // Alignment Gauge (Overlord vs Hero)
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`霸王路线: ${this.alignment > 0 ? '🔴' : '🔵'} (${this.alignment})`, this.W - 20, 26);
    }

    renderDialogueModal() {
        if (!this.activeChoiceModal) return;
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(0, 0, this.W, this.H);

        const modalW = 540, modalH = 280;
        const modalX = (this.W - modalW) / 2;
        const modalY = (this.H - modalH) / 2;

        ctx.fillStyle = '#1c1a1b';
        ctx.fillRect(modalX, modalY, modalW, modalH);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.strokeRect(modalX, modalY, modalW, modalH);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 22px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.activeChoiceModal.title, this.W / 2, modalY + 40);

        ctx.fillStyle = '#f4f1de';
        ctx.font = '15px sans-serif';
        ctx.fillText(this.activeChoiceModal.question, this.W / 2, modalY + 85);

        const startY = modalY + 130;
        for (let i = 0; i < this.activeChoiceModal.options.length; i++) {
            const opt = this.activeChoiceModal.options[i];
            const oy = startY + i * 60;

            ctx.fillStyle = '#9e2a2b';
            ctx.fillRect(modalX + 30, oy, modalW - 60, 45);
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(modalX + 30, oy, modalW - 60, 45);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px "Noto Serif SC", serif';
            ctx.textAlign = 'center';
            ctx.fillText(opt.label, this.W / 2, oy + 27);
        }
    }

    renderGameOverModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#d90429';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('全 军 覆 没', this.W / 2, 240);

        ctx.fillStyle = '#9d9d9d';
        ctx.font = '16px sans-serif';
        ctx.fillText('出师未捷身先死，魏国大业尚未完成...', this.W / 2, 300);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('按 Enter 键 重新开始战役', this.W / 2, 420);
        }
    }

    renderWinModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('魏 武 挥 鞭·三 国 一 统！', this.W / 2, 220);

        ctx.fillStyle = '#f4f1de';
        ctx.font = '16px sans-serif';
        ctx.fillText('曹操平定四大战役，霸业告成，天下大定！', this.W / 2, 290);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#9e2a2b';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 重温经典史诗', this.W / 2, 420);
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
            ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(f.text, f.x, f.y);
        }
    }
}

window.CaoCaoGame = CaoCaoGame;
