'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { CameraPipeline } from '@/modules/camera';
import type { CompressedFrame } from '@/modules/shared/types';

interface UseCameraReturn {
  stream: MediaStream | null;
  error: string | null;
  isLowPower: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => CompressedFrame | null;
  setLowPower: (enabled: boolean) => void;
}

export function useCamera(): UseCameraReturn {
  const pipelineRef = useRef<CameraPipeline | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLowPower, setIsLowPower] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const pipeline = new CameraPipeline({});
      const mediaStream = await pipeline.start();
      pipelineRef.current = pipeline;
      setStream(mediaStream);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '摄像头启动失败';
      setError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    pipelineRef.current?.stop();
    pipelineRef.current = null;
    setStream(null);
    setIsLowPower(false);
  }, []);

  const captureFrame = useCallback((): CompressedFrame | null => {
    return pipelineRef.current?.captureFrame() ?? null;
  }, []);

  const setLowPower = useCallback((enabled: boolean) => {
    pipelineRef.current?.setLowPower(enabled);
    setIsLowPower(enabled);
  }, []);

  useEffect(() => {
    return () => {
      pipelineRef.current?.stop();
    };
  }, []);

  return { stream, error, isLowPower, startCamera, stopCamera, captureFrame, setLowPower };
}
