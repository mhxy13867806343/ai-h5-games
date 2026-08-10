/* ============================================================
   《真侍魂：武士道列传》 Samurai Shodown RPG - HTML5 Canvas Engine
   ============================================================ */

class SamuraiGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.W = 900;
        this.H = 650;

        this.state = 'LOADING'; // LOADING, MENU, CHAR_SELECT, BATTLE, DIALOGUE, GAME_OVER, CHAPTER_WIN
        this.frame = 0;

        // Player Warrior Stats
        this.player = null;
        this.heroIndex = 0; // 0: Haohmaru, 1: Ukyo, 2: Nakoruru

        // Heroes data
        this.heroes = [
            {
                name: '霸王丸', title: '豪快之剑客', icon: '🔴',
                hp: 550, maxHp: 550, atk: 75, def: 25, spd: 40,
                katana: '河古名刀', sharpness: 100, pow: 0, maxPow: 100,
                skills: [
                    { name: '弧月斩', cost: 25, dmg: 1.4, icon: '🌙', desc: '向上挥剑掀起月弧切斩' },
                    { name: '旋风烈斩', cost: 40, dmg: 1.8, icon: '🌪️', desc: '凝聚疾风向敌人群斩击' },
                    { name: '天霸封神斩', cost: 100, dmg: 3.5, icon: '⚡', desc: '【奥义超必杀】震碎地表的绝命一斩！', isSuper: true }
                ]
            },
            {
                name: '橘右京', title: '神速之神合居', icon: '🔵',
                hp: 420, maxHp: 420, atk: 85, def: 18, spd: 70,
                katana: '自作无铭', sharpness: 100, pow: 0, maxPow: 100,
                skills: [
                    { name: '燕返', cost: 20, dmg: 1.5, icon: '🪶', desc: '凌空跳跃反手一记神速斩' },
                    { name: '秘剑·细雪', cost: 35, dmg: 2.0, icon: '❄️', desc: '抛起苹果瞬间切出数十刀影' },
                    { name: '飞燕六连斩', cost: 100, dmg: 3.8, icon: '🌌', desc: '【奥义超必杀】神速流六连闪击！', isSuper: true }
                ]
            },
            {
                name: '娜可露露', title: '大自然巫女', icon: '🟢',
                hp: 460, maxHp: 460, atk: 65, def: 22, spd: 60,
                katana: '宝刀·宝刀', sharpness: 100, pow: 0, maxPow: 100,
                skills: [
                    { name: '胜利之刃', cost: 20, dmg: 1.3, icon: '🍃', desc: '借助自然风暴突进斩击' },
                    { name: '鹰之守护', cost: 30, dmg: 1.6, icon: '🦅', desc: '召唤灵鹰守护并冲击敌人' },
                    { name: '辉神之轮', cost: 100, dmg: 3.2, icon: '🌟', desc: '【奥义超必杀】净化世间万物之光', isSuper: true }
                ]
            }
        ];

        // Enemy opponent
        this.enemy = null;

        // Chapter missions
        this.chapters = [
            {
                id: 1, name: '第一章：江户宿场·浪人扫荡',
                bg: 'town',
                enemies: [
                    { name: '江户浪人', hp: 300, maxHp: 300, atk: 45, def: 10, icon: '🥷' },
                    { name: '忍军刺客', hp: 450, maxHp: 450, atk: 55, def: 15, icon: '🎭' }
                ]
            },
            {
                id: 2, name: '第二章：严流岛·宿命之决斗',
                bg: 'island',
                enemies: [
                    { name: '牙神幻十郎', hp: 900, maxHp: 900, atk: 80, def: 25, isBoss: true, icon: '👹' }
                ]
            },
            {
                id: 3, name: '第三章：富士树海·阴阳百鬼',
                bg: 'forest',
                enemies: [
                    { name: '树海怨灵', hp: 700, maxHp: 700, atk: 65, def: 20, icon: '👻' },
                    { name: '服部半藏影分身', hp: 1100, maxHp: 1100, atk: 90, def: 30, isBoss: true, icon: '👤' }
                ]
            },
            {
                id: 4, name: '第四章：魔界降临·罗将神封印',
                bg: 'makai',
                enemies: [
                    { name: '罗将神水姬', hp: 1800, maxHp: 1800, atk: 110, def: 40, isBoss: true, icon: '🐍' }
                ]
            }
        ];

        this.chapterIndex = 0;
        this.subEnemyIndex = 0;

        // Bushido choices
        this.bushidoScores = { justice: 0, valor: 0, benevolence: 0 };
        this.activeChoiceModal = null;

        // Battle ATB Gauges
        this.playerAtb = 0;
        this.enemyAtb = 0;
        this.turn = 'player'; // 'player', 'enemy', 'animating'

        // Battle FX
        this.particles = [];
        this.sakuraParticles = [];
        this.floatingTexts = [];
        this.screenShake = 0;
        this.screenFlash = null;

        // Web Audio Synth
        this.audioCtx = null;

        // Inputs
        this.keys = {};
        this.mouse = { x: 0, y: 0, clicked: false };
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.setupInputs();
        this.initSakuraParticles();
        this.runLoadingSequence();
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

            if (type === 'slash') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(900, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
            } else if (type === 'clash') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.setValueAtTime(400, now + 0.05);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (type === 'super') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now); osc.stop(now + 0.4);
            } else if (type === 'sharpen') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1500, now);
                osc.frequency.linearRampToValueAtTime(2200, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.1);
                osc.frequency.setValueAtTime(659, now + 0.2);
                osc.frequency.setValueAtTime(880, now + 0.3);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
            }
        } catch (e) {}
    }

    setupInputs() {
        window.addEventListener('keydown', e => {
            this.initAudio();
            this.keys[e.code] = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            if (this.state === 'CHAR_SELECT') {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.heroIndex = (this.heroIndex + 2) % 3;
                    this.playSound('slash');
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.heroIndex = (this.heroIndex + 1) % 3;
                    this.playSound('slash');
                }
                if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'Enter') {
                    this.confirmHeroSelect();
                }
            }

            if (this.state === 'BATTLE' && this.playerAtb >= 100 && this.turn === 'player') {
                if (e.code === 'KeyJ' || e.code === 'KeyZ') this.playerAction('attack');
                if (e.code === 'KeyK' || e.code === 'KeyX') this.playerAction('skill', 0);
                if (e.code === 'KeyL' || e.code === 'KeyC') this.playerAction('skill', 2); // Super
                if (e.code === 'KeyI' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.playerAction('sharpen');
            }

            if (e.code === 'Enter') {
                if (this.state === 'MENU') this.state = 'CHAR_SELECT';
                if (this.state === 'GAME_OVER' || this.state === 'CHAPTER_WIN') this.restart();
            }
        });

        const getPos = e => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (this.W / rect.width),
                y: (e.clientY - rect.top) * (this.H / rect.height)
            };
        };

        this.canvas.addEventListener('mousemove', e => {
            const p = getPos(e);
            this.mouse.x = p.x;
            this.mouse.y = p.y;
        });

        this.canvas.addEventListener('mousedown', e => {
            this.initAudio();
            const p = getPos(e);
            this.mouse.x = p.x;
            this.mouse.y = p.y;
            this.mouse.clicked = true;
            this.handleCanvasClick();
        });
    }

    initSakuraParticles() {
        this.sakuraParticles = [];
        for (let i = 0; i < 40; i++) {
            this.sakuraParticles.push({
                x: Math.random() * this.W,
                y: Math.random() * this.H,
                size: 3 + Math.random() * 4,
                speedX: -0.8 - Math.random() * 1.5,
                speedY: 1 + Math.random() * 1.5,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.06
            });
        }
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

    confirmHeroSelect() {
        const baseData = this.heroes[this.heroIndex];
        this.player = JSON.parse(JSON.stringify(baseData));
        this.chapterIndex = 0;
        this.subEnemyIndex = 0;
        this.startBattle();
    }

    startBattle() {
        const chap = this.chapters[this.chapterIndex];
        const enData = chap.enemies[this.subEnemyIndex];
        this.enemy = JSON.parse(JSON.stringify(enData));

        this.playerAtb = 30;
        this.enemyAtb = 0;
        this.turn = 'player';
        this.state = 'BATTLE';
    }

    restart() {
        this.state = 'CHAR_SELECT';
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
       UPDATE LOGIC
       ============================================================ */

    update() {
        this.updateSakura();

        if (this.screenShake > 0) this.screenShake--;

        if (this.state === 'BATTLE') {
            this.updateBattleATB();
        }

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

    updateSakura() {
        for (let p of this.sakuraParticles) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.rot += p.rotSpeed;
            if (p.y > this.H + 10) {
                p.y = -10;
                p.x = Math.random() * (this.W + 150);
            }
            if (p.x < -10) p.x = this.W + 10;
        }
    }

    updateBattleATB() {
        if (this.turn === 'animating') return;

        // Player & Enemy ATB fill
        if (this.playerAtb < 100) {
            this.playerAtb += (this.player.spd / 40);
        }

        if (this.enemyAtb < 100) {
            this.enemyAtb += 0.8;
            if (this.enemyAtb >= 100 && this.turn !== 'player') {
                this.enemyTurnAction();
            }
        }
    }

    playerAction(actionType, skillIdx = 0) {
        if (this.playerAtb < 100 || this.turn !== 'player') return;

        this.playerAtb = 0;
        this.turn = 'animating';

        if (actionType === 'attack') {
            // Basic Katana Slash
            this.playSound('slash');
            let multiplier = this.player.sharpness >= 70 ? 1.3 : (this.player.sharpness >= 40 ? 1.0 : 0.7);
            let dmg = Math.floor(this.player.atk * multiplier);

            // Sharpness decrease slightly
            this.player.sharpness = Math.max(10, this.player.sharpness - 5);

            // POW charge
            this.player.pow = Math.min(100, this.player.pow + 15);

            this.applyDamageToEnemy(dmg, '普通斩击');
            this.spawnSlashParticles(620, 360, '#c1121f');
        } else if (actionType === 'skill') {
            const skill = this.player.skills[skillIdx];
            if (skill.isSuper && this.player.pow < 100) {
                this.addFloat('怒气未满，无法使用奥义！', 250, 480, '#dc2626');
                this.playerAtb = 100;
                this.turn = 'player';
                return;
            }

            if (skill.isSuper) {
                this.player.pow = 0;
                this.playSound('super');
                this.screenFlash = '#c1121f';
                this.screenShake = 20;
            } else {
                this.playSound('slash');
            }

            let dmg = Math.floor(this.player.atk * skill.dmg);
            this.applyDamageToEnemy(dmg, skill.name);
            this.spawnSlashParticles(620, 360, skill.isSuper ? '#ffb703' : '#e63946');
        } else if (actionType === 'sharpen') {
            // Sharpen Katana
            this.playSound('sharpen');
            this.player.sharpness = 100;
            this.addFloat('磨刀成功！刀刃极利 (伤害+50%)', 250, 480, '#d4af37');
            this.spawnSlashParticles(220, 380, '#d4af37');

            setTimeout(() => {
                this.turn = 'player';
            }, 600);
        }
    }

    applyDamageToEnemy(dmg, attackName) {
        this.enemy.hp -= dmg;
        this.addFloat(`-${dmg} (${attackName})`, 620, 320, '#e63946');

        if (this.enemy.hp <= 0) {
            this.enemy.hp = 0;
            this.playSound('win');

            setTimeout(() => {
                this.subEnemyIndex++;
                const chap = this.chapters[this.chapterIndex];
                if (this.subEnemyIndex >= chap.enemies.length) {
                    // Chapter Win!
                    this.chapterIndex++;
                    if (this.chapterIndex >= this.chapters.length) {
                        this.state = 'CHAPTER_WIN'; // All completed
                    } else {
                        this.triggerBushidoChoice();
                    }
                } else {
                    this.startBattle(); // Next enemy in chapter
                }
            }, 1000);
        } else {
            setTimeout(() => {
                this.turn = 'enemy';
            }, 700);
        }
    }

    enemyTurnAction() {
        this.enemyAtb = 0;
        this.turn = 'animating';

        this.playSound('slash');
        let dmg = Math.floor(this.enemy.atk * (0.8 + Math.random() * 0.4));
        this.player.hp -= dmg;
        this.player.pow = Math.min(100, this.player.pow + 20); // Gaining POW on hit!

        this.addFloat(`-${dmg} HP`, 220, 340, '#dc2626');
        this.screenShake = 8;
        this.spawnSlashParticles(220, 380, '#ffffff');

        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.state = 'GAME_OVER';
        } else {
            setTimeout(() => {
                this.turn = 'player';
            }, 800);
        }
    }

    triggerBushidoChoice() {
        this.activeChoiceModal = {
            title: '武士道修行抉择',
            question: '面对战败的流浪武士，你选择如何处置？',
            options: [
                { label: '【义】遵从武士之名，赐予名誉比试', type: 'justice', buff: '攻击力 +10' },
                { label: '【勇】斩断魔障，继续挑战强敌', type: 'valor', buff: '速度 +15' },
                { label: '【仁】手下留情，感化归隐田园', type: 'benevolence', buff: '最大HP +100' }
            ]
        };
        this.state = 'DIALOGUE';
    }

    handleCanvasClick() {
        const mx = this.mouse.x;
        const my = this.mouse.y;

        if (this.state === 'CHAR_SELECT') {
            // Click character cards
            for (let i = 0; i < 3; i++) {
                const cx = 150 + i * 220;
                if (mx >= cx && mx <= cx + 180 && my >= 200 && my <= 450) {
                    this.heroIndex = i;
                    this.confirmHeroSelect();
                    return;
                }
            }
        } else if (this.state === 'BATTLE' && this.playerAtb >= 100 && this.turn === 'player') {
            // Action buttons on bottom bar
            if (mx >= 120 && mx <= 230 && my >= 550 && my <= 610) this.playerAction('attack');
            if (mx >= 250 && mx <= 360 && my >= 550 && my <= 610) this.playerAction('skill', 0);
            if (mx >= 380 && mx <= 490 && my >= 550 && my <= 610) this.playerAction('skill', 1);
            if (mx >= 510 && mx <= 620 && my >= 550 && my <= 610) this.playerAction('skill', 2);
            if (mx >= 640 && mx <= 750 && my >= 550 && my <= 610) this.playerAction('sharpen');
        } else if (this.state === 'DIALOGUE' && this.activeChoiceModal) {
            // Bushido option clicks
            const startY = 320;
            for (let i = 0; i < 3; i++) {
                const oy = startY + i * 55;
                if (mx >= 220 && mx <= 680 && my >= oy && my <= oy + 45) {
                    const opt = this.activeChoiceModal.options[i];
                    this.bushidoScores[opt.type]++;

                    if (opt.type === 'justice') this.player.atk += 10;
                    if (opt.type === 'valor') this.player.spd += 15;
                    if (opt.type === 'benevolence') {
                        this.player.maxHp += 100;
                        this.player.hp += 100;
                    }

                    this.playSound('win');
                    this.activeChoiceModal = null;
                    this.startBattle(); // Continue to next chapter!
                    return;
                }
            }
        }
    }

    addFloat(text, x, y, color = '#ffb703') {
        this.floatingTexts.push({ text, x, y, color, life: 60 });
    }

    spawnSlashParticles(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 3 + Math.random() * 6;
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
        ctx.fillStyle = '#0a0908';
        ctx.fillRect(0, 0, this.W, this.H);

        this.renderBackground();
        this.renderSakura();

        if (this.state === 'MENU') this.renderMenu();
        if (this.state === 'CHAR_SELECT') this.renderCharSelect();
        if (this.state === 'BATTLE' || this.state === 'DIALOGUE') {
            this.renderBattle();
            if (this.state === 'DIALOGUE') this.renderDialogueModal();
        }

        if (this.state === 'GAME_OVER') this.renderGameOverModal();
        if (this.state === 'CHAPTER_WIN') this.renderWinModal();

        this.renderParticles();
        this.renderFloats();

        if (this.screenFlash) {
            ctx.fillStyle = this.screenFlash;
            ctx.fillRect(0, 0, this.W, this.H);
            this.screenFlash = null;
        }
    }

    renderBackground() {
        const ctx = this.ctx;
        const chap = this.chapters[this.chapterIndex] || this.chapters[0];

        let bgGrad = ctx.createLinearGradient(0, 0, 0, this.H);
        if (chap.bg === 'island') {
            bgGrad.addColorStop(0, '#1a0404');
            bgGrad.addColorStop(0.6, '#4a0e17');
            bgGrad.addColorStop(1, '#8b1e00');
        } else if (chap.bg === 'forest') {
            bgGrad.addColorStop(0, '#051c0a');
            bgGrad.addColorStop(0.6, '#0d3b14');
            bgGrad.addColorStop(1, '#1b5e20');
        } else if (chap.bg === 'makai') {
            bgGrad.addColorStop(0, '#12001a');
            bgGrad.addColorStop(0.6, '#38004d');
            bgGrad.addColorStop(1, '#5c0080');
        } else {
            bgGrad.addColorStop(0, '#0a0908');
            bgGrad.addColorStop(0.6, '#281216');
            bgGrad.addColorStop(1, '#4a1e24');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.W, this.H);

        // Crimson Blood Moon
        ctx.fillStyle = '#c1121f';
        ctx.shadowColor = '#ff4d4d';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(750, 120, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ground Dojo Floor
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 440, this.W, 210);
        ctx.fillStyle = '#780000';
        ctx.fillRect(0, 437, this.W, 3);
    }

    renderSakura() {
        const ctx = this.ctx;
        ctx.fillStyle = '#ffb3c1';
        for (let p of this.sakuraParticles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderMenu() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(10, 9, 8, 0.85)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#c1121f';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('真侍魂：武士道列传', this.W / 2, 200);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('SAMURAI SHODOWN: BUSHIDO RETSUDEN', this.W / 2, 245);

        ctx.fillStyle = '#a8a29e';
        ctx.font = '15px sans-serif';
        ctx.fillText('刀光剑影，试合胜负只在一闪之间！', this.W / 2, 320);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 选择武士参战', this.W / 2, 440);
        }
    }

    renderCharSelect() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(10, 9, 8, 0.9)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 28px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('选择参战武士', this.W / 2, 80);

        for (let i = 0; i < 3; i++) {
            const h = this.heroes[i];
            const cx = 150 + i * 220;
            const cy = 180;
            const isSelected = i === this.heroIndex;

            ctx.fillStyle = isSelected ? '#1c1917' : '#0a0908';
            ctx.fillRect(cx, cy, 180, 270);
            ctx.strokeStyle = isSelected ? '#d4af37' : '#44403c';
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.strokeRect(cx, cy, 180, 270);

            ctx.font = '48px sans-serif';
            ctx.fillText(h.icon, cx + 90, cy + 80);

            ctx.fillStyle = isSelected ? '#d4af37' : '#ffffff';
            ctx.font = 'bold 20px "Noto Serif SC", serif';
            ctx.fillText(h.name, cx + 90, cy + 140);

            ctx.fillStyle = '#a8a29e';
            ctx.font = '13px sans-serif';
            ctx.fillText(h.title, cx + 90, cy + 170);

            ctx.font = '12px monospace';
            ctx.fillStyle = '#ffb703';
            ctx.fillText(`HP: ${h.hp}  ATK: ${h.atk}`, cx + 90, cy + 210);
            ctx.fillText(`佩刀: ${h.katana}`, cx + 90, cy + 235);
        }

        ctx.fillStyle = '#a8a29e';
        ctx.font = '14px sans-serif';
        ctx.fillText('使用 WASD / 方向键 选择，按 J 键 或 点击 确认参战', this.W / 2, 530);
    }

    renderBattle() {
        const ctx = this.ctx;
        const chap = this.chapters[this.chapterIndex] || this.chapters[0];

        ctx.save();
        if (this.screenShake > 0) {
            ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        }

        // Chapter Header
        ctx.fillStyle = 'rgba(10,9,8,0.7)';
        ctx.fillRect(0, 0, this.W, 40);
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 16px "Noto Serif SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText(chap.name, 20, 26);

        // Player Warrior (Left)
        ctx.save();
        ctx.translate(220, 380);

        ctx.fillStyle = '#c1121f';
        ctx.fillRect(-25, -60, 50, 60);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(-20, -50, 40, 10);
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.player.icon, 0, -65);

        ctx.restore();

        // Enemy Opponent (Right)
        ctx.save();
        ctx.translate(620, 380);

        ctx.fillStyle = '#44403c';
        ctx.fillRect(-25, -60, 50, 60);
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.enemy.icon, 0, -65);

        ctx.restore();

        // Health Bars & Stats (Player Left)
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(20, 60, 300, 100);
        ctx.strokeStyle = '#d4af37';
        ctx.strokeRect(20, 60, 300, 100);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Noto Serif SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${this.player.name} (${this.player.katana})`, 30, 82);

        // HP Bar
        ctx.fillStyle = '#444';
        ctx.fillRect(30, 92, 280, 14);
        const hpPct = this.player.hp / this.player.maxHp;
        ctx.fillStyle = hpPct > 0.3 ? '#2a9d8f' : '#dc2626';
        ctx.fillRect(30, 92, 280 * hpPct, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${this.player.hp}/${this.player.maxHp}`, 130, 103);

        // Sharpness Bar
        ctx.fillStyle = '#444';
        ctx.fillRect(30, 114, 130, 8);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(30, 114, 130 * (this.player.sharpness / 100), 8);
        ctx.fillStyle = '#a8a29e';
        ctx.font = '10px sans-serif';
        ctx.fillText(`锋利: ${this.player.sharpness}%`, 170, 122);

        // POW Bar
        ctx.fillStyle = '#444';
        ctx.fillRect(30, 130, 280, 10);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(30, 130, 280 * (this.player.pow / 100), 10);
        if (this.player.pow >= 100) {
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('⚡ 怒气 MAX (按 L 释放超必杀)', 100, 139);
        }

        // Enemy HP Bar (Right)
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(580, 60, 300, 70);
        ctx.strokeStyle = '#c1121f';
        ctx.strokeRect(580, 60, 300, 70);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Noto Serif SC", serif';
        ctx.textAlign = 'right';
        ctx.fillText(this.enemy.name, 860, 82);

        ctx.fillStyle = '#444';
        ctx.fillRect(590, 92, 280, 14);
        const enHpPct = this.enemy.hp / this.enemy.maxHp;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(590, 92, 280 * enHpPct, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${this.enemy.hp}/${this.enemy.maxHp}`, 700, 103);

        // Bottom Action Bar (when player ATB ready)
        this.renderBottomActionBar();

        ctx.restore();
    }

    renderBottomActionBar() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(28, 25, 23, 0.95)';
        ctx.fillRect(0, 520, this.W, 130);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(0, 520, this.W, 3);

        // ATB Bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(20, 530, 860, 8);
        ctx.fillStyle = this.playerAtb >= 100 ? '#ffb703' : '#2a9d8f';
        ctx.fillRect(20, 530, 860 * (this.playerAtb / 100), 8);

        const isReady = this.playerAtb >= 100 && this.turn === 'player';

        const btns = [
            { label: 'J: 普通斩击', type: 'attack' },
            { label: `K: ${this.player.skills[0].name}`, type: 'skill0' },
            { label: `技能: ${this.player.skills[1].name}`, type: 'skill1' },
            { label: `L: ${this.player.skills[2].name}`, type: 'super', super: true },
            { label: 'I: 刀械保养', type: 'sharpen' }
        ];

        for (let i = 0; i < btns.length; i++) {
            const b = btns[i];
            const bx = 120 + i * 130;
            const by = 550;

            ctx.fillStyle = isReady ? (b.super ? (this.player.pow >= 100 ? '#c1121f' : '#44403c') : '#281216') : '#141210';
            ctx.fillRect(bx, by, 110, 60);
            ctx.strokeStyle = isReady ? (b.super ? '#ffb703' : '#d4af37') : '#44403c';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, 110, 60);

            ctx.fillStyle = isReady ? '#ffffff' : '#666';
            ctx.font = 'bold 12px "Noto Serif SC", serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.label, bx + 55, by + 35);
        }
    }

    renderDialogueModal() {
        if (!this.activeChoiceModal) return;
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.W, this.H);

        const modalW = 520, modalH = 340;
        const modalX = (this.W - modalW) / 2;
        const modalY = (this.H - modalH) / 2;

        ctx.fillStyle = '#1c1917';
        ctx.fillRect(modalX, modalY, modalW, modalH);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.strokeRect(modalX, modalY, modalW, modalH);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 22px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.activeChoiceModal.title, this.W / 2, modalY + 40);

        ctx.fillStyle = '#f5f5f4';
        ctx.font = '15px sans-serif';
        ctx.fillText(this.activeChoiceModal.question, this.W / 2, modalY + 80);

        const startY = modalY + 130;
        for (let i = 0; i < 3; i++) {
            const opt = this.activeChoiceModal.options[i];
            const oy = startY + i * 55;

            ctx.fillStyle = '#281216';
            ctx.fillRect(modalX + 30, oy, modalW - 60, 44);
            ctx.strokeStyle = '#c1121f';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(modalX + 30, oy, modalW - 60, 44);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px "Noto Serif SC", serif';
            ctx.textAlign = 'center';
            ctx.fillText(opt.label, this.W / 2, oy + 26);
        }
    }

    renderGameOverModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#c1121f';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('剑 阵 败 北', this.W / 2, 240);

        ctx.fillStyle = '#a8a29e';
        ctx.font = '16px sans-serif';
        ctx.fillText('刀断人亡，武士道修行尚未结束...', this.W / 2, 300);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('按 Enter 键 重新挑战', this.W / 2, 420);
        }
    }

    renderWinModal() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, this.W, this.H);

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 46px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('天下无双！罗将神封印！', this.W / 2, 220);

        ctx.fillStyle = '#f5f5f4';
        ctx.font = '16px sans-serif';
        ctx.fillText(`你带领 ${this.player.name} 斩尽一切恶魔，拯救了江户天下！`, this.W / 2, 290);

        if (Math.floor(this.frame / 25) % 2 === 0) {
            ctx.fillStyle = '#c1121f';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('按 Enter 键 重新开始传记', this.W / 2, 420);
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
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(f.text, f.x, f.y);
        }
    }
}

window.SamuraiGame = SamuraiGame;
