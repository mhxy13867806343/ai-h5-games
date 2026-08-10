/* ============================================================
   《开心农场》 Happy Farm H5 - HTML5 Canvas Engine
   ============================================================ */

class HappyFarmGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.W = 900;
        this.H = 650;

        this.state = 'LOADING'; // LOADING, MENU, PLAYING, ORDERS, SHOP, PAUSED
        this.frame = 0;

        // Player Economy & Stats
        this.gold = 500;
        this.exp = 0;
        this.level = 1;
        this.gems = 10;

        // Active selected tool / seed
        this.selectedSeed = 'carrot'; // carrot, wheat, corn, tomato, strawberry, sunflower, pumpkin
        this.selectedTool = 'plant'; // plant, water, harvest, fertilize

        // Inventory Storage (Barn / Silo)
        this.inventory = {
            carrot: 5, wheat: 5, corn: 2, tomato: 0,
            strawberry: 0, sunflower: 0, pumpkin: 0,
            egg: 0, milk: 0, wool: 0,
            bread: 0, cheese: 0, juice: 0
        };

        // Soil Plots Grid (12 plots: 4x3)
        this.plots = [];
        this.initPlots();

        // Animals
        this.animals = [
            { type: 'chicken', name: '母鸡', x: 700, y: 140, fed: false, timer: 0, maxTimer: 12 * 60, product: 'egg', ready: false },
            { type: 'cow', name: '奶牛', x: 700, y: 270, fed: false, timer: 0, maxTimer: 20 * 60, product: 'milk', ready: false },
            { type: 'sheep', name: '绵羊', x: 700, y: 400, fed: false, timer: 0, maxTimer: 30 * 60, product: 'wool', ready: false }
        ];

        // Factories
        this.factories = [
            { type: 'bakery', name: '面包房', x: 70, y: 450, producing: false, timer: 0, maxTimer: 15 * 60, inItem: 'wheat', inQty: 2, outItem: 'bread' },
            { type: 'dairy', name: '乳品厂', x: 220, y: 450, producing: false, timer: 0, maxTimer: 25 * 60, inItem: 'milk', inQty: 2, outItem: 'cheese' },
            { type: 'juiceBar', name: '果汁坊', x: 370, y: 450, producing: false, timer: 0, maxTimer: 35 * 60, inItem: 'strawberry', inQty: 2, outItem: 'juice' }
        ];

        // Order Board
        this.orders = [];
        this.generateOrders();

        // Delivery Truck
        this.truck = { x: -150, y: 150, targetX: 180, state: 'parked', animTimer: 0 };

        // Floating notifications (+25 Gold, etc)
        this.floats = [];

        // Particles (Harvest, Water, Sparkles)
        this.particles = [];

        // Weather System
        this.weather = 'sunny'; // sunny, rainy
        this.weatherTimer = 600;

        // Mouse
        this.mouse = { x: 0, y: 0, clicked: false, down: false };

        // Web Audio Synth
        this.audioCtx = null;
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.setupInputs();
        this.runLoadingSequence();
    }

    initPlots() {
        this.plots = [];
        const startX = 220;
        const startY = 160;
        const gapX = 105;
        const gapY = 85;

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                this.plots.push({
                    id: row * 4 + col + 1,
                    x: startX + col * gapX,
                    y: startY + row * gapY,
                    w: 90, h: 70,
                    unlocked: row < 2 || (row === 2 && col < 2), // 10 plots default
                    unlockCost: 300 + (row * 4 + col) * 100,
                    crop: null, // null or { type, stage, growth, maxGrowth, watered }
                    wetTimer: 0
                });
            }
        }
    }

    getCropData(type) {
        const crops = {
            carrot:     { name: '胡萝卜', seedCost: 10, growTime: 6, sellPrice: 25, expGain: 6, icon: '🥕' },
            wheat:      { name: '小麦',   seedCost: 15, growTime: 10, sellPrice: 40, expGain: 10, icon: '🌾' },
            corn:       { name: '玉米',   seedCost: 25, growTime: 16, sellPrice: 70, expGain: 18, icon: '🌽' },
            tomato:     { name: '西红柿', seedCost: 40, growTime: 24, sellPrice: 110, expGain: 28, icon: '🍅' },
            strawberry: { name: '草莓',   seedCost: 60, growTime: 32, sellPrice: 170, expGain: 42, icon: '🍓' },
            sunflower:  { name: '向日葵', seedCost: 90, growTime: 45, sellPrice: 260, expGain: 60, icon: '🌻' },
            pumpkin:    { name: '南瓜',   seedCost: 130, growTime: 60, sellPrice: 380, expGain: 90, icon: '🎃' }
        };
        return crops[type] || crops.carrot;
    }

    getItemData(type) {
        const items = {
            carrot:     { name: '胡萝卜', icon: '🥕', price: 25 },
            wheat:      { name: '小麦',   icon: '🌾', price: 40 },
            corn:       { name: '玉米',   icon: '🌽', price: 70 },
            tomato:     { name: '西红柿', icon: '🍅', price: 110 },
            strawberry: { name: '草莓',   icon: '🍓', price: 170 },
            sunflower:  { name: '向日葵', icon: '🌻', price: 260 },
            pumpkin:    { name: '南瓜',   icon: '🎃', price: 380 },
            egg:        { name: '鸡蛋',   icon: '🥚', price: 50 },
            milk:       { name: '牛奶',   icon: '🥛', price: 90 },
            wool:       { name: '羊毛',   icon: '🧶', price: 150 },
            bread:      { name: '新鲜面包', icon: '🍞', price: 200 },
            cheese:     { name: '美味奶酪', icon: '🧀', price: 320 },
            juice:      { name: '鲜榨果汁', icon: '🍹', price: 500 }
        };
        return items[type] || { name: type, icon: '📦', price: 20 };
    }

    generateOrders() {
        this.orders = [
            {
                id: 1, customer: '村长约瑟夫', avatar: '👨‍🌾',
                reqs: [{ item: 'carrot', qty: 3 }, { item: 'wheat', qty: 2 }],
                goldReward: 220, expReward: 40, done: false
            },
            {
                id: 2, customer: '面包师玛丽', avatar: '👩‍🍳',
                reqs: [{ item: 'egg', qty: 2 }, { item: 'milk', qty: 1 }],
                goldReward: 350, expReward: 65, done: false
            },
            {
                id: 3, customer: '商人汤姆', avatar: '🕵️‍♂️',
                reqs: [{ item: 'corn', qty: 3 }, { item: 'strawberry', qty: 1 }],
                goldReward: 480, expReward: 90, done: false
            }
        ];
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

            if (type === 'plant') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (type === 'water') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (type === 'harvest') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.08);
                osc.frequency.setValueAtTime(783, now + 0.16);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'coin') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(987, now);
                osc.frequency.setValueAtTime(1318, now + 0.08);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            } else if (type === 'truck') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.linearRampToValueAtTime(240, now + 0.3);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now); osc.stop(now + 0.4);
            }
        } catch (e) {}
    }

    setupInputs() {
        window.addEventListener('keydown', e => {
            this.initAudio();
            if (e.code === 'Digit1') this.selectedSeed = 'carrot';
            if (e.code === 'Digit2') this.selectedSeed = 'wheat';
            if (e.code === 'Digit3') this.selectedSeed = 'corn';
            if (e.code === 'Digit4') this.selectedSeed = 'tomato';
            if (e.code === 'Digit5') this.selectedSeed = 'strawberry';
            if (e.code === 'Digit6') this.selectedSeed = 'sunflower';

            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === 'PLAYING') this.state = 'PAUSED';
                else if (this.state === 'PAUSED') this.state = 'PLAYING';
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
            this.mouse.down = true;
            this.mouse.clicked = true;
            this.handleCanvasClick();
        });

        window.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
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
                    this.state = 'PLAYING';
                    this.startLoop();
                }, 200);
            }
        }, 30);
    }

    restart() {
        this.gold = 500;
        this.exp = 0;
        this.level = 1;
        this.selectedSeed = 'carrot';
        this.selectedTool = 'plant';
        this.inventory = { carrot: 5, wheat: 5, corn: 2, tomato: 0, strawberry: 0, sunflower: 0, pumpkin: 0, egg: 0, milk: 0, wool: 0, bread: 0, cheese: 0, juice: 0 };
        this.initPlots();
        this.generateOrders();
        this.state = 'PLAYING';
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
        if (this.state !== 'PLAYING') return;

        // Weather update
        this.weatherTimer--;
        if (this.weatherTimer <= 0) {
            this.weather = this.weather === 'sunny' ? 'rainy' : 'sunny';
            this.weatherTimer = 800 + Math.floor(Math.random() * 600);
        }

        // Plots update
        for (let p of this.plots) {
            if (!p.unlocked || !p.crop) continue;

            // Automatic rain watering
            if (this.weather === 'rainy') p.crop.watered = true;

            // Growth progression
            const speed = p.crop.watered ? 1.8 : 1.0;
            p.crop.growth += speed;

            if (p.crop.growth >= p.crop.maxGrowth) {
                p.crop.growth = p.crop.maxGrowth;
                p.crop.stage = 3; // Mature
            } else if (p.crop.growth >= p.crop.maxGrowth * 0.5) {
                p.crop.stage = 2; // Sprout
            } else {
                p.crop.stage = 1; // Seed
            }
        }

        // Animals update
        for (let a of this.animals) {
            if (a.fed && !a.ready) {
                a.timer++;
                if (a.timer >= a.maxTimer) {
                    a.ready = true;
                    a.fed = false;
                    a.timer = 0;
                }
            }
        }

        // Factories update
        for (let fac of this.factories) {
            if (fac.producing) {
                fac.timer++;
                if (fac.timer >= fac.maxTimer) {
                    fac.producing = false;
                    fac.timer = 0;
                    this.inventory[fac.outItem] = (this.inventory[fac.outItem] || 0) + 1;
                    this.addFloat(`+1 ${this.getItemData(fac.outItem).name}`, fac.x + 30, fac.y);
                    this.playSound('harvest');
                }
            }
        }

        // Truck animation
        if (this.truck.state === 'driving_away') {
            this.truck.x += 6;
            if (this.truck.x > this.W + 100) {
                this.truck.state = 'returning';
                this.truck.x = -150;
            }
        } else if (this.truck.state === 'returning') {
            this.truck.x += 4;
            if (this.truck.x >= this.truck.targetX) {
                this.truck.x = this.truck.targetX;
                this.truck.state = 'parked';
            }
        }

        // Floats update
        for (let i = this.floats.length - 1; i >= 0; i--) {
            let f = this.floats[i];
            f.y -= 1.2;
            f.life--;
            if (f.life <= 0) this.floats.splice(i, 1);
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

    handleCanvasClick() {
        const mx = this.mouse.x;
        const my = this.mouse.y;

        // 1. Check Plots Click
        for (let p of this.plots) {
            if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) {
                if (!p.unlocked) {
                    // Unlock plot
                    if (this.gold >= p.unlockCost) {
                        this.gold -= p.unlockCost;
                        p.unlocked = true;
                        this.playSound('coin');
                        this.addFloat('土地解锁！', p.x + 20, p.y);
                    } else {
                        this.addFloat('金币不足！', p.x + 20, p.y, '#e63946');
                    }
                    return;
                }

                if (!p.crop) {
                    // Plant seed
                    const seedData = this.getCropData(this.selectedSeed);
                    if (this.gold >= seedData.seedCost) {
                        this.gold -= seedData.seedCost;
                        p.crop = {
                            type: this.selectedSeed,
                            stage: 1,
                            growth: 0,
                            maxGrowth: seedData.growTime * 60,
                            watered: false
                        };
                        this.playSound('plant');
                        this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#8d5b4c');
                    } else {
                        this.addFloat('种子金币不足！', p.x + 10, p.y, '#e63946');
                    }
                } else if (p.crop.stage === 3) {
                    // Harvest Crop
                    const cropData = this.getCropData(p.crop.type);
                    this.inventory[p.crop.type] = (this.inventory[p.crop.type] || 0) + 1;
                    this.exp += cropData.expGain;

                    this.addFloat(`+1 ${cropData.name}`, p.x + 20, p.y);
                    this.addFloat(`+${cropData.expGain} 经验`, p.x + 20, p.y - 20, '#52b788');
                    this.playSound('harvest');
                    this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#e9c46a');

                    p.crop = null;
                    this.checkLevelUp();
                } else if (!p.crop.watered) {
                    // Water crop
                    p.crop.watered = true;
                    this.playSound('water');
                    this.addFloat('💧 已浇水', p.x + 20, p.y, '#00b4d8');
                    this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#00b4d8');
                }
                return;
            }
        }

        // 2. Check Seed Selector Bar Click (Bottom Bar)
        const seedTypes = ['carrot', 'wheat', 'corn', 'tomato', 'strawberry', 'sunflower', 'pumpkin'];
        const barStartX = 180;
        const barY = 570;
        for (let i = 0; i < seedTypes.length; i++) {
            const bx = barStartX + i * 85;
            if (mx >= bx && mx <= bx + 75 && my >= barY && my <= barY + 60) {
                this.selectedSeed = seedTypes[i];
                this.playSound('plant');
                return;
            }
        }

        // 3. Check Animal Feed & Collection
        for (let a of this.animals) {
            const dist = Math.hypot(mx - a.x, my - a.y);
            if (dist < 40) {
                if (a.ready) {
                    // Collect Product
                    a.ready = false;
                    this.inventory[a.product] = (this.inventory[a.product] || 0) + 1;
                    const itemData = this.getItemData(a.product);
                    this.addFloat(`+1 ${itemData.name}`, a.x, a.y - 20);
                    this.playSound('harvest');
                } else if (!a.fed) {
                    // Feed Animal
                    const reqCrop = a.type === 'chicken' ? 'wheat' : (a.type === 'cow' ? 'carrot' : 'sunflower');
                    if (this.inventory[reqCrop] && this.inventory[reqCrop] > 0) {
                        this.inventory[reqCrop]--;
                        a.fed = true;
                        a.timer = 0;
                        this.addFloat('喂食成功！', a.x, a.y - 20, '#52b788');
                        this.playSound('plant');
                    } else {
                        const cropName = this.getCropData(reqCrop).name;
                        this.addFloat(`缺少饲料: ${cropName}`, a.x - 20, a.y - 20, '#e63946');
                    }
                }
                return;
            }
        }

        // 4. Check Factory Click
        for (let fac of this.factories) {
            if (mx >= fac.x && mx <= fac.x + 120 && my >= fac.y && my <= fac.y + 100) {
                if (!fac.producing) {
                    if (this.inventory[fac.inItem] && this.inventory[fac.inItem] >= fac.inQty) {
                        this.inventory[fac.inItem] -= fac.inQty;
                        fac.producing = true;
                        fac.timer = 0;
                        this.addFloat('开工加工！', fac.x + 20, fac.y - 10, '#52b788');
                        this.playSound('water');
                    } else {
                        const inName = this.getItemData(fac.inItem).name;
                        this.addFloat(`需要 ${fac.inQty}个 ${inName}`, fac.x, fac.y - 10, '#e63946');
                    }
                }
                return;
            }
        }

        // 5. Check Truck / Order Board Click
        if (mx >= 50 && mx <= 190 && my >= 130 && my <= 230) {
            // Open Orders / Complete Truck Delivery
            this.tryFulfillOrder();
        }
    }

    tryFulfillOrder() {
        for (let ord of this.orders) {
            if (ord.done) continue;
            let canFulfill = true;
            for (let req of ord.reqs) {
                if (!this.inventory[req.item] || this.inventory[req.item] < req.qty) {
                    canFulfill = false;
                    break;
                }
            }

            if (canFulfill) {
                // Fulfill Order!
                for (let req of ord.reqs) {
                    this.inventory[req.item] -= req.qty;
                }
                ord.done = true;
                this.gold += ord.goldReward;
                this.exp += ord.expReward;

                this.truck.state = 'driving_away';
                this.playSound('truck');
                this.playSound('coin');

                this.addFloat(`订单完成！+${ord.goldReward}金币`, 200, 180, '#ffb703');
                this.checkLevelUp();

                // Refresh order after delay
                setTimeout(() => {
                    ord.done = false;
                    this.generateOrders();
                }, 4000);
                return;
            }
        }
        this.addFloat('暂无满足条件的订单', 180, 180, '#e63946');
    }

    checkLevelUp() {
        const reqExp = this.level * 100;
        if (this.exp >= reqExp) {
            this.level++;
            this.exp -= reqExp;
            this.gold += 200;
            this.addFloat(`🎉 升级！当前等级 LV.${this.level}`, 400, 300, '#ffb703');
            this.playSound('coin');
        }
    }

    addFloat(text, x, y, color = '#f4a261') {
        this.floats.push({ text, x, y, color, life: 60 });
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 1 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color,
                size: 3 + Math.random() * 3,
                life: 20 + Math.random() * 15
            });
        }
    }

    /* ============================================================
       RENDER LOGIC
       ============================================================ */

    render() {
        const ctx = this.ctx;

        // Background Farm Pastoral Field
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(0, 0, this.W, this.H);

        // Grass Pattern Details
        ctx.fillStyle = '#40916c';
        for (let x = 0; x < this.W; x += 40) {
            for (let y = 0; y < this.H; y += 40) {
                if ((x + y) % 80 === 0) {
                    ctx.fillRect(x, y, 20, 20);
                }
            }
        }

        // River at Top
        ctx.fillStyle = '#0077b6';
        ctx.fillRect(0, 50, this.W, 40);
        ctx.fillStyle = '#00b4d8';
        ctx.fillRect(0, 55, this.W, 8);

        // Rain Overlay
        if (this.weather === 'rainy') {
            ctx.fillStyle = 'rgba(0, 180, 216, 0.15)';
            ctx.fillRect(0, 0, this.W, this.H);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 40; i++) {
                const rx = (this.frame * 12 + i * 25) % this.W;
                const ry = (this.frame * 20 + i * 35) % this.H;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 5, ry + 15);
                ctx.stroke();
            }
        }

        // Draw Components
        this.renderRoadAndTruck();
        this.renderPlots();
        this.renderAnimals();
        this.renderFactories();
        this.renderOrderBoard();
        this.renderBottomBar();
        this.renderHUD();

        // Particles & Floats
        this.renderParticles();
        this.renderFloats();

        if (this.state === 'PAUSED') this.renderPaused();
    }

    renderRoadAndTruck() {
        const ctx = this.ctx;
        // Dirt Road
        ctx.fillStyle = '#bc6c25';
        ctx.fillRect(0, 150, 250, 45);

        // Delivery Truck
        ctx.save();
        ctx.translate(this.truck.x, this.truck.y);

        // Truck Cabin & Cargo
        ctx.fillStyle = '#e63946';
        ctx.fillRect(0, 0, 70, 40);
        ctx.fillStyle = '#457b9d';
        ctx.fillRect(70, 10, 30, 30);
        ctx.fillStyle = '#a8ded0';
        ctx.fillRect(75, 14, 15, 12); // Window

        // Wheels
        ctx.fillStyle = '#1d3557';
        ctx.beginPath(); ctx.arc(20, 42, 9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(80, 42, 9, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#f1faee';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('🚚 农场发货', 5, 24);

        ctx.restore();
    }

    renderPlots() {
        const ctx = this.ctx;
        for (let p of this.plots) {
            ctx.save();
            ctx.translate(p.x, p.y);

            if (!p.unlocked) {
                // Locked Plot
                ctx.fillStyle = '#523d35';
                ctx.fillRect(0, 0, p.w, p.h);
                ctx.strokeStyle = '#382621';
                ctx.strokeRect(0, 0, p.w, p.h);

                ctx.fillStyle = '#e9c46a';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🔒 点击解锁', p.w / 2, p.h / 2 - 4);
                ctx.fillText(`🪙 ${p.unlockCost}`, p.w / 2, p.h / 2 + 14);
            } else {
                // Unlocked Soil
                ctx.fillStyle = p.crop && p.crop.watered ? '#432818' : '#7f4f24';
                ctx.fillRect(0, 0, p.w, p.h);
                ctx.strokeStyle = '#582f0e';
                ctx.lineWidth = 3;
                ctx.strokeRect(0, 0, p.w, p.h);

                if (p.crop) {
                    const cData = this.getCropData(p.crop.type);
                    ctx.textAlign = 'center';

                    if (p.crop.stage === 1) {
                        // Seed
                        ctx.fillStyle = '#a7c957';
                        ctx.beginPath(); ctx.arc(p.w / 2, p.h / 2, 6, 0, Math.PI * 2); ctx.fill();
                    } else if (p.crop.stage === 2) {
                        // Sprout
                        ctx.font = '22px sans-serif';
                        ctx.fillText('🌿', p.w / 2, p.h / 2 + 8);
                    } else if (p.crop.stage === 3) {
                        // Mature
                        ctx.font = '32px sans-serif';
                        ctx.fillText(cData.icon, p.w / 2, p.h / 2 + 10);

                        // Glow halo for mature crops
                        ctx.fillStyle = 'rgba(233, 196, 106, 0.3)';
                        ctx.beginPath(); ctx.arc(p.w / 2, p.h / 2, 25, 0, Math.PI * 2); ctx.fill();
                    }

                    // Progress bar if growing
                    if (p.crop.stage < 3) {
                        const pct = p.crop.growth / p.crop.maxGrowth;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.fillRect(10, p.h - 10, p.w - 20, 6);
                        ctx.fillStyle = '#52b788';
                        ctx.fillRect(10, p.h - 10, (p.w - 20) * pct, 6);
                    }
                }
            }

            ctx.restore();
        }
    }

    renderAnimals() {
        const ctx = this.ctx;
        for (let a of this.animals) {
            ctx.save();
            ctx.translate(a.x, a.y);

            // Pen Fence
            ctx.fillStyle = '#6c584c';
            ctx.fillRect(-35, -35, 70, 70);
            ctx.fillStyle = '#adc178';
            ctx.fillRect(-30, -30, 60, 60);

            // Animal Icon
            ctx.font = '36px sans-serif';
            ctx.textAlign = 'center';
            const icon = a.type === 'chicken' ? '🐔' : (a.type === 'cow' ? '🐮' : '🐑');
            ctx.fillText(icon, 0, 10);

            // Status Badge
            if (a.ready) {
                const prodData = this.getItemData(a.product);
                ctx.font = '22px sans-serif';
                ctx.fillText(prodData.icon, 0, -22);
            } else if (!a.fed) {
                ctx.fillStyle = '#e63946';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText('需喂食', 0, 24);
            } else {
                // Progress
                const pct = a.timer / a.maxTimer;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(-20, 20, 40, 5);
                ctx.fillStyle = '#2a9d8f';
                ctx.fillRect(-20, 20, 40 * pct, 5);
            }

            ctx.restore();
        }
    }

    renderFactories() {
        const ctx = this.ctx;
        for (let fac of this.factories) {
            ctx.save();
            ctx.translate(fac.x, fac.y);

            // Building
            ctx.fillStyle = '#d62828';
            ctx.fillRect(0, 20, 110, 70);
            ctx.fillStyle = '#fdf0d5';
            ctx.fillRect(10, 0, 90, 25); // Roof

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(fac.name, 55, 45);

            const outData = this.getItemData(fac.outItem);
            ctx.font = '24px sans-serif';
            ctx.fillText(outData.icon, 55, 75);

            if (fac.producing) {
                const pct = fac.timer / fac.maxTimer;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(10, 80, 90, 6);
                ctx.fillStyle = '#ffb703';
                ctx.fillRect(10, 80, 90 * pct, 6);
            }

            ctx.restore();
        }
    }

    renderOrderBoard() {
        const ctx = this.ctx;
        // Board Frame
        ctx.fillStyle = '#b07d62';
        ctx.fillRect(50, 110, 140, 40);
        ctx.fillStyle = '#ffe8d6';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📋 告示板订单', 120, 135);
    }

    renderBottomBar() {
        const ctx = this.ctx;
        // Bar Container
        ctx.fillStyle = 'rgba(27, 38, 59, 0.9)';
        ctx.fillRect(0, 550, this.W, 100);
        ctx.fillStyle = '#415a77';
        ctx.fillRect(0, 550, this.W, 3);

        const seedTypes = ['carrot', 'wheat', 'corn', 'tomato', 'strawberry', 'sunflower', 'pumpkin'];
        const startX = 180;

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#e9c46a';
        ctx.textAlign = 'left';
        ctx.fillText('选择种植种子：', 20, 605);

        for (let i = 0; i < seedTypes.length; i++) {
            const st = seedTypes[i];
            const cData = this.getCropData(st);
            const bx = startX + i * 85;
            const by = 565;

            ctx.fillStyle = this.selectedSeed === st ? '#2a9d8f' : '#264653';
            ctx.fillRect(bx, by, 75, 70);
            ctx.strokeStyle = this.selectedSeed === st ? '#e9c46a' : '#415a77';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, 75, 70);

            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cData.icon, bx + 37, by + 30);

            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(cData.name, bx + 37, by + 48);

            ctx.fillStyle = '#e9c46a';
            ctx.fillText(`🪙${cData.seedCost}`, bx + 37, by + 62);
        }
    }

    renderHUD() {
        const ctx = this.ctx;

        // Top HUD Bar
        ctx.fillStyle = 'rgba(13, 27, 42, 0.85)';
        ctx.fillRect(0, 0, this.W, 45);
        ctx.fillStyle = '#2a9d8f';
        ctx.fillRect(0, 43, this.W, 2);

        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = '#ffb703';
        ctx.textAlign = 'left';
        ctx.fillText(`🪙 金币: ${this.gold}`, 20, 28);

        ctx.fillStyle = '#52b788';
        ctx.fillText(`⭐ 等级: LV.${this.level} (${this.exp}/${this.level * 100})`, 220, 28);

        // Warehouse Storage Icons
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`仓库: 🥕${this.inventory.carrot||0} 🌾${this.inventory.wheat||0} 🌽${this.inventory.corn||0} 🥚${this.inventory.egg||0} 🥛${this.inventory.milk||0}`, 480, 28);
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
        for (let f of this.floats) {
            ctx.fillStyle = f.color;
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(f.text, f.x, f.y);
        }
    }

    renderPaused() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('农 场 暂 停', this.W / 2, this.H / 2);
    }
}

window.HappyFarmGame = HappyFarmGame;
