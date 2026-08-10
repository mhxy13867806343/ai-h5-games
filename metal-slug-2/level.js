var MS2 = window.MS2 || {};

MS2.Level = class {
    constructor() {
        this.levelWidth = 6000;
        this.groundY = 480;
        this.platforms = [
            {x:500, y:420, w:120, h:16},
            {x:900, y:380, w:100, h:16},
            {x:1100, y:350, w:80, h:16},
            {x:1400, y:400, w:150, h:16},
            {x:1800, y:360, w:100, h:16},
            {x:2100, y:420, w:120, h:16},
            {x:2500, y:380, w:100, h:16},
            {x:2900, y:350, w:130, h:16},
            {x:3300, y:400, w:100, h:16},
            {x:3700, y:370, w:110, h:16},
            {x:4100, y:410, w:100, h:16},
            {x:4500, y:380, w:120, h:16},
        ];
        this.enemySpawns = [
            {x:300, type:'arab'}, {x:500, type:'arab'}, {x:700, type:'rebel'},
            {x:900, type:'arab'}, {x:1000, type:'arab'},
            {x:1200, type:'rebel'}, {x:1350, type:'arab'},
            {x:1500, type:'rebel'}, {x:1700, type:'arab'}, {x:1800, type:'arab'},
            {x:2000, type:'heli'},
            {x:2100, type:'arab'}, {x:2300, type:'rebel'}, {x:2400, type:'arab'},
            {x:2600, type:'rebel'}, {x:2800, type:'arab'}, {x:2900, type:'rebel'},
            {x:3100, type:'arab'}, {x:3300, type:'rebel'}, {x:3400, type:'arab'},
            {x:3600, type:'heli'},
            {x:3800, type:'rebel'}, {x:4000, type:'arab'}, {x:4200, type:'rebel'},
            {x:4500, type:'rebel'}, {x:4700, type:'arab'},
            {x:5200, type:'boss'},
        ];
        this.enemySpawns.forEach(s => s.triggered = false);
        this.items = [
            {x:250, y:450, type:'food', collected:false},
            {x:600, y:390, type:'H', collected:false},
            {x:1000, y:450, type:'grenade', collected:false},
            {x:1300, y:450, type:'food', collected:false},
            {x:1800, y:330, type:'S', collected:false},
            {x:2200, y:450, type:'food', collected:false},
            {x:2600, y:450, type:'grenade', collected:false},
            {x:3000, y:350, type:'R', collected:false},
            {x:3500, y:450, type:'food', collected:false},
            {x:3800, y:450, type:'grenade', collected:false},
            {x:4200, y:380, type:'F', collected:false},
            {x:4600, y:450, type:'food', collected:false},
            {x:4900, y:450, type:'L', collected:false},
        ];
        this.pows = [
            {x:400, y:480, freed:false, frame:0, runX:0},
            {x:800, y:480, freed:false, frame:0, runX:0},
            {x:1500, y:480, freed:false, frame:0, runX:0},
            {x:2000, y:480, freed:false, frame:0, runX:0},
            {x:2700, y:480, freed:false, frame:0, runX:0},
            {x:3400, y:480, freed:false, frame:0, runX:0},
            {x:4000, y:480, freed:false, frame:0, runX:0},
            {x:4800, y:480, freed:false, frame:0, runX:0},
        ];
        // Decorations - buildings, trees, etc
        this.buildings = [];
        for (let i = 0; i < 30; i++) {
            this.buildings.push({
                x: i * 220 + Math.random() * 80,
                w: 60 + Math.random() * 80,
                h: 60 + Math.random() * 100,
                color: ['#c4a56a','#b89858','#d4b87a','#a88844'][Math.floor(Math.random()*4)],
                windows: Math.floor(Math.random() * 4) + 1,
                hasDome: Math.random() > 0.6
            });
        }
        this.palmTrees = [];
        for (let i = 0; i < 20; i++) {
            this.palmTrees.push({
                x: i * 350 + Math.random() * 200,
                h: 80 + Math.random() * 40,
                lean: (Math.random() - 0.5) * 0.3
            });
        }
        this.clouds = [];
        for (let i = 0; i < 12; i++) {
            this.clouds.push({
                x: i * 500 + Math.random() * 300,
                y: 30 + Math.random() * 80,
                w: 60 + Math.random() * 80,
                h: 20 + Math.random() * 15
            });
        }
    }

    drawBackground(ctx, camX, camY, W, H) {
        // Layer 1: Sky gradient
        let grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#1a0a30');
        grad.addColorStop(0.3, '#3a1850');
        grad.addColorStop(0.6, '#c85030');
        grad.addColorStop(0.8, '#e8a040');
        grad.addColorStop(1, '#f0c868');
        ctx.fillStyle = grad;
        ctx.fillRect(camX, 0, W, H);

        // Sun
        let sunX = camX + W * 0.75 - camX * 0.05;
        ctx.fillStyle = '#ffe080';
        ctx.beginPath(); ctx.arc(sunX, 140, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff8c0';
        ctx.beginPath(); ctx.arc(sunX, 140, 28, 0, Math.PI * 2); ctx.fill();

        // Clouds (very slow parallax)
        ctx.fillStyle = 'rgba(255,200,150,0.3)';
        for (let c of this.clouds) {
            let cx = c.x - camX * 0.1;
            ctx.beginPath();
            ctx.ellipse(cx, c.y, c.w, c.h, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Layer 2: Distant dunes (0.3x parallax)
        let offset2 = camX * 0.3;
        ctx.fillStyle = '#c8a050';
        ctx.beginPath(); ctx.moveTo(camX, H);
        for (let x = camX; x < camX + W + 50; x += 50) {
            let y = 340 + Math.sin((x + offset2 * 0.5) * 0.003) * 30 + Math.sin((x + offset2) * 0.007) * 15;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(camX + W, H); ctx.closePath(); ctx.fill();
        // Distant building silhouettes
        ctx.fillStyle = '#a08040';
        for (let b of this.buildings) {
            let bx = b.x - offset2;
            if (bx > camX - 100 && bx < camX + W + 100) {
                ctx.fillRect(bx, 350 - b.h * 0.4, b.w * 0.6, b.h * 0.4);
                if (b.hasDome) {
                    ctx.beginPath();
                    ctx.arc(bx + b.w * 0.3, 350 - b.h * 0.4, b.w * 0.2, Math.PI, 0);
                    ctx.fill();
                }
            }
        }

        // Layer 3: Near buildings (0.6x parallax)
        let offset3 = camX * 0.6;
        ctx.fillStyle = '#b89050';
        ctx.beginPath(); ctx.moveTo(camX, H);
        for (let x = camX; x < camX + W + 50; x += 50) {
            let y = 380 + Math.sin((x + offset3) * 0.005) * 20;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(camX + W, H); ctx.closePath(); ctx.fill();

        // Near buildings
        for (let b of this.buildings) {
            let bx = b.x * 1.5 - offset3;
            if (bx > camX - 150 && bx < camX + W + 150) {
                ctx.fillStyle = b.color;
                ctx.fillRect(bx, 400 - b.h * 0.7, b.w, b.h * 0.7);
                // Windows
                ctx.fillStyle = '#2a1a0a';
                for (let wi = 0; wi < b.windows; wi++) {
                    ctx.fillRect(bx + 8 + wi * 18, 400 - b.h * 0.5 + 10, 10, 12);
                }
                // Door
                ctx.fillStyle = '#5a3a1a';
                ctx.fillRect(bx + b.w/2 - 8, 400 - 25, 16, 25);
                // Dome
                if (b.hasDome) {
                    ctx.fillStyle = '#e0c870';
                    ctx.beginPath();
                    ctx.arc(bx + b.w/2, 400 - b.h * 0.7, b.w * 0.3, Math.PI, 0);
                    ctx.fill();
                }
            }
        }

        // Palm trees
        for (let t of this.palmTrees) {
            let tx = t.x - offset3;
            if (tx > camX - 60 && tx < camX + W + 60) {
                // Trunk
                ctx.fillStyle = '#6a4a2a';
                ctx.save();
                ctx.translate(tx, this.groundY);
                ctx.rotate(t.lean);
                ctx.fillRect(-4, -t.h, 8, t.h);
                // Fronds
                ctx.fillStyle = '#3a6a2a';
                for (let a = 0; a < 5; a++) {
                    let angle = -Math.PI/2 + (a - 2) * 0.5;
                    ctx.save();
                    ctx.translate(0, -t.h);
                    ctx.rotate(angle);
                    ctx.fillRect(-3, 0, 6, 35);
                    ctx.fillRect(-8, 30, 16, 8);
                    ctx.restore();
                }
                ctx.restore();
            }
        }
    }

    drawForeground(ctx, camX) {
        // Ground
        ctx.fillStyle = '#c8a868';
        ctx.fillRect(camX, this.groundY, 900, 120);
        // Ground detail line
        ctx.fillStyle = '#a88848';
        ctx.fillRect(camX, this.groundY, 900, 3);
        // Sand texture dots
        ctx.fillStyle = '#b89858';
        for (let x = camX; x < camX + 900; x += 15) {
            for (let y = this.groundY + 8; y < this.groundY + 110; y += 12) {
                if (Math.sin(x * 0.7 + y * 1.3) > 0.6)
                    ctx.fillRect(x, y, 2, 2);
            }
        }
        // Platforms
        for (let p of this.platforms) {
            if (p.x + p.w > camX - 50 && p.x < camX + 900) {
                ctx.fillStyle = '#a08048';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#887038';
                ctx.fillRect(p.x, p.y, p.w, 3);
                ctx.fillStyle = '#c0a060';
                ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, 2);
            }
        }
        // Items
        for (let item of this.items) {
            if (!item.collected && item.x > camX - 30 && item.x < camX + 850) {
                MS2.Sprites.drawItem(ctx, item.x, item.y, item.type, this._frame || 0);
            }
        }
        // POWs
        for (let pow of this.pows) {
            if (pow.x > camX - 30 && pow.x < camX + 850) {
                pow.frame++;
                if (pow.freed) {
                    pow.runX += 2;
                    if (pow.runX < 200) {
                        MS2.Sprites.drawPOW(ctx, pow.x - pow.runX, pow.y, pow.frame, true);
                    }
                } else {
                    MS2.Sprites.drawPOW(ctx, pow.x, pow.y, pow.frame, false);
                }
            }
        }
    }

    checkSpawns(camX) {
        let spawned = [];
        let viewRight = camX + 850;
        for (let s of this.enemySpawns) {
            if (!s.triggered && s.x < viewRight && s.x > camX - 100) {
                s.triggered = true;
                let e;
                switch (s.type) {
                    case 'arab': e = new MS2.ArabSoldier(s.x, this.groundY); break;
                    case 'rebel': e = new MS2.RebelSoldier(s.x, this.groundY); break;
                    case 'heli': e = new MS2.Helicopter(s.x, 100); break;
                    case 'boss': e = new MS2.Boss(s.x, 130); break;
                }
                if (e) spawned.push(e);
            }
        }
        return spawned;
    }

    getGroundY(x) {
        for (let p of this.platforms) {
            if (x > p.x && x < p.x + p.w) return p.y;
        }
        return this.groundY;
    }

    update() { this._frame = (this._frame || 0) + 1; }
};

window.MS2 = MS2;
