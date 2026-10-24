/**
 * Quiet, locally synthesized Roadster audio. No files, requests or autoplay.
 * Call setMuted(false) and unlock() from the sound button's user gesture.
 * update()/event() never create or resume an AudioContext.
 */
export function createGameAudio() {
  let context = null;
  let graph = null;
  let muted = true;
  let disposed = false;
  let phase = 'ready';
  let lastState = { phase: 'ready', speed: 25, boosting: false };
  let crashWindowUntil = -1;
  let crashPlayed = false;
  const voices = new Set();

  function ease(parameter, value, duration = 0.035) {
    parameter.setTargetAtTime(value, context.currentTime, duration);
  }

  function noiseBuffer() {
    const length = Math.max(1, Math.floor(context.sampleRate * 1.5));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      // Smooth the random samples before filtering to avoid a sharp hiss.
      previous = (previous + (Math.random() * 2 - 1) * 0.08) / 1.08;
      channel[index] = previous * 3;
    }
    return buffer;
  }

  function makeGraph() {
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    const engine = context.createOscillator();
    engine.type = 'triangle';
    engine.frequency.value = 42;
    const engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 190;
    engineFilter.Q.value = 0.45;
    const engineGain = context.createGain();
    engineGain.gain.value = 0;
    engine.connect(engineFilter).connect(engineGain).connect(master);

    const buffer = noiseBuffer();
    const wind = context.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 720;
    windFilter.Q.value = 0.4;
    const windGain = context.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter).connect(windGain).connect(master);
    engine.start();
    wind.start();
    return {
      master, engine, engineFilter, engineGain, wind, windFilter, windGain, buffer,
      nodes: [engine, engineFilter, engineGain, wind, windFilter, windGain, master],
    };
  }

  function dropVoice(voice) {
    voices.delete(voice);
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* Already disconnected. */ }
    }
  }

  function stopVoices(keepCrash = false) {
    if (!context) return;
    for (const voice of voices) {
      if (keepCrash && voice.kind === 'crash') continue;
      try {
        voice.gain.gain.cancelScheduledValues(context.currentTime);
        voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.008);
        voice.source.stop(context.currentTime + 0.035);
      } catch {
        dropVoice(voice);
      }
    }
  }

  function syncLevels() {
    if (!context || !graph || disposed) return;
    const audible = !muted && phase === 'running' && context.state === 'running';
    const speed = Math.max(0, Math.min(60, Number(lastState.speed) || 0));
    const boosting = audible && Boolean(lastState.boosting);
    ease(graph.master.gain, muted ? 0 : 0.58, 0.012);
    ease(graph.engineGain.gain, audible ? 0.020 + speed * 0.00018 : 0, audible ? 0.06 : 0.008);
    ease(graph.engine.frequency, 30 + speed * 0.82, 0.08);
    ease(graph.engineFilter.frequency, 150 + speed * 2, 0.08);
    ease(graph.windGain.gain, boosting ? 0.020 : 0, boosting ? 0.04 : 0.012);
    ease(graph.windFilter.frequency, boosting ? 1050 : 560, 0.06);
  }

  async function unlock() {
    if (disposed) return false;
    try {
      if (!context) {
        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (typeof AudioContextClass !== 'function') return false;
        context = new AudioContextClass({ latencyHint: 'interactive' });
        try {
          graph = makeGraph();
        } catch {
          const failedContext = context;
          context = null;
          graph = null;
          try { await failedContext.close(); } catch { /* Unsupported implementation. */ }
          return false;
        }
      }
      // This is intentionally the only call site that can resume audio.
      if (context.state === 'suspended') await context.resume();
      if (disposed || !context || context.state !== 'running') return false;
      syncLevels();
      return true;
    } catch {
      // Unsupported WebAudio, browser policy or a rejected resume is non-fatal.
      return false;
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (!context || disposed) return;
    try {
      if (muted) stopVoices();
      syncLevels();
    } catch { /* Keep the game usable if audio fails. */ }
  }

  function update(state, _dt) {
    if (disposed || !state) return;
    lastState = { phase: state.phase, speed: state.speed, boosting: state.boosting };
    const previousPhase = phase;
    phase = state.phase;
    if (phase === 'running' && previousPhase !== 'running') crashPlayed = false;
    if (!context || !graph) return;
    try {
      if (previousPhase === 'running' && phase === 'over') {
        crashWindowUntil = context.currentTime + 0.18;
      }
      if (phase === 'ready' || phase === 'paused') {
        crashWindowUntil = -1;
      }
      if (phase !== 'running' && phase !== previousPhase) {
        // A collision may have been dispatched just before update(over).
        stopVoices(phase === 'over');
      }
      syncLevels();
    } catch { /* Keep a lost/suspended audio device from breaking the game loop. */ }
  }

  function tone(frequency, offset) {
    const now = context.currentTime + offset;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.032, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    oscillator.connect(gain).connect(graph.master);
    const voice = { source: oscillator, gain, kind: 'clear', nodes: [oscillator, gain] };
    voices.add(voice);
    oscillator.onended = () => dropVoice(voice);
    oscillator.start(now);
    oscillator.stop(now + 0.145);
  }

  function crash() {
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = graph.buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 0.4;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    source.connect(filter).connect(gain).connect(graph.master);
    const voice = { source, gain, kind: 'crash', nodes: [source, filter, gain] };
    voices.add(voice);
    source.onended = () => dropVoice(voice);
    source.start(now);
    source.stop(now + 0.12);
  }

  function event(type) {
    if (disposed || muted || !context || !graph || context.state !== 'running') return;
    try {
      if (type === 'clear' && phase === 'running') {
        tone(329.63, 0);
        tone(440, 0.085);
      } else if (type === 'lock' && phase === 'running') {
        tone(622.25, 0);
        tone(622.25, 0.17);
      } else if (type === 'shot' && phase === 'running') {
        tone(110, 0);
      } else if (type === 'dodge' && phase === 'running') {
        tone(523.25, 0);
      } else if (type === 'crash' && !crashPlayed && (
        phase === 'running' || (phase === 'over' && context.currentTime <= crashWindowUntil)
      )) {
        crashPlayed = true;
        crash();
      }
    } catch { /* One failed effect must not affect play. */ }
  }

  function dispose() {
    if (disposed) return Promise.resolve();
    disposed = true;
    muted = true;
    const oldContext = context;
    if (graph && oldContext) {
      try { graph.master.gain.value = 0; } catch { /* Closed context. */ }
      for (const source of [graph.engine, graph.wind]) {
        try { source.stop(); } catch { /* Already stopped. */ }
      }
      for (const voice of voices) {
        try { voice.source.stop(); } catch { /* Already stopped. */ }
        dropVoice(voice);
      }
      for (const node of graph.nodes) {
        try { node.disconnect(); } catch { /* Already disconnected. */ }
      }
    }
    graph = null;
    context = null;
    try {
      return Promise.resolve(oldContext?.close()).catch(() => {});
    } catch {
      return Promise.resolve();
    }
  }

  return { unlock, setMuted, update, event, dispose };
}
