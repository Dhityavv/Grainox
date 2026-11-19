"use client";

// Web Audio API Sound Effects Synthesizer for Grainox
// 100% client-side, zero external asset downloads, instant playback.

const SOUND_STORAGE_KEY = "grainox_sound_enabled";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Throttling for scroll ticks so it doesn't sound cacophonous
let lastScrollSoundTime = 0;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        // 50% comfortable perceived master volume
        masterGain.gain.setValueAtTime(0.55, audioCtx.currentTime);
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
    return saved !== "false"; // Default is strictly true / enabled
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
 * Tactile mechanical UI tap on button / link click (crisp, pleasant, ~50% volume)
 */
export function playClickSound(): void {
  withAudioContext((ctx, master) => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Clean tactile pop: drops from 1200Hz to 380Hz over 70ms
      osc.type = "sine";
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.07);

      // Volume envelope: punchy attack then gentle release
      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.08);

      // Secondary subtle mechanical sub-click for realistic tactile feel
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(450, now);
      subOsc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

      subGain.gain.setValueAtTime(0.25, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      subOsc.connect(subGain);
      subGain.connect(master);

      subOsc.start(now);
      subOsc.stop(now + 0.055);
    } catch (_) {}
  });
}

/**
 * Modern mechanical scroll / wheel tick sound
 * Throttled to ~75ms interval to create an authentic haptic wheel experience
 */
export function playScrollSound(): void {
  const nowMs = Date.now();
  if (nowMs - lastScrollSoundTime < 75) return;
  lastScrollSoundTime = nowMs;

  withAudioContext((ctx, master) => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // High-frequency subtle notch tick
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.022);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.026);
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
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.045);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.046);
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
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.1);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.11);

      // Subtle warm undertone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(180, now);
      subOsc.frequency.exponentialRampToValueAtTime(360, now + 0.09);

      subGain.gain.setValueAtTime(0.32, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      subOsc.connect(subGain);
      subGain.connect(master);

      subOsc.start(now);
      subOsc.stop(now + 0.095);
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
        const noteStart = now + idx * 0.07;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.38, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.38);

        osc.connect(gain);
        gain.connect(master);

        osc.start(noteStart);
        osc.stop(noteStart + 0.39);
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
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.setValueAtTime(960, now + 0.04);
      } else {
        osc.frequency.setValueAtTime(960, now);
        osc.frequency.setValueAtTime(480, now + 0.04);
      }

      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.095);
    } catch (_) {}
  });
}

/**
 * Global audio unlock, click dispatcher, and scroll tick handler
 */
export function initGlobalSound(): void {
  if (typeof window === "undefined") return;

  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };

  // Immediate unlock on ANY user gesture (touch, mouse, pointer, wheel, keyboard)
  const unlockEvents = ["pointerdown", "mousedown", "touchstart", "keydown", "wheel"];
  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true, once: false });
  });

  // Global click delegator for buttons, interactive chips, links, and form controls
  const handleGlobalClick = (e: MouseEvent) => {
    if (!isSoundEnabled()) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if target or parent is an interactive button, clickable element, link, or card
    const el = target.closest<HTMLElement>(
      "button, [role='button'], a, .chip-pop, .btn-pop, input[type='file'] + label, label.cursor-pointer, select, input[type='checkbox'], input[type='radio'], [tabindex='0']"
    );

    if (el) {
      playClickSound();
    }
  };

  window.addEventListener("click", handleGlobalClick, { capture: true, passive: true });

  // Global scroll & wheel listener for mechanical feedback
  const handleScrollTick = () => {
    if (!isSoundEnabled()) return;
    playScrollSound();
  };

  window.addEventListener("wheel", handleScrollTick, { passive: true });
  window.addEventListener("scroll", handleScrollTick, { passive: true });
}
