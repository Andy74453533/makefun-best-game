// All sound is synthesised with WebAudio: no audio files, no network. Effects
// are short oscillator/noise gestures; the music is a slow generative pad that
// walks a chord progression while a run is in progress.

const CHORDS = [
  [220.0, 261.63, 329.63], // A minor
  [174.61, 220.0, 261.63], // F major
  [196.0, 246.94, 293.66], // G major
  [164.81, 220.0, 261.63], // E / Am colour
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let musicTimer = null;
  let chordIndex = 0;
  let muted = false;
  let pickupStreak = 0;
  let pickupStreakAt = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      ctx = new AudioContext();
    } catch (error) {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.05;
    musicGain.connect(master);
    return true;
  }

  function tone({ freq, freqEnd = null, duration, type = 'sine', gain = 0.2, delay = 0, destination = null }) {
    if (!ctx || muted) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(destination || master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function noise({ duration, gain = 0.2, filterFreq = 1200, delay = 0 }) {
    if (!ctx || muted) return;
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    source.start(start);
  }

  function playChord() {
    if (!ctx || muted) return;
    const chord = CHORDS[chordIndex % CHORDS.length];
    chordIndex += 1;
    for (const freq of chord) {
      tone({ freq, duration: 3.4, type: 'triangle', gain: 0.5, destination: musicGain });
      tone({ freq: freq / 2, duration: 3.4, type: 'sine', gain: 0.35, destination: musicGain });
    }
  }

  const sfx = {
    shoot() {
      tone({ freq: 880, freqEnd: 520, duration: 0.07, type: 'triangle', gain: 0.08 });
    },
    hit() {
      tone({ freq: 240, freqEnd: 140, duration: 0.06, type: 'square', gain: 0.06 });
    },
    kill() {
      tone({ freq: 420, freqEnd: 90, duration: 0.16, type: 'sawtooth', gain: 0.1 });
      noise({ duration: 0.12, gain: 0.08, filterFreq: 900 });
    },
    pickup(now) {
      if (now - pickupStreakAt > 0.9) pickupStreak = 0;
      pickupStreakAt = now;
      pickupStreak = Math.min(pickupStreak + 1, 12);
      const base = 660 * Math.pow(2, pickupStreak / 24);
      tone({ freq: base, duration: 0.09, type: 'sine', gain: 0.12 });
      tone({ freq: base * 1.5, duration: 0.12, type: 'sine', gain: 0.07, delay: 0.04 });
    },
    levelup() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone({ freq, duration: 0.22, type: 'triangle', gain: 0.14, delay: i * 0.07 });
      });
    },
    dash() {
      noise({ duration: 0.16, gain: 0.1, filterFreq: 2400 });
    },
    nova() {
      tone({ freq: 160, freqEnd: 40, duration: 0.4, type: 'sine', gain: 0.3 });
      noise({ duration: 0.3, gain: 0.14, filterFreq: 1600 });
    },
    hurt() {
      tone({ freq: 130, freqEnd: 60, duration: 0.22, type: 'sawtooth', gain: 0.2 });
    },
    spit() {
      tone({ freq: 340, freqEnd: 700, duration: 0.12, type: 'square', gain: 0.05 });
    },
    boss() {
      tone({ freq: 98, freqEnd: 55, duration: 0.9, type: 'sawtooth', gain: 0.22 });
      tone({ freq: 147, freqEnd: 82, duration: 0.9, type: 'square', gain: 0.1, delay: 0.1 });
    },
    click() {
      tone({ freq: 700, duration: 0.05, type: 'sine', gain: 0.1 });
    },
    wave() {
      tone({ freq: 392, duration: 0.18, type: 'triangle', gain: 0.12 });
      tone({ freq: 523.25, duration: 0.26, type: 'triangle', gain: 0.12, delay: 0.12 });
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
        tone({ freq, duration: 0.3, type: 'triangle', gain: 0.15, delay: i * 0.11 });
      });
    },
    gameover() {
      [330, 262, 196, 131].forEach((freq, i) => {
        tone({ freq, duration: 0.42, type: 'sine', gain: 0.14, delay: i * 0.22 });
      });
    },
  };

  return {
    ensure,
    play(name, arg) {
      if (!ctx || muted) return;
      const fn = sfx[name];
      if (fn) fn(arg);
    },
    startMusic() {
      if (!ensure() || musicTimer !== null) return;
      playChord();
      musicTimer = window.setInterval(playChord, 3200);
    },
    stopMusic() {
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    setMuted(value) {
      muted = value;
      if (master && ctx) master.gain.value = muted ? 0 : 0.9;
    },
    toggleMuted() {
      this.setMuted(!muted);
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
