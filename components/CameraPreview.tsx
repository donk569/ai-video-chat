'use client';

import { useRef, useEffect } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  mirror?: boolean;
  className?: string;
}

export function CameraPreview({ stream, mirror = true, className = '' }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm">摄像头未启动</p>
            <p className="text-xs mt-1 opacity-60">点击下方按钮开始</p>
          </div>
        </div>
      )}
    </div>
  );
}
