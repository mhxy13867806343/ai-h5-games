/*!
 * share.js —— 一键分享到 微博 / QQ / QQ空间 / 微信 / 腾讯微博 / 豆瓣 / 点点 / LinkedIn / Facebook / Twitter / Google+
 *
 * API 兼容 overtrue/share.js：
 *   socialShare('.social-share', config)
 *   <div class="social-share" data-disabled="google" data-description="..."></div>
 *
 * 本文件为自研实现（含内置二维码编码器），零依赖、可完全离线运行。
 * License: MIT
 */
(function (global, factory) {
  var api = factory();
  global.socialShare = api.socialShare;
  global.jiathis = api.socialShare;
  global.SocialShare = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ==================================================================
   * 一、内置二维码编码器（byte 模式 / EC-M / 版本 1~10 / 8 种掩码择优）
   * ================================================================== */
  var QR = (function () {
    var EXP = [], LOG = [];
    for (var i = 0; i < 8; i++) EXP[i] = 1 << i;
    for (i = 8; i < 256; i++) EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8];
    for (i = 0; i < 255; i++) LOG[EXP[i]] = i;

    function gexp(n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP[n]; }
    function glog(n) { if (n < 1) throw new Error('glog(' + n + ')'); return LOG[n]; }

    function Poly(num, shift) {
      var offset = 0;
      while (offset < num.length && num[offset] === 0) offset++;
      this.num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
      for (i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
    }
    Poly.prototype.get = function (i) { return this.num[i]; };
    Poly.prototype.len = function () { return this.num.length; };
    Poly.prototype.multiply = function (e) {
      var num = new Array(this.len() + e.len() - 1);
      for (var k = 0; k < num.length; k++) num[k] = 0;
      for (var i = 0; i < this.len(); i++)
        for (var j = 0; j < e.len(); j++)
          num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      return new Poly(num, 0);
    };
    Poly.prototype.mod = function (e) {
      if (this.len() - e.len() < 0) return this;
      var ratio = glog(this.get(0)) - glog(e.get(0));
      var num = this.num.slice();
      for (var i = 0; i < e.len(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
      return new Poly(num, 0).mod(e);
    };

    function generatorPoly(len) {
      var a = new Poly([1], 0);
      for (var i = 0; i < len; i++) a = a.multiply(new Poly([1, gexp(i)], 0));
      return a;
    }

    // EC level M，版本 1~10 的 RS 分块表 [块数, 总码字, 数据码字, ...]
    var RS_M = {
      1: [1, 26, 16], 2: [1, 44, 28], 3: [1, 70, 44], 4: [2, 50, 32], 5: [2, 67, 43],
      6: [4, 43, 27], 7: [4, 49, 31], 8: [2, 60, 38, 2, 61, 39],
      9: [3, 58, 36, 2, 59, 37], 10: [4, 69, 43, 1, 70, 44]
    };
    // 校正图形中心坐标
    var ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
      [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

    function rsBlocks(ver) {
      var t = RS_M[ver], list = [];
      for (var i = 0; i < t.length; i += 3)
        for (var j = 0; j < t[i]; j++) list.push({ total: t[i + 1], data: t[i + 2] });
      return list;
    }
    function dataCount(ver) {
      var n = 0, b = rsBlocks(ver);
      for (var i = 0; i < b.length; i++) n += b[i].data;
      return n;
    }
    function lenBits(ver) { return ver < 10 ? 8 : 16; }
    function capacity(ver) { return Math.floor((dataCount(ver) * 8 - 4 - lenBits(ver)) / 8); }

    function utf8(str) {
      var out = [];
      for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
        else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
          var c2 = str.charCodeAt(++i);
          var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
          out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      }
      return out;
    }

    function BitBuf() { this.buf = []; this.len = 0; }
    BitBuf.prototype.put = function (num, length) {
      for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    };
    BitBuf.prototype.putBit = function (bit) {
      var idx = Math.floor(this.len / 8);
      if (this.buf.length <= idx) this.buf.push(0);
      if (bit) this.buf[idx] |= (0x80 >>> (this.len % 8));
      this.len++;
    };

    var G15 = 0x537, G18 = 0x1f25, G15_MASK = 0x5412;
    function bchDigit(d) { var n = 0; while (d !== 0) { n++; d >>>= 1; } return n; }
    function bchTypeInfo(d) {
      var v = d << 10;
      while (bchDigit(v) - bchDigit(G15) >= 0) v ^= (G15 << (bchDigit(v) - bchDigit(G15)));
      return ((d << 10) | v) ^ G15_MASK;
    }
    function bchTypeNumber(d) {
      var v = d << 12;
      while (bchDigit(v) - bchDigit(G18) >= 0) v ^= (G18 << (bchDigit(v) - bchDigit(G18)));
      return (d << 12) | v;
    }

    function maskFn(p, i, j) {
      switch (p) {
        case 0: return (i + j) % 2 === 0;
        case 1: return i % 2 === 0;
        case 2: return j % 3 === 0;
        case 3: return (i + j) % 3 === 0;
        case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case 5: return (i * j) % 2 + (i * j) % 3 === 0;
        case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
        default: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
      }
    }

    function createData(ver, bytes) {
      var buf = new BitBuf();
      buf.put(4, 4);
      buf.put(bytes.length, lenBits(ver));
      for (var i = 0; i < bytes.length; i++) buf.put(bytes[i], 8);
      var total = dataCount(ver) * 8;
      if (buf.len + 4 <= total) buf.put(0, 4);
      while (buf.len % 8 !== 0) buf.putBit(false);
      while (buf.buf.length < dataCount(ver)) {
        buf.buf.push(0xEC);
        if (buf.buf.length < dataCount(ver)) buf.buf.push(0x11);
      }
      return buf;
    }

    function createBytes(buf, blocks) {
      var offset = 0, maxD = 0, maxE = 0, dc = [], ec = [];
      for (var r = 0; r < blocks.length; r++) {
        var dCount = blocks[r].data, eCount = blocks[r].total - dCount;
        maxD = Math.max(maxD, dCount); maxE = Math.max(maxE, eCount);
        dc[r] = [];
        for (var i = 0; i < dCount; i++) dc[r][i] = 0xff & buf.buf[i + offset];
        offset += dCount;
        var rsPoly = generatorPoly(eCount);
        var raw = dc[r].slice();
        var pad = new Array(rsPoly.len() - 1);
        for (i = 0; i < pad.length; i++) pad[i] = 0;
        var modPoly = new Poly(raw.concat(pad), 0).mod(rsPoly);
        ec[r] = [];
        for (i = 0; i < rsPoly.len() - 1; i++) {
          var mi = i + modPoly.len() - (rsPoly.len() - 1);
          ec[r][i] = mi >= 0 ? modPoly.get(mi) : 0;
        }
      }
      var totalLen = 0;
      for (r = 0; r < blocks.length; r++) totalLen += blocks[r].total;
      var data = new Array(totalLen), idx = 0;
      for (i = 0; i < maxD; i++) for (r = 0; r < blocks.length; r++) if (i < dc[r].length) data[idx++] = dc[r][i];
      for (i = 0; i < maxE; i++) for (r = 0; r < blocks.length; r++) if (i < ec[r].length) data[idx++] = ec[r][i];
      return data;
    }

    function build(ver, data, mask, test) {
      var n = ver * 4 + 17;
      var m = new Array(n);
      for (var r = 0; r < n; r++) { m[r] = new Array(n); for (var c = 0; c < n; c++) m[r][c] = null; }

      function probe(row, col) {
        for (var r = -1; r <= 7; r++) {
          if (row + r <= -1 || n <= row + r) continue;
          for (var c = -1; c <= 7; c++) {
            if (col + c <= -1 || n <= col + c) continue;
            m[row + r][col + c] = (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
              (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
              (2 <= r && r <= 4 && 2 <= c && c <= 4);
          }
        }
      }
      probe(0, 0); probe(n - 7, 0); probe(0, n - 7);

      var pos = ALIGN[ver - 1];
      for (var i = 0; i < pos.length; i++) for (var j = 0; j < pos.length; j++) {
        var ar = pos[i], ac = pos[j];
        if (m[ar][ac] !== null) continue;
        for (var rr = -2; rr <= 2; rr++) for (var cc = -2; cc <= 2; cc++)
          m[ar + rr][ac + cc] = (rr === -2 || rr === 2 || cc === -2 || cc === 2 || (rr === 0 && cc === 0));
      }

      for (r = 8; r < n - 8; r++) if (m[r][6] === null) m[r][6] = (r % 2 === 0);
      for (c = 8; c < n - 8; c++) if (m[6][c] === null) m[6][c] = (c % 2 === 0);

      if (ver >= 7) {
        var vbits = bchTypeNumber(ver);
        for (i = 0; i < 18; i++) {
          var vm = (!test && ((vbits >> i) & 1) === 1);
          m[Math.floor(i / 3)][i % 3 + n - 8 - 3] = vm;
          m[i % 3 + n - 8 - 3][Math.floor(i / 3)] = vm;
        }
      }

      // 格式信息：EC-M 的等级位为 0b00
      var bits = bchTypeInfo((0 << 3) | mask);
      for (i = 0; i < 15; i++) {
        var fm = (!test && ((bits >> i) & 1) === 1);
        if (i < 6) m[i][8] = fm; else if (i < 8) m[i + 1][8] = fm; else m[n - 15 + i][8] = fm;
      }
      for (i = 0; i < 15; i++) {
        var fm2 = (!test && ((bits >> i) & 1) === 1);
        if (i < 8) m[8][n - i - 1] = fm2; else if (i < 9) m[8][15 - i - 1 + 1] = fm2; else m[8][15 - i - 1] = fm2;
      }
      m[n - 8][8] = !test;

      // 数据填充（之字形）
      var inc = -1, row = n - 1, bitIndex = 7, byteIndex = 0;
      for (var col = n - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (var k = 0; k < 2; k++) {
            if (m[row][col - k] === null) {
              var dark = false;
              if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              if (maskFn(mask, row, col - k)) dark = !dark;
              m[row][col - k] = dark;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || n <= row) { row -= inc; inc = -inc; break; }
        }
      }
      return m;
    }

    function lostPoint(m) {
      var n = m.length, lost = 0, r, c, i, j;
      for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
        var same = 0, dark = m[r][c];
        for (i = -1; i <= 1; i++) {
          if (r + i < 0 || n <= r + i) continue;
          for (j = -1; j <= 1; j++) {
            if (c + j < 0 || n <= c + j) continue;
            if (i === 0 && j === 0) continue;
            if (dark === m[r + i][c + j]) same++;
          }
        }
        if (same > 5) lost += (3 + same - 5);
      }
      for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {
        var cnt = 0;
        if (m[r][c]) cnt++; if (m[r + 1][c]) cnt++; if (m[r][c + 1]) cnt++; if (m[r + 1][c + 1]) cnt++;
        if (cnt === 0 || cnt === 4) lost += 3;
      }
      for (r = 0; r < n; r++) for (c = 0; c < n - 6; c++)
        if (m[r][c] && !m[r][c + 1] && m[r][c + 2] && m[r][c + 3] && m[r][c + 4] && !m[r][c + 5] && m[r][c + 6]) lost += 40;
      for (c = 0; c < n; c++) for (r = 0; r < n - 6; r++)
        if (m[r][c] && !m[r + 1][c] && m[r + 2][c] && m[r + 3][c] && m[r + 4][c] && !m[r + 5][c] && m[r + 6][c]) lost += 40;
      var darkCount = 0;
      for (c = 0; c < n; c++) for (r = 0; r < n; r++) if (m[r][c]) darkCount++;
      lost += Math.abs(100 * darkCount / n / n - 50) / 5 * 10;
      return lost;
    }

    /** 生成二维码矩阵：返回 { size, modules, version, mask } */
    function encode(text) {
      var bytes = utf8(String(text)), ver = 0;
      for (var v = 1; v <= 10; v++) { if (bytes.length <= capacity(v)) { ver = v; break; } }
      if (!ver) throw new Error('内容过长，无法生成二维码');
      var codewords = createBytes(createData(ver, bytes), rsBlocks(ver));
      var best = null, bestScore = Infinity, bestMask = 0;
      for (var mk = 0; mk < 8; mk++) {
        var mm = build(ver, codewords, mk, false);
        var sc = lostPoint(mm);
        if (sc < bestScore) { bestScore = sc; best = mm; bestMask = mk; }
      }
      return { size: best.length, modules: best, version: ver, mask: bestMask, codewords: codewords };
    }

    /** 绘制到 canvas */
    function draw(canvas, text, size, opts) {
      opts = opts || {};
      var qr = encode(text);
      var quiet = opts.quiet == null ? 4 : opts.quiet;
      var total = qr.size + quiet * 2;
      var scale = Math.max(1, Math.floor(size / total));
      var px = scale * total;
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      canvas.width = px * dpr; canvas.height = px * dpr;
      canvas.style.width = px + 'px'; canvas.style.height = px + 'px';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = opts.light || '#ffffff';
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = opts.dark || '#000000';
      for (var r = 0; r < qr.size; r++) for (var c = 0; c < qr.size; c++)
        if (qr.modules[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
      return qr;
    }

    return { encode: encode, draw: draw, capacity: capacity, _maskFn: maskFn };
  })();

  /* ==================================================================
   * 二、分享站点定义
   * ================================================================== */
  var TEMPLATES = {
    qzone: 'https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url={{URL}}&title={{TITLE}}&desc={{DESCRIPTION}}&summary={{SUMMARY}}&site={{SOURCE}}',
    qq: 'https://connect.qq.com/widget/shareqq/index.html?url={{URL}}&title={{TITLE}}&source={{SOURCE}}&desc={{DESCRIPTION}}&pics={{IMAGE}}&summary={{SUMMARY}}',
    tencent: 'https://share.v.t.qq.com/index.php?c=share&a=index&title={{TITLE}}&url={{URL}}&pic={{IMAGE}}',
    weibo: 'https://service.weibo.com/share/share.php?url={{URL}}&title={{TITLE}}&pic={{IMAGE}}&appkey={{WEIBOKEY}}',
    wechat: 'javascript:;',
    douban: 'https://www.douban.com/share/service?href={{URL}}&name={{TITLE}}&text={{DESCRIPTION}}&image={{IMAGE}}&starid=0&aid=0&style=11',
    diandian: 'http://www.diandian.com/share?lo={{URL}}&ti={{TITLE}}&type=link',
    linkedin: 'https://www.linkedin.com/shareArticle?mini=true&ro=true&title={{TITLE}}&url={{URL}}&summary={{SUMMARY}}&source={{SOURCE}}&armin=armin',
    facebook: 'https://www.facebook.com/sharer/sharer.php?u={{URL}}',
    twitter: 'https://twitter.com/intent/tweet?text={{TITLE}}&url={{URL}}&via={{ORIGIN}}',
    google: 'https://plus.google.com/share?url={{URL}}',
    copy: 'javascript:;'
  };

  var SITES = {
    weibo: { label: '微博', glyph: '微', color: '#e6162d' },
    qq: { label: 'QQ 好友', glyph: 'Q', color: '#56b6e7' },
    qzone: { label: 'QQ 空间', glyph: '★', color: '#fdbe3d' },
    wechat: { label: '微信', glyph: '信', color: '#7bc549' },
    tencent: { label: '腾讯微博', glyph: '腾', color: '#4676a8' },
    douban: { label: '豆瓣', glyph: '豆', color: '#33b045' },
    diandian: { label: '点点', glyph: '点', color: '#307dca' },
    linkedin: { label: 'LinkedIn', glyph: 'in', color: '#0077b5' },
    facebook: { label: 'Facebook', glyph: 'f', color: '#44619d' },
    twitter: { label: 'Twitter / X', glyph: '✗', color: '#1d9bf0' },
    google: { label: 'Google+', glyph: 'G', color: '#db4437' },
    copy: { label: '复制链接', glyph: '⧉', color: '#6b7280' }
  };

  var ALL_SITES = ['weibo', 'qq', 'qzone', 'wechat', 'tencent', 'douban', 'diandian', 'linkedin', 'facebook', 'twitter', 'google', 'copy'];

  var DEFAULTS = {
    url: '', source: '', title: '', description: '', image: '', summary: '', weiboKey: '', origin: '',
    sites: ALL_SITES.slice(),
    mobileSites: [],
    disabled: [],
    initialized: false,
    mode: 'append',
    wechatQrcodeTitle: '微信扫一扫：分享',
    wechatQrcodeHelper: '<p>微信里点“发现”，扫一下</p><p>二维码便可将本文分享至朋友圈。</p>',
    wechatQrcodeSize: 132
  };

  /* ==================================================================
   * 三、工具函数
   * ================================================================== */
  function hasDoc() { return typeof document !== 'undefined' && !!document; }

  function meta(name) {
    if (!hasDoc()) return '';
    var el = document.querySelector('meta[name="' + name + '"]') ||
      document.querySelector('meta[property="og:' + name + '"]');
    return el ? (el.getAttribute('content') || '') : '';
  }

  function firstImage() {
    if (!hasDoc()) return '';
    var og = document.querySelector('meta[property="og:image"]');
    if (og && og.getAttribute('content')) return og.getAttribute('content');
    var img = document.querySelector('img');
    return img ? (img.src || '') : '';
  }

  function toList(v) {
    if (v == null || v === '') return [];
    if (Object.prototype.toString.call(v) === '[object Array]') return v.slice();
    return String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function camel(str) { return str.replace(/-(\w)/g, function (_, c) { return c.toUpperCase(); }); }
  function kebab(str) { return str.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }

  function isMobile() {
    if (typeof navigator === 'undefined') return false;
    return /mobile|android|iphone|ipad|ipod|phone/i.test(navigator.userAgent || '');
  }

  /** 站点专属覆盖：data-weibo-title 优先于全局 title */
  function siteValue(data, site, field) {
    var k = site + camel('-' + field);
    var v = data[k];
    return (v == null || v === '') ? (data[field] == null ? '' : data[field]) : v;
  }

  function makeUrl(site, data) {
    var tpl = TEMPLATES[site];
    if (!tpl) return 'javascript:;';
    return tpl.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      var field = key.toLowerCase();
      var map = { weibokey: 'weiboKey' };
      field = map[field] || field;
      var v = siteValue(data, site, field);
      if (field === 'summary' && !v) v = siteValue(data, site, 'description');
      return encodeURIComponent(v == null ? '' : v);
    });
  }

  /* ==================================================================
   * 四、微信二维码弹层 & 复制
   * ================================================================== */
  function buildWechatBox(anchor, data) {
    var box = document.createElement('div');
    box.className = 'social-share-wechat-box';
    box.innerHTML =
      '<div class="ssw-title"></div>' +
      '<div class="ssw-qr"><canvas></canvas></div>' +
      '<div class="ssw-help"></div>' +
      '<span class="ssw-close" role="button" aria-label="关闭">×</span>';
    box.querySelector('.ssw-title').textContent = data.wechatQrcodeTitle || DEFAULTS.wechatQrcodeTitle;
    box.querySelector('.ssw-help').innerHTML = data.wechatQrcodeHelper || DEFAULTS.wechatQrcodeHelper;
    anchor.appendChild(box);
    var drawn = false;
    function render() {
      if (drawn) return;
      try {
        QR.draw(box.querySelector('canvas'), siteValue(data, 'wechat', 'url'),
          parseInt(data.wechatQrcodeSize, 10) || DEFAULTS.wechatQrcodeSize, { dark: '#111827', light: '#ffffff' });
        drawn = true;
      } catch (e) {
        box.querySelector('.ssw-qr').textContent = '二维码生成失败';
      }
    }
    anchor.addEventListener('mouseenter', render);
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      render();
      anchor.classList.toggle('is-open');
    });
    box.querySelector('.ssw-close').addEventListener('click', function (e) {
      e.stopPropagation(); anchor.classList.remove('is-open');
    });
    box.addEventListener('click', function (e) { e.stopPropagation(); });
    return box;
  }

  function toast(msg) {
    if (!hasDoc()) return;
    var t = document.createElement('div');
    t.className = 'social-share-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 300);
    }, 1600);
  }

  function copyText(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* ==================================================================
   * 五、主流程
   * ================================================================== */
  function readOptions(el, config) {
    var data = {};
    var k;
    for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) data[k] = DEFAULTS[k];

    // 页面级默认值
    data.url = (typeof location !== 'undefined' ? location.href : '');
    data.title = (hasDoc() && (meta('title') || document.title)) || '';
    data.description = meta('description') || '';
    data.source = meta('site') || (typeof location !== 'undefined' ? location.host : '');
    data.image = firstImage();
    data.origin = data.source;

    // JS 配置
    if (config) for (k in config) if (Object.prototype.hasOwnProperty.call(config, k)) data[k] = config[k];

    // data-* 覆盖（含站点专属 data-weibo-title 等）
    if (el && el.attributes) {
      for (var i = 0; i < el.attributes.length; i++) {
        var at = el.attributes[i];
        if (at.name.indexOf('data-') !== 0) continue;
        data[camel(at.name.slice(5))] = at.value;
      }
    }

    data.sites = toList(data.sites);
    data.disabled = toList(data.disabled);
    data.mobileSites = toList(data.mobileSites);
    if (!data.sites.length) data.sites = ALL_SITES.slice();
    if (isMobile() && data.mobileSites.length) data.sites = data.mobileSites;
    data.sites = data.sites.filter(function (s) {
      return SITES[s] && data.disabled.indexOf(s) === -1;
    });
    data.initialized = (data.initialized === true || data.initialized === 'true');
    return data;
  }

  function decorate(a, site, data) {
    var url = makeUrl(site, data);
    if (site === 'wechat') {
      a.setAttribute('href', 'javascript:;');
      a.classList.add('has-qr');
      buildWechatBox(a, data);
    } else if (site === 'copy') {
      a.setAttribute('href', 'javascript:;');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        copyText(siteValue(data, 'copy', 'url')).then(function (ok) {
          toast(ok ? '链接已复制到剪贴板' : '复制失败，请手动复制');
        });
      });
    } else {
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    if (!a.getAttribute('title')) a.setAttribute('title', '分享到 ' + SITES[site].label);
    a.setAttribute('data-share-site', site);
    return a;
  }

  function createIcon(site, data) {
    var a = document.createElement('a');
    a.className = 'social-share-icon icon-' + site;
    a.setAttribute('role', 'button');
    var g = document.createElement('span');
    g.className = 'ssi-glyph';
    g.textContent = SITES[site].glyph;
    a.appendChild(g);
    return decorate(a, site, data);
  }

  function renderOne(el, config) {
    if (!el || el.getAttribute('data-share-done') === '1') return null;
    var data = readOptions(el, config);
    el.classList.add('social-share');

    if (data.initialized) {
      // 用户自定义图标：仅补链接
      var nodes = el.querySelectorAll('a[class*="icon-"]');
      for (var i = 0; i < nodes.length; i++) {
        var cls = nodes[i].className.match(/icon-([\w-]+)/);
        if (cls && SITES[cls[1]]) decorate(nodes[i], cls[1], data);
      }
    } else {
      var frag = document.createDocumentFragment();
      for (var j = 0; j < data.sites.length; j++) frag.appendChild(createIcon(data.sites[j], data));
      if (data.mode === 'prepend' && el.firstChild) el.insertBefore(frag, el.firstChild);
      else el.appendChild(frag);
    }
    el.setAttribute('data-share-done', '1');
    return data;
  }

  function socialShare(selector, config) {
    if (!hasDoc()) return [];
    var list = [];
    if (typeof selector === 'string') list = [].slice.call(document.querySelectorAll(selector));
    else if (selector && selector.nodeType === 1) list = [selector];
    else if (selector && selector.length != null) list = [].slice.call(selector);
    var out = [];
    for (var i = 0; i < list.length; i++) out.push(renderOne(list[i], config));
    return out;
  }

  function autoInit() {
    socialShare('.social-share:not([data-share-done]), .share-component:not([data-share-done])');
  }

  if (hasDoc()) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
    else setTimeout(autoInit, 0);
    document.addEventListener('click', function () {
      var open = document.querySelectorAll('.social-share-icon.is-open');
      for (var i = 0; i < open.length; i++) open[i].classList.remove('is-open');
    });
  }

  return {
    socialShare: socialShare,
    autoInit: autoInit,
    makeUrl: makeUrl,
    readOptions: readOptions,
    QR: QR,
    SITES: SITES,
    TEMPLATES: TEMPLATES,
    ALL_SITES: ALL_SITES,
    DEFAULTS: DEFAULTS,
    _internal: { toList: toList, camel: camel, kebab: kebab, siteValue: siteValue }
  };
});
