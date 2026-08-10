/* ============================================================
   《口袋妖怪：暗黑升起 (Pokémon Dark Rising)》纯 HTML5 Canvas 引擎
   ============================================================ */

class PokemonDarkRisingEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // GBA Aspect Ratio (240x160 -> 720x480)
        this.canvas.width = 720;
        this.canvas.height = 480;

        // Audio Context
        this.initAudio();

        // Game State
        this.state = 'STARTER_SELECT'; // STARTER_SELECT, OVERWORLD, BATTLE, VICTORY, GAME_OVER
        this.starterIndex = 0;

        // Player Data
        this.player = {
            name: '赤红',
            x: 5, y: 5,
            direction: 'DOWN',
            party: [],
            badges: 1
        };

        // Starters Options (Pokemon Dark Rising signature 3 Dragons)
        this.starters = [
            { id: 147, name: '迷你龙 (Dratini)', type: '龙', hp: 41, maxHp: 41, atk: 14, def: 12, spd: 13, moves: [{ name: '龙之怒', pwr: 15 }, { name: '电光一闪', pwr: 10 }, { name: '火焰牙', pwr: 18 }], sprite: '🐲' },
            { id: 371, name: '宝贝龙 (Bagon)', type: '龙', hp: 45, maxHp: 45, atk: 16, def: 14, spd: 11, moves: [{ name: '龙爪', pwr: 18 }, { name: '头锤', pwr: 12 }, { name: '咬碎', pwr: 16 }], sprite: '🐉' },
            { id: 443, name: '圆陆鲨 (Gible)', type: '龙/地面', hp: 48, maxHp: 48, atk: 15, def: 13, spd: 12, moves: [{ name: '地震', pwr: 20 }, { name: '撞击', pwr: 10 }, { name: '龙之波动', pwr: 16 }], sprite: '🐊' }
        ];

        // Active Battle State
        this.battle = null;
        this.battleMenuIndex = 0;

        // Overworld Map
        this.mapCols = 15;
        this.mapRows = 10;
        this.tileSize = 48;

        // Tilemap (0: Grass, 1: Tall Grass encounter, 2: Water, 3: Building, 4: Path)
        this.tilemap = [
            [3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            [3, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 1, 1, 1, 3],
            [3, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 1, 1, 1, 3],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [3, 0, 1, 1, 4, 4, 0, 2, 2, 2, 0, 0, 0, 0, 3],
            [3, 0, 1, 1, 4, 4, 0, 2, 2, 2, 0, 0, 0, 0, 3],
            [3, 0, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 3],
            [3, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 3],
            [3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3]
        ];

        // Loop
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
            gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {}
    }

    handleInput(action) {
        this.playTone(400, 0.05);

        if (this.state === 'STARTER_SELECT') {
            if (action === 'LEFT' || action === 'UP') this.starterIndex = (this.starterIndex - 1 + 3) % 3;
            if (action === 'RIGHT' || action === 'DOWN') this.starterIndex = (this.starterIndex + 1) % 3;

            if (action === 'A' || action === 'START') {
                const chosen = JSON.parse(JSON.stringify(this.starters[this.starterIndex]));
                this.player.party.push(chosen);
                this.state = 'OVERWORLD';
                this.playTone(587, 0.3);
            }
            return;
        }

        if (this.state === 'OVERWORLD') {
            let nextX = this.player.x;
            let nextY = this.player.y;

            if (action === 'UP') { nextY--; this.player.direction = 'UP'; }
            if (action === 'DOWN') { nextY++; this.player.direction = 'DOWN'; }
            if (action === 'LEFT') { nextX--; this.player.direction = 'LEFT'; }
            if (action === 'RIGHT') { nextX++; this.player.direction = 'RIGHT'; }

            if (nextX >= 0 && nextX < this.mapCols && nextY >= 0 && nextY < this.mapRows) {
                const tile = this.tilemap[nextY][nextX];
                if (tile !== 3 && tile !== 2) {
                    this.player.x = nextX;
                    this.player.y = nextY;

                    // Tall grass encounter check (25% chance)
                    if (tile === 1 && Math.random() < 0.3) {
                        this.triggerWildBattle();
                    }
                }
            }
            return;
        }

        if (this.state === 'BATTLE') {
            if (action === 'LEFT' || action === 'UP') this.battleMenuIndex = (this.battleMenuIndex - 1 + 4) % 4;
            if (action === 'RIGHT' || action === 'DOWN') this.battleMenuIndex = (this.battleMenuIndex + 1) % 4;

            if (action === 'A') {
                this.executeBattleTurn(this.battleMenuIndex);
            }
            if (action === 'B') {
                this.state = 'OVERWORLD'; // Run away
            }
            return;
        }
    }

    triggerWildBattle() {
        const wildPokemons = [
            { name: '超梦影子 (Shadow Mewtwo)', hp: 55, maxHp: 55, atk: 18, def: 12, sprite: '🔮' },
            { name: '暗黑基拉祈 (Dark Jirachi)', hp: 50, maxHp: 50, atk: 16, def: 15, sprite: '✨' },
            { name: '噩梦神 达克莱伊 (Darkrai)', hp: 52, maxHp: 52, atk: 17, def: 11, sprite: '🌑' }
        ];

        const wild = wildPokemons[Math.floor(Math.random() * wildPokemons.length)];

        this.battle = {
            playerMon: this.player.party[0],
            enemyMon: wild,
            log: `野生的 《${wild.name}》 出现了！`
        };

        this.state = 'BATTLE';
        this.battleMenuIndex = 0;
        this.playTone(300, 0.4);
    }

    executeBattleTurn(actionIndex) {
        if (!this.battle) return;

        const { playerMon, enemyMon } = this.battle;

        if (actionIndex === 0) { // 招式攻击
            const move = playerMon.moves[0];
            const dmg = Math.max(5, playerMon.atk + move.pwr - enemyMon.def);
            enemyMon.hp = Math.max(0, enemyMon.hp - dmg);
            this.battle.log = `${playerMon.name} 使用了【${move.name}】！造成 ${dmg} 伤害！`;
            this.playTone(523, 0.2, 'sawtooth');

            if (enemyMon.hp <= 0) {
                this.battle.log = `敌方 ${enemyMon.name} 倒下了！战斗胜利！`;
                setTimeout(() => {
                    this.state = 'OVERWORLD';
                }, 1500);
                return;
            }

            // Enemy Turn
            setTimeout(() => {
                const enemyDmg = Math.max(4, enemyMon.atk - playerMon.def);
                playerMon.hp = Math.max(0, playerMon.hp - enemyDmg);
                this.battle.log = `${enemyMon.name} 反击！造成 ${enemyDmg} 伤害！`;
                this.playTone(220, 0.2, 'square');

                if (playerMon.hp <= 0) {
                    playerMon.hp = playerMon.maxHp; // Auto revive for fun
                    this.state = 'OVERWORLD';
                }
            }, 800);
        } else if (actionIndex === 1) { // 包裹回复
            playerMon.hp = Math.min(playerMon.maxHp, playerMon.hp + 20);
            this.battle.log = `使用了【全复药】！${playerMon.name} 恢复了 20 HP！`;
            this.playTone(659, 0.3, 'triangle');
        } else if (actionIndex === 2) { // 捕获宝可梦
            this.battle.log = `抛出了【暗黑精灵球】！成功捕获了 ${enemyMon.name}！`;
            this.playTone(880, 0.4);
            setTimeout(() => { this.state = 'OVERWORLD'; }, 1500);
        } else if (actionIndex === 3) { // 逃跑
            this.state = 'OVERWORLD';
        }
    }

    restart() {
        this.state = 'STARTER_SELECT';
        this.starterIndex = 0;
        this.player.party = [];
    }

    loop(timestamp) {
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    render() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'STARTER_SELECT') {
            this.renderStarterSelect();
        } else if (this.state === 'OVERWORLD') {
            this.renderOverworld();
        } else if (this.state === 'BATTLE') {
            this.renderBattle();
        }
    }

    renderStarterSelect() {
        this.ctx.fillStyle = '#1e1b4b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header Title
        this.ctx.fillStyle = '#c084fc';
        this.ctx.font = 'bold 26px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔥 《口袋妖怪：暗黑升起》 (Pokémon Dark Rising)', this.canvas.width / 2, 60);

        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = '16px sans-serif';
        this.ctx.fillText('暗黑降临 Omnis 地区！请选择你的初始龙系宝可梦 (GBA 龙族三首领)：', this.canvas.width / 2, 100);

        // Render 3 Starter Cards
        this.starters.forEach((mon, idx) => {
            const cardX = 60 + idx * 210;
            const cardY = 140;
            const isSelected = idx === this.starterIndex;

            this.ctx.fillStyle = isSelected ? '#3730a3' : '#1e293b';
            this.ctx.strokeStyle = isSelected ? '#c084fc' : '#334155';
            this.ctx.lineWidth = isSelected ? 3 : 1;

            this.ctx.fillRect(cardX, cardY, 180, 240);
            this.ctx.strokeRect(cardX, cardY, 180, 240);

            // Sprite Emoji
            this.ctx.font = '54px sans-serif';
            this.ctx.fillText(mon.sprite, cardX + 90, cardY + 80);

            // Name & Type
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.fillText(mon.name, cardX + 90, cardY + 130);

            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '13px sans-serif';
            this.ctx.fillText(`属性: ${mon.type}`, cardX + 90, cardY + 160);
            this.ctx.fillText(`生命: ${mon.hp} / 攻击: ${mon.atk}`, cardX + 90, cardY + 185);

            if (isSelected) {
                this.ctx.fillStyle = '#f59e0b';
                this.ctx.font = 'bold 15px sans-serif';
                this.ctx.fillText('▶ [A 键] 确认选择', cardX + 90, cardY + 220);
            }
        });

        this.ctx.textAlign = 'left';
    }

    renderOverworld() {
        // Render Tilemap
        for (let r = 0; r < this.mapRows; r++) {
            for (let c = 0; c < this.mapCols; c++) {
                const x = c * this.tileSize;
                const y = r * this.tileSize;
                const tile = this.tilemap[r][c];

                if (tile === 0) this.ctx.fillStyle = '#15803d'; // Plain grass
                else if (tile === 1) this.ctx.fillStyle = '#166534'; // Tall grass
                else if (tile === 2) this.ctx.fillStyle = '#0284c7'; // Water
                else if (tile === 3) this.ctx.fillStyle = '#334155'; // Wall/Building
                else if (tile === 4) this.ctx.fillStyle = '#d97706'; // Path

                this.ctx.fillRect(x, y, this.tileSize - 1, this.tileSize - 1);

                if (tile === 1) {
                    this.ctx.font = '14px sans-serif';
                    this.ctx.fillText('🌿', x + 14, y + 30);
                }
            }
        }

        // Render Player
        const px = this.player.x * this.tileSize;
        const py = this.player.y * this.tileSize;

        this.ctx.font = '28px sans-serif';
        this.ctx.fillText('🧢', px + 8, py + 36);

        // Status Top Overlay
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, 40);

        const myMon = this.player.party[0];
        if (myMon) {
            this.ctx.fillStyle = '#c084fc';
            this.ctx.font = 'bold 15px sans-serif';
            this.ctx.fillText(`🎮 训练家: ${this.player.name}  |  首发宝可梦: ${myMon.sprite} ${myMon.name} (HP: ${myMon.hp}/${myMon.maxHp})  |  地图: 走进深草丛草地 🌿 触发野外战斗`, 16, 26);
        }
    }

    renderBattle() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.battle) return;

        const { playerMon, enemyMon } = this.battle;

        // Enemy Monster Display
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(400, 40, 280, 100);
        this.ctx.strokeStyle = '#e11d48';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(400, 40, 280, 100);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.fillText(`${enemyMon.name}`, 420, 70);

        // Enemy HP Bar
        const eRatio = enemyMon.hp / enemyMon.maxHp;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(420, 90, 240, 12);
        this.ctx.fillStyle = eRatio > 0.4 ? '#10b981' : '#ef4444';
        this.ctx.fillRect(420, 90, 240 * eRatio, 12);

        this.ctx.font = '72px sans-serif';
        this.ctx.fillText(enemyMon.sprite, 480, 220);

        // Player Monster Display
        this.ctx.font = '72px sans-serif';
        this.ctx.fillText(playerMon.sprite, 120, 320);

        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(40, 200, 280, 100);
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(40, 200, 280, 100);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.fillText(`${playerMon.name}`, 60, 230);

        const pRatio = playerMon.hp / playerMon.maxHp;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(60, 250, 240, 12);
        this.ctx.fillStyle = pRatio > 0.4 ? '#10b981' : '#ef4444';
        this.ctx.fillRect(60, 250, 240 * pRatio, 12);

        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = '13px sans-serif';
        this.ctx.fillText(`HP: ${playerMon.hp} / ${playerMon.maxHp}`, 60, 280);

        // Action Command Box
        this.ctx.fillStyle = '#1e1b4b';
        this.ctx.fillRect(0, 360, this.canvas.width, 120);
        this.ctx.strokeStyle = '#c084fc';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 360, this.canvas.width, 120);

        this.ctx.fillStyle = '#fb7185';
        this.ctx.font = '16px sans-serif';
        this.ctx.fillText(this.battle.log, 20, 395);

        const options = ['⚔️ 招式攻击', '🎒 伤药回复', '🔴 捕捉宝可梦', '🏃 逃跑'];
        options.forEach((opt, idx) => {
            const bx = 420 + (idx % 2) * 140;
            const by = 390 + Math.floor(idx / 2) * 35;
            const isSel = idx === this.battleMenuIndex;

            this.ctx.fillStyle = isSel ? '#f59e0b' : '#fff';
            this.ctx.font = 'bold 15px sans-serif';
            this.ctx.fillText((isSel ? '▶ ' : '  ') + opt, bx, by);
        });
    }
}

window.PokemonDarkRisingEngine = PokemonDarkRisingEngine;
