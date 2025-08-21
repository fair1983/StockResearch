// lib/console-bridge.ts
'use client';

import type { LogConfig } from '@/types';

// 允許過濾的層級
type Lvl = 'log' | 'info' | 'debug' | 'warn' | 'error';

const ORIG = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function stackSource(): string {
  // 嘗試解析呼叫來源 (檔名)
  const s = new Error().stack || '';
  const line = s.split('\n')[3] || '';
  // 例: "at Object.console.log (http://localhost:3000/_next/.../page.tsx:63:12)"
  const m = line.match(/\/([^\/\)]+?\.(?:tsx|ts|jsx|js)):\d+/);
  return m ? m[1] : '';
}

function argsToText(args: any[]): string {
  try {
    return args.map(a => (typeof a === 'string' ? a : '')).join(' ');
  } catch { return ''; }
}

export function installConsoleBridge(getConfig: () => LogConfig) {
  const filt = (lvl: Lvl, args: any[]): boolean => {
    const cfg = getConfig?.();

    // ---- 靜音條件 ----
    const frontendLevel = (cfg as any)?.frontend?.level ?? 'info';
    const apiLevel      = (cfg as any)?.api?.level ?? 'info';
    const yfLevel       = (cfg as any)?.yahooFinance?.level ?? 'info';
    const systemLevel   = (cfg as any)?.system?.level ?? 'info';

    // 圖表渲染總開關
    const cr = (cfg as any)?.frontend?.chartRender;
    const chartRenderOff =
      typeof cr === 'boolean' ? !cr : !(cr?.enabled ?? false);

    // 所有主要類別都 off，視為全靜音（warn/error 仍可選擇放行）
    const allOff = [frontendLevel, apiLevel, yfLevel, systemLevel].every(v => v === 'off');

    // 文字與來源（可作為黑名單）
    const text   = argsToText(args);
    const source = stackSource();

    // 內建黑名單：Fast Refresh / React DevTools 提示
    const isDevInfraNoise =
      /^\[Fast Refresh\]/.test(text) ||
      /React DevTools/.test(text) ||
      /Hot Module Replacement/i.test(text);

    // 若在 silent 狀態：擋掉 log/info/debug；warn/error 允許（你也可改成全擋）
    if (allOff && chartRenderOff) {
      if (lvl === 'log' || lvl === 'info' || lvl === 'debug') return false;
      // 這裡如果你連 warn 都想擋，取消下一行註解
      // if (lvl === 'warn') return false;
    }

    // 不論是否 silent，都擋開發基礎噪音
    if (isDevInfraNoise) return false;

    // 針對指定檔案再加一層黑名單（可自行增減）
    const noiseFiles = new Set([
      'hot-reloader-client.js',
      'main-app.js',
      'page.tsx',
      'MultiChartLayout.tsx',
      'MultiChartIndicatorRenderer.tsx',
    ]);
    
    // 只在全靜音模式下才擋指定檔案
    if (allOff && chartRenderOff && noiseFiles.has(source) && (lvl === 'log' || lvl === 'info' || lvl === 'debug')) {
      return false;
    }

    return true; // 允許輸出
  };

  (['log','info','debug','warn','error'] as Lvl[]).forEach((lvl) => {
    (console as any)[lvl] = (...args: any[]) => {
      if (!filt(lvl, args)) return;
      ORIG[lvl](...args);
    };
  });

  // 回傳還原函式（需要時可呼叫）
  return () => {
    (['log','info','debug','warn','error'] as Lvl[]).forEach((lvl) => {
      (console as any)[lvl] = ORIG[lvl];
    });
  };
}
