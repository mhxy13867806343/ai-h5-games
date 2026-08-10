// Metal Slug 2 - Input System
var MS2 = window.MS2 || {};

MS2.Input = class {
    constructor() {
        this.keys = {};
        this.prev = {};
    }
    init() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyJ','KeyK','KeyL','KeyZ','KeyX','KeyC'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    }
    update() {
        this.prev = Object.assign({}, this.keys);
    }
    down(action) {
        const m = {
            UP: ['ArrowUp','KeyW'], DOWN: ['ArrowDown','KeyS'],
            LEFT: ['ArrowLeft','KeyA'], RIGHT: ['ArrowRight','KeyD'],
            SHOOT: ['KeyJ','KeyZ'], JUMP: ['KeyK','KeyX'],
            GRENADE: ['KeyL','KeyC'], START: ['Enter'], COIN: ['Digit5']
        };
        return (m[action]||[]).some(k => this.keys[k]);
    }
    pressed(action) {
        const m = {
            UP: ['ArrowUp','KeyW'], DOWN: ['ArrowDown','KeyS'],
            LEFT: ['ArrowLeft','KeyA'], RIGHT: ['ArrowRight','KeyD'],
            SHOOT: ['KeyJ','KeyZ'], JUMP: ['KeyK','KeyX'],
            GRENADE: ['KeyL','KeyC'], START: ['Enter'], COIN: ['Digit5']
        };
        return (m[action]||[]).some(k => this.keys[k] && !this.prev[k]);
    }
};
window.MS2 = MS2;
