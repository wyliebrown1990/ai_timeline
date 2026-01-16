/**
 * Sound Service (Sprint Feed-6)
 *
 * Provides audio feedback for feed actions using Web Audio API.
 * Sounds are generated programmatically - no external files needed.
 * Default: Disabled (opt-in via settings)
 */

const STORAGE_KEY = 'ai_timeline_sounds_enabled';

// Audio context (created lazily on first use)
let audioContext: AudioContext | null = null;

/**
 * Get or create AudioContext (lazy initialization)
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return null;
    }
  }

  // Resume if suspended (browsers require user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

/**
 * Play a simple tone
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.1
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Envelope for smooth sound
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

/**
 * Play a chord (multiple tones)
 */
function playChord(
  frequencies: number[],
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.05
): void {
  frequencies.forEach((freq) => {
    playTone(freq, duration, type, volume);
  });
}

/**
 * Sound Service singleton
 */
export const soundService = {
  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch (e) {
      console.warn('Failed to save sound preference:', e);
    }
  },

  /**
   * Check if Web Audio API is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      (!!window.AudioContext || !!(window as any).webkitAudioContext);
  },

  /**
   * Play swipe sound - subtle whoosh
   */
  swipe(): void {
    if (!this.isEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Create noise for whoosh effect
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // White noise with decay
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3;
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(8000, ctx.currentTime + 0.08);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);

    source.start();
  },

  /**
   * Play vote sound - quick click
   */
  vote(): void {
    if (!this.isEnabled()) return;
    playTone(800, 0.05, 'square', 0.05);
  },

  /**
   * Play save sound - pleasant ding
   */
  save(): void {
    if (!this.isEnabled()) return;
    playChord([523, 659, 784], 0.15, 'sine', 0.04); // C5, E5, G5 chord
  },

  /**
   * Play achievement sound - triumphant fanfare
   */
  achievement(): void {
    if (!this.isEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Play ascending notes
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.2, 'sine', 0.08);
      }, i * 100);
    });
  },

  /**
   * Play error sound - low buzz
   */
  error(): void {
    if (!this.isEnabled()) return;
    playTone(150, 0.15, 'sawtooth', 0.05);
  },

  /**
   * Play notification sound - gentle ping
   */
  notification(): void {
    if (!this.isEnabled()) return;
    playTone(880, 0.1, 'sine', 0.06);
  },

  /**
   * Play streak milestone sound - celebratory
   */
  streakMilestone(): void {
    if (!this.isEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Ascending arpeggio
    const notes = [392, 494, 587, 784, 988]; // G4, B4, D5, G5, B5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.25, 'sine', 0.06);
      }, i * 80);
    });
  },

  /**
   * Initialize audio context (call on user interaction)
   * Browsers require user interaction before playing audio
   */
  initialize(): void {
    getAudioContext();
  },
};

export default soundService;
