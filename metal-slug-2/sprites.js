// Metal Slug 2 - Procedural Sprite Drawing System
var MS2 = window.MS2 || {};

MS2.Sprites = {
    // Color palettes
    P: {
        skin: '#e8b88a', skinShade: '#c49060',
        hair: '#e8c830', headband: '#ffffff',
        vest: '#4a6741', vestDark: '#344a2e',
        pants: '#4a6741', pantsDark: '#344a2e',
        boots: '#5a3a1a', bootsDark: '#3a2510',
        belt: '#2a2a2a', gun: '#555555', gunDark: '#333333',
        // Enemy colors
        arabRobe: '#c8a870', arabRobeDark: '#a08050',
        arabWrap: '#f0e8d0', sword: '#c0c0c0',
        rebelGreen: '#556b2f', rebelHelmet: '#6b7b3f',
        rebelSkin: '#d4a070',
    },

    px(ctx, x, y, w, h) { ctx.fillRect(x, y, w, h); },

    drawPlayer(ctx, x, y, state, frame, dir, shooting) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (dir === -1) ctx.scale(-1, 1);
        const P = this.P;
        const bob = (state === 'IDLE') ? Math.sin(frame * 0.15) * 1 : 0;
        const crouch = (state === 'CROUCH') ? 8 : 0;
        const s = 2; // pixel scale

        // Headband
        ctx.fillStyle = P.headband;
        this.px(ctx, -4*s, -18*s + bob, 8*s, 2*s);
        // Headband tail (flutters)
        if (dir === 1) {
            this.px(ctx, -6*s, -18*s + bob, 2*s, 1*s);
            this.px(ctx, -7*s, -17*s + bob + Math.sin(frame*0.3), 2*s, 1*s);
        }

        // Hair
        ctx.fillStyle = P.hair;
        this.px(ctx, -4*s, -20*s + bob, 8*s, 3*s);
        this.px(ctx, -5*s, -19*s + bob, 1*s, 2*s);

        // Head / Face
        ctx.fillStyle = P.skin;
        this.px(ctx, -3*s, -16*s + bob, 7*s, 5*s);
        // Eye
        ctx.fillStyle = '#222';
        this.px(ctx, 1*s, -15*s + bob, 1*s, 1*s);
        // Mouth
        ctx.fillStyle = P.skinShade;
        this.px(ctx, 1*s, -13*s + bob, 2*s, 1*s);

        if (state === 'CROUCH') {
            // Crouching body - compressed
            ctx.fillStyle = P.vest;
            this.px(ctx, -4*s, -11*s + bob, 8*s, 5*s);
            ctx.fillStyle = P.vestDark;
            this.px(ctx, -4*s, -7*s + bob, 8*s, 2*s);
            // Legs tucked
            ctx.fillStyle = P.pants;
            this.px(ctx, -5*s, -5*s + bob, 5*s, 3*s);
            this.px(ctx, 0*s, -5*s + bob, 5*s, 3*s);
            ctx.fillStyle = P.boots;
            this.px(ctx, -5*s, -2*s + bob, 4*s, 2*s);
            this.px(ctx, 1*s, -2*s + bob, 4*s, 2*s);
        } else if (state === 'JUMP') {
            // Body
            ctx.fillStyle = P.vest;
            this.px(ctx, -4*s, -11*s, 8*s, 6*s);
            ctx.fillStyle = P.vestDark;
            this.px(ctx, -4*s, -6*s, 8*s, 2*s);
            // Belt
            ctx.fillStyle = P.belt;
            this.px(ctx, -4*s, -5*s, 8*s, 1*s);
            // Legs tucked up
            ctx.fillStyle = P.pants;
            this.px(ctx, -5*s, -4*s, 4*s, 3*s);
            this.px(ctx, 1*s, -4*s, 4*s, 3*s);
            ctx.fillStyle = P.boots;
            this.px(ctx, -5*s, -1*s, 4*s, 2*s);
            this.px(ctx, 1*s, -1*s, 4*s, 2*s);
        } else {
            // Standing body
            ctx.fillStyle = P.vest;
            this.px(ctx, -4*s, -11*s + bob, 8*s, 6*s);
            ctx.fillStyle = P.vestDark;
            this.px(ctx, -4*s, -6*s + bob, 8*s, 2*s);
            // Belt
            ctx.fillStyle = P.belt;
            this.px(ctx, -4*s, -5*s + bob, 8*s, 1*s);
            // Legs - walking animation
            ctx.fillStyle = P.pants;
            if (state === 'WALK') {
                const lf = Math.floor(frame / 4) % 4;
                const offsets = [[-2,0,2,-1], [0,-2,-1,1], [2,0,-2,1], [0,2,1,-1]];
                const o = offsets[lf];
                this.px(ctx, (-3+o[0])*s, -4*s + bob, 3*s, 6*s);
                this.px(ctx, (1+o[1])*s, -4*s + bob, 3*s, 6*s);
                ctx.fillStyle = P.boots;
                this.px(ctx, (-4+o[0])*s, 2*s + bob, 4*s, 2*s);
                this.px(ctx, (0+o[1])*s, 2*s + bob, 4*s, 2*s);
            } else {
                this.px(ctx, -3*s, -4*s + bob, 3*s, 6*s);
                this.px(ctx, 1*s, -4*s + bob, 3*s, 6*s);
                ctx.fillStyle = P.boots;
                this.px(ctx, -4*s, 2*s + bob, 4*s, 2*s);
                this.px(ctx, 0*s, 2*s + bob, 4*s, 2*s);
            }
        }

        // Arms + Gun
        ctx.fillStyle = P.skin;
        if (shooting === 'up') {
            this.px(ctx, 0*s, -20*s + bob, 3*s, 9*s);
            ctx.fillStyle = P.gun;
            this.px(ctx, -1*s, -26*s + bob, 4*s, 7*s);
            ctx.fillStyle = P.gunDark;
            this.px(ctx, 0*s, -27*s + bob, 2*s, 2*s);
        } else if (shooting === 'diagup') {
            this.px(ctx, 2*s, -16*s + bob, 6*s, 3*s);
            ctx.fillStyle = P.gun;
            this.px(ctx, 6*s, -20*s + bob, 4*s, 5*s);
        } else if (shooting === 'diagdown') {
            this.px(ctx, 2*s, -8*s + bob, 6*s, 3*s);
            ctx.fillStyle = P.gun;
            this.px(ctx, 6*s, -6*s + bob, 4*s, 5*s);
        } else {
            // Forward arm + gun
            this.px(ctx, 3*s, -10*s + bob + crouch, 5*s, 3*s);
            ctx.fillStyle = P.gun;
            this.px(ctx, 7*s, -11*s + bob + crouch, 6*s, 3*s);
            ctx.fillStyle = P.gunDark;
            this.px(ctx, 12*s, -10*s + bob + crouch, 2*s, 1*s);
        }

        // Death state
        if (state === 'DYING') {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#ff0000';
            this.px(ctx, -5*s, -12*s, 10*s, 3*s);
        }

        ctx.restore();
    },

    drawArabSoldier(ctx, x, y, frame, dir, state) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (dir === -1) ctx.scale(-1, 1);
        const P = this.P;
        const s = 2;

        // Head wrap
        ctx.fillStyle = P.arabWrap;
        this.px(ctx, -3*s, -16*s, 6*s, 6*s);
        this.px(ctx, -4*s, -14*s, 1*s, 4*s);
        // Face
        ctx.fillStyle = P.rebelSkin;
        this.px(ctx, -1*s, -13*s, 4*s, 3*s);
        // Eye
        ctx.fillStyle = '#222';
        this.px(ctx, 1*s, -13*s, 1*s, 1*s);

        // Body robe
        ctx.fillStyle = P.arabRobe;
        this.px(ctx, -4*s, -10*s, 8*s, 8*s);
        ctx.fillStyle = P.arabRobeDark;
        this.px(ctx, -4*s, -4*s, 8*s, 3*s);

        // Legs
        ctx.fillStyle = '#8a6a40';
        if (state === 'WALK' || state === 'CHASE') {
            const lf = Math.floor(frame / 5) % 2;
            this.px(ctx, (-2 + lf*2)*s, -1*s, 3*s, 4*s);
            this.px(ctx, (0 - lf*2)*s, -1*s, 3*s, 4*s);
        } else {
            this.px(ctx, -2*s, -1*s, 3*s, 4*s);
            this.px(ctx, 0*s, -1*s, 3*s, 4*s);
        }

        // Boots
        ctx.fillStyle = '#4a3020';
        this.px(ctx, -3*s, 3*s, 3*s, 1*s);
        this.px(ctx, 0*s, 3*s, 3*s, 1*s);

        // Sword arm
        if (state === 'ATTACK') {
            ctx.fillStyle = P.rebelSkin;
            this.px(ctx, 3*s, -14*s, 3*s, 4*s);
            ctx.fillStyle = P.sword;
            this.px(ctx, 5*s, -18*s, 1*s, 8*s);
            ctx.fillStyle = '#e0e000';
            this.px(ctx, 5*s, -19*s, 1*s, 1*s); // tip glint
        } else {
            ctx.fillStyle = P.rebelSkin;
            this.px(ctx, 3*s, -8*s, 3*s, 3*s);
            ctx.fillStyle = P.sword;
            this.px(ctx, 5*s, -10*s, 1*s, 6*s);
        }

        ctx.restore();
    },

    drawRebelSoldier(ctx, x, y, frame, dir, state) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (dir === -1) ctx.scale(-1, 1);
        const P = this.P;
        const s = 2;

        // Helmet
        ctx.fillStyle = P.rebelHelmet;
        this.px(ctx, -4*s, -17*s, 8*s, 4*s);
        ctx.fillStyle = '#5a6b2f';
        this.px(ctx, -4*s, -13*s, 8*s, 1*s);
        // Face
        ctx.fillStyle = P.rebelSkin;
        this.px(ctx, -3*s, -13*s, 6*s, 4*s);
        ctx.fillStyle = '#222';
        this.px(ctx, 1*s, -12*s, 1*s, 1*s);

        // Body
        ctx.fillStyle = P.rebelGreen;
        this.px(ctx, -4*s, -9*s, 8*s, 7*s);
        ctx.fillStyle = '#3a4a1f';
        this.px(ctx, -4*s, -4*s, 8*s, 2*s);
        // Belt
        ctx.fillStyle = '#4a3a1a';
        this.px(ctx, -4*s, -3*s, 8*s, 1*s);

        // Legs
        ctx.fillStyle = P.rebelGreen;
        const lf = (state === 'WALK') ? Math.floor(frame / 5) % 2 : 0;
        this.px(ctx, (-2+lf)*s, -2*s, 3*s, 5*s);
        this.px(ctx, (0-lf)*s, -2*s, 3*s, 5*s);
        // Boots
        ctx.fillStyle = '#3a2a10';
        this.px(ctx, -3*s, 3*s, 3*s, 2*s);
        this.px(ctx, 0*s, 3*s, 3*s, 2*s);

        // Gun arm
        ctx.fillStyle = P.rebelSkin;
        this.px(ctx, 3*s, -8*s, 4*s, 2*s);
        ctx.fillStyle = '#444';
        this.px(ctx, 6*s, -9*s, 5*s, 2*s);

        ctx.restore();
    },

    drawHelicopter(ctx, x, y, frame, hp, maxHp) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        const s = 2;
        // Body
        ctx.fillStyle = '#556655';
        this.px(ctx, -20*s, -5*s, 40*s, 12*s);
        ctx.fillStyle = '#445544';
        this.px(ctx, -15*s, -8*s, 30*s, 4*s);
        // Cockpit window
        ctx.fillStyle = '#88ccff';
        this.px(ctx, 10*s, -4*s, 8*s, 5*s);
        ctx.fillStyle = '#66aadd';
        this.px(ctx, 12*s, -3*s, 5*s, 3*s);
        // Tail
        ctx.fillStyle = '#445544';
        this.px(ctx, -30*s, -3*s, 12*s, 4*s);
        this.px(ctx, -28*s, -8*s, 4*s, 5*s);
        // Rotor
        ctx.fillStyle = '#888';
        const rotorPhase = (frame * 0.5) % 2;
        if (rotorPhase < 1) {
            this.px(ctx, -35*s, -10*s, 70*s, 1*s);
        } else {
            this.px(ctx, -15*s, -10*s, 30*s, 1*s);
        }
        // Landing gear
        ctx.fillStyle = '#333';
        this.px(ctx, -10*s, 7*s, 3*s, 4*s);
        this.px(ctx, 8*s, 7*s, 3*s, 4*s);
        this.px(ctx, -14*s, 10*s, 28*s, 1*s);
        // HP bar
        if (hp < maxHp) {
            ctx.fillStyle = '#333';
            this.px(ctx, -20*s, -14*s, 40*s, 2*s);
            ctx.fillStyle = hp > maxHp*0.3 ? '#00ff44' : '#ff3333';
            this.px(ctx, -20*s, -14*s, Math.round(40*s * hp/maxHp), 2*s);
        }
        ctx.restore();
    },

    drawBoss(ctx, x, y, frame, hp, maxHp, phase) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        const s = 2;
        // Main body - large aircraft
        ctx.fillStyle = '#5a6a5a';
        this.px(ctx, -50*s, -15*s, 100*s, 30*s);
        // Cockpit
        ctx.fillStyle = '#334433';
        this.px(ctx, 30*s, -10*s, 20*s, 15*s);
        ctx.fillStyle = '#88bbff';
        this.px(ctx, 35*s, -8*s, 12*s, 8*s);
        // Wings
        ctx.fillStyle = '#4a5a4a';
        this.px(ctx, -40*s, -30*s, 25*s, 16*s);
        this.px(ctx, -40*s, 14*s, 25*s, 16*s);
        // Engines
        ctx.fillStyle = '#333';
        this.px(ctx, -50*s, -28*s, 12*s, 10*s);
        this.px(ctx, -50*s, 18*s, 12*s, 10*s);
        // Engine glow
        if (phase >= 2) {
            ctx.fillStyle = frame % 4 < 2 ? '#ff6600' : '#ffaa00';
            this.px(ctx, -55*s, -26*s, 6*s, 6*s);
            this.px(ctx, -55*s, 20*s, 6*s, 6*s);
        }
        // Weapon pods
        ctx.fillStyle = '#444';
        this.px(ctx, -30*s, -35*s, 8*s, 6*s);
        this.px(ctx, -30*s, 29*s, 8*s, 6*s);
        // Tail
        ctx.fillStyle = '#4a5a4a';
        this.px(ctx, -55*s, -8*s, 8*s, 16*s);
        // Damage effects
        if (hp < maxHp * 0.5) {
            ctx.fillStyle = frame % 6 < 3 ? '#ff4400' : '#ffaa00';
            this.px(ctx, -20*s + Math.sin(frame*0.2)*10, -5*s, 5*s, 5*s);
        }
        if (hp < maxHp * 0.25) {
            ctx.fillStyle = '#222';
            this.px(ctx, 10*s, 5*s, 8*s, 8*s);
        }
        ctx.restore();
        // HP Bar at top of screen
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - 100, y - 80, 200, 12);
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 99, y - 79, 198, 10);
        const hpW = Math.round(196 * hp / maxHp);
        ctx.fillStyle = hp > maxHp*0.3 ? '#ff3300' : '#ff0000';
        ctx.fillRect(x - 98, y - 78, hpW, 8);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('KEESI II', x, y - 70);
    },

    drawBullet(ctx, x, y, type) {
        ctx.save();
        switch(type) {
            case 'P':
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(x-2, y-1, 6, 3);
                break;
            case 'H':
                ctx.fillStyle = '#ffee00';
                ctx.fillRect(x-4, y-2, 10, 4);
                ctx.fillStyle = '#ffff88';
                ctx.fillRect(x-2, y-1, 6, 2);
                break;
            case 'S':
                ctx.fillStyle = '#ffcc00';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x + i*3 - 4, y + (i-1)*3 - 1, 4, 3);
                }
                break;
            case 'R':
                ctx.fillStyle = '#888';
                ctx.fillRect(x-6, y-3, 14, 6);
                ctx.fillStyle = '#ff4400';
                ctx.fillRect(x-8, y-2, 3, 4);
                ctx.fillStyle = '#cc0000';
                ctx.fillRect(x+6, y-2, 3, 4);
                break;
            case 'F':
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#ff6600';
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI*2);
                ctx.fill();
                break;
            case 'L':
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(x-12, y-1, 28, 2);
                ctx.fillStyle = '#aaffff';
                ctx.fillRect(x-8, y, 20, 1);
                break;
            case 'enemy':
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(x-3, y-2, 6, 4);
                break;
            case 'missile':
                ctx.fillStyle = '#884400';
                ctx.fillRect(x-5, y-2, 10, 5);
                ctx.fillStyle = '#ff2200';
                ctx.fillRect(x-7, y-1, 3, 3);
                break;
        }
        ctx.restore();
    },

    drawExplosion(ctx, x, y, frame, big) {
        const maxR = big ? 40 : 20;
        const r = Math.min(frame * (big ? 5 : 3), maxR);
        const fade = Math.max(0, 1 - frame / (big ? 20 : 12));
        ctx.save();
        ctx.globalAlpha = fade;
        // Outer ring
        ctx.fillStyle = '#ff4400';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        // Middle
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(x, y, r*0.7, 0, Math.PI*2); ctx.fill();
        // Core
        ctx.fillStyle = '#ffff88';
        ctx.beginPath(); ctx.arc(x, y, r*0.3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },

    drawGrenade(ctx, x, y, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = '#2a4a1a';
        ctx.fillRect(-4, -6, 8, 12);
        ctx.fillStyle = '#555';
        ctx.fillRect(-2, -8, 4, 3);
        ctx.fillStyle = '#888';
        ctx.fillRect(-1, -9, 2, 2);
        ctx.restore();
    },

    drawPOW(ctx, x, y, frame, freed) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        const s = 2;
        if (!freed) {
            // Tied up - long hair old man
            ctx.fillStyle = '#ddd';
            this.px(ctx, -3*s, -14*s, 6*s, 8*s); // hair
            ctx.fillStyle = '#e8b88a';
            this.px(ctx, -2*s, -10*s, 5*s, 4*s); // face
            ctx.fillStyle = '#222';
            this.px(ctx, 0*s, -9*s, 1*s, 1*s); // eye
            ctx.fillStyle = '#884422';
            this.px(ctx, -3*s, -6*s, 6*s, 6*s); // body
            // Ropes
            ctx.fillStyle = '#aa8844';
            this.px(ctx, -4*s, -5*s, 8*s, 1*s);
            this.px(ctx, -4*s, -2*s, 8*s, 1*s);
            // Legs
            ctx.fillStyle = '#665533';
            this.px(ctx, -2*s, 0*s, 2*s, 4*s);
            this.px(ctx, 1*s, 0*s, 2*s, 4*s);
        } else {
            // Running away celebration
            const bobY = Math.sin(frame * 0.3) * 2;
            ctx.fillStyle = '#ddd';
            this.px(ctx, -3*s, -14*s + bobY, 6*s, 8*s);
            ctx.fillStyle = '#e8b88a';
            this.px(ctx, -2*s, -10*s + bobY, 5*s, 4*s);
            ctx.fillStyle = '#884422';
            this.px(ctx, -3*s, -6*s + bobY, 6*s, 6*s);
            ctx.fillStyle = '#665533';
            const lf = Math.floor(frame / 4) % 2;
            this.px(ctx, (-2+lf)*s, 0*s + bobY, 2*s, 4*s);
            this.px(ctx, (1-lf)*s, 0*s + bobY, 2*s, 4*s);
        }
        ctx.restore();
    },

    drawItem(ctx, x, y, type, frame) {
        ctx.save();
        const bob = Math.sin(frame * 0.1) * 3;
        ctx.translate(Math.round(x), Math.round(y + bob));
        const s = 2;
        switch(type) {
            case 'H': case 'S': case 'R': case 'F': case 'L':
                // Weapon crate
                ctx.fillStyle = '#886633';
                this.px(ctx, -5*s, -5*s, 10*s, 10*s);
                ctx.fillStyle = '#aa8844';
                this.px(ctx, -4*s, -4*s, 8*s, 8*s);
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(type, 0, 4);
                break;
            case 'grenade':
                ctx.fillStyle = '#2a4a1a';
                this.px(ctx, -3*s, -4*s, 6*s, 8*s);
                ctx.fillStyle = '#555';
                this.px(ctx, -1*s, -6*s, 2*s, 3*s);
                break;
            case 'food':
                // Chicken leg
                ctx.fillStyle = '#cc8833';
                this.px(ctx, -3*s, -3*s, 6*s, 6*s);
                ctx.fillStyle = '#eebb55';
                this.px(ctx, -2*s, -2*s, 4*s, 4*s);
                ctx.fillStyle = '#886633';
                this.px(ctx, 0, 2*s, 2*s, 4*s);
                break;
            case 'gem':
                ctx.fillStyle = '#4488ff';
                this.px(ctx, -2*s, -3*s, 4*s, 6*s);
                ctx.fillStyle = '#66aaff';
                this.px(ctx, -1*s, -2*s, 2*s, 3*s);
                break;
        }
        ctx.restore();
    }
};

window.MS2 = MS2;
