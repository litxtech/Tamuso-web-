let spinAudio: HTMLAudioElement | null = null;
let lightningAudio: HTMLAudioElement | null = null;
let enabled = false;

export const audioManager = {
  init() {
    if (!spinAudio) {
      // Use the synchronized spin file
      spinAudio = new Audio('/audio/wheel-spin-synced.mp3');
      lightningAudio = new Audio('/audio/high-win-lightning.mp3');
      
      // The synced audio must NOT loop. It should play exactly once per spin.
      spinAudio.loop = false;

      // Preload
      spinAudio.load();
      lightningAudio.load();
    }
  },

  getEnabled() {
    return enabled;
  },

  setEnabled(val: boolean) {
    enabled = val;
    if (val) {
      this.init();
      // Brief silent play to unlock audio context on mobile
      spinAudio?.play().then(() => {
        spinAudio?.pause();
        if (spinAudio) spinAudio.currentTime = 0;
      }).catch(() => {});
    } else {
      this.stopSpin();
    }
  },

  playSpin() {
    if (enabled && spinAudio) {
      spinAudio.currentTime = 0;
      spinAudio.play().catch(() => {});
    }
  },

  stopSpin() {
    if (spinAudio) {
      spinAudio.pause();
      spinAudio.currentTime = 0; // Ensure it resets perfectly
    }
  },

  playLightning() {
    if (enabled && lightningAudio) {
      lightningAudio.currentTime = 0;
      lightningAudio.play().catch(() => {});
    }
  }
};
