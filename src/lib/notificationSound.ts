let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;

export const playIncomingMessageSound = () => {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastPlayedAt < 800) return;
  lastPlayedAt = now;

  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    audioContext = audioContext || new AudioContextClass();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => undefined);
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startTime = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, startTime + 0.14);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.2);
  } catch {
    // Browsers can block audio before user interaction; ignore safely.
  }
};