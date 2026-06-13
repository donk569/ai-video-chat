import { describe, it, expect } from 'vitest';
import { CONFIG } from '@/modules/shared/config';
import {
  CameraPermissionDeniedError,
  NoCameraError,
  MicPermissionDeniedError,
  NoMicrophoneError,
  AudioContextError,
  ASRTimeoutError,
  ASRAPIError,
  VLMTimeoutError,
  VLMAPIError,
  TTSError,
} from '@/modules/shared/errors';

describe('shared/config', () => {
  it('exports CONFIG with camera section', () => {
    expect(CONFIG.camera).toBeDefined();
    expect(CONFIG.camera.width).toBeGreaterThan(0);
    expect(CONFIG.camera.height).toBeGreaterThan(0);
    expect(CONFIG.camera.fps).toBeGreaterThan(0);
    expect(CONFIG.camera.jpegQuality).toBeGreaterThan(0);
    expect(CONFIG.camera.diffThreshold).toBeGreaterThan(0);
    expect(CONFIG.camera.lowPowerFps).toBeGreaterThan(0);
  });

  it('exports CONFIG with audio section', () => {
    expect(CONFIG.audio).toBeDefined();
    expect(CONFIG.audio.sampleRate).toBeGreaterThan(0);
    expect(CONFIG.audio.vadThreshold).toBeGreaterThan(0);
    expect(CONFIG.audio.silenceTimeoutMs).toBeGreaterThan(0);
  });

  it('exports CONFIG with asr section', () => {
    expect(CONFIG.asr).toBeDefined();
    expect(CONFIG.asr.lang).toBeTruthy();
    expect(typeof CONFIG.asr.fallbackEnabled).toBe('boolean');
  });

  it('exports CONFIG with vlm section', () => {
    expect(CONFIG.vlm).toBeDefined();
    expect(CONFIG.vlm.cacheSize).toBeGreaterThan(0);
    expect(typeof CONFIG.vlm.localModelEnabled).toBe('boolean');
  });

  it('exports CONFIG with tts section', () => {
    expect(CONFIG.tts).toBeDefined();
    expect(CONFIG.tts.lang).toBeTruthy();
    expect(typeof CONFIG.tts.fallbackEnabled).toBe('boolean');
  });

  it('exports CONFIG with powerSaver section', () => {
    expect(CONFIG.powerSaver).toBeDefined();
    expect(CONFIG.powerSaver.idleTimeoutMs).toBeGreaterThan(0);
  });

  it('exports CONFIG with api section', () => {
    expect(CONFIG.api).toBeDefined();
    expect(CONFIG.api.baseURL).toBeTruthy();
    expect(CONFIG.api.timeoutMs).toBeGreaterThan(0);
  });
});

describe('shared/errors', () => {
  it('CameraPermissionDeniedError has Chinese message', () => {
    const err = new CameraPermissionDeniedError();
    expect(err.message).toMatch(/摄像头/);
    expect(err.name).toBe('CameraPermissionDeniedError');
  });

  it('NoCameraError has Chinese message', () => {
    const err = new NoCameraError();
    expect(err.message).toMatch(/摄像头/);
    expect(err instanceof Error).toBe(true);
  });

  it('MicPermissionDeniedError has Chinese message', () => {
    const err = new MicPermissionDeniedError();
    expect(err.message).toMatch(/麦克风/);
    expect(err.name).toBe('MicPermissionDeniedError');
  });

  it('NoMicrophoneError has Chinese message', () => {
    const err = new NoMicrophoneError();
    expect(err.message).toMatch(/麦克风/);
    expect(err instanceof Error).toBe(true);
  });

  it('AudioContextError has Chinese message', () => {
    const err = new AudioContextError();
    expect(err.message).toMatch(/音频/);
  });

  it('ASRTimeoutError has Chinese message and retry hint', () => {
    const err = new ASRTimeoutError();
    expect(err.message).toMatch(/超时|识别/);
    expect(err.name).toBe('ASRTimeoutError');
  });

  it('ASRAPIError has Chinese message', () => {
    const err = new ASRAPIError();
    expect(err.message).toMatch(/识别/);
  });

  it('VLMTimeoutError has Chinese message', () => {
    const err = new VLMTimeoutError();
    expect(err.message).toMatch(/超时|视觉/);
  });

  it('VLMAPIError has Chinese message', () => {
    const err = new VLMAPIError();
    expect(err.message).toMatch(/视觉/);
  });

  it('TTSError has Chinese message', () => {
    const err = new TTSError();
    expect(err.message).toMatch(/语音/);
  });

  it('all errors accept optional custom message', () => {
    const custom = '自定义错误信息';
    expect(new CameraPermissionDeniedError(custom).message).toContain(custom);
    expect(new NoCameraError(custom).message).toContain(custom);
    expect(new ASRTimeoutError(custom).message).toContain(custom);
    expect(new TTSError(custom).message).toContain(custom);
  });
});
