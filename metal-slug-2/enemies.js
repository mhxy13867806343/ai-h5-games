var MS2 = window.MS2 || {};

MS2.Enemy = class {
    constructor(x, y, hp, w, h, type) {
        this.x = x; this.y = y; this.hp = hp; this.maxHp = hp;
        this.width = w; this.height = h; this.type = type;
        this.vx = 0; this.vy = 0; this.direction = -1;
        this.state = 'IDLE'; this.frame = 0; this.active = true;
        this.dropType = null; this.deathTimer = 0;
        this.gravity = 0.5; this.shootTimer = 0;
    }
    update(px, py, groundY) { this.frame++; return { bullets: [], enemies: [] }; }
    draw(ctx) {}
    takeDamage(dmg) {
        this.hp -= dmg;
        if (this.hp <= 0) { this.die(); return true; }
        return false;
    }
    die() {
        this.state = 'DYING'; this.deathTimer = 30;
    }
    getHitbox() {
        return { x: this.x - this.width/2, y: this.y - this.height, w: this.width, h: this.height };
    }
};

MS2.ArabSoldier = class extends MS2.Enemy {
    constructor(x, y) {
        super(x, y, 1, 40, 64, 'arab');
        this.speed = 2.5; this.attackRange = 60; this.detectRange = 400;
        this.attackCooldown = 0;
    }
    update(px, py, groundY) {
        this.frame++;
        let result = { bullets: [], enemies: [] };
        if (this.state === 'DYING') {
            this.deathTimer--;
            if (this.deathTimer <= 0) this.active = false;
            this.vy += this.gravity; this.y += this.vy;
            if (this.y > groundY) this.y = groundY;
            return result;
        }
        // Apply gravity
        this.vy += this.gravity; this.y += this.vy;
        if (this.y >= groundY) { this.y = groundY; this.vy = 0; }
        
        let dx = px - this.x;
        let dist = Math.abs(dx);
        this.direction = dx > 0 ? 1 : -1;
        
        if (dist < this.attackRange) {
            this.state = 'ATTACK'; this.vx = 0;
            this.attackCooldown--;
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 60;
                // Throw scimitar
                result.bullets.push(new MS2.Bullet(
                    this.x + this.direction * 20, this.y - 30,
                    this.direction * 6, -3, 'enemy', 1, 'enemy'
                ));
            }
        } else if (dist < this.detectRange) {
            this.state = 'CHASE';
            this.vx = this.direction * this.speed;
            this.x += this.vx;
        } else {
            this.state = 'IDLE'; this.vx = 0;
        }
        return result;
    }
    draw(ctx) {
        if (!this.active) return;
        if (this.state === 'DYING') {
            ctx.save(); ctx.globalAlpha = this.deathTimer / 30;
            MS2.Sprites.drawArabSoldier(ctx, this.x, this.y, this.frame, this.direction, 'IDLE');
            ctx.restore();
            return;
        }
        MS2.Sprites.drawArabSoldier(ctx, this.x, this.y, this.frame, this.direction, this.state);
    }
};

MS2.RebelSoldier = class extends MS2.Enemy {
    constructor(x, y) {
        super(x, y, 1, 40, 70, 'rebel');
        this.speed = 1.5; this.detectRange = 500; this.fireRate = 90;
        this.shootTimer = Math.random() * 60;
    }
    update(px, py, groundY) {
        this.frame++;
        let result = { bullets: [], enemies: [] };
        if (this.state === 'DYING') {
            this.deathTimer--;
            if (this.deathTimer <= 0) this.active = false;
            this.vy += this.gravity; this.y += this.vy;
            if (this.y > groundY) this.y = groundY;
            return result;
        }
        this.vy += this.gravity; this.y += this.vy;
        if (this.y >= groundY) { this.y = groundY; this.vy = 0; }
        
        let dx = px - this.x;
        let dist = Math.abs(dx);
        this.direction = dx > 0 ? 1 : -1;
        
        if (dist < this.detectRange) {
            this.state = 'WALK';
            if (dist > 200) { this.x += this.direction * this.speed; }
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                this.shootTimer = this.fireRate;
                this.state = 'ATTACK';
                let angle = Math.atan2(py - 30 - this.y + 30, px - this.x);
                result.bullets.push(new MS2.Bullet(
                    this.x + this.direction * 20, this.y - 35,
                    Math.cos(angle) * 5, Math.sin(angle) * 5,
                    'enemy', 1, 'enemy'
                ));
            }
        } else {
            this.state = 'IDLE';
        }
        return result;
    }
    draw(ctx) {
        if (!this.active) return;
        if (this.state === 'DYING') {
            ctx.save(); ctx.globalAlpha = this.deathTimer / 30;
            MS2.Sprites.drawRebelSoldier(ctx, this.x, this.y, this.frame, this.direction, 'IDLE');
            ctx.restore();
            return;
        }
        MS2.Sprites.drawRebelSoldier(ctx, this.x, this.y, this.frame, this.direction, this.state);
    }
};

MS2.Helicopter = class extends MS2.Enemy {
    constructor(x, y) {
        super(x, y || 100, 12, 120, 60, 'heli');
        this.baseY = y || 100; this.speed = 1.5;
        this.moveDir = -1; this.bombTimer = 120;
        this.amplitude = 30; this.phase = Math.random() * Math.PI * 2;
    }
    update(px, py, groundY) {
        this.frame++;
        let result = { bullets: [], enemies: [] };
        if (this.state === 'DYING') {
            this.deathTimer--;
            this.vy += 0.3; this.y += this.vy;
            this.x += this.vx;
            if (this.deathTimer <= 0) this.active = false;
            return result;
        }
        // Sine wave movement
        this.phase += 0.02;
        this.y = this.baseY + Math.sin(this.phase) * this.amplitude;
        this.x += this.moveDir * this.speed;
        // Reverse at edges relative to player
        if (Math.abs(this.x - px) > 350) this.moveDir = px > this.x ? 1 : -1;
        this.direction = this.moveDir;
        // Drop bombs
        this.bombTimer--;
        if (this.bombTimer <= 0) {
            this.bombTimer = 100 + Math.random() * 40;
            result.bullets.push(new MS2.Bullet(
                this.x, this.y + 30, 0, 4, 'missile', 1, 'enemy'
            ));
        }
        return result;
    }
    die() {
        this.state = 'DYING'; this.deathTimer = 40;
        this.vy = 2; this.vx = this.moveDir * 2;
    }
    draw(ctx) {
        if (!this.active) return;
        if (this.state === 'DYING') {
            ctx.save(); ctx.globalAlpha = this.deathTimer / 40;
            MS2.Sprites.drawHelicopter(ctx, this.x, this.y, this.frame, 0, this.maxHp);
            // Fire effect
            MS2.Sprites.drawExplosion(ctx, this.x + Math.random()*40-20, this.y + Math.random()*20, (40-this.deathTimer)/3, false);
            ctx.restore();
            return;
        }
        MS2.Sprites.drawHelicopter(ctx, this.x, this.y, this.frame, this.hp, this.maxHp);
    }
};

MS2.Boss = class extends MS2.Enemy {
    constructor(x, y) {
        super(x, y || 120, 80, 200, 120, 'boss');
        this.baseY = y || 120; this.speed = 0.8;
        this.moveDir = 1; this.phase = 0;
        this.missileTimer = 0; this.sweepTimer = 0;
        this.soldierTimer = 0; this.defeated = false;
        this.minX = x - 200; this.maxX = x + 200;
    }
    getPhase() {
        let pct = this.hp / this.maxHp;
        if (pct > 0.6) return 1;
        if (pct > 0.3) return 2;
        return 3;
    }
    update(px, py, groundY) {
        this.frame++;
        let result = { bullets: [], enemies: [] };
        if (this.state === 'DYING') {
            this.deathTimer--;
            this.vy += 0.2; this.y += this.vy;
            if (this.deathTimer <= 0) {
                this.active = false; this.defeated = true;
            }
            return result;
        }
        // Movement
        this.phase += 0.015;
        this.y = this.baseY + Math.sin(this.phase) * 20;
        this.x += this.moveDir * this.speed;
        if (this.x > this.maxX) this.moveDir = -1;
        if (this.x < this.minX) this.moveDir = 1;
        this.direction = px > this.x ? 1 : -1;
        
        let currentPhase = this.getPhase();
        
        // Phase 1: Drop soldiers
        if (currentPhase >= 1) {
            this.soldierTimer--;
            if (this.soldierTimer <= 0) {
                this.soldierTimer = 180;
                result.enemies.push(new MS2.ArabSoldier(
                    this.x + (Math.random() - 0.5) * 100,
                    this.y + 60
                ));
            }
        }
        // Phase 2: Fire missiles
        if (currentPhase >= 2) {
            this.missileTimer--;
            if (this.missileTimer <= 0) {
                this.missileTimer = 60;
                let angle = Math.atan2(py - this.y, px - this.x);
                result.bullets.push(new MS2.Bullet(
                    this.x - 40, this.y + 20,
                    Math.cos(angle) * 5, Math.sin(angle) * 5,
                    'missile', 1, 'enemy'
                ));
                result.bullets.push(new MS2.Bullet(
                    this.x + 40, this.y + 20,
                    Math.cos(angle) * 4.5, Math.sin(angle) * 4.5,
                    'missile', 1, 'enemy'
                ));
            }
        }
        // Phase 3: Ground fire sweep
        if (currentPhase >= 3) {
            this.sweepTimer--;
            if (this.sweepTimer <= 0) {
                this.sweepTimer = 15;
                for (let i = 0; i < 3; i++) {
                    result.bullets.push(new MS2.Bullet(
                        this.x - 60 + i * 60, this.y + 50,
                        (Math.random() - 0.5) * 3, 5 + Math.random() * 2,
                        'enemy', 1, 'enemy'
                    ));
                }
            }
        }
        return result;
    }
    die() {
        this.state = 'DYING'; this.deathTimer = 90; this.vy = 0;
    }
    draw(ctx) {
        if (!this.active) return;
        if (this.state === 'DYING') {
            ctx.save(); ctx.globalAlpha = Math.max(0.2, this.deathTimer / 90);
            MS2.Sprites.drawBoss(ctx, this.x, this.y, this.frame, 0, this.maxHp, 3);
            // Multiple explosions
            for (let i = 0; i < 3; i++) {
                MS2.Sprites.drawExplosion(ctx,
                    this.x + Math.sin(this.frame * 0.3 + i * 2) * 60,
                    this.y + Math.cos(this.frame * 0.4 + i * 1.5) * 30,
                    (90 - this.deathTimer) / 4 + i * 2, true);
            }
            ctx.restore();
            return;
        }
        MS2.Sprites.drawBoss(ctx, this.x, this.y, this.frame, this.hp, this.maxHp, this.getPhase());
    }
};

window.MS2 = MS2;
