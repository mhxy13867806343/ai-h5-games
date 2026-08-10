/* ============================================================
   《火焰纹章：圣魔之光石（女孩版）》纯 HTML5 Canvas SRPG 引擎
   ============================================================ */

class FEGirlsEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // GBA Native Resolution Scale (240x160 -> 720x480)
        this.cols = 12;
        this.rows = 9;
        this.tileSize = 40; // 480x360 rendered inside canvas

        this.canvas.width = this.cols * this.tileSize;
        this.canvas.height = this.rows * this.tileSize + 80; // Extra status banner space

        // Game State
        this.state = 'TITLE'; // TITLE, PLAYER_PHASE, UNIT_SELECT, MOVE_SELECT, ACTION_MENU, TARGET_SELECT, BATTLE_ANIMATION, ENEMY_PHASE, GAME_OVER, VICTORY
        this.turn = 'PLAYER'; // PLAYER, ENEMY
        this.turnCount = 1;
        this.speedMultiplier = 1;

        // Cursor Position
        this.cursor = { x: 2, y: 4 };
        this.selectedUnit = null;
        this.moveRange = [];
        this.attackRange = [];
        this.targetUnits = [];
        this.targetIndex = 0;

        // Battle Simulation State
        this.battleData = null;
        this.battleTimer = 0;

        // Audio Context Synthesizer for SFX
        this.initAudio();

        // Tile Map (0: Plain, 1: Forest, 2: Mountain, 3: Fort, 4: Castle)
        this.map = [
            [0, 0, 1, 1, 0, 0, 0, 2, 2, 2, 3, 4],
            [0, 1, 1, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 2, 1, 0, 0, 1, 1, 0, 0, 0, 0],
            [2, 2, 2, 0, 0, 0, 1, 1, 1, 0, 0, 0],
            [2, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0]
        ];

        // Units
        this.units = [];
        this.initUnits();

        // Action Menu Options
        this.menuOptions = [];
        this.menuIndex = 0;

        // Banner Animation
        this.bannerText = '';
        this.bannerTimer = 0;

        // Bind Loop
        this.lastTime = 0;
        requestAnimationFrame((t) => this.loop(t));
    }

    initAudio() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();
        } catch (e) {
            this.audioCtx = null;
        }
    }

    playTone(freq, duration, type = 'sine') {
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {}
    }

    initUnits() {
        this.units = [
            // Player Team (FE Girls - All Female Roster)
            { id: 1, name: '艾莉可', title: '鲁内斯公主', faction: 'PLAYER', job: '领主', avatar: '👸', x: 1, y: 3, hp: 24, maxHp: 24, atk: 8, skl: 10, spd: 11, def: 5, res: 4, mov: 5, weapon: '细剑', wType: 'SWORD', range: 1, moved: false },
            { id: 2, name: '瓦涅莎', title: '天马骑士', faction: 'PLAYER', job: '飞马骑士', avatar: '🦄', x: 1, y: 4, hp: 20, maxHp: 20, atk: 7, skl: 9, spd: 13, def: 4, res: 6, mov: 7, weapon: '铁枪', wType: 'LANCE', range: 1, moved: false },
            { id: 3, name: '露特', title: '天才魔道士', faction: 'PLAYER', job: '魔法师', avatar: '🧙‍♀️', x: 0, y: 3, hp: 18, maxHp: 18, atk: 10, skl: 8, spd: 9, def: 3, res: 8, mov: 4, weapon: '理魔法', wType: 'MAGIC', range: 2, moved: false },
            { id: 4, name: '娜塔莎', title: '圣修女', faction: 'PLAYER', job: '修女', avatar: '✝️', x: 0, y: 4, hp: 19, maxHp: 19, atk: 4, skl: 7, spd: 8, def: 2, res: 9, mov: 4, weapon: '治疗杖', wType: 'STAFF', range: 1, moved: false },
            { id: 5, name: '塔娜', title: '弗雷利亚公主', faction: 'PLAYER', job: '天马骑士', avatar: '🧚‍♀️', x: 1, y: 5, hp: 21, maxHp: 21, atk: 8, skl: 10, spd: 12, def: 5, res: 5, mov: 7, weapon: '投枪', wType: 'LANCE', range: 1, moved: false },
            { id: 6, name: '阿梅莉亚', title: '新人士兵', faction: 'PLAYER', job: '新兵', avatar: '🛡️', x: 0, y: 5, hp: 22, maxHp: 22, atk: 7, skl: 6, spd: 7, def: 6, res: 3, mov: 4, weapon: '细枪', wType: 'LANCE', range: 1, moved: false },

            // Enemy Team (Grado Empire & Monsters)
            { id: 101, name: '古拉德长枪兵', title: '帝国前锋', faction: 'ENEMY', job: '重枪兵', avatar: '💂‍♂️', x: 7, y: 2, hp: 22, maxHp: 22, atk: 7, skl: 5, spd: 4, def: 6, res: 1, mov: 4, weapon: '铁枪', wType: 'LANCE', range: 1, moved: false },
            { id: 102, name: '帝国弓箭手', title: '远程射手', faction: 'ENEMY', job: '弓箭手', avatar: '🏹', x: 8, y: 1, hp: 19, maxHp: 19, atk: 8, skl: 7, spd: 8, def: 4, res: 2, mov: 5, weapon: '铁弓', wType: 'BOW', range: 2, moved: false },
            { id: 103, name: '山贼头目', title: '山林强盗', faction: 'ENEMY', job: '斧战士', avatar: '🪓', x: 7, y: 5, hp: 25, maxHp: 25, atk: 10, skl: 4, spd: 6, def: 4, res: 0, mov: 5, weapon: '手斧', wType: 'AXE', range: 1, moved: false },
            { id: 104, name: '魔物食尸鬼', title: '魔物军团', faction: 'ENEMY', job: '骨卒', avatar: '🧟‍♂️', x: 9, y: 4, hp: 20, maxHp: 20, atk: 6, skl: 4, spd: 5, def: 3, res: 2, mov: 5, weapon: '毒爪', wType: 'AXE', range: 1, moved: false },
            { id: 105, name: '帝国将军 希尔达', title: '守城BOSS', faction: 'ENEMY', job: '将军', avatar: '🦹‍♀️', x: 11, y: 0, hp: 32, maxHp: 32, atk: 12, skl: 9, spd: 6, def: 9, res: 5, mov: 4, weapon: '银枪', wType: 'LANCE', range: 1, moved: false }
        ];

        this.showTurnBanner('PLAYER PHASE');
    }

    showTurnBanner(text) {
        this.bannerText = text;
        this.bannerTimer = 90;
        if (text.includes('PLAYER')) {
            this.playTone(523.25, 0.2); // C5
            setTimeout(() => this.playTone(659.25, 0.3), 150); // E5
        } else {
            this.playTone(329.63, 0.2); // E4
            setTimeout(() => this.playTone(261.63, 0.3), 150); // C4
        }
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.x === x && u.y === y && u.hp > 0);
    }

    calculateMoveRange(unit) {
        const range = [];
        const visited = {};

        const queue = [{ x: unit.x, y: unit.y, mov: unit.mov }];
        visited[`${unit.x},${unit.y}`] = unit.mov;

        while (queue.length > 0) {
            const curr = queue.shift();
            range.push({ x: curr.x, y: curr.y });

            const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            for (const d of dirs) {
                const nx = curr.x + d.x;
                const ny = curr.y + d.y;

                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                    const occupant = this.getUnitAt(nx, ny);
                    if (occupant && occupant.faction !== unit.faction) continue; // Enemy block

                    const tileType = this.map[ny][nx];
                    let cost = 1;
                    if (tileType === 1) cost = 2; // Forest
                    if (tileType === 2) cost = unit.job.includes('飞马') || unit.job.includes('天马') ? 1 : 3; // Mountain

                    const remMov = curr.mov - cost;
                    const key = `${nx},${ny}`;

                    if (remMov >= 0 && (visited[key] === undefined || visited[key] < remMov)) {
                        visited[key] = remMov;
                        queue.push({ x: nx, y: ny, mov: remMov });
                    }
                }
            }
        }
        return range;
    }

    calculateAttackRange(unit, fromX = unit.x, fromY = unit.y) {
        const range = [];
        const r = unit.range || 1;
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.abs(dx) + Math.abs(dy) === r) {
                    const nx = fromX + dx;
                    const ny = fromY + dy;
                    if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                        range.push({ x: nx, y: ny });
                    }
                }
            }
        }
        return range;
    }

    handleInput(action) {
        if (this.bannerTimer > 0) return;

        this.playTone(440, 0.05); // Button feedback tick

        if (this.state === 'TITLE') {
            if (action === 'START' || action === 'A') {
                this.state = 'PLAYER_PHASE';
            }
            return;
        }

        if (this.state === 'PLAYER_PHASE' || this.state === 'UNIT_SELECT') {
            if (action === 'UP') this.cursor.y = Math.max(0, this.cursor.y - 1);
            if (action === 'DOWN') this.cursor.y = Math.min(this.rows - 1, this.cursor.y + 1);
            if (action === 'LEFT') this.cursor.x = Math.max(0, this.cursor.x - 1);
            if (action === 'RIGHT') this.cursor.x = Math.min(this.cols - 1, this.cursor.x + 1);

            if (action === 'A') {
                const u = this.getUnitAt(this.cursor.x, this.cursor.y);
                if (u && u.faction === 'PLAYER' && !u.moved) {
                    this.selectedUnit = u;
                    this.moveRange = this.calculateMoveRange(u);
                    this.attackRange = this.calculateAttackRange(u);
                    this.state = 'MOVE_SELECT';
                }
            }

            if (action === 'START') {
                this.endPlayerTurn();
            }
            return;
        }

        if (this.state === 'MOVE_SELECT') {
            if (action === 'UP') this.cursor.y = Math.max(0, this.cursor.y - 1);
            if (action === 'DOWN') this.cursor.y = Math.min(this.rows - 1, this.cursor.y + 1);
            if (action === 'LEFT') this.cursor.x = Math.max(0, this.cursor.x - 1);
            if (action === 'RIGHT') this.cursor.x = Math.min(this.cols - 1, this.cursor.x + 1);

            if (action === 'B') {
                this.selectedUnit = null;
                this.state = 'PLAYER_PHASE';
                return;
            }

            if (action === 'A') {
                const canMove = this.moveRange.some(m => m.x === this.cursor.x && m.y === this.cursor.y);
                const occupant = this.getUnitAt(this.cursor.x, this.cursor.y);

                if (canMove && (!occupant || occupant === this.selectedUnit)) {
                    this.selectedUnit.origX = this.selectedUnit.x;
                    this.selectedUnit.origY = this.selectedUnit.y;
                    this.selectedUnit.x = this.cursor.x;
                    this.selectedUnit.y = this.cursor.y;

                    // Open Action Menu
                    this.openActionMenu();
                }
            }
            return;
        }

        if (this.state === 'ACTION_MENU') {
            if (action === 'UP') this.menuIndex = (this.menuIndex - 1 + this.menuOptions.length) % this.menuOptions.length;
            if (action === 'DOWN') this.menuIndex = (this.menuIndex + 1) % this.menuOptions.length;

            if (action === 'B') {
                // Cancel Move
                this.selectedUnit.x = this.selectedUnit.origX;
                this.selectedUnit.y = this.selectedUnit.origY;
                this.cursor.x = this.selectedUnit.x;
                this.cursor.y = this.selectedUnit.y;
                this.state = 'MOVE_SELECT';
                return;
            }

            if (action === 'A') {
                const choice = this.menuOptions[this.menuIndex];
                if (choice === '攻击') {
                    this.targetUnits = this.getAttackTargets(this.selectedUnit);
                    if (this.targetUnits.length > 0) {
                        this.targetIndex = 0;
                        this.cursor.x = this.targetUnits[0].x;
                        this.cursor.y = this.targetUnits[0].y;
                        this.state = 'TARGET_SELECT';
                    }
                } else if (choice === '治疗') {
                    this.targetUnits = this.getHealTargets(this.selectedUnit);
                    if (this.targetUnits.length > 0) {
                        this.targetIndex = 0;
                        this.cursor.x = this.targetUnits[0].x;
                        this.cursor.y = this.targetUnits[0].y;
                        this.state = 'TARGET_SELECT';
                    }
                } else if (choice === '待命') {
                    this.selectedUnit.moved = true;
                    this.selectedUnit = null;
                    this.state = 'PLAYER_PHASE';
                    this.checkPhaseEnd();
                }
            }
            return;
        }

        if (this.state === 'TARGET_SELECT') {
            if (action === 'LEFT' || action === 'UP') {
                this.targetIndex = (this.targetIndex - 1 + this.targetUnits.length) % this.targetUnits.length;
                this.cursor.x = this.targetUnits[this.targetIndex].x;
                this.cursor.y = this.targetUnits[this.targetIndex].y;
            }
            if (action === 'RIGHT' || action === 'DOWN') {
                this.targetIndex = (this.targetIndex + 1) % this.targetUnits.length;
                this.cursor.x = this.targetUnits[this.targetIndex].x;
                this.cursor.y = this.targetUnits[this.targetIndex].y;
            }

            if (action === 'B') {
                this.state = 'ACTION_MENU';
                return;
            }

            if (action === 'A') {
                const target = this.targetUnits[this.targetIndex];
                if (this.selectedUnit.wType === 'STAFF') {
                    // Heal Action
                    target.hp = Math.min(target.maxHp, target.hp + 12);
                    this.playTone(880, 0.4, 'triangle');
                    this.selectedUnit.moved = true;
                    this.selectedUnit = null;
                    this.state = 'PLAYER_PHASE';
                    this.checkPhaseEnd();
                } else {
                    // Attack Battle Execution
                    this.startBattle(this.selectedUnit, target);
                }
            }
            return;
        }
    }

    openActionMenu() {
        this.menuOptions = [];
        const attackTargets = this.getAttackTargets(this.selectedUnit);
        const healTargets = this.getHealTargets(this.selectedUnit);

        if (this.selectedUnit.wType === 'STAFF') {
            if (healTargets.length > 0) this.menuOptions.push('治疗');
        } else {
            if (attackTargets.length > 0) this.menuOptions.push('攻击');
        }
        this.menuOptions.push('待命');
        this.menuIndex = 0;
        this.state = 'ACTION_MENU';
    }

    getAttackTargets(unit) {
        const range = this.calculateAttackRange(unit, unit.x, unit.y);
        return this.units.filter(u => u.faction !== unit.faction && u.hp > 0 && range.some(r => r.x === u.x && r.y === u.y));
    }

    getHealTargets(unit) {
        const range = this.calculateAttackRange(unit, unit.x, unit.y);
        return this.units.filter(u => u.faction === unit.faction && u.hp < u.maxHp && range.some(r => r.x === u.x && r.y === u.y));
    }

    startBattle(attacker, defender) {
        let atkDmg = Math.max(1, attacker.atk - defender.def);
        let defDmg = Math.max(1, defender.atk - attacker.def);

        // Weapon Triangle
        if (attacker.wType === 'SWORD' && defender.wType === 'AXE') atkDmg += 2;
        if (attacker.wType === 'AXE' && defender.wType === 'LANCE') atkDmg += 2;
        if (attacker.wType === 'LANCE' && defender.wType === 'SWORD') atkDmg += 2;

        this.battleData = {
            attacker, defender,
            atkDmg, defDmg,
            phase: 'ATTACKER_HIT',
            timer: 45
        };

        this.state = 'BATTLE_ANIMATION';
    }

    updateBattle() {
        if (!this.battleData) return;
        this.battleData.timer--;

        if (this.battleData.timer <= 0) {
            if (this.battleData.phase === 'ATTACKER_HIT') {
                // Attacker strikes
                this.battleData.defender.hp = Math.max(0, this.battleData.defender.hp - this.battleData.atkDmg);
                this.playTone(220, 0.2, 'sawtooth'); // Slash sound

                if (this.battleData.defender.hp === 0) {
                    this.battleData = null;
                    this.selectedUnit.moved = true;
                    this.selectedUnit = null;
                    this.state = 'PLAYER_PHASE';
                    this.checkVictoryDefeat();
                    return;
                }

                // Counter-attack phase
                this.battleData.phase = 'DEFENDER_HIT';
                this.battleData.timer = 45;
            } else if (this.battleData.phase === 'DEFENDER_HIT') {
                // Defender strikes back
                this.battleData.attacker.hp = Math.max(0, this.battleData.attacker.hp - this.battleData.defDmg);
                this.playTone(200, 0.2, 'sawtooth');

                this.battleData = null;
                this.selectedUnit.moved = true;
                this.selectedUnit = null;
                this.state = 'PLAYER_PHASE';
                this.checkVictoryDefeat();
            }
        }
    }

    checkPhaseEnd() {
        const playerUnits = this.units.filter(u => u.faction === 'PLAYER' && u.hp > 0);
        if (playerUnits.every(u => u.moved)) {
            this.endPlayerTurn();
        }
    }

    endPlayerTurn() {
        this.turn = 'ENEMY';
        this.showTurnBanner('ENEMY PHASE');
        this.state = 'ENEMY_PHASE';

        // Reset player moved states
        this.units.filter(u => u.faction === 'PLAYER').forEach(u => u.moved = false);

        setTimeout(() => this.processEnemyTurn(), 1200);
    }

    processEnemyTurn() {
        const enemies = this.units.filter(u => u.faction === 'ENEMY' && u.hp > 0);
        let delay = 0;

        enemies.forEach((enemy, idx) => {
            setTimeout(() => {
                const targets = this.units.filter(u => u.faction === 'PLAYER' && u.hp > 0);
                if (targets.length === 0) return;

                // Find closest player target
                let closest = targets[0];
                let minDist = 999;
                targets.forEach(t => {
                    const dist = Math.abs(t.x - enemy.x) + Math.abs(t.y - enemy.y);
                    if (dist < minDist) { minDist = dist; closest = t; }
                });

                if (minDist <= enemy.range) {
                    // Attack
                    closest.hp = Math.max(0, closest.hp - Math.max(1, enemy.atk - closest.def));
                    this.playTone(180, 0.2, 'square');
                } else {
                    // Move closer
                    if (closest.x > enemy.x && !this.getUnitAt(enemy.x + 1, enemy.y)) enemy.x++;
                    else if (closest.x < enemy.x && !this.getUnitAt(enemy.x - 1, enemy.y)) enemy.x--;
                    else if (closest.y > enemy.y && !this.getUnitAt(enemy.x, enemy.y + 1)) enemy.y++;
                    else if (closest.y < enemy.y && !this.getUnitAt(enemy.x, enemy.y - 1)) enemy.y--;
                }

                if (idx === enemies.length - 1) {
                    setTimeout(() => {
                        this.turn = 'PLAYER';
                        this.turnCount++;
                        this.showTurnBanner('PLAYER PHASE');
                        this.state = 'PLAYER_PHASE';
                    }, 800);
                }
            }, idx * 600);
        });
    }

    checkVictoryDefeat() {
        const players = this.units.filter(u => u.faction === 'PLAYER' && u.hp > 0);
        const enemies = this.units.filter(u => u.faction === 'ENEMY' && u.hp > 0);

        if (enemies.length === 0) {
            this.state = 'VICTORY';
            this.playTone(659, 0.5);
        } else if (players.length === 0) {
            this.state = 'GAME_OVER';
        }
    }

    restart() {
        this.initUnits();
        this.cursor = { x: 2, y: 4 };
        this.selectedUnit = null;
        this.state = 'PLAYER_PHASE';
    }

    loop(timestamp) {
        this.update();
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        if (this.bannerTimer > 0) this.bannerTimer--;
        if (this.state === 'BATTLE_ANIMATION') this.updateBattle();
    }

    render() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Map Tiles
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = c * this.tileSize;
                const y = r * this.tileSize;
                const tile = this.map[r][c];

                if (tile === 0) this.ctx.fillStyle = '#1e293b'; // Plain
                else if (tile === 1) this.ctx.fillStyle = '#064e3b'; // Forest
                else if (tile === 2) this.ctx.fillStyle = '#451a03'; // Mountain
                else if (tile === 3) this.ctx.fillStyle = '#1e1b4b'; // Fort
                else if (tile === 4) this.ctx.fillStyle = '#831843'; // Castle

                this.ctx.fillRect(x, y, this.tileSize - 1, this.tileSize - 1);

                // Tile Icon Label
                this.ctx.font = '12px sans-serif';
                if (tile === 1) this.ctx.fillText('🌲', x + 12, y + 26);
                if (tile === 2) this.ctx.fillText('⛰️', x + 12, y + 26);
                if (tile === 3) this.ctx.fillText('🏰', x + 12, y + 26);
                if (tile === 4) this.ctx.fillText('👑', x + 12, y + 26);
            }
        }

        // Draw Move & Attack Overlays
        if (this.state === 'MOVE_SELECT' && this.moveRange) {
            this.ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            this.moveRange.forEach(m => {
                this.ctx.fillRect(m.x * this.tileSize, m.y * this.tileSize, this.tileSize - 1, this.tileSize - 1);
            });
        }

        // Draw Units
        this.units.forEach(u => {
            if (u.hp <= 0) return;
            const x = u.x * this.tileSize;
            const y = u.y * this.tileSize;

            // Faction Ring
            this.ctx.beginPath();
            this.ctx.arc(x + 20, y + 20, 16, 0, Math.PI * 2);
            this.ctx.fillStyle = u.moved ? '#64748b' : (u.faction === 'PLAYER' ? '#0284c7' : '#e11d48');
            this.ctx.fill();

            // Avatar Emoji
            this.ctx.font = '18px sans-serif';
            this.ctx.fillText(u.avatar, x + 10, y + 26);

            // Mini HP Bar
            const hpRatio = u.hp / u.maxHp;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x + 4, y + 34, 32, 4);
            this.ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : '#ef4444';
            this.ctx.fillRect(x + 4, y + 34, 32 * hpRatio, 4);
        });

        // Draw Cursor
        const cx = this.cursor.x * this.tileSize;
        const cy = this.cursor.y * this.tileSize;
        this.ctx.strokeStyle = '#ffb703';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(cx - 2, cy - 2, this.tileSize + 3, this.tileSize + 3);

        // Draw Action Menu Popup
        if (this.state === 'ACTION_MENU') {
            const menuX = cx + 45;
            const menuY = cy;
            this.ctx.fillStyle = '#1e293b';
            this.ctx.strokeStyle = '#38bdf8';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(menuX, menuY, 80, this.menuOptions.length * 28 + 10);
            this.ctx.strokeRect(menuX, menuY, 80, this.menuOptions.length * 28 + 10);

            this.menuOptions.forEach((opt, idx) => {
                this.ctx.fillStyle = idx === this.menuIndex ? '#ffb703' : '#fff';
                this.ctx.font = 'bold 13px sans-serif';
                this.ctx.fillText((idx === this.menuIndex ? '▶ ' : '  ') + opt, menuX + 8, menuY + 22 + idx * 28);
            });
        }

        // Draw Battle Simulation Animation
        if (this.state === 'BATTLE_ANIMATION' && this.battleData) {
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            this.ctx.fillRect(40, 100, 400, 160);
            this.ctx.strokeStyle = '#e11d48';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(40, 100, 400, 160);

            const { attacker, defender, atkDmg } = this.battleData;

            this.ctx.fillStyle = '#ffb703';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.fillText(`⚔️ 战术交锋对决`, 180, 130);

            this.ctx.fillStyle = '#38bdf8';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.fillText(`${attacker.name} [${attacker.weapon}]`, 60, 160);
            this.ctx.fillText(`HP: ${attacker.hp}/${attacker.maxHp}`, 60, 185);

            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillText(`${defender.name} [${defender.weapon}]`, 280, 160);
            this.ctx.fillText(`HP: ${defender.hp}/${defender.maxHp}`, 280, 185);

            this.ctx.fillStyle = '#f59e0b';
            this.ctx.font = 'bold 18px sans-serif';
            this.ctx.fillText(`💥 造成 -${atkDmg} 伤害!`, 180, 220);
        }

        // Draw Status Bar at Bottom
        const barY = this.rows * this.tileSize;
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0, barY, this.canvas.width, 80);
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, barY, this.canvas.width, 80);

        const currentUnit = this.getUnitAt(this.cursor.x, this.cursor.y);
        if (currentUnit) {
            this.ctx.fillStyle = '#38bdf8';
            this.ctx.font = 'bold 15px sans-serif';
            this.ctx.fillText(`${currentUnit.avatar} ${currentUnit.name} (${currentUnit.job}) - ${currentUnit.title}`, 16, barY + 26);

            this.ctx.fillStyle = '#cbd5e1';
            this.ctx.font = '13px sans-serif';
            this.ctx.fillText(`HP: ${currentUnit.hp}/${currentUnit.maxHp}  |  攻击: ${currentUnit.atk}  |  防御: ${currentUnit.def}  |  速度: ${currentUnit.spd}  |  装备: ${currentUnit.weapon}`, 16, barY + 54);
        } else {
            const tileName = ['平原', '森林 (+20%回避)', '山地 (+30%回避)', '堡垒 (防御+2/回血)', '城堡 (守军据点)'][this.map[this.cursor.y][this.cursor.x]];
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '14px sans-serif';
            this.ctx.fillText(`🗺️ 地形: ${tileName} [坐标: ${this.cursor.x}, ${this.cursor.y}]  |  回合: 第 ${this.turnCount} 回合`, 16, barY + 42);
        }

        // Draw Turn Banner Overlays
        if (this.bannerTimer > 0) {
            this.ctx.fillStyle = this.bannerText.includes('PLAYER') ? 'rgba(2, 132, 199, 0.85)' : 'rgba(225, 29, 72, 0.85)';
            this.ctx.fillRect(0, 140, this.canvas.width, 70);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 26px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.bannerText, this.canvas.width / 2, 185);
            this.ctx.textAlign = 'left';
        }
    }
}

window.FEGirlsEngine = FEGirlsEngine;
