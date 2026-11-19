"use client";

// Studio-Grade UI Sound Engine for Grainox
// Powered by Web Audio API & Curated Artlist / Kenney Studio Sound Assets (CC0 Royalty-Free)
// 100% Client-Side, Zero Network Dependencies, Zero Latency.

import { SOUND_ASSETS } from "./sound-assets";

const SOUND_STORAGE_KEY = "grainox_sound_enabled";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const audioBufferCache: Map<string, AudioBuffer> = new Map();

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
        // Increased volume by 20% by default as requested: ~0.72 perceived volume
        masterGain.gain.setValueAtTime(0.72, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);

        // Preload key sounds in the background
        preloadSounds(audioCtx);
      }
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Convert base64 data URI directly to ArrayBuffer without network fetch
 */
function dataUriToArrayBuffer(dataUri: string): ArrayBuffer {
  const base64 = dataUri.split(",")[1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Pre-decode sound assets for zero-latency instant playback
 */
async function preloadSounds(ctx: AudioContext): Promise<void> {
  const soundEntries = Object.values(SOUND_ASSETS);
  for (const uri of soundEntries) {
    if (!audioBufferCache.has(uri)) {
      try {
        const buffer = dataUriToArrayBuffer(uri);
        // decodeAudioData consumes the buffer, so pass a clone
        const decoded = await ctx.decodeAudioData(buffer.slice(0));
        audioBufferCache.set(uri, decoded);
      } catch (_) {}
    }
  }
}

/**
 * Play a studio-grade sound buffer through the master gain
 */
function playSoundAsset(dataUri: string, volume = 1.0): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const playBuffer = (buffer: AudioBuffer) => {
    try {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      source.buffer = buffer;

      source.connect(gainNode);
      gainNode.connect(masterGain!);

      source.start(0);
    } catch (_) {}
  };

  const ensureContextAndPlay = () => {
    const cached = audioBufferCache.get(dataUri);
    if (cached) {
      playBuffer(cached);
    } else {
      // Decode on demand if not yet cached
      try {
        const buffer = dataUriToArrayBuffer(dataUri);
        ctx.decodeAudioData(buffer.slice(0)).then((decoded) => {
          audioBufferCache.set(dataUri, decoded);
          playBuffer(decoded);
        }).catch(() => {});
      } catch (_) {}
    }
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(() => {
      ensureContextAndPlay();
    }).catch(() => {});
  } else {
    ensureContextAndPlay();
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
 * Tactile Artlist-grade button / link click tap
 */
export function playClickSound(): void {
  playSoundAsset(SOUND_ASSETS.CLICK, 1.0);
}

/**
 * Subtle scroll & wheel mechanical tick sound
 * Throttled to ~75ms interval for natural haptic feel
 */
export function playScrollSound(): void {
  const nowMs = Date.now();
  if (nowMs - lastScrollSoundTime < 75) return;
  lastScrollSoundTime = nowMs;

  playSoundAsset(SOUND_ASSETS.SCROLL, 0.7);
}

/**
 * Drag hover sound when files enter a dropzone
 */
export function playDragHoverSound(): void {
  playSoundAsset(SOUND_ASSETS.CLICK_ALT, 0.85);
}

/**
 * Satisfying acoustic pop when dropping files
 */
export function playDropSound(): void {
  playSoundAsset(SOUND_ASSETS.DROP, 1.0);
}

/**
 * Uplifting harmonic chime on successful task or download completion
 */
export function playSuccessSound(): void {
  playSoundAsset(SOUND_ASSETS.SUCCESS, 1.0);
}

/**
 * Clean physical switch toggle sound
 */
export function playToggleSound(enabled = true): void {
  if (enabled) {
    playSoundAsset(SOUND_ASSETS.SWITCH_ON, 0.9);
  } else {
    playSoundAsset(SOUND_ASSETS.SWITCH_OFF, 0.9);
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
