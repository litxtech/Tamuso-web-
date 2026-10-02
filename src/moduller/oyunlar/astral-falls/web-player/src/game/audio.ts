type Sound = 'drop' | 'match' | 'win' | 'bonus';
let context: AudioContext | null = null;

function tone(frequency: number, duration: number, delay: number, volume: number, type: OscillatorType) {
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Original, programmatic sound cues; no third-party game audio is used. */
export function playSound(sound: Sound, muted: boolean) {
  if (muted || typeof window === 'undefined') return;
  try {
    context ??= new AudioContext();
    void context.resume();
    if (sound === 'drop') {
      tone(260, 0.12, 0, 0.075, 'triangle');
      tone(190, 0.10, 0.045, 0.055, 'sine');
    } else if (sound === 'match') {
      [440, 554, 659].forEach((note, i) => tone(note, 0.19, i * 0.075, 0.07, 'sine'));
    } else if (sound === 'win') {
      [392, 494, 587, 784].forEach((note, i) => tone(note, 0.34, i * 0.1, 0.09, 'triangle'));
    } else {
      [330, 440, 554, 659, 880].forEach((note, i) => tone(note, 0.48, i * 0.12, 0.075, 'sine'));
    }
  } catch {
    // Browser audio permissions can deny playback; game controls remain usable.
  }
}