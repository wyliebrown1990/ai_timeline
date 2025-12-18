/**
 * Study Session Sound Effects
 *
 * Uses Web Audio API to generate subtle sound effects for:
 * - Card flip
 * - Correct answer (Good/Easy)
 * - Incorrect/needs review (Again)
 *
 * All sounds are generated programmatically - no audio files needed.
 */

// =============================================================================
// Types
// =============================================================================

export type SoundType = 'flip' | 'correct' | 'incorrect';

// =============================================================================
// Audio Context (lazy initialization)
// =============================================================================

let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context (lazy initialization).
 * Must be called after user interaction due to browser autoplay policies.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }

  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

// =============================================================================
// Sound Generation
// =============================================================================

/**
 * Play a subtle flip sound (short click).
 */
function playFlipSound(ctx: AudioContext): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Short click sound
  oscillator.frequency.setValueAtTime(800, ctx.currentTime);
  oscillator.type = 'sine';

  // Quick fade in/out
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}

/**
 * Play a pleasant success sound (rising tone).
 */
function playCorrectSound(ctx: AudioContext): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Rising tone
  oscillator.frequency.setValueAtTime(440, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.1);
  oscillator.type = 'sine';

  // Gentle envelope
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

/**
 * Play a subtle incorrect sound (low thud).
 */
function playIncorrectSound(ctx: AudioContext): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Low thud
  oscillator.frequency.setValueAtTime(200, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.1);
  oscillator.type = 'sine';

  // Quick envelope
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.12);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Play a sound effect.
 * Silently fails if audio is not supported.
 *
 * @param type - The type of sound to play
 */
export function playSound(type: SoundType): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (type) {
    case 'flip':
      playFlipSound(ctx);
      break;
    case 'correct':
      playCorrectSound(ctx);
      break;
    case 'incorrect':
      playIncorrectSound(ctx);
      break;
  }
}

/**
 * Initialize audio context (call on first user interaction).
 * This ensures audio will work due to browser autoplay policies.
 */
export function initAudio(): void {
  getAudioContext();
}
