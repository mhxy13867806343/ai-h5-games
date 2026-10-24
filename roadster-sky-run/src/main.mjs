import { createApp, h, reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { Button } from 'vant/es/button/index.mjs';
import 'vant/lib/style/base.css';
import 'vant/lib/button/index.css';
import 'vant/lib/loading/index.css';
import './ui.css';
import { createGameRuntime } from './runtime.mjs';

const root = document.getElementById('roadster-sky-run');
if (!root) throw new Error('Roadster game container is missing.');
// Replacing a preview cleans up its own animation loop and audio resources.
root.__roadsterDispose?.();

const element = (tag, classes, children, props = {}) => h(tag, { class: classes, ...props }, children);
const button = (classes, text, props = {}) => h(Button, { class: `${classes} cursor-interaction`, type: 'default', ...props }, { default: () => text });
const keycap = text => h('kbd', text);

const app = createApp({
  setup() {
    const canvas = ref(null);
    const ui = reactive({ phase: 'ready', score: 0, cleared: 0, speed: 0, fuel: 100, height: 0, distance: 0, nextDistance: 180, stationHeight: 5, best: 0, maxHeight: 0, newBest: false, boosting: false, input: {}, muted: true, crashReason: '', renderFailed: false, overtaken: 0, nearbyTraffic: 3, threat: { phase: 'safe', charge: 0, turretId: null } });
    const message = ref('');
    const messageType = ref('');
    const error = ref('');
    const announced = ref('点击开始驾驶。四车道随机车流，约75米起飞越站；越过收费站后，注意路侧炮台锁定并左右变向。');
    let runtime;
    let messageTimer;

    onMounted(() => {
      runtime = createGameRuntime({
        root, canvas: canvas.value,
        onUpdate: snapshot => Object.assign(ui, snapshot),
        onError: text => { error.value = text; if (text) announced.value = text; },
        onNotice: (text, type) => {
          clearTimeout(messageTimer);
          message.value = text;
          messageType.value = type;
          if (text) announced.value = text;
          messageTimer = setTimeout(() => { message.value = ''; messageType.value = ''; }, type === 'clear' ? 1900 : 1700);
        },
      });
    });
    onBeforeUnmount(() => { runtime?.dispose(); clearTimeout(messageTimer); });

    function hold(control, event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
      runtime?.setInput(control, true, `pointer:${event.pointerId}`);
    }
    function release(control, event) {
      runtime?.setInput(control, false, `pointer:${event.pointerId}`);
    }
    function holdProps(control, label) {
      return {
        'aria-label': label, 'aria-pressed': !!ui.input[control], disabled: ui.phase !== 'running',
        onPointerdown: event => hold(control, event),
        onPointerup: event => release(control, event),
        onPointercancel: event => release(control, event),
        onLostpointercapture: event => release(control, event),
        onContextmenu: event => event.preventDefault(),
        onKeydown: event => {
          if (event.code === 'Enter') { event.preventDefault(); runtime?.setInput(control, true, 'button-key'); }
        },
        onKeyup: event => {
          if (event.code === 'Enter') { event.preventDefault(); runtime?.setInput(control, false, 'button-key'); }
        },
        onBlur: () => runtime?.setInput(control, false, 'button-key'),
      };
    }

    function hint() {
      if (ui.phase !== 'running') return '75 m 左右 · 按住冷气起飞';
      if (ui.threat.phase === 'incoming') return '炮弹来袭！左右变向躲开';
      if (ui.threat.phase === 'locking') return '炮台锁定中 · 准备变向';
      if (ui.fuel < 3 && ui.height > 0) return '冷气耗尽 · 松开，准备落地';
      if (ui.boosting) return ui.cleared > 0 && ui.nextDistance > 160 ? '越站成功 · 注意路侧炮台' : '保持喷气 · 越过后松开';
      if (ui.height > 0.15) return ui.nextDistance <= 110 ? '继续喷气 · 整车越过棚顶' : '松开落地 · 自动补充冷气';
      if (ui.nextDistance <= 95 && ui.nextDistance >= 45) return '就是现在！按住冷气起飞';
      if (ui.nextDistance < 45) return '快按冷气，拉升高度！';
      if (ui.fuel < 97) return '冷气补充中 · 保持前进';
      return ui.nearbyTraffic > 0 ? '留意前方车辆 · 转向避让' : '接近收费站 · 准备起飞';
    }

    const guide = () => element('div', 'rs-key-guide', [
      element('span', '', [keycap('A / D'), '转向']),
      element('span', '', [keycap('Space'), '按住喷气']),
      element('span', '', [keycap('P'), '暂停']),
    ]);

    function overlay() {
      if (error.value) return element('div', 'rs-overlay is-error', [
        element('div', 'rs-dialog', [
          element('div', 'rs-eyebrow', 'ROADSTER'), h('h2', '画面暂不可用'),
          h('p', error.value),
          button('rs-start-button', '重新加载画面', { type: 'primary', onClick: () => runtime?.retryScene() }),
        ], { role: 'alert' }),
      ]);
      if (ui.phase === 'running') return null;
      if (ui.phase === 'ready') return element('div', 'rs-overlay is-ready', [
        element('div', 'rs-dialog', [
          element('div', 'rs-eyebrow', 'ROADSTER · FOUR LANES'),
          h('h1', '飞跃收费站'),
          element('p', 'rs-description', ['每局随机车流，穿越四车道高速。', h('br'), '飞越收费站后，小心路侧大炮追击。']),
          element('div', 'rs-mode-labels', [h('span', '四车道'), h('span', '随机车流'), h('span', '过站追击')]),
          button('rs-start-button', '开始驾驶  →', { type: 'primary', onClick: () => runtime?.start(), 'data-action': 'start' }),
          guide(),
          element('div', 'rs-timing', ['约 ', h('b', '75 m'), ' 起跳 · 看到锁定就准备变向']),
        ], { role: 'dialog', 'aria-label': '开始驾驶' }),
      ]);
      if (ui.phase === 'paused') return element('div', 'rs-overlay is-paused', [
        element('div', 'rs-dialog', [
          element('div', 'rs-eyebrow', 'TAKE A BREATH'), h('h2', '稍作停靠'),
          h('p', '旅程已暂停，准备好后继续出发。'),
          button('rs-start-button', '继续驾驶  →', { type: 'primary', onClick: () => runtime?.resume(), 'data-action': 'resume' }),
          button('rs-secondary', '重新出发', { onClick: () => runtime?.start(), 'data-action': 'restart-paused' }),
          guide(),
        ], { role: 'dialog', 'aria-label': '游戏暂停' }),
      ]);
      return element('div', 'rs-overlay is-over', [
        element('div', 'rs-dialog', [
          element('div', 'rs-eyebrow', 'RUN COMPLETE'), h('h2', '下一次，飞得更远'),
          element('div', 'rs-over-score', ui.score.toLocaleString('zh-CN')),
          ui.newBest ? element('div', 'rs-record', '✦ 刷新个人最高分') : null,
          element('div', 'rs-over-stats', [
            element('span', '', ['飞越', h('b', `${ui.cleared} 座`)]),
            element('span', '', ['超车', h('b', `${ui.overtaken} 辆`)]),
            element('span', '', ['里程', h('b', `${Math.floor(ui.distance)} m`)]),
            element('span', '', ['高度', h('b', `${ui.maxHeight.toFixed(1)} m`)]),
          ]),
          h('p', ui.crashReason),
          button('rs-start-button', '再跑一次  ↗', { type: 'primary', onClick: () => runtime?.start(), 'data-action': 'restart' }),
          element('div', 'rs-key-guide', [element('span', '', [keycap('R'), '快速重开'])]),
        ], { role: 'dialog', 'aria-label': '本次驾驶结果', 'aria-live': 'polite' }),
      ]);
    }

    function meter(label, value, fraction, className, unit) {
      return element('div', `rs-meter ${className}`, [
        element('div', 'rs-meter-track', [element('div', 'rs-meter-fill', null, { style: { height: `${Math.max(0, Math.min(100, fraction * 100))}%` } })], { role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': unit === '%' ? 100 : 18, 'aria-valuenow': Number(value) }),
        element('div', 'rs-meter-label', [label, h('b', `${value}${unit}`)]),
      ]);
    }

    return () => [
      element('header', 'rs-appbar', [
        element('div', 'rs-brand', [element('span', 'rs-wordmark', 'ROADSTER'), element('span', 'rs-brand-title', '飞跃收费站')]),
        element('span', 'rs-build', '4 LANES · 每局随机'),
      ]),
      element('div', 'rs-game', [
        h('canvas', { ref: canvas, class: 'rs-canvas', 'aria-label': '银色跑车穿行四车道随机车流，飞越有收费员的收费站，躲避站后路侧炮台发射的炮弹', role: 'img' }, '3D 驾驶画面需要支持 WebGL 的浏览器。'),
        element('div', 'rs-hud', [
          element('div', 'rs-hud-top', [
            element('div', 'rs-scoreboard', [
              element('span', 'rs-score', ui.score.toLocaleString('zh-CN'), { 'aria-label': `得分 ${ui.score}` }),
              element('div', 'rs-score-meta', [element('span', '', ['飞越 ', h('b', String(ui.cleared)), ' 座']), element('span', '', ['最高 ', h('b', ui.best.toLocaleString('zh-CN'))])]),
            ]),
            element('div', 'rs-top-right', [
              element('div', 'rs-tools', [
                button('rs-tool', ui.muted ? '♪' : '♫', { onClick: () => runtime?.toggleSound(), 'aria-label': ui.muted ? '开启声音' : '关闭声音', 'aria-pressed': !ui.muted, 'data-action': 'sound' }),
                button('rs-tool', ui.phase === 'paused' ? '▷' : 'Ⅱ', { onClick: () => ui.phase === 'paused' ? runtime?.resume() : runtime?.pause(), 'aria-label': ui.phase === 'paused' ? '继续游戏' : '暂停游戏', disabled: !['running', 'paused'].includes(ui.phase), 'data-action': 'pause' }),
              ]),
              element('div', 'rs-speedometer', [h('strong', String(ui.speed)), h('span', 'km/h')], { 'aria-label': `车速 ${ui.speed} 公里每小时` }),
            ]),
          ]),
          element('div', `rs-threat ${ui.threat.phase}`, [
            element('div', 'rs-threat-title', [element('span', 'rs-threat-dot', null, { 'aria-hidden': 'true' }), h('strong', ui.threat.phase === 'locking' ? '炮台正在锁定' : ui.threat.phase === 'incoming' ? '炮弹来袭！' : ui.height > 2.8 ? '空中飞行 · 留意炮台' : '地面行驶 · 注意前车')]),
            element('div', 'rs-threat-detail', ui.threat.phase === 'locking' ? '瞄准中，准备左右变向' : ui.threat.phase === 'incoming' ? '立即变向，避开弹道' : `前方 ${ui.nearbyTraffic} 辆 · 已超越 ${ui.overtaken} 辆`),
            ui.threat.phase === 'locking' ? element('div', 'rs-lock-track', [element('div', 'rs-lock-fill', null, { style: { width: `${Math.round(ui.threat.charge * 100)}%` } })], { role: 'progressbar', 'aria-label': '炮台锁定进度', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(ui.threat.charge * 100) }) : null,
          ]),
          element('div', 'rs-meters', [meter('冷气', ui.fuel, ui.fuel / 100, ui.fuel < 20 ? 'low' : '', '%'), meter('高度', ui.height.toFixed(1), ui.height / 18, 'rs-meter-height', 'm')]),
          element('div', `rs-distance ${ui.phase === 'running' && ui.nextDistance <= 95 && ui.height < 1 ? 'ignite' : ''}`, [
            element('div', 'rs-distance-main', [h('span', '下一个收费站'), h('strong', String(ui.nextDistance)), h('small', 'm')]),
            element('div', 'rs-hint', hint()),
          ]),
        ]),
        message.value && ui.phase === 'running' ? element('div', `rs-toast ${['lock', 'shot'].includes(messageType.value) ? 'rs-toast-danger' : ''}`, message.value, { key: message.value }) : null,
        messageType.value === 'crash' ? element('div', 'rs-flash', null, { 'aria-hidden': 'true' }) : null,
        element('div', `rs-driving-controls ${ui.phase !== 'running' ? 'is-inactive' : ''}`, [
          element('div', 'rs-steering', [
            button(`rs-steer ${ui.input.left ? 'is-held' : ''}`, ['‹', h('small', 'A / ←')], holdProps('left', '按住向左转向，也可按 A 或左方向键')),
            button(`rs-steer ${ui.input.right ? 'is-held' : ''}`, ['›', h('small', 'D / →')], holdProps('right', '按住向右转向，也可按 D 或右方向键')),
            button(`rs-brake ${ui.input.brake ? 'is-held' : ''}`, '减速', holdProps('brake', '按住减速，也可按 S 或下方向键')),
          ]),
          button(`rs-boost ${ui.input.boost ? 'is-held' : ''}`, [element('span', 'rs-boost-mark', '➜', { 'aria-hidden': 'true' }), element('span', 'rs-boost-copy', [h('b', ui.boosting ? '喷气中' : '按住冷气'), h('small', 'SPACE · 起飞')])], holdProps('boost', '按住冷气喷射起飞，松开下降，也可按住空格键')),
        ]),
        overlay(),
        element('span', 'rs-sr-only', announced.value, { 'aria-live': 'polite', 'aria-atomic': 'true' }),
      ]),
      element('footer', 'rs-footer', [
        element('span', '', [h('em', '地面避车，过站躲炮。'), ' 每次重开，车流重新生成。']),
        element('span', 'rs-footer-help', 'A / D 转向 · S 减速 · P 暂停 · 手机可触屏'),
      ]),
    ];
  },
});

app.mount(root.querySelector('#roadster-interface'));
root.__roadsterDispose = () => { app.unmount(); delete root.__roadsterDispose; };
