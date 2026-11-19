"use client";

// Web Audio API Sound Effects Synthesizer for Grainox
// 100% client-side, zero external asset downloads, instant playback.

const SOUND_STORAGE_KEY = "grainox_sound_enabled";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function withAudioContext(callback: (ctx: AudioContext, master: GainNode) => void) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  if (ctx.state === "suspended") {
    ctx.resume().then(() => {
      if (masterGain) callback(ctx, masterGain);
    }).catch(() => {});
  } else {
    callback(ctx, masterGain);
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    return saved !== "false"; // Default enabled
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    window.dispatchEvent(
      new CustomEvent("grainox_sound_toggled", { detail: { enabled } })
    );
  } catch {}
}

export function toggleSound(): boolean {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  if (next) {
    playToggleSound(true);
  }
  return next;
}

/**
 * Tactile mechanical UI tap on button / link click
 */
export function playClickSound(): void {
  withAudioContext((ctx, master) => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_) {}
  });
}

/**
 * Soft tick when dragging files over a dropzone
 */
export function playDragHoverSound(): void {
  withAudioContext((ctx, master) => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.035);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch (_) {}
  });
}

/**
 * Satisfying bubble pop when dropping files
 */
export function playDropSound(): void {
  withAudioContext((ctx, master) => {
    try {
      const now = ctx.currentTime;

      // Primary tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.09);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.1);

      // Subtle warm undertone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

      subGain.gain.setValueAtTime(0.2, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      subOsc.connect(subGain);
      subGain.connect(master);

      subOsc.start(now);
      subOsc.stop(now + 0.08);
    } catch (_) {}
  });
}

/**
 * Uplifting modern chord chime on successful process or download completion
 */
export function playSuccessSound(): void {
  withAudioContext((ctx, master) => {
    try {
      // C5, E5, G5, C6 (Major triad)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.06;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.22, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(master);

        osc.start(noteStart);
        osc.stop(noteStart + 0.36);
      });
    } catch (_) {}
  });
}

/**
 * Snappy tactile toggle switch sound
 */
export function playToggleSound(enabled = true): void {
  withAudioContext((ctx, master) => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      if (enabled) {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(880, now + 0.04);
      } else {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.04);
      }

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (_) {}
  });
}

/**
 * Global audio unlock and click dispatcher
 */
export function initGlobalSound(): void {
  if (typeof window === "undefined") return;

  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };

  // Immediate unlock on user gesture
  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });

  // Global click delegator for buttons, interactive chips, and action links
  const handleGlobalClick = (e: MouseEvent) => {
    if (!isSoundEnabled()) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if target or parent is an interactive button or clickable element
    const el = target.closest<HTMLElement>(
      "button, [role='button'], a, .chip-pop, .btn-pop, input[type='file'] + label, label.cursor-pointer"
    );

    if (el) {
      // Ensure context is running and play click sound
      playClickSound();
    }
  };

  window.addEventListener("click", handleGlobalClick, { capture: true, passive: true });
}
