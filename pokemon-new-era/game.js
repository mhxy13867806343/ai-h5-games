/* ============================================================
   《口袋妖怪：新纪元 (Pokémon: New Era)》纯 HTML5 Canvas 游戏引擎
   ============================================================ */

class PokemonNewEraEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // GBA Standard resolution
        this.canvas.width = 720;
        this.canvas.height = 480;

        this.initAudio();

        // Game State
        this.state = 'STARTER_SELECT'; // STARTER_SELECT, OVERWORLD, BATTLE
        this.starterIndex = 0;

        // Player Data
        this.player = {
            name: '曙光训练师',
            x: 6, y: 4,
            direction: 'DOWN',
            party: [],
            resonanceGauge: 100 // Resonance meter for Resonance Evolution
        };

        // Legendary Starters of Pokemon New Era
        this.starters = [
            { id: 644, name: '捷克罗姆 (Zekrom)', type: '电/龙', hp: 50, maxHp: 50, atk: 18, def: 14, moves: [{ name: '雷击', pwr: 22 }, { name: '交叉闪电', pwr: 18 }, { name: '龙爪', pwr: 16 }], sprite: '⚡', resonanceSprite: '⚡🐉' },
            { id: 643, name: '莱希拉姆 (Reshiram)', type: '火/龙', hp: 50, maxHp: 50, atk: 19, def: 13, moves: [{ name: '青焰', pwr: 22 }, { name: '交叉火焰', pwr: 18 }, { name: '龙之波动', pwr: 16 }], sprite: '🔥', resonanceSprite: '🔥🐉' },
            { id: 646, name: '酋雷姆 (Kyurem)', type: '冰/龙', hp: 52, maxHp: 52, atk: 17, def: 15, moves: [{ name: '冰封世界', pwr: 20 }, { name: '冰冻光束', pwr: 16 }, { name: '巨声', pwr: 14 }], sprite: '❄️', resonanceSprite: '❄️🐉' }
        ];

        // Active Battle
        this.battle = null;
        this.battleMenuIndex = 0;

        // Tilemap
        this.mapCols = 15;
        this.mapRows = 10;
        this.tileSize = 48;
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
        this.playTone(350, 0.05);

        if (this.state === 'STARTER_SELECT') {
            if (action === 'LEFT' || action === 'UP') this.starterIndex = (this.starterIndex - 1 + 3) % 3;
            if (action === 'RIGHT' || action === 'DOWN') this.starterIndex = (this.starterIndex + 1) % 3;

            if (action === 'A' || action === 'START') {
                const chosen = JSON.parse(JSON.stringify(this.starters[this.starterIndex]));
                chosen.isResonated = false;
                this.player.party.push(chosen);
                this.state = 'OVERWORLD';
                this.playTone(600, 0.3);
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
            if (action === 'L') { // L 键触发共鸣进化
                this.triggerResonanceEvolution();
            }
            if (action === 'B') {
                this.state = 'OVERWORLD';
            }
            return;
        }
    }

    triggerResonanceEvolution() {
        if (!this.battle) return;
        const { playerMon } = this.battle;
        if (!playerMon.isResonated && this.player.resonanceGauge >= 100) {
            playerMon.isResonated = true;
            playerMon.atk += 15;
            this.battle.log = `✨ 契约爆发！${playerMon.name} 触发了【共鸣进化】！全属性提高！`;
            this.playTone(880, 0.5, 'sawtooth');
        }
    }

    triggerWildBattle() {
        const enemies = [
            { name: '秩序守护者·阿尔宙斯分身', hp: 60, maxHp: 60, atk: 18, def: 14, sprite: '✨' },
            { name: '暗影无极汰那 (Dark Eternatus)', hp: 65, maxHp: 65, atk: 20, def: 12, sprite: '🌌' },
            { name: '曙光霸主·凤王', hp: 58, maxHp: 58, atk: 17, def: 15, sprite: '🦅' }
        ];
        const wild = enemies[Math.floor(Math.random() * enemies.length)];

        this.battle = {
            playerMon: this.player.party[0],
            enemyMon: wild,
            log: `野生的 《${wild.name}》 阻挡在前方！`
        };

        this.state = 'BATTLE';
        this.battleMenuIndex = 0;
        this.playTone(320, 0.4);
    }

    executeBattleTurn(actionIndex) {
        if (!this.battle) return;

        const { playerMon, enemyMon } = this.battle;

        if (actionIndex === 0) { // 招式攻击
            const move = playerMon.moves[0];
            const pwrBonus = playerMon.isResonated ? 12 : 0;
            const dmg = Math.max(6, playerMon.atk + move.pwr + pwrBonus - enemyMon.def);
            enemyMon.hp = Math.max(0, enemyMon.hp - dmg);
            this.battle.log = `${playerMon.name} 发动【${move.name}】！造成 ${dmg} 伤害！`;
            this.playTone(554, 0.2, 'sawtooth');

            if (enemyMon.hp <= 0) {
                this.battle.log = `${enemyMon.name} 倒下了！战斗胜利！`;
                setTimeout(() => { this.state = 'OVERWORLD'; }, 1500);
                return;
            }

            // Enemy Turn
            setTimeout(() => {
                const enemyDmg = Math.max(4, enemyMon.atk - playerMon.def);
                playerMon.hp = Math.max(0, playerMon.hp - enemyDmg);
                this.battle.log = `${enemyMon.name} 反击！造成 ${enemyDmg} 伤害！`;
                this.playTone(200, 0.2, 'square');

                if (playerMon.hp <= 0) {
                    playerMon.hp = playerMon.maxHp;
                    this.state = 'OVERWORLD';
                }
            }, 800);
        } else if (actionIndex === 1) { // 共鸣/全复药
            if (!playerMon.isResonated) {
                this.triggerResonanceEvolution();
            } else {
                playerMon.hp = Math.min(playerMon.maxHp, playerMon.hp + 25);
                this.battle.log = `使用了【曙光全复药】！恢复 25 HP！`;
                this.playTone(700, 0.3);
            }
        } else if (actionIndex === 2) { // 捕捉
            this.battle.log = `投掷【共鸣球】！成功缔结契约，捕获 ${enemyMon.name}！`;
            this.playTone(900, 0.4);
            setTimeout(() => { this.state = 'OVERWORLD'; }, 1500);
        } else if (actionIndex === 3) {
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
        this.ctx.fillStyle = '#0d1117';
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
        this.ctx.fillStyle = '#161b22';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header Title
        this.ctx.fillStyle = '#ff6c00';
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⚡ 《口袋妖怪：新纪元》 (Pokémon: New Era)', this.canvas.width / 2, 55);

        this.ctx.fillStyle = '#8b949e';
        this.ctx.font = '15px sans-serif';
        this.ctx.fillText('曙光地区开局！请选择你的初始传奇龙族宝可梦：', this.canvas.width / 2, 90);

        // 3 Cards
        this.starters.forEach((mon, idx) => {
            const cardX = 60 + idx * 210;
            const cardY = 130;
            const isSelected = idx === this.starterIndex;

            this.ctx.fillStyle = isSelected ? '#21262d' : '#0d1117';
            this.ctx.strokeStyle = isSelected ? '#ff6c00' : '#30363d';
            this.ctx.lineWidth = isSelected ? 3 : 1;

            this.ctx.fillRect(cardX, cardY, 180, 250);
            this.ctx.strokeRect(cardX, cardY, 180, 250);

            // Sprite
            this.ctx.font = '54px sans-serif';
            this.ctx.fillText(mon.sprite, cardX + 90, cardY + 80);

            // Name
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 15px sans-serif';
            this.ctx.fillText(mon.name, cardX + 90, cardY + 130);

            this.ctx.fillStyle = '#8b949e';
            this.ctx.font = '13px sans-serif';
            this.ctx.fillText(`属性: ${mon.type}`, cardX + 90, cardY + 160);
            this.ctx.fillText(`生命: ${mon.hp} / 攻击: ${mon.atk}`, cardX + 90, cardY + 185);

            if (isSelected) {
                this.ctx.fillStyle = '#10b981';
                this.ctx.font = 'bold 14px sans-serif';
                this.ctx.fillText('▶ [A 键] 确认开启新纪元', cardX + 90, cardY + 225);
            }
        });

        this.ctx.textAlign = 'left';
    }

    renderOverworld() {
        for (let r = 0; r < this.mapRows; r++) {
            for (let c = 0; c < this.mapCols; c++) {
                const x = c * this.tileSize;
                const y = r * this.tileSize;
                const tile = this.tilemap[r][c];

                if (tile === 0) this.ctx.fillStyle = '#15803d';
                else if (tile === 1) this.ctx.fillStyle = '#166534';
                else if (tile === 2) this.ctx.fillStyle = '#0284c7';
                else if (tile === 3) this.ctx.fillStyle = '#30363d';
                else if (tile === 4) this.ctx.fillStyle = '#d97706';

                this.ctx.fillRect(x, y, this.tileSize - 1, this.tileSize - 1);

                if (tile === 1) {
                    this.ctx.font = '14px sans-serif';
                    this.ctx.fillText('🌾', x + 14, y + 30);
                }
            }
        }

        const px = this.player.x * this.tileSize;
        const py = this.player.y * this.tileSize;
        this.ctx.font = '28px sans-serif';
        this.ctx.fillText('🧑‍🌾', px + 8, py + 36);

        // Top Info Overlay
        this.ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, 38);

        const myMon = this.player.party[0];
        if (myMon) {
            this.ctx.fillStyle = '#ff6c00';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.fillText(`🎮 曙光地区 · 主角: ${myMon.sprite} ${myMon.name} (HP: ${myMon.hp}/${myMon.maxHp})  |  提示: 走进🌾草丛可触发野生霸主宝可梦对决！`, 16, 24);
        }
    }

    renderBattle() {
        this.ctx.fillStyle = '#0d1117';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.battle) return;

        const { playerMon, enemyMon } = this.battle;

        // Enemy Box
        this.ctx.fillStyle = '#161b22';
        this.ctx.fillRect(400, 40, 280, 95);
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(400, 40, 280, 95);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.fillText(enemyMon.name, 415, 68);

        const eRatio = enemyMon.hp / enemyMon.maxHp;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(415, 85, 240, 10);
        this.ctx.fillStyle = eRatio > 0.4 ? '#10b981' : '#ef4444';
        this.ctx.fillRect(415, 85, 240 * eRatio, 10);

        this.ctx.font = '72px sans-serif';
        this.ctx.fillText(enemyMon.sprite, 480, 210);

        // Player Box
        const pSprite = playerMon.isResonated ? playerMon.resonanceSprite : playerMon.sprite;
        this.ctx.font = '72px sans-serif';
        this.ctx.fillText(pSprite, 120, 310);

        this.ctx.fillStyle = '#161b22';
        this.ctx.fillRect(40, 190, 280, 105);
        this.ctx.strokeStyle = playerMon.isResonated ? '#ff6c00' : '#38bdf8';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(40, 190, 280, 105);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px sans-serif';
        const titleStr = playerMon.isResonated ? `✨ ${playerMon.name} (共鸣形态)` : playerMon.name;
        this.ctx.fillText(titleStr, 55, 220);

        const pRatio = playerMon.hp / playerMon.maxHp;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(55, 238, 240, 10);
        this.ctx.fillStyle = pRatio > 0.4 ? '#10b981' : '#ef4444';
        this.ctx.fillRect(55, 238, 240 * pRatio, 10);

        this.ctx.fillStyle = '#8b949e';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(`HP: ${playerMon.hp} / ${playerMon.maxHp}  |  按 L 键触能【共鸣进化】`, 55, 272);

        // Battle Control Box
        this.ctx.fillStyle = '#161b22';
        this.ctx.fillRect(0, 360, this.canvas.width, 120);
        this.ctx.strokeStyle = '#ff6c00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 360, this.canvas.width, 120);

        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = '15px sans-serif';
        this.ctx.fillText(this.battle.log, 20, 395);

        const options = ['⚔️ 招式发动', playerMon.isResonated ? '🧪 全复药' : '✨ 共鸣进化', '🔴 缔结契约', '🏃 撤退'];
        options.forEach((opt, idx) => {
            const bx = 420 + (idx % 2) * 140;
            const by = 390 + Math.floor(idx / 2) * 35;
            const isSel = idx === this.battleMenuIndex;

            this.ctx.fillStyle = isSel ? '#ff6c00' : '#fff';
            this.ctx.font = 'bold 15px sans-serif';
            this.ctx.fillText((isSel ? '▶ ' : '  ') + opt, bx, by);
        });
    }
}

window.PokemonNewEraEngine = PokemonNewEraEngine;
