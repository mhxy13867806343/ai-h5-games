var MS2 = window.MS2 || {};

MS2.Game = class {
    constructor() {
        this.state = 'LOADING';
        this.canvas = null; this.ctx = null;
        this.W = 800; this.H = 600;
        this.input = null; this.player = null; this.level = null;
        this.camX = 0; this.camY = 0;
        this.enemies = []; this.bullets = []; this.grenades = [];
        this.explosions = []; this.enemyBullets = [];
        this.shakeX = 0; this.shakeY = 0; this.shakeTimer = 0;
        this.missionTextTimer = 0; this.bossActive = false;
        this.frame = 0; this.coins = 0;
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.input = new MS2.Input();
        this.input.init();
        this.runLoading();
    }

    runLoading() {
        let progress = 0;
        const iv = setInterval(() => {
            progress += 4;
            const bar = document.querySelector('.loading-bar .progress');
            const txt = document.querySelector('.loading-text');
            if (bar) bar.style.width = progress + '%';
            if (txt) txt.textContent = '加载中... ' + Math.min(progress, 100) + '%';
            if (progress >= 100) {
                clearInterval(iv);
                setTimeout(() => {
                    document.getElementById('loading-screen').classList.remove('active');
                    this.state = 'MENU';
                    this.loop = this.loop.bind(this);
                    requestAnimationFrame(this.loop);
                }, 300);
            }
        }, 40);
    }

    startGame() {
        this.level = new MS2.Level();
        this.player = new MS2.Player(100, this.level.groundY);
        this.enemies = []; this.bullets = []; this.grenades = [];
        this.explosions = []; this.enemyBullets = [];
        this.camX = 0; this.camY = 0;
        this.bossActive = false;
        this.missionTextTimer = 180;
        this.state = 'PLAYING';
    }

    restart() {
        this.coins = 0;
        this.state = 'MENU';
    }

    loop(ts) {
        this.update();
        this.render();
        this.input.update();
        this.frame++;
        requestAnimationFrame(this.loop);
    }

    update() {
        switch (this.state) {
            case 'MENU':
                if (this.input.pressed('COIN')) { this.coins++; this.state = 'COIN_INSERTED'; }
                if (this.input.pressed('START')) { this.coins = 1; this.state = 'COIN_INSERTED'; }
                break;
            case 'COIN_INSERTED':
                if (this.input.pressed('START')) this.startGame();
                if (this.input.pressed('COIN')) this.coins++;
                break;
            case 'PLAYING':
                this.updatePlaying();
                break;
            case 'PAUSED':
                if (this.input.pressed('START')) this.state = 'PLAYING';
                break;
            case 'GAME_OVER':
                if (this.input.pressed('START')) this.restart();
                break;
            case 'LEVEL_COMPLETE':
                if (this.input.pressed('START')) this.restart();
                break;
        }
    }

    updatePlaying() {
        if (this.input.pressed('START')) { this.state = 'PAUSED'; return; }
        if (this.missionTextTimer > 0) this.missionTextTimer--;

        this.level.update();

        // Player update
        let result = this.player.update(this.input, this.level.groundY, this.level.platforms);
        this.bullets.push(...result.bullets);
        this.grenades.push(...result.grenades);

        // Camera - follow player, only scroll right
        let targetCamX = this.player.x - this.W / 3;
        if (targetCamX > this.camX) this.camX = targetCamX;
        if (this.camX < 0) this.camX = 0;
        if (this.camX > this.level.levelWidth - this.W) this.camX = this.level.levelWidth - this.W;
        // Clamp player to camera bounds
        if (this.player.x < this.camX + 24) this.player.x = this.camX + 24;
        if (this.player.x > this.camX + this.W - 24) this.player.x = this.camX + this.W - 24;

        // Spawn enemies
        let newEnemies = this.level.checkSpawns(this.camX);
        this.enemies.push(...newEnemies);
        for (let e of newEnemies) {
            if (e.type === 'boss') this.bossActive = true;
        }

        // Update enemies
        for (let e of this.enemies) {
            if (!e.active) continue;
            let er = e.update(this.player.x, this.player.y, this.level.groundY);
            if (er.bullets) this.enemyBullets.push(...er.bullets);
            if (er.enemies) this.enemies.push(...er.enemies);
        }
        this.enemies = this.enemies.filter(e => e.active);

        // Update bullets
        for (let b of this.bullets) b.update();
        this.bullets = this.bullets.filter(b => b.active);

        for (let b of this.enemyBullets) b.update();
        this.enemyBullets = this.enemyBullets.filter(b => b.active);

        // Update grenades
        for (let g of this.grenades) {
            g.update(this.level.groundY);
            if (!g.active && g.exploded) {
                this.explosions.push(new MS2.Explosion(g.x, g.y, true));
                this.shake(8, 15);
            }
        }
        this.grenades = this.grenades.filter(g => g.active);

        // Update explosions
        for (let ex of this.explosions) ex.update();
        this.explosions = this.explosions.filter(ex => ex.active);

        // === Collision Detection ===
        // Player bullets vs enemies
        for (let b of this.bullets) {
            if (!b.active) continue;
            for (let e of this.enemies) {
                if (!e.active || e.state === 'DYING') continue;
                let eh = e.getHitbox();
                if (this.aabb(b.x - b.width/2, b.y - b.height/2, b.width, b.height, eh.x, eh.y, eh.w, eh.h)) {
                    b.active = false;
                    if (e.takeDamage(b.damage)) {
                        this.player.score += (e.type === 'boss' ? 50000 : e.type === 'heli' ? 5000 : 1000);
                        this.explosions.push(new MS2.Explosion(e.x, e.y - e.height/2, e.type === 'boss' || e.type === 'heli'));
                        this.shake(e.type === 'boss' ? 15 : 5, e.type === 'boss' ? 30 : 10);
                    }
                }
            }
        }

        // Explosion radius vs enemies
        for (let ex of this.explosions) {
            if (ex.frame > 3) continue; // only damage on first few frames
            for (let e of this.enemies) {
                if (!e.active || e.state === 'DYING') continue;
                if (ex.hit[e.x + '_' + e.y]) continue;
                let dist = Math.sqrt((ex.x - e.x) ** 2 + (ex.y - (e.y - e.height/2)) ** 2);
                if (dist < ex.radius) {
                    ex.hit[e.x + '_' + e.y] = true;
                    if (e.takeDamage(ex.damage)) {
                        this.player.score += (e.type === 'boss' ? 50000 : e.type === 'heli' ? 5000 : 1000);
                    }
                }
            }
        }

        // Enemy bullets vs player
        if (!this.player.isDead && this.player.invincTimer <= 0) {
            let ph = this.player.getHitbox();
            for (let b of this.enemyBullets) {
                if (!b.active) continue;
                if (this.aabb(b.x - 4, b.y - 3, 8, 6, ph.x, ph.y, ph.w, ph.h)) {
                    b.active = false;
                    this.player.die();
                    this.explosions.push(new MS2.Explosion(this.player.x, this.player.y - 30, false));
                    this.shake(10, 15);
                    break;
                }
            }
            // Enemy body vs player (melee)
            for (let e of this.enemies) {
                if (!e.active || e.state === 'DYING') continue;
                let eh = e.getHitbox();
                if (this.aabb(ph.x, ph.y, ph.w, ph.h, eh.x, eh.y, eh.w, eh.h)) {
                    if (e.state === 'ATTACK' && e.type === 'arab') {
                        this.player.die();
                        this.shake(8, 12);
                        break;
                    }
                }
            }
        }

        // Player vs items
        if (!this.player.isDead) {
            let ph = this.player.getHitbox();
            for (let item of this.level.items) {
                if (item.collected) continue;
                if (this.aabb(ph.x, ph.y, ph.w, ph.h, item.x - 12, item.y - 12, 24, 24)) {
                    item.collected = true;
                    if (['H','S','R','F','L'].includes(item.type)) {
                        this.player.collectWeapon(item.type);
                    } else if (item.type === 'grenade') {
                        this.player.grenades = Math.min(this.player.grenades + 5, 20);
                    } else if (item.type === 'food') {
                        this.player.score += 500;
                    } else if (item.type === 'gem') {
                        this.player.score += 2000;
                    }
                }
            }
            // Player vs POWs
            for (let pow of this.level.pows) {
                if (pow.freed) continue;
                if (this.aabb(ph.x, ph.y, ph.w, ph.h, pow.x - 15, pow.y - 40, 30, 40)) {
                    pow.freed = true;
                    this.player.score += 1000;
                }
            }
        }

        // Check boss defeated
        if (this.bossActive) {
            let boss = this.enemies.find(e => e.type === 'boss');
            if (!boss || boss.defeated) {
                this.state = 'LEVEL_COMPLETE';
            }
        }

        // Check game over
        if (this.player.lives <= 0 && this.player.isDead) {
            this.state = 'GAME_OVER';
        }

        // Screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        } else {
            this.shakeX = 0; this.shakeY = 0;
        }
    }

    aabb(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity; this.shakeTimer = duration;
    }

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.W, this.H);

        switch (this.state) {
            case 'MENU': this.renderMenu(ctx); break;
            case 'COIN_INSERTED': this.renderCoinInserted(ctx); break;
            case 'PLAYING': case 'PAUSED':
                this.renderGame(ctx);
                if (this.state === 'PAUSED') this.renderPaused(ctx);
                break;
            case 'GAME_OVER': this.renderGame(ctx); this.renderGameOver(ctx); break;
            case 'LEVEL_COMPLETE': this.renderGame(ctx); this.renderLevelComplete(ctx); break;
        }
    }

    renderMenu(ctx) {
        // Desert background
        let grad = ctx.createLinearGradient(0, 0, 0, this.H);
        grad.addColorStop(0, '#1a0a30');
        grad.addColorStop(0.5, '#c85030');
        grad.addColorStop(1, '#e8a040');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.W, this.H);
        // Ground
        ctx.fillStyle = '#c8a868';
        ctx.fillRect(0, 480, this.W, 120);
        // Title
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('METAL SLUG 2', this.W/2, 180);
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('合 金 弹 头 2', this.W/2, 220);
        // Subtitle
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.fillText('SUPER VEHICLE - 001/II', this.W/2, 260);
        // Insert coin (blinking)
        if (Math.floor(this.frame / 30) % 2 === 0) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('INSERT COIN (按 5 投币)', this.W/2, 380);
        }
        // Credits
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.fillText('CREDIT: ' + this.coins, this.W/2, 550);
        ctx.fillText('© SNK 1998 — HTML5 Recreation', this.W/2, 580);
    }

    renderCoinInserted(ctx) {
        this.renderMenu(ctx);
        // Override with PRESS START
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 340, this.W, 80);
        if (Math.floor(this.frame / 20) % 2 === 0) {
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS START (按 Enter)', this.W/2, 390);
        }
        ctx.fillStyle = '#ffff00';
        ctx.font = '14px monospace';
        ctx.fillText('CREDIT: ' + this.coins, this.W/2, 550);
    }

    renderGame(ctx) {
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Background (not translated by camera - handled internally)
        this.level.drawBackground(ctx, this.camX, this.camY, this.W, this.H);

        // Camera transform for game objects
        ctx.save();
        ctx.translate(-this.camX, 0);

        // Foreground/terrain
        this.level.drawForeground(ctx, this.camX);

        // Enemies
        for (let e of this.enemies) e.draw(ctx);

        // Player
        this.player.draw(ctx);

        // Bullets
        for (let b of this.bullets) b.draw(ctx);
        for (let b of this.enemyBullets) b.draw(ctx);

        // Grenades
        for (let g of this.grenades) g.draw(ctx);

        // Explosions
        for (let ex of this.explosions) ex.draw(ctx);

        ctx.restore(); // end camera

        // HUD (not affected by camera)
        this.renderHUD(ctx);

        ctx.restore(); // end shake
    }

    renderHUD(ctx) {
        ctx.save();
        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE', 15, 25);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(String(this.player.score).padStart(8, '0'), 15, 48);

        // Weapon ammo
        if (this.player.weapon.type !== 'P') {
            ctx.fillStyle = '#00ccff';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(this.player.weapon.type + ': ' +
                (this.player.weapon.ammo === -1 ? '∞' : this.player.weapon.ammo), 15, 70);
        }

        // Lives (top right)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('×' + this.player.lives, this.W - 15, 25);
        // Player icon for lives
        for (let i = 0; i < this.player.lives; i++) {
            ctx.fillStyle = '#4a6741';
            ctx.fillRect(this.W - 55 - i * 22, 10, 16, 18);
            ctx.fillStyle = '#e8b88a';
            ctx.fillRect(this.W - 53 - i * 22, 6, 12, 8);
        }

        // Grenades
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('💣×' + this.player.grenades, this.W - 15, 50);

        // Mission text
        if (this.missionTextTimer > 0) {
            let alpha = this.missionTextTimer > 60 ? 1 : this.missionTextTimer / 60;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff6600';
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('MISSION 1', this.W/2, this.H/2 - 40);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText('DRIFTING IN DESERT', this.W/2, this.H/2);
            ctx.restore();
        }

        // Boss HP bar
        if (this.bossActive) {
            let boss = this.enemies.find(e => e.type === 'boss' && e.active);
            if (boss && boss.state !== 'DYING') {
                let barW = 300, barH = 16;
                let barX = (this.W - barW) / 2, barY = 12;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barW, barH);
                let hpW = Math.round(barW * boss.hp / boss.maxHp);
                let hpGrad = ctx.createLinearGradient(barX, 0, barX + hpW, 0);
                hpGrad.addColorStop(0, '#ff0000');
                hpGrad.addColorStop(1, '#ff6600');
                ctx.fillStyle = hpGrad;
                ctx.fillRect(barX, barY, hpW, barH);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('KEESI II', this.W/2, barY + 12);
            }
        }

        ctx.restore();
    }

    renderPaused(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', this.W/2, this.H/2 - 10);
        ctx.fillStyle = '#aaa';
        ctx.font = '16px monospace';
        ctx.fillText('按 Enter 继续', this.W/2, this.H/2 + 30);
    }

    renderGameOver(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 52px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.W/2, this.H/2 - 30);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('SCORE: ' + String(this.player.score).padStart(8, '0'), this.W/2, this.H/2 + 20);
        ctx.fillStyle = '#aaa';
        ctx.font = '16px monospace';
        ctx.fillText('按 Enter 重新开始', this.W/2, this.H/2 + 60);
    }

    renderLevelComplete(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.fillStyle = '#00ff66';
        ctx.font = 'bold 42px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MISSION COMPLETE!', this.W/2, this.H/2 - 60);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('SCORE: ' + String(this.player.score).padStart(8, '0'), this.W/2, this.H/2);
        // POW count
        let freed = this.level.pows.filter(p => p.freed).length;
        ctx.fillStyle = '#00ccff';
        ctx.font = '16px monospace';
        ctx.fillText('PRISONERS RESCUED: ' + freed + ' / ' + this.level.pows.length, this.W/2, this.H/2 + 35);
        ctx.fillStyle = '#aaa';
        ctx.font = '16px monospace';
        ctx.fillText('按 Enter 返回', this.W/2, this.H/2 + 80);
    }
};

window.MS2 = MS2;
