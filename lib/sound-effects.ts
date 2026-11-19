"use client";

// Studio-Grade UI Sound Engine for Grainox
// Dual-Engine: High-Fidelity Audio Elements (Artlist/Kenney SFX) + Zero-Latency Web Audio Fallback
// 100% Client-Side, Zero Network Dependencies, 100% Reliable Playback across all devices.

import { SOUND_ASSETS } from "./sound-assets";

const SOUND_STORAGE_KEY = "grainox_sound_enabled";

// Pre-instantiated HTML5 Audio instances for instant playback
const audioPool: Record<string, HTMLAudioElement[]> = {};

// Web Audio API context for fallback and global unlock
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
        // +20% volume boost: 0.85 master gain
        masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play sound using HTML5 Audio (MP3 DataURI) with rapid-click cloning
 * Fallbacks seamlessly to Web Audio synthesizer if HTML5 Audio is restricted
 */
function playAudioOrFallback(
  dataUri: string,
  volume = 0.85,
  synthFallback?: () => void
): void {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  try {
    // 1. Try HTML5 Audio with preloaded / cloned node for zero-latency polyphony
    if (!audioPool[dataUri]) {
      audioPool[dataUri] = [];
    }

    // Reuse idle audio or create new
    let audio = audioPool[dataUri].find((a) => a.paused || a.ended);
    if (!audio) {
      audio = new Audio(dataUri);
      audio.preload = "auto";
      if (audioPool[dataUri].length < 6) {
        audioPool[dataUri].push(audio);
      }
    }

    audio.volume = Math.min(1.0, Math.max(0, volume));
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay prevented or format error -> fire bulletproof Web Audio synthesizer
        synthFallback?.();
      });
    }
  } catch (_) {
    // Immediate fallback on any audio exception
    synthFallback?.();
  }
}

/**
 * Web Audio Synthesizer Fallback: Tactile Pop
 */
function synthClickSound(): void {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1250, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.075);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.085);
  } catch (_) {}
}

/**
 * Web Audio Synthesizer Fallback: Scroll Tick
 */
function synthScrollSound(): void {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1750, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.025);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch (_) {}
}

/**
 * Web Audio Synthesizer Fallback: Success Chime
 */
function synthSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.07;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.48, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.42);

      osc.connect(gain);
      gain.connect(masterGain!);

      osc.start(noteStart);
      osc.stop(noteStart + 0.43);
    });
  } catch (_) {}
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
 * Tactile Artlist-grade button / link click tap (+20% volume)
 */
export function playClickSound(): void {
  playAudioOrFallback(SOUND_ASSETS.CLICK, 0.88, synthClickSound);
}

/**
 * Subtle scroll & wheel mechanical tick sound
 * Throttled to ~75ms interval for natural tactile notch feel
 */
export function playScrollSound(): void {
  const nowMs = Date.now();
  if (nowMs - lastScrollSoundTime < 75) return;
  lastScrollSoundTime = nowMs;

  playAudioOrFallback(SOUND_ASSETS.SCROLL, 0.65, synthScrollSound);
}

/**
 * Drag hover sound when files enter a dropzone
 */
export function playDragHoverSound(): void {
  playAudioOrFallback(SOUND_ASSETS.CLICK_ALT, 0.75, synthClickSound);
}

/**
 * Satisfying acoustic pop when dropping files
 */
export function playDropSound(): void {
  playAudioOrFallback(SOUND_ASSETS.DROP, 0.9, synthClickSound);
}

/**
 * Uplifting harmonic chime on successful task or download completion
 */
export function playSuccessSound(): void {
  playAudioOrFallback(SOUND_ASSETS.SUCCESS, 0.92, synthSuccessSound);
}

/**
 * Clean physical switch toggle sound
 */
export function playToggleSound(enabled = true): void {
  if (enabled) {
    playAudioOrFallback(SOUND_ASSETS.SWITCH_ON, 0.88, synthClickSound);
  } else {
    playAudioOrFallback(SOUND_ASSETS.SWITCH_OFF, 0.88, synthClickSound);
  }
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
