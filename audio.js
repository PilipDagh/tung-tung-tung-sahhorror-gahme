/* =========================================================================
   AUDIO.JS - CUSTOM SOUND ENGINE (SILENT IF AUDIO FILES NOT FOUND)
   ========================================================================= */
class DualAudioEngine {
  constructor() {
    this.ctx = null;
    this.chaseTimer = null;
    this.loadedBuffers = {};
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Relative audio paths in your GitHub repository
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
      drop: 'audio/item_drop.mp3',
      bat_hit: 'audio/bat_hit.mp3',
      painting_drop: 'audio/painting_drop.mp3',
      bounce: 'audio/bounce.mp3'
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
          console.log(`[Audio Engine] Custom audio file found & loaded: ${path}`);
        }
      } catch (e) {
        // Missing audio remains completely silent as requested
      }
    }
  }

  playFile(key, targetNode) {
    this.init();
    if (this.loadedBuffers[key]) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.loadedBuffers[key];
      src.connect(targetNode || this.sfxGain);
      src.start(0);
    }
  }

  playTung() {
    this.playFile('tung', this.musicGain);
  }

  playSahurChant() {
    this.playFile('sahur', this.musicGain);
  }

  triggerTungSahurPattern() {
    this.playTung();
    setTimeout(() => this.playTung(), 240);
    setTimeout(() => this.playTung(), 480);
    setTimeout(() => this.playSahurChant(), 750);
  }

  startChase() {
    if (this.chaseTimer) return;
    this.playFile('chase', this.musicGain);
    this.triggerTungSahurPattern();
    this.chaseTimer = setInterval(() => {
      if (!this.loadedBuffers['chase']) {
        this.triggerTungSahurPattern();
      }
    }, 1400);
  }

  stopChase() {
    if (this.chaseTimer) {
      clearInterval(this.chaseTimer);
      this.chaseTimer = null;
    }
  }

  playDoor() {
    this.playFile('door', this.sfxGain);
  }

  playDrawer() {
    this.playFile('drawer', this.sfxGain);
  }

  playItemDrop(name) {
    this.playFile('drop', this.sfxGain);
  }

  playBatHit() {
    this.playFile('bat_hit', this.sfxGain);
  }

  playPaintingDrop() {
    this.playFile('painting_drop', this.sfxGain);
  }

  playBounce() {
    this.playFile('bounce', this.sfxGain);
  }

  playCreak() {
    this.playFile('creak', this.sfxGain);
  }

  playCrossbow() {
    this.playFile('crossbow', this.sfxGain);
  }

  playShotgun() {
    this.playFile('shotgun', this.sfxGain);
  }

  playJumpscare() {
    this.playFile('jumpscare', this.sfxGain);
  }
}
const audio = new DualAudioEngine();
