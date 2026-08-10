/* ============================================================
   《最终幻想 1-6 属性与存档修改器》 FF1-6 Trainer & Editor JS
   ============================================================ */

class FFEditor {
    constructor() {
        this.currentGame = 'ff1';
        this.selectedCharId = 1;

        // Games Database Schema
        this.db = {
            ff1: {
                title: '最终幻想 I (Final Fantasy I)',
                gil: 9999999,
                characters: [
                    { id: 1, name: '光之战士 (Knight)', job: '骑士', icon: '⚔️', level: 99, hp: 9999, maxHp: 9999, mp: 999, maxMp: 999, str: 255, agi: 255, sta: 255, int: 255, spr: 255 },
                    { id: 2, name: '黑魔导 (Black Wizard)', job: '黑魔导师', icon: '🧙‍♂️', level: 99, hp: 8800, maxHp: 8800, mp: 999, maxMp: 999, str: 180, agi: 220, sta: 190, int: 255, spr: 240 },
                    { id: 3, name: '白魔导 (White Wizard)', job: '白魔导师', icon: '🧙‍♀️', level: 99, hp: 9200, maxHp: 9200, mp: 999, maxMp: 999, str: 170, agi: 210, sta: 200, int: 230, spr: 255 },
                    { id: 4, name: '忍者 (Ninja)', job: '忍者', icon: '🥷', level: 99, hp: 9500, maxHp: 9500, mp: 800, maxMp: 800, str: 240, agi: 255, sta: 230, int: 210, spr: 200 }
                ],
                items: [
                    { id: 'excalibur', name: '圣剑 (Excalibur)', count: 99 },
                    { id: 'ragnarok', name: '诸神黄昏 (Ragnarok)', count: 99 },
                    { id: 'ribbon', name: '丝带 (Ribbon)', count: 99 },
                    { id: 'elixir', name: '圣灵药 (Elixir)', count: 99 },
                    { id: 'phoenix', name: '凤凰之羽 (Phoenix Down)', count: 99 }
                ],
                magic: [
                    { id: 'flare', name: '火炎核爆 (Flare)', learned: true },
                    { id: 'holy', name: '神圣术 (Holy)', learned: true },
                    { id: 'full_life', name: '全复活术 (Full-Life)', learned: true }
                ]
            },
            ff2: {
                title: '最终幻想 II (Final Fantasy II)',
                gil: 9999999,
                characters: [
                    { id: 1, name: '菲利奥尼尔 (Firion)', job: '反抗军领袖', icon: '🗡️', level: 99, hp: 9999, maxHp: 9999, mp: 999, maxMp: 999, str: 255, agi: 255, sta: 255, int: 255, spr: 255 },
                    { id: 2, name: '玛利亚 (Maria)', job: '弓箭手/魔导', icon: '🏹', level: 99, hp: 9500, maxHp: 9500, mp: 999, maxMp: 999, str: 220, agi: 255, sta: 210, int: 255, spr: 255 },
                    { id: 3, name: '盖 (Guy)', job: '重装战士', icon: '🪓', level: 99, hp: 9999, maxHp: 9999, mp: 750, maxMp: 750, str: 255, agi: 200, sta: 255, int: 180, spr: 190 },
                    { id: 4, name: '里昂 (Leon)', job: '黑骑士', icon: '🛡️', level: 99, hp: 9800, maxHp: 9800, mp: 850, maxMp: 850, str: 250, agi: 240, sta: 245, int: 210, spr: 210 }
                ],
                items: [
                    { id: 'blood_sword', name: '吸血剑 (Blood Sword)', count: 99 },
                    { id: 'masamune', name: '正宗 (Masamune)', count: 99 },
                    { id: 'genji_glove', name: '源氏护手', count: 99 }
                ],
                magic: [
                    { id: 'ultima', name: '究极魔法 (Ultima Level 16)', learned: true },
                    { id: 'teleport', name: '传送术', learned: true }
                ]
            },
            ff3: {
                title: '最终幻想 III (Final Fantasy III)',
                gil: 9999999,
                characters: [
                    { id: 1, name: '鲁内斯 (Luneth)', job: '洋葱骑士 (Onion Knight)', icon: '🧅', level: 99, hp: 9999, maxHp: 9999, mp: 999, maxMp: 999, str: 255, agi: 255, sta: 255, int: 255, spr: 255 },
                    { id: 2, name: '阿尔克 (Arc)', job: '贤者 (Sage)', icon: '📖', level: 99, hp: 9200, maxHp: 9200, mp: 999, maxMp: 999, str: 190, agi: 230, sta: 200, int: 255, spr: 255 },
                    { id: 3, name: '蕾菲雅 (Refia)', job: '忍者 (Ninja)', icon: '🥷', level: 99, hp: 9600, maxHp: 9600, mp: 880, maxMp: 880, str: 255, agi: 255, sta: 240, int: 210, spr: 210 },
                    { id: 4, name: '凌古斯 (Ingus)', job: '魔导剑士', icon: '⚔️', level: 99, hp: 9800, maxHp: 9800, mp: 920, maxMp: 920, str: 250, agi: 240, sta: 250, int: 230, spr: 220 }
                ],
                items: [
                    { id: 'onion_sword', name: '洋葱之剑 (Onion Sword)', count: 99 },
                    { id: 'onion_shield', name: '洋葱之盾', count: 99 },
                    { id: 'onion_helm', name: '洋葱头盔', count: 99 }
                ],
                magic: [
                    { id: 'bahamut_ff3', name: '召唤巴哈姆特', learned: true },
                    { id: 'meteor', name: '陨石术 (Meteor)', learned: true }
                ]
            },
            ff4: {
                title: '最终幻想 IV (Final Fantasy IV)',
                gil: 9999999,
                characters: [
                    { id: 1, name: '塞西尔 (Cecil)', job: '圣骑士 (Paladin)', icon: '🛡️', level: 99, hp: 9999, maxHp: 9999, mp: 999, maxMp: 999, str: 255, agi: 255, sta: 255, int: 220, spr: 255 },
                    { id: 2, name: '凯因 (Kain)', job: '龙骑士 (Dragoon)', icon: '🐉', level: 99, hp: 9999, maxHp: 9999, mp: 600, maxMp: 600, str: 255, agi: 250, sta: 245, int: 180, spr: 190 },
                    { id: 3, name: '罗莎 (Rosa)', job: '白魔导士/弓手', icon: '🏹', level: 99, hp: 9100, maxHp: 9100, mp: 999, maxMp: 999, str: 180, agi: 240, sta: 200, int: 230, spr: 255 },
                    { id: 4, name: '莉迪亚 (Rydia)', job: '召唤士/黑魔导', icon: '🔮', level: 99, hp: 8900, maxHp: 8900, mp: 999, maxMp: 999, str: 170, agi: 230, sta: 190, int: 255, spr: 255 }
                ],
                items: [
                    { id: 'ragnarok_ff4', name: '诸神黄昏 (Ragnarok)', count: 99 },
                    { id: 'holy_lance', name: '神圣龙枪', count: 99 }
                ],
                magic: [
                    { id: 'bahamut_ff4', name: '幻兽巴哈姆特', learned: true },
                    { id: 'leviathan', name: '水神利维坦', learned: true }
                ]
            },
            ff5: {
                title: '最终幻想 V (Final Fantasy V)',
                gil: 9999999,
                characters: [
                    { id: 1, name: '巴兹 (Bartz)', job: '自由人 (全职业宗师)', icon: '🗡️', level: 99, hp: 9999, maxHp: 9999, mp: 999, maxMp: 999, str: 255, agi: 255, sta: 255, int: 255, spr: 255 },
                    { id: 2, name: '蕾娜 (Lenna)', job: '白魔宗师', icon: '👑', level: 99, hp: 9400, maxHp: 9400, mp: 999, maxMp: 999, str: 200, agi: 250, sta: 210, int: 255, spr: 255 },
                    { id: 3, name: '法里斯 (Faris)', job: '海盗剑圣', icon: '🏴‍☠️', level: 99, hp: 9700, maxHp: 9700, mp: 950, maxMp: 950, str: 250, agi: 255, sta: 245, int: 220, spr: 220 },
                    { id: 4, name: '库露露 (Krile)', job: '召唤宗师', icon: '👧', level: 99, hp: 9200, maxHp: 9200, mp: 999, maxMp: 999, str: 190, agi: 255, sta: 200, int: 255, spr: 255 }
                ],
                items: [
                    { id: 'brave_blade', name: '勇者之剑 (Brave Blade)', count: 99 },
                    { id: 'chicken_knife', name: '小鸡小刀', count: 99 }
                ],
                magic: [
                    { id: 'shinryu', name: '神龙召集', learned: true },
                    { id: 'odin', name: '斩铁剑奥丁', learned: true }
                ]
            },
            ff6: {
                title: '最终幻想 VI (Final Fantasy VI)',
                gil: 9999999,
                characters: [
                    { id: 1, name: '蒂娜 (Terra)', job: '幻兽半魔导', icon: '👩‍🦰', level: 99, hp: 9999, maxHp: 9999, mp: 999, maxMp: 999, str: 255, agi: 255, sta: 255, int: 255, spr: 255 },
                    { id: 2, name: '洛克 (Locke)', job: '寻宝猎人', icon: '🗡️', level: 99, hp: 9800, maxHp: 9800, mp: 920, maxMp: 920, str: 250, agi: 255, sta: 240, int: 210, spr: 210 },
                    { id: 3, name: '塞丽丝 (Celes)', job: '魔导骑士', icon: '⚔️', level: 99, hp: 9999, maxHp: 9999, mp: 999, maxMp: 999, str: 245, agi: 250, sta: 250, int: 255, spr: 255 },
                    { id: 4, name: '埃德加 (Edgar)', job: '机械国王', icon: '👑', level: 99, hp: 9999, maxHp: 9999, mp: 850, maxMp: 850, str: 255, agi: 240, sta: 250, int: 200, spr: 200 },
                    { id: 5, name: '马修 (Sabin)', job: '狂暴格斗家', icon: '🥊', level: 99, hp: 9999, maxHp: 9999, mp: 800, maxMp: 800, str: 255, agi: 245, sta: 255, int: 220, spr: 210 }
                ],
                items: [
                    { id: 'ultimawpn', name: '创世武器 (Ultima Weapon)', count: 99 },
                    { id: 'lightbringer', name: '创世圣剑 (Lightbringer)', count: 99 },
                    { id: 'paladin_shield', name: '英雄圣骑士之盾', count: 99 }
                ],
                magic: [
                    { id: 'ff6_ultima', name: '究极 Ultima (伤害 9999)', learned: true },
                    { id: 'ff6_esper', name: '魔石魔导士合体', learned: true }
                ]
            }
        };
    }

    init() {
        this.setupTabListeners();
        this.setupInputListeners();
        this.renderAll();
    }

    setupTabListeners() {
        // Game Tabs (FF1 ~ FF6)
        document.querySelectorAll('.game-tab').forEach(tab => {
            tab.addEventListener('click', e => {
                document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentGame = tab.dataset.game;
                this.selectedCharId = 1;
                this.renderAll();
            });
        });

        // Sub Tabs (Stats / Inventory / Magic)
        document.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', e => {
                document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            });
        });

        // One-Click Presets
        document.getElementById('btn-max-gil').addEventListener('click', () => {
            this.db[this.currentGame].gil = 9999999;
            document.getElementById('input-gil').value = 9999999;
            alert('💰 金币已成功修改为 9,999,999 ギル！');
        });

        document.getElementById('btn-max-party').addEventListener('click', () => {
            const chars = this.db[this.currentGame].characters;
            for (let c of chars) {
                c.level = 99;
                c.hp = 9999; c.maxHp = 9999;
                c.mp = 999; c.maxMp = 999;
                c.str = 255; c.agi = 255; c.sta = 255; c.int = 255; c.spr = 255;
            }
            this.renderAll();
            alert('🚀 全员已一键拉满 99 级！9999 HP / 999 MP / 255 属性！');
        });

        document.getElementById('btn-all-items-99').addEventListener('click', () => {
            const items = this.db[this.currentGame].items;
            for (let item of items) item.count = 99;
            this.renderInventory();
            alert('📦 背包内所有创世神装与圣灵药均已设置为 x99！');
        });

        document.getElementById('btn-learn-all-magic').addEventListener('click', () => {
            const magics = this.db[this.currentGame].magic;
            for (let m of magics) m.learned = true;
            this.renderMagic();
            alert('🔮 全员已一键习得 Ultima 究极魔法与全召唤兽！');
        });

        // Export / Import
        document.getElementById('btn-export-json').addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.db[this.currentGame], null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${this.currentGame}_save_edited.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });

        document.getElementById('btn-import-json').addEventListener('click', () => {
            document.getElementById('file-import').click();
        });

        document.getElementById('file-import').addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = evt => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (parsed.characters) {
                        this.db[this.currentGame] = parsed;
                        this.renderAll();
                        alert('📥 存档文件读取并加载成功！');
                    }
                } catch (err) {
                    alert('存档格式错误！请导入正确的 JSON 存档。');
                }
            };
            reader.readAsText(file);
        });
    }

    setupInputListeners() {
        const bindInput = (id, field) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', e => {
                    const char = this.getSelectedChar();
                    if (char) char[field] = parseInt(e.target.value) || 0;
                });
            }
        };

        bindInput('stat-level', 'level');
        bindInput('stat-hp', 'hp');
        bindInput('stat-maxhp', 'maxHp');
        bindInput('stat-mp', 'mp');
        bindInput('stat-maxmp', 'maxMp');
        bindInput('stat-str', 'str');
        bindInput('stat-agi', 'agi');
        bindInput('stat-sta', 'sta');
        bindInput('stat-int', 'int');
        bindInput('stat-spr', 'spr');
    }

    getSelectedChar() {
        const gameData = this.db[this.currentGame];
        return gameData.characters.find(c => c.id === this.selectedCharId) || gameData.characters[0];
    }

    renderAll() {
        const gameData = this.db[this.currentGame];

        // Render Gil
        document.getElementById('input-gil').value = gameData.gil;

        // Render Character List
        const $charList = document.getElementById('character-list');
        $charList.innerHTML = '';

        gameData.characters.forEach(char => {
            const isActive = char.id === this.selectedCharId ? 'active' : '';
            const $item = document.createElement('div');
            $item.className = `char-item ${isActive}`;
            $item.innerHTML = `<span class="icon">${char.icon}</span><span class="name">${char.name}</span>`;
            $item.addEventListener('click', () => {
                this.selectedCharId = char.id;
                this.renderAll();
            });
            $charList.appendChild($item);
        });

        // Render Selected Char Stats
        const char = this.getSelectedChar();
        if (char) {
            document.getElementById('char-avatar').textContent = char.icon;
            document.getElementById('char-name-title').textContent = char.name;
            document.getElementById('char-job-desc').textContent = `职业: ${char.job}`;

            document.getElementById('stat-level').value = char.level;
            document.getElementById('stat-hp').value = char.hp;
            document.getElementById('stat-maxhp').value = char.maxHp;
            document.getElementById('stat-mp').value = char.mp;
            document.getElementById('stat-maxmp').value = char.maxMp;
            document.getElementById('stat-str').value = char.str;
            document.getElementById('stat-agi').value = char.agi;
            document.getElementById('stat-sta').value = char.sta;
            document.getElementById('stat-int').value = char.int;
            document.getElementById('stat-spr').value = char.spr;
        }

        this.renderInventory();
        this.renderMagic();
    }

    renderInventory() {
        const items = this.db[this.currentGame].items;
        const $grid = document.getElementById('inventory-grid');
        $grid.innerHTML = '';

        items.forEach(item => {
            const $box = document.createElement('div');
            $box.className = 'item-box';
            $box.innerHTML = `<span>🗡️ ${item.name}</span> <input type="number" value="${item.count}" min="0" max="99" />`;
            const $input = $box.querySelector('input');
            $input.addEventListener('input', e => {
                item.count = parseInt(e.target.value) || 0;
            });
            $grid.appendChild($box);
        });
    }

    renderMagic() {
        const magics = this.db[this.currentGame].magic;
        const $grid = document.getElementById('magic-grid');
        $grid.innerHTML = '';

        magics.forEach(m => {
            const $box = document.createElement('div');
            $box.className = 'magic-box';
            $box.innerHTML = `<span>🔮 ${m.name}</span> <input type="checkbox" ${m.learned ? 'checked' : ''} />`;
            const $chk = $box.querySelector('input');
            $chk.addEventListener('change', e => {
                m.learned = e.target.checked;
            });
            $grid.appendChild($box);
        });
    }
}

window.FFEditor = FFEditor;
