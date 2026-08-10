var MS2 = window.MS2 || {};

MS2.Player = class {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.width = 48; this.height = 64;
        this.gravity = 0.6; this.jumpVel = -13; this.walkSpeed = 4;
        this.lives = 3; this.score = 0; this.grenades = 10;
        this.weapon = MS2.Weapons.Pistol();
        this.direction = 1; this.state = 'IDLE'; this.frame = 0;
        this.isGrounded = false; this.invincTimer = 0;
        this.isDead = false; this.deadTimer = 0;
        this.shootDir = 'forward';
    }
    update(input, groundY, platforms) {
        if (this.invincTimer > 0) this.invincTimer--;
        this.frame++;
        let newBullets = [], newGrenades = [];
        if (this.isDead) {
            this.deadTimer--;
            if (this.deadTimer <= 0 && this.lives > 0) this.respawn();
            this.vy += this.gravity;
            this.y += this.vy;
            return { bullets: newBullets, grenades: newGrenades };
        }
        // Movement
        if (input.down('LEFT')) {
            this.vx = -this.walkSpeed; this.direction = -1;
            if (this.isGrounded && this.state !== 'CROUCH') this.state = 'WALK';
        } else if (input.down('RIGHT')) {
            this.vx = this.walkSpeed; this.direction = 1;
            if (this.isGrounded && this.state !== 'CROUCH') this.state = 'WALK';
        } else {
            this.vx = 0;
            if (this.isGrounded && this.state !== 'CROUCH') this.state = 'IDLE';
        }
        // Crouch
        if (input.down('DOWN') && this.isGrounded) {
            this.state = 'CROUCH'; this.vx = 0;
        } else if (this.state === 'CROUCH' && !input.down('DOWN')) {
            this.state = 'IDLE';
        }
        // Jump
        if (input.pressed('JUMP') && this.isGrounded) {
            this.vy = this.jumpVel; this.isGrounded = false; this.state = 'JUMP';
        }
        if (!this.isGrounded) this.state = 'JUMP';
        // Gravity + position
        this.vy += this.gravity;
        this.x += this.vx; this.y += this.vy;
        // Clamp x
        if (this.x < 24) this.x = 24;
        // Platform collision
        this.isGrounded = false;
        if (this.y >= groundY) {
            this.y = groundY; this.vy = 0; this.isGrounded = true;
            if (this.state === 'JUMP') this.state = 'IDLE';
        }
        if (platforms) {
            for (let p of platforms) {
                if (this.x > p.x - 10 && this.x < p.x + p.w + 10 &&
                    this.y >= p.y && this.y - this.vy/1.1 <= p.y + 5 && this.vy >= 0) {
                    this.y = p.y; this.vy = 0; this.isGrounded = true;
                    if (this.state === 'JUMP') this.state = 'IDLE';
                }
            }
        }
        // Aim direction
        this.shootDir = 'forward';
        let aimX = this.direction, aimY = 0;
        if (input.down('UP')) {
            if (input.down('LEFT') || input.down('RIGHT')) {
                this.shootDir = 'diagup'; aimY = -1;
            } else {
                this.shootDir = 'up'; aimX = 0; aimY = -1;
            }
        } else if (input.down('DOWN') && !this.isGrounded) {
            this.shootDir = 'diagdown'; aimY = 1; aimX = this.direction;
        }
        // Shoot
        this.weapon.update();
        if (input.down('SHOOT') && this.weapon.canShoot()) {
            const bx = this.x + this.direction * 20;
            const by = this.y - (this.state === 'CROUCH' ? 20 : 36);
            const bullets = this.weapon.shoot(bx, by, aimX, aimY);
            newBullets.push(...bullets);
        }
        // Grenade
        if (input.pressed('GRENADE') && this.grenades > 0) {
            this.grenades--;
            newGrenades.push(new MS2.Grenade(this.x, this.y - 32, this.direction * 7, -9));
        }
        return { bullets: newBullets, grenades: newGrenades };
    }
    die() {
        if (this.invincTimer > 0 || this.isDead) return;
        this.isDead = true; this.state = 'DYING';
        this.vy = -8; this.vx = -this.direction * 3;
        this.lives--; this.deadTimer = 120;
    }
    respawn() {
        this.isDead = false; this.state = 'IDLE';
        this.invincTimer = 180; this.weapon = MS2.Weapons.Pistol();
        this.vy = 0; this.vx = 0;
    }
    draw(ctx) {
        if (this.invincTimer > 0 && Math.floor(this.frame / 4) % 2 === 0) return;
        MS2.Sprites.drawPlayer(ctx, this.x, this.y, this.state, this.frame, this.direction, this.shootDir);
    }
    collectWeapon(type) {
        const map = {H:'HMG',S:'Shotgun',R:'Rocket',F:'Flame',L:'Laser'};
        const fn = MS2.Weapons[map[type] || type];
        if (fn) this.weapon = fn();
    }
    getHitbox() {
        const h = this.state === 'CROUCH' ? 40 : this.height;
        return { x: this.x - 16, y: this.y - h, w: 32, h: h };
    }
};

window.MS2 = MS2;
