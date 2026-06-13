'use client';

import { useState } from 'react';
import type { CostStats } from '@/modules/shared/types';

interface DebugPanelProps {
  costStats: CostStats;
  fps?: number;
  latencyMs?: number;
}

export function DebugPanel({ costStats, fps, latencyMs }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur text-gray-300 text-xs hover:text-white transition-colors border border-white/10"
      >
        {collapsed ? '📊 调试' : '✕ 收起'}
      </button>

      {!collapsed && (
        <div className="mt-2 p-4 rounded-xl bg-black/80 backdrop-blur border border-white/10 text-white text-xs font-mono space-y-2 min-w-[220px]">
          <div className="flex justify-between">
            <span className="text-gray-400">帧率</span>
            <span>{fps?.toFixed(1) ?? '—'} fps</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">延迟</span>
            <span>{latencyMs != null ? `${latencyMs}ms` : '—'}</span>
          </div>
          <hr className="border-white/10" />
          <div className="flex justify-between">
            <span className="text-gray-400">云端调用</span>
            <span>{costStats.cloudCalls} 次</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Token 消耗</span>
            <span>{costStats.tokensUsed}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-yellow-400">预估成本</span>
            <span className="text-yellow-400">¥{costStats.estimatedCostRMB.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
