/**
 * PM QUEST - 8-Bit Retro Sound Effects Engine
 * Pure Web Audio API synthesis (Zero external assets required).
 */
const soundFx = (function() {
  let audioCtx = null;
  let muted = false;

  function initCtx() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration, type = 'square', startGain = 0.15, endGain = 0.001) {
    if (muted) return;
    initCtx();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(startGain, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endGain, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  return {
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      playTone(600, 0.06, 'square', 0.1, 0.01);
    },
    tick() {
      playTone(880, 0.04, 'sine', 0.08, 0.001);
    },
    timerAlert() {
      playTone(440, 0.08, 'sawtooth', 0.12, 0.01);
      setTimeout(() => playTone(330, 0.08, 'sawtooth', 0.12, 0.01), 90);
    },
    correct() {
      initCtx();
      if (!audioCtx || muted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.12, 'square', 0.15, 0.01), i * 90);
      });
    },
    wrong() {
      initCtx();
      if (!audioCtx || muted) return;
      playTone(220, 0.15, 'sawtooth', 0.18, 0.01);
      setTimeout(() => playTone(164.81, 0.35, 'sawtooth', 0.18, 0.01), 120);
    },
    unlock() {
      initCtx();
      if (!audioCtx || muted) return;
      const notes = [392.00, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.14, 'triangle', 0.2, 0.01), i * 80);
      });
    },
    questStart() {
      initCtx();
      if (!audioCtx || muted) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.12, 'square', 0.15, 0.01), i * 70);
      });
    },
    fanfare() {
      initCtx();
      if (!audioCtx || muted) return;
      const notes = [
        { f: 523.25, d: 0.15, wait: 0 },
        { f: 523.25, d: 0.15, wait: 160 },
        { f: 523.25, d: 0.15, wait: 320 },
        { f: 659.25, d: 0.35, wait: 480 },
        { f: 587.33, d: 0.2, wait: 850 },
        { f: 659.25, d: 0.2, wait: 1050 },
        { f: 783.99, d: 0.6, wait: 1250 }
      ];
      notes.forEach(n => {
        setTimeout(() => playTone(n.f, n.d, 'triangle', 0.22, 0.01), n.wait);
      });
    }
  };
})();

window.soundFx = soundFx;
