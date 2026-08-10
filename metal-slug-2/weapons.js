// Metal Slug 2 - Weapons & Projectiles
var MS2 = window.MS2 || {};

MS2.Bullet = class {
    constructor(x, y, vx, vy, type, damage, owner) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.type = type;
        this.damage = damage || 1;
        this.owner = owner || 'player';
        this.active = true;
        this.life = type === 'L' ? 30 : (type === 'enemy' ? 120 : 80);
        this.width = type === 'R' ? 14 : (type === 'missile' ? 10 : 6);
        this.height = type === 'R' ? 6 : 4;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (--this.life <= 0) this.active = false;
        if (this.x < -50 || this.x > 5000 || this.y < -50 || this.y > 700) this.active = false;
    }
    draw(ctx) {
        if (!this.active) return;
        MS2.Sprites.drawBullet(ctx, this.x, this.y, this.type);
    }
};

MS2.Grenade = class {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.gravity = 0.35;
        this.rotation = 0;
        this.active = true;
        this.timer = 90;
        this.bounced = false;
        this.width = 8; this.height = 12;
        this.exploded = false;
    }
    update(groundY) {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += 0.15;
        this.timer--;
        if (this.y >= groundY - 2 && !this.bounced) {
            this.y = groundY - 2;
            this.vy = -this.vy * 0.3;
            this.vx *= 0.5;
            this.bounced = true;
        }
        if (this.timer <= 0 || (this.bounced && Math.abs(this.vy) < 1)) {
            this.explode();
        }
    }
    explode() {
        if (this.exploded) return;
        this.exploded = true;
        this.active = false;
    }
    draw(ctx) {
        if (!this.active) return;
        MS2.Sprites.drawGrenade(ctx, this.x, this.y, this.rotation);
    }
};

MS2.Explosion = class {
    constructor(x, y, big) {
        this.x = x; this.y = y;
        this.frame = 0;
        this.maxFrame = big ? 20 : 12;
        this.active = true;
        this.big = big || false;
        this.damage = big ? 10 : 5;
        this.radius = big ? 60 : 30;
        this.hit = {};
    }
    update() {
        this.frame++;
        if (this.frame > this.maxFrame) this.active = false;
    }
    draw(ctx) {
        MS2.Sprites.drawExplosion(ctx, this.x, this.y, this.frame, this.big);
    }
};

MS2.Weapon = class {
    constructor(type, ammo, fireRate, damage, speed) {
        this.type = type;
        this.ammo = ammo;
        this.fireRate = fireRate;
        this.damage = damage;
        this.speed = speed;
        this.cooldown = 0;
    }
    update() { if (this.cooldown > 0) this.cooldown--; }
    canShoot() { return this.cooldown <= 0 && (this.ammo > 0 || this.ammo === -1); }
    shoot(x, y, dirX, dirY) {
        if (!this.canShoot()) return [];
        this.cooldown = this.fireRate;
        if (this.ammo > 0) this.ammo--;
        const sp = this.speed;
        // Normalize direction
        const len = Math.sqrt(dirX*dirX + dirY*dirY) || 1;
        const nx = dirX/len, ny = dirY/len;
        return [new MS2.Bullet(x, y, nx*sp, ny*sp, this.type, this.damage, 'player')];
    }
    isEmpty() { return this.ammo === 0; }
};

MS2.Weapons = {
    Pistol:    () => new MS2.Weapon('P', -1, 12, 1, 14),
    HMG:       () => new MS2.Weapon('H', 200, 4, 2, 16),
    Shotgun:   () => {
        const w = new MS2.Weapon('S', 30, 22, 4, 12);
        const origShoot = w.shoot.bind(w);
        w.shoot = function(x, y, dirX, dirY) {
            if (!this.canShoot()) return [];
            this.cooldown = this.fireRate;
            if (this.ammo > 0) this.ammo--;
            const sp = this.speed;
            const len = Math.sqrt(dirX*dirX + dirY*dirY) || 1;
            const nx = dirX/len, ny = dirY/len;
            const spread = 0.15;
            return [
                new MS2.Bullet(x, y, nx*sp, ny*sp, 'S', this.damage, 'player'),
                new MS2.Bullet(x, y, (nx*Math.cos(spread)-ny*Math.sin(spread))*sp, (nx*Math.sin(spread)+ny*Math.cos(spread))*sp, 'S', this.damage, 'player'),
                new MS2.Bullet(x, y, (nx*Math.cos(-spread)-ny*Math.sin(-spread))*sp, (nx*Math.sin(-spread)+ny*Math.cos(-spread))*sp, 'S', this.damage, 'player')
            ];
        };
        return w;
    },
    Rocket:    () => new MS2.Weapon('R', 30, 28, 8, 8),
    Flame:     () => new MS2.Weapon('F', 60, 3, 2, 7),
    Laser:     () => new MS2.Weapon('L', 200, 2, 3, 22),
};

window.MS2 = MS2;
