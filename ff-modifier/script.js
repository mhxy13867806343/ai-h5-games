/* =====================================================
 *  最终幻想 1-6 · FFD 属性修改器
 *  纯前端 · 文件读取 + 字节级解析 + 实时编辑
 * ===================================================== */

// ---------------- 工具函数 ----------------
const $ = (id) => document.getElementById(id);

function u8(buf, off) { return off < buf.length ? buf[off] : 0; }
function u16(buf, off) { return u8(buf, off) | (u8(buf, off + 1) << 8); }
function u32(buf, off) {
  return (u8(buf, off) | (u8(buf, off + 1) << 8) | (u8(buf, off + 2) << 16) | (u8(buf, off + 3) << 24)) >>> 0;
}
function setU8(buf, off, val) { if (off < buf.length) buf[off] = val & 0xff; }
function setU16(buf, off, val) {
  setU8(buf, off, val & 0xff);
  setU8(buf, off + 1, (val >> 8) & 0xff);
}
function setU32(buf, off, val) {
  setU16(buf, off, val & 0xffff);
  setU16(buf, off + 2, (val >> 16) & 0xffff);
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

// ---------------- 存档模板定义 ----------------
// offset 全部为相对整个文件或每个角色块的偏移量
// 当字段在角色块内时,运行时自动加上 charOffset
const TEMPLATES = {
  'ff1-nes': {
    name: 'FF1 · NES (8-bit)',
    desc: '美版 NES · 512 字节 (4 角色 × 32 + 钱 + 杂项)',
    blockSize: 32,
    baseOffset: 0x00,
    charCount: 4,
    charNames: ['战士', '盗贼', '僧侣', '魔法师'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 4, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x04, type: 'uint16', min: 0, max: 999 },
      { key: 'mp', label: 'MP', offset: 0x06, type: 'uint16', min: 0, max: 999 },
      { key: 'level', label: '等级', offset: 0x0E, type: 'uint8', min: 1, max: 50 },
      { key: 'str', label: '力量', offset: 0x11, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x12, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x13, type: 'uint8' },
      { key: 'int', label: '智力', offset: 0x14, type: 'uint8' },
      { key: 'luck', label: '运气', offset: 0x15, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x7C, type: 'uint32', min: 0, max: 999999 },
    ],
  },

  'ff1-gba': {
    name: 'FF1 · GBA (Dawn of Souls)',
    desc: '美版 GBA · 单角色结构 0x4C 字节',
    blockSize: 0x4C,
    baseOffset: 0x0C,
    charCount: 4,
    charNames: ['角色 1', '角色 2', '角色 3', '角色 4'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 6, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x06, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x10, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x12, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x13, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x14, type: 'uint8' },
      { key: 'int', label: '智力', offset: 0x15, type: 'uint8' },
      { key: 'luck', label: '运气', offset: 0x16, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0xA0, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff2-nes': {
    name: 'FF2 · NES (8-bit)',
    desc: '美版 NES · 角色块 0x40 字节',
    blockSize: 0x40,
    baseOffset: 0x10,
    charCount: 4,
    charNames: ['Firion', 'Maria', 'Guy', 'Leon'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 6, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x06, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0A, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x0C, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x0D, type: 'uint8' },
      { key: 'stamina', label: '体力', offset: 0x0E, type: 'uint8' },
      { key: 'spirit', label: '精神', offset: 0x0F, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0xA0, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff2-gba': {
    name: 'FF2 · GBA (Dawn of Souls)',
    desc: '美版 GBA · 角色块 0x50 字节',
    blockSize: 0x50,
    baseOffset: 0x0C,
    charCount: 4,
    charNames: ['Firion', 'Maria', 'Guy', 'Leon'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 6, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x06, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0C, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x10, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x11, type: 'uint8' },
      { key: 'stamina', label: '体力', offset: 0x12, type: 'uint8' },
      { key: 'spirit', label: '精神', offset: 0x13, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x140, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff3-nes': {
    name: 'FF3 · NES (8-bit)',
    desc: '美版 NES · 角色块 0x80 字节',
    blockSize: 0x80,
    baseOffset: 0x20,
    charCount: 4,
    charNames: ['洋葱剑士 1', '洋葱剑士 2', '洋葱剑士 3', '洋葱剑士 4'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 5, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x07, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x09, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0B, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x0C, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x0E, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x0F, type: 'uint8' },
      { key: 'int', label: '智力', offset: 0x10, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x230, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff3-ds': {
    name: 'FF3 · NDS 复刻版',
    desc: 'NDS 复刻版 · 角色块 0x40 字节',
    blockSize: 0x40,
    baseOffset: 0x10,
    charCount: 4,
    charNames: ['角色 1', '角色 2', '角色 3', '角色 4'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 8, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x08, type: 'uint32', min: 0, max: 99999 },
      { key: 'mp', label: 'MP', offset: 0x0C, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0E, type: 'uint16', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x20, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x21, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x22, type: 'uint8' },
      { key: 'int', label: '智力', offset: 0x23, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x120, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff4-snes': {
    name: 'FF4 · SNES (美版 Easy Type)',
    desc: '美版 SNES · 角色块 0x40 字节',
    blockSize: 0x40,
    baseOffset: 0x10,
    charCount: 5,
    charNames: ['Cecil', 'Kain', 'Rydia', 'Tellah', 'Edward'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 6, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x06, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0A, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x14, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x15, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x16, type: 'uint8' },
      { key: 'wis', label: '智慧', offset: 0x17, type: 'uint8' },
      { key: 'will', label: '意志', offset: 0x18, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x180, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff4-gba': {
    name: 'FF4 · GBA (完整版)',
    desc: '美版 GBA · 角色块 0x50 字节',
    blockSize: 0x50,
    baseOffset: 0x10,
    charCount: 12,
    charNames: ['Cecil', 'Kain', 'Rydia', 'Tellah', 'Edward', 'Rosa', 'Yang', 'Palom', 'Porom', 'Cid', 'Rubicant', 'Edge'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 8, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x0A, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0C, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x20, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x21, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x22, type: 'uint8' },
      { key: 'wis', label: '智慧', offset: 0x23, type: 'uint8' },
      { key: 'will', label: '意志', offset: 0x24, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x200, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff4-ds': {
    name: 'FF4 · NDS 复刻版',
    desc: 'NDS 复刻版 · 角色块 0x80 字节',
    blockSize: 0x80,
    baseOffset: 0x40,
    charCount: 12,
    charNames: ['Cecil', 'Kain', 'Rydia', 'Tellah', 'Edward', 'Rosa', 'Yang', 'Palom', 'Porom', 'Cid', 'Rubicant', 'Edge'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 8, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x08, type: 'uint32', min: 0, max: 99999 },
      { key: 'mp', label: 'MP', offset: 0x0C, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0E, type: 'uint16', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x30, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x31, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x32, type: 'uint8' },
      { key: 'wis', label: '智慧', offset: 0x33, type: 'uint8' },
      { key: 'will', label: '意志', offset: 0x34, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x640, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff5-snes': {
    name: 'FF5 · SNES',
    desc: '美版 SNES · 角色块 0x40 字节',
    blockSize: 0x40,
    baseOffset: 0x10,
    charCount: 4,
    charNames: ['Bartz', 'Lenna', 'Krile', 'Faris'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 6, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x06, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0A, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x14, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x15, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x16, type: 'uint8' },
      { key: 'mag', label: '魔力', offset: 0x17, type: 'uint8' },
      { key: 'spi', label: '精神', offset: 0x18, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x140, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff5-gba': {
    name: 'FF5 · GBA 复刻版',
    desc: 'GBA 复刻版 · 角色块 0x50 字节',
    blockSize: 0x50,
    baseOffset: 0x10,
    charCount: 4,
    charNames: ['Bartz', 'Lenna', 'Krile', 'Faris'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 8, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x0A, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x0C, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x20, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x21, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x22, type: 'uint8' },
      { key: 'mag', label: '魔力', offset: 0x23, type: 'uint8' },
      { key: 'spi', label: '精神', offset: 0x24, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x180, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff6-snes': {
    name: 'FF6 · SNES',
    desc: '美版 SNES · 角色块 0x2A 字节',
    blockSize: 0x2A,
    baseOffset: 0x00,
    charCount: 14,
    charNames: ['Terra', 'Locke', 'Cyan', 'Shadow', 'Edgar', 'Sabin', 'Celes', 'Strago', 'Relm', 'Setzer', 'Mog', 'Gau', 'Gogo', 'Umaro'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 6, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x07, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x09, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x16, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x18, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x19, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x1A, type: 'uint8' },
      { key: 'mag', label: '魔力', offset: 0x1B, type: 'uint8' },
      { key: 'spi', label: '精神', offset: 0x1C, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x1D4, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff6-gba': {
    name: 'FF6 · GBA 复刻版',
    desc: 'GBA 复刻版 · 角色块 0x48 字节',
    blockSize: 0x48,
    baseOffset: 0x00,
    charCount: 14,
    charNames: ['Terra', 'Locke', 'Cyan', 'Shadow', 'Edgar', 'Sabin', 'Celes', 'Strago', 'Relm', 'Setzer', 'Mog', 'Gau', 'Gogo', 'Umaro'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 8, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x08, type: 'uint16', min: 0, max: 9999 },
      { key: 'mp', label: 'MP', offset: 0x0A, type: 'uint16', min: 0, max: 9999 },
      { key: 'level', label: '等级', offset: 0x10, type: 'uint8', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x14, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x15, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x16, type: 'uint8' },
      { key: 'mag', label: '魔力', offset: 0x17, type: 'uint8' },
      { key: 'spi', label: '精神', offset: 0x18, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x3A0, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff1-psp': {
    name: 'FF1 · PSP 复刻版',
    desc: 'PSP 复刻版 · 角色块 0x80 字节',
    blockSize: 0x80,
    baseOffset: 0x100,
    charCount: 5,
    charNames: ['战士', '盗贼', '僧侣', '魔法师', '红色战士'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 8, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x08, type: 'uint32', min: 0, max: 99999 },
      { key: 'mp', label: 'MP', offset: 0x0C, type: 'uint32', min: 0, max: 99999 },
      { key: 'level', label: '等级', offset: 0x10, type: 'uint16', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x14, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x15, type: 'uint8' },
      { key: 'vit', label: '耐力', offset: 0x16, type: 'uint8' },
      { key: 'int', label: '智力', offset: 0x17, type: 'uint8' },
      { key: 'luck', label: '运气', offset: 0x18, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x400, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'ff2-psp': {
    name: 'FF2 · PSP 复刻版',
    desc: 'PSP 复刻版 · 角色块 0x80 字节',
    blockSize: 0x80,
    baseOffset: 0x100,
    charCount: 5,
    charNames: ['Firion', 'Maria', 'Guy', 'Leon', 'Minwu'],
    fields: [
      { key: 'name', label: '名字', offset: 0x00, length: 8, type: 'name' },
      { key: 'hp', label: 'HP', offset: 0x08, type: 'uint32', min: 0, max: 99999 },
      { key: 'mp', label: 'MP', offset: 0x0C, type: 'uint32', min: 0, max: 99999 },
      { key: 'level', label: '等级', offset: 0x10, type: 'uint16', min: 1, max: 99 },
      { key: 'str', label: '力量', offset: 0x14, type: 'uint8' },
      { key: 'agl', label: '敏捷', offset: 0x15, type: 'uint8' },
      { key: 'stamina', label: '体力', offset: 0x16, type: 'uint8' },
      { key: 'spirit', label: '精神', offset: 0x17, type: 'uint8' },
    ],
    extras: [
      { key: 'gil', label: '金钱 (Gil)', offset: 0x400, type: 'uint32', min: 0, max: 9999999 },
    ],
  },

  'custom': {
    name: '自定义 (Hex 视图)',
    desc: '通用模式,所有数据通过 Hex 视图直接编辑',
    blockSize: 0,
    baseOffset: 0,
    charCount: 0,
    fields: [],
    extras: [],
  },
};

// ---------------- 应用状态 ----------------
const state = {
  buffer: null,        // Uint8Array of save file
  fileName: '',
  template: null,
  templateKey: 'ff1-nes',
};

// ---------------- 事件绑定 ----------------
function bindUI() {
  // Dropzone
  const dz = $('dropzone');
  const fi = $('file-input');
  dz.addEventListener('click', () => fi.click());
  fi.addEventListener('change', (e) => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });

  // Game select
  $('game-select').addEventListener('change', (e) => {
    state.templateKey = e.target.value;
    state.template = TEMPLATES[state.templateKey];
    $('template-hint').textContent = state.template.desc;
    renderCharacters();
    renderExtras();
    renderHex();
  });

  // Buttons
  $('btn-load-sample').addEventListener('click', loadSample);
  $('btn-clear').addEventListener('click', clearAll);
  $('btn-max-all').addEventListener('click', batchMaxAll);
  $('btn-max-gil').addEventListener('click', batchMaxGil);
  $('btn-unlock').addEventListener('click', batchUnlock);
  $('btn-save').addEventListener('click', exportSave);
  $('btn-export-hex').addEventListener('click', exportHex);
  $('btn-copy').addEventListener('click', copyHex);
  $('btn-help').addEventListener('click', () => $('help-modal').hidden = false);

  document.querySelectorAll('[data-close]').forEach(el =>
    el.addEventListener('click', () => $('help-modal').hidden = true)
  );
  $('help-modal').addEventListener('click', (e) => {
    if (e.target.id === 'help-modal') $('help-modal').hidden = true;
  });
}

// ---------------- 加载存档 ----------------
function loadFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    state.buffer = new Uint8Array(e.target.result);
    state.fileName = file.name;
    $('file-meta').innerHTML = `<b>${file.name}</b><br>${fmtBytes(file.size)} · ${state.buffer.length} bytes`;
    $('btn-save').disabled = false;
    $('btn-export-hex').disabled = false;
    $('btn-copy').disabled = false;
    autoDetect();
    renderAll();
    toast('已加载: ' + file.name, 'success');
  };
  reader.readAsArrayBuffer(file);
}

function autoDetect() {
  if (!state.buffer) return;
  const size = state.buffer.length;
  // 简单的体积推断
  let guess = null;
  if (size === 512) guess = 'ff1-nes';
  else if (size === 0x800) guess = 'ff1-gba';
  else if (size === 0x400) guess = 'ff2-nes';
  else if (size === 0x1000) guess = 'ff2-gba';
  else if (size === 0x800) guess = 'ff3-nes';
  else if (size === 0x4000) guess = 'ff3-ds';
  else if (size === 0x600) guess = 'ff4-snes';
  else if (size === 0x1000) guess = 'ff4-gba';
  else if (size === 0x8000) guess = 'ff4-ds';
  else if (size === 0x500) guess = 'ff5-snes';
  else if (size === 0x1000) guess = 'ff5-gba';
  else if (size === 0x800) guess = 'ff6-snes';
  else if (size === 0x2000) guess = 'ff6-gba';

  if (guess && TEMPLATES[guess]) {
    $('game-select').value = guess;
    state.templateKey = guess;
    state.template = TEMPLATES[guess];
    $('template-hint').textContent = '🔍 自动识别为 ' + state.template.name;
  }
}

function clearAll() {
  state.buffer = null;
  state.fileName = '';
  $('file-meta').textContent = '未选择文件';
  $('btn-save').disabled = true;
  $('btn-export-hex').disabled = true;
  $('btn-copy').disabled = true;
  renderAll();
  toast('已清空');
}

// ---------------- 示例数据生成 ----------------
function loadSample() {
  // 生成 FF4 SNES 大小 (6144 字节) 示例
  const tpl = TEMPLATES[state.templateKey];
  const sampleSize = 6144;
  const buf = new Uint8Array(sampleSize);
  // 写入部分有意义数据
  for (let i = 0; i < sampleSize; i++) buf[i] = Math.floor(Math.random() * 256);

  // 填充示例角色数据
  if (tpl.charCount > 0) {
    // 转为 ASCII 名(NES/SNES 存档只支持 ASCII)
    const asciiNames = (tpl.charNames || []).map(n => {
      const ascii = n.replace(/[^\x20-\x7e]/g, '').substring(0, 8);
      return ascii || ('CH' + Math.random().toString(36).substring(2, 5)).toUpperCase();
    });
    for (let c = 0; c < tpl.charCount; c++) {
      const base = tpl.baseOffset + c * tpl.blockSize;
      tpl.fields.forEach(f => {
        if (f.type === 'name') {
          const name = (asciiNames[c] || 'CH' + c).padEnd(f.length, '\0').substring(0, f.length);
          for (let i = 0; i < f.length; i++) {
            setU8(buf, base + f.offset + i, name.charCodeAt(i) || 0);
          }
        } else if (f.key === 'hp') setU16(buf, base + f.offset, 8500);
        else if (f.key === 'mp') setU16(buf, base + f.offset, 999);
        else if (f.key === 'level') setU8(buf, base + f.offset, 75);
        else if (f.type === 'uint8') setU8(buf, base + f.offset, 99);
        else if (f.type === 'uint16') setU16(buf, base + f.offset, 9999);
        else if (f.type === 'uint32') setU32(buf, base + f.offset, 9999);
      });
    }
  }
  // 金钱
  if (tpl.extras) {
    tpl.extras.forEach(ex => {
      if (ex.key === 'gil') setU32(buf, ex.offset, 500000);
    });
  }

  state.buffer = buf;
  state.fileName = 'sample-' + state.templateKey + '.ffd';
  $('file-meta').innerHTML = `<b>${state.fileName}</b><br>${fmtBytes(buf.length)} · 示例数据`;
  $('btn-save').disabled = false;
  $('btn-export-hex').disabled = false;
  $('btn-copy').disabled = false;
  renderAll();
  toast('已载入示例数据', 'success');
}

// ---------------- 渲染 ----------------
function renderAll() {
  renderCharacters();
  renderExtras();
  renderHex();
}

function renderCharacters() {
  const container = $('characters');
  if (!state.buffer || !state.template || state.template.charCount === 0) {
    if (!state.buffer) {
      container.classList.add('empty');
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🗡️</div>
          <h2>欢迎使用 FF1-6 FFD 属性修改器</h2>
          <p>从左侧加载 .ffd 存档或示例数据,即可在此编辑角色属性。</p>
          <ul>
            <li>支持 <b>FF1-FF6</b> 多个版本(NES / SNES / GBA / NDS / PSP)</li>
            <li>可修改等级、HP、MP、力量、敏捷等核心属性</li>
            <li>支持金钱、道具、魔法解锁等批量操作</li>
            <li>所有操作均在浏览器本地完成,不上传任何数据</li>
          </ul>
        </div>`;
    } else {
      container.classList.remove('empty');
      container.innerHTML = '<div class="empty-state"><p>当前游戏版本无预定义角色结构,请使用 Hex 视图自由编辑。</p></div>';
    }
    return;
  }

  container.classList.remove('empty');
  const tpl = state.template;
  let html = '';
  for (let c = 0; c < tpl.charCount; c++) {
    const charBase = tpl.baseOffset + c * tpl.blockSize;
    if (charBase + tpl.blockSize > state.buffer.length) break;

    const nameField = tpl.fields.find(f => f.type === 'name');
    let charName = (tpl.charNames[c] || ('角色 ' + (c + 1))).toUpperCase();
    if (nameField) {
      let raw = '';
      for (let i = 0; i < nameField.length; i++) {
        const b = u8(state.buffer, charBase + nameField.offset + i);
        if (b === 0) break;
        raw += String.fromCharCode(b);
      }
      if (raw.trim()) charName = raw.trim();
    }

    html += `<div class="character-card" data-char="${c}">`;
    html += `<div class="char-header">
      <div class="char-avatar">${(charName[0] || '?').toUpperCase()}</div>
      <div class="char-info">
        <h4>${charName}</h4>
        <div class="char-class">${tpl.name} · 角色 ${c + 1}</div>
      </div>
      <div class="char-status">
        <span class="lv">Lv ${readField(tpl.fields, charBase, 'level', 'uint8')}</span>
      </div>
    </div>`;

    html += `<div class="stats-grid">`;
    tpl.fields.forEach(f => {
      if (f.type === 'name') return;
      const abs = charBase + f.offset;
      const val = readField([f], charBase, f.key, f.type);
      const max = f.max != null ? f.max : (f.type === 'uint32' ? 99999 : (f.type === 'uint16' ? 9999 : 99));
      const min = f.min != null ? f.min : 0;
      const maxAttr = f.type === 'uint32' ? 9999999 : max;
      const percent = maxAttr > 0 ? Math.min(100, (val / maxAttr) * 100) : 0;

      html += `<div class="stat-item">
        <div class="stat-label">${f.label}</div>
        <input class="stat-input" type="number"
          data-char="${c}" data-key="${f.key}" data-type="${f.type}" data-off="${f.offset}"
          value="${val}" min="${min}" max="${maxAttr}" step="1" />
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${percent}%"></div></div>
      </div>`;
    });
    html += `</div></div>`;
  }
  container.innerHTML = html;

  // 绑定输入事件
  container.querySelectorAll('.stat-input').forEach(inp => {
    inp.addEventListener('input', onStatChange);
    inp.addEventListener('focus', (e) => e.target.select());
  });
}

function renderExtras() {
  // 简化:extras 直接在 hex 区展示
}

function renderHex() {
  const view = $('hex-view');
  if (!state.buffer) {
    view.textContent = '请先加载存档';
    $('hex-meta').textContent = '—';
    return;
  }
  $('hex-meta').textContent = `${state.buffer.length} bytes`;

  const tpl = state.template;
  const lines = [];
  const highlight = new Set();
  if (tpl && tpl.charCount > 0) {
    for (let c = 0; c < tpl.charCount; c++) {
      const charBase = tpl.baseOffset + c * tpl.blockSize;
      if (charBase + tpl.blockSize > state.buffer.length) break;
      tpl.fields.forEach(f => {
        for (let i = 0; i < (f.length || (f.type === 'uint16' ? 2 : f.type === 'uint32' ? 4 : 1)); i++) {
          highlight.add(charBase + f.offset + i);
        }
      });
    }
  }

  const bytesPerLine = 16;
  for (let off = 0; off < state.buffer.length; off += bytesPerLine) {
    const slice = state.buffer.subarray(off, Math.min(off + bytesPerLine, state.buffer.length));
    const hex = Array.from(slice).map((b, i) => {
      return b.toString(16).padStart(2, '0').toUpperCase();
    }).join(' ');
    const ascii = Array.from(slice).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
    const isFirstHi = highlight.has(off);
    const marker = isFirstHi ? '▶' : ' ';
    lines.push(`${off.toString(16).padStart(6, '0')}  ${hex.padEnd(48, ' ')}  ${ascii}  ${marker}`);
  }
  view.textContent = lines.join('\n');
}

// ---------------- 写入 ----------------
function onStatChange(e) {
  const inp = e.target;
  const c = +inp.dataset.char;
  const fKey = inp.dataset.key;
  const fType = inp.dataset.type;
  const fOff = +inp.dataset.off;
  const tpl = state.template;
  const charBase = tpl.baseOffset + c * tpl.blockSize;
  const abs = charBase + fOff;
  let val = parseInt(inp.value, 10);
  if (isNaN(val)) val = 0;

  const field = tpl.fields.find(f => f.key === fKey);
  if (field && field.min != null) val = Math.max(field.min, val);
  if (field && field.max != null) val = Math.min(field.max, val);

  if (fType === 'uint32') setU32(state.buffer, abs, val);
  else if (fType === 'uint16') setU16(state.buffer, abs, val);
  else setU8(state.buffer, abs, val);

  inp.classList.add('dirty');
  if (field && field.max != null && val === field.max) inp.classList.add('stat-max');

  // 同步等级显示
  if (fKey === 'level') {
    const card = inp.closest('.character-card');
    card.querySelector('.lv').textContent = 'Lv ' + val;
  }

  if ($('auto-refresh').checked) renderHex();
}

// ---------------- 批量操作 ----------------
function batchMaxAll() {
  if (!state.buffer || !state.template) return toast('请先加载存档', 'error');
  const tpl = state.template;
  for (let c = 0; c < tpl.charCount; c++) {
    const charBase = tpl.baseOffset + c * tpl.blockSize;
    if (charBase + tpl.blockSize > state.buffer.length) break;
    tpl.fields.forEach(f => {
      if (f.type === 'name') return;
      const abs = charBase + f.offset;
      const max = f.max != null ? f.max : (f.type === 'uint32' ? 99999 : (f.type === 'uint16' ? 9999 : 99));
      if (f.type === 'uint32') setU32(state.buffer, abs, max);
      else if (f.type === 'uint16') setU16(state.buffer, abs, max);
      else setU8(state.buffer, abs, max);
    });
  }
  renderAll();
  toast('所有角色属性已拉满 ✨', 'success');
}

function batchMaxGil() {
  if (!state.buffer || !state.template) return toast('请先加载存档', 'error');
  const tpl = state.template;
  if (!tpl.extras) return toast('当前模板无金钱字段', 'error');
  tpl.extras.forEach(ex => {
    if (ex.key === 'gil') {
      setU32(state.buffer, ex.offset, 9999999);
    }
  });
  renderAll();
  toast('金钱已设为 9,999,999 💰', 'success');
}

function batchUnlock() {
  if (!state.buffer) return toast('请先加载存档', 'error');
  // 简单实现:在 extras 后面填充 0xFF(标记全道具/全魔法)
  if (state.template && state.template.extras) {
    const ex = state.template.extras[state.template.extras.length - 1];
    if (ex) {
      const start = ex.offset + 4;
      for (let i = start; i < state.buffer.length && i < start + 0x100; i++) {
        state.buffer[i] = 0xFF;
      }
    }
  } else {
    // 自定义模式:全文件填 0xFF
    for (let i = 0; i < state.buffer.length; i++) state.buffer[i] = 0xFF;
  }
  renderAll();
  toast('已尝试解锁所有道具/魔法(部分版本可能需要特定偏移)', 'success');
}

// ---------------- 导出 ----------------
function exportSave() {
  if (!state.buffer) return;
  const blob = new Blob([state.buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const base = state.fileName.replace(/\.[^.]+$/, '');
  const ext = state.fileName.match(/\.[^.]+$/)?.[0] || '.ffd';
  a.href = url;
  a.download = base + '.modified' + ext;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已导出: ' + a.download, 'success');
}

function exportHex() {
  if (!state.buffer) return;
  const hex = Array.from(state.buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  const blob = new Blob([hex], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.fileName || 'save') + '.hex.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已导出 Hex 文本', 'success');
}

function copyHex() {
  if (!state.buffer) return;
  const hex = Array.from(state.buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  navigator.clipboard.writeText(hex).then(() => toast('已复制到剪贴板', 'success'));
}

// ---------------- 辅助:读取字段 ----------------
function readField(fields, charBase, key, type) {
  const f = fields.find(x => x.key === key);
  if (!f) return 0;
  const off = charBase + f.offset;
  if (type === 'uint32') return u32(state.buffer, off);
  if (type === 'uint16') return u16(state.buffer, off);
  return u8(state.buffer, off);
}

// ---------------- 启动 ----------------
document.addEventListener('DOMContentLoaded', () => {
  state.template = TEMPLATES[state.templateKey];
  $('template-hint').textContent = state.template.desc;
  bindUI();
  renderAll();
});
