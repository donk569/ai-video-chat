import { CONFIG } from '@/modules/shared/config';
import type { AudioChunk } from '@/modules/shared/types';

// ============================================================
// 纯函数：RMS 计算 + 语音检测
// ============================================================

export function computeRMS(buffer: Float32Array): number {
  if (buffer.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export function detectSpeech(rms: number, threshold: number = 0.02): boolean {
  return rms > threshold;
}

// ============================================================
// Float32Array → WAV Blob 编码
// ============================================================

function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E

  // fmt  sub-chunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6d); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // space
  view.setUint32(16, 16, true);    // sub-chunk size
  view.setUint16(20, 1, true);     // PCM format
  view.setUint16(22, 1, true);     // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);     // block align
  view.setUint16(34, 16, true);    // bits per sample

  // data sub-chunk
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  view.setUint32(40, numSamples * 2, true);

  // Write 16-bit PCM samples
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(44 + i * 2, val, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// ============================================================
// AudioChunker: 语音活动检测 + 自动分段
// ============================================================

export class AudioChunker {
  private vadThreshold: number;
  private silenceTimeoutMs: number;
  private chunkDurationMs: number;
  private sampleRate: number;

  private buffers: Float32Array[] = [];
  private totalSamples: number = 0;
  private hasSpeech: boolean = false;
  private isCurrentlySpeaking: boolean = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private callback: ((chunk: AudioChunk) => void) | null = null;

  constructor(
    config: {
      vadThreshold?: number;
      silenceTimeoutMs?: number;
      chunkDurationMs?: number;
      sampleRate?: number;
    } = {},
  ) {
    this.vadThreshold = config.vadThreshold ?? CONFIG.audio.vadThreshold;
    this.silenceTimeoutMs =
      config.silenceTimeoutMs ?? CONFIG.audio.silenceTimeoutMs;
    this.chunkDurationMs =
      config.chunkDurationMs ?? CONFIG.audio.chunkDurationMs;
    this.sampleRate = config.sampleRate ?? CONFIG.audio.sampleRate;
  }

  onChunk(callback: (chunk: AudioChunk) => void): void {
    this.callback = callback;
  }

  addData(data: Float32Array): void {
    const rms = computeRMS(data);
    const isSpeech = detectSpeech(rms, this.vadThreshold);

    if (this.buffers.length === 0) {
      this.maxDurationTimer = setTimeout(() => {
        this.emitChunk();
      }, this.chunkDurationMs);
    }

    this.buffers.push(data);
    this.totalSamples += data.length;

    if (isSpeech) {
      this.hasSpeech = true;
      this.isCurrentlySpeaking = true;
    } else {
      this.isCurrentlySpeaking = false;
    }

    // Always restart silence timer — fires if no new data for silenceTimeoutMs
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(() => {
      if (this.hasSpeech) {
        this.emitChunk();
      }
      this.silenceTimer = null;
    }, this.silenceTimeoutMs);
  }

  private emitChunk(): void {
    if (this.buffers.length === 0) return;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    if (!this.hasSpeech) {
      this.clearBuffers();
      return;
    }

    const combined = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const buf of this.buffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    const durationMs = (this.totalSamples / this.sampleRate) * 1000;
    const blob = float32ToWav(combined, this.sampleRate);

    const chunk: AudioChunk = {
      blob,
      durationMs: Math.round(durationMs),
      hasSpeech: true,
    };

    this.callback?.(chunk);
    this.clearBuffers();
  }

  private clearBuffers(): void {
    this.buffers = [];
    this.totalSamples = 0;
    this.hasSpeech = false;
    this.isCurrentlySpeaking = false;
  }

  flush(): void {
    this.emitChunk();
  }

  reset(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
    this.clearBuffers();
  }
}
