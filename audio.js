/* =========================================================================
   DUAL-MODE AUDIO ENGINE: TUNG TUNG SAHUR SYNTHESIS + LOCAL FILE BACKUP
   ========================================================================= */
class DualAudioEngine {
  constructor() {
    this.ctx = null;
    this.chaseTimer = null;
    this.loadedBuffers = {};
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Relative paths in your GitHub repository
    this.soundFiles = {
      chase: 'audio/sahur_chase.mp3',
      tung: 'audio/tung.mp3',
      sahur: 'audio/sahur_voice.mp3',
      jumpscare: 'audio/jumpscare.mp3',
      creak: 'audio/creak.mp3',
      door: 'audio/door_open.mp3',
      drawer: 'audio/drawer.mp3',
      crossbow: 'audio/crossbow.mp3',
      shotgun: 'audio/shotgun.mp3',
      drop: 'audio/item_drop.mp3'
    };
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 1.0;
      this.musicGain.connect(this.masterGain);

      this.preloadLocalAudio();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolumes(master, sfx, music) {
    if (this.masterGain) this.masterGain.gain.value = master;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
    if (this.musicGain) this.musicGain.gain.value = music;
  }

  async preloadLocalAudio() {
    for (const [key, path] of Object.entries(this.soundFiles)) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const arr = await res.arrayBuffer();
          this.loadedBuffers[key] = await this.ctx.decodeAudioData(arr);
          console.log(`[Audio Engine] Custom audio file found: ${path}`);
        }
      } catch (e) {
        // Procedural synthesis will handle missing files automatically
      }
    }
  }

  playFileOrSynth(key, targetNode, synthCallback) {
    this.init();
    if (this.loadedBuffers[key]) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.loadedBuffers[key];
      src.connect(targetNode || this.sfxGain);
      src.start(0);
    } else {
      synthCallback();
    }
  }

  playTung(volMultiplier = 1.0) {
    this.playFileOrSynth('tung', this.musicGain, () => {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.9 * volMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  playSahurChant(volMultiplier = 1.0) {
    this.playFileOrSynth('sahur', this.musicGain, () => {
      const now = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.5));
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.75 * volMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      src.start(now);
    });
  }

  triggerTungSahurPattern() {
    this.playTung(1.0);
    setTimeout(() => this.playTung(1.0), 220);
    setTimeout(() => this.playTung(1.0), 440);
    setTimeout(() => this.playTung(1.2), 660);
    setTimeout(() => this.playSahurChant(1.1), 850);
  }

  startChase() {
    if (this.chaseTimer) return;
    this.triggerTungSahurPattern();
    this.chaseTimer = setInterval(() => this.triggerTungSahurPattern(), 1400);
  }

  stopChase() {
    if (this.chaseTimer) {
      clearInterval(this.chaseTimer);
      this.chaseTimer = null;
    }
  }

  playDoor() {
    this.playFileOrSynth('door', this.sfxGain, () => this.playCreak(0.8));
  }

  playDrawer() {
    this.playFileOrSynth('drawer', this.sfxGain, () => {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playItemDrop(name, impactVelocity = 3.0) {
    this.playFileOrSynth('drop', this.sfxGain, () => {
      const intensity = Math.min(impactVelocity / 6, 1.2);
      if (name && (name.includes('Key') || name.includes('Hammer') || name.includes('Shotgun'))) {
        this.playTung(intensity);
      } else {
        this.playCreak(intensity);
      }
    });
  }

  playCreak(intensity = 1.0) {
    this.playFileOrSynth('creak', this.sfxGain, () => {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.linearRampToValueAtTime(145, now + 0.3);
      gain.gain.setValueAtTime(0.15 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  playCrossbow() {
    this.playFileOrSynth('crossbow', this.sfxGain, () => {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  playShotgun() {
    this.playFileOrSynth('shotgun', this.sfxGain, () => {
      this.playTung(1.5);
      this.playCreak(1.2);
    });
  }

  playJumpscare() {
    this.playFileOrSynth('jumpscare', this.sfxGain, () => {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160 + i * 110, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.9);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 1.0);
      }
    });
  }
}
const audio = new DualAudioEngine();
