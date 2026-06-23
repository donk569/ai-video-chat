'use client';

interface PermissionGateProps {
  cameraError: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}

export function PermissionGate({ cameraError, onRetry, children }: PermissionGateProps) {
  if (!cameraError) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-sm mx-4 text-center text-white">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">需要摄像头权限</h3>
        <p className="text-sm text-gray-400 mb-6">{cameraError}</p>
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          重试
        </button>
        <p className="text-xs text-gray-500 mt-4">
          请在浏览器设置中允许访问摄像头和麦克风
        </p>
      </div>
    </div>
  );
}
