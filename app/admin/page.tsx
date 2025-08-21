'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { LogConfig, LogLevel, FrontendChartRenderConfig, LogLevelName } from '@/types';

/* =========================
 * 工具：取/設 nested path
 * ========================= */
function getAtPath<T = any>(obj: any, path: string, fallback?: T): T {
  return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj) ?? (fallback as any);
}
function setAtPath<T = any>(obj: any, path: string, value: T): LogConfig {
  const keys = path.split('.');
  const next: any = { ...obj };
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = { ...(cur[k] ?? {}) };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return next as LogConfig;
}

/* =========================
 * 型別：Schema
 * ========================= */
type SwitchField = { type: 'switch'; label: string; path: string; hint?: string };
type LevelField  = { type: 'level';  label?: string; path: string };
type CustomField = { type: 'custom'; render: (cfg: LogConfig, update: (path: string, v: any) => void) => JSX.Element };
type Field = SwitchField | LevelField | CustomField;

type SectionSchema = {
  key: keyof LogConfig;
  title: string;
  fields: Field[];
  cols?: number; // 每區塊欄位數
};

/* =========================
 * 自訂子元件：ChartRender 群組
 * ========================= */
function ChartRenderGroup({
  cfg, onChange,
}: { cfg: LogConfig; onChange:(v: FrontendChartRenderConfig) => void }) {
  const normalized: FrontendChartRenderConfig =
    typeof cfg.frontend.chartRender === 'boolean'
      ? {
          enabled: cfg.frontend.chartRender,
          level: cfg.frontend.level ?? 'info',
          init: false, indicators: false, resize: false, crosshair: false, cleanup: false, misc: false,
        }
      : (cfg.frontend.chartRender as FrontendChartRenderConfig);

  const set = (patch: Partial<FrontendChartRenderConfig>) => onChange({ ...normalized, ...patch });

  return (
    <div className="mt-3 rounded border p-3">
      <div className="flex items-center justify-between">
        <Switch label="圖表渲染" checked={normalized.enabled} onChange={(v)=>set({ enabled: v })}/>
        <Level value={normalized.level ?? 'info'} onChange={(v)=>set({ level: v })}/>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
        {(['init','indicators','resize','crosshair','cleanup','misc'] as const).map(k => (
          <Switch key={k} label={k} checked={(normalized as any)[k]} onChange={(v)=>set({ [k]: v } as any)}/>
        ))}
      </div>
    </div>
  );
}

/* =========================
 * Schema：一次宣告，UI自動生成
 * ========================= */
const SECTIONS: SectionSchema[] = [
  {
    key: 'api',
    title: 'API',
    fields: [
      { type: 'switch', label: '啟用', path: 'api.enabled' },
      { type: 'level',  label: '等級', path: 'api.level' },
      { type: 'switch', label: '請求', path: 'api.request' },
      { type: 'switch', label: '回應', path: 'api.response' },
      { type: 'switch', label: '錯誤', path: 'api.error' },
      { type: 'switch', label: '時間', path: 'api.timing' },
    ],
  },
  {
    key: 'yahooFinance',
    title: 'Yahoo Finance',
    fields: [
      { type: 'switch', label: '啟用', path: 'yahooFinance.enabled' },
      { type: 'level',  label: '等級', path: 'yahooFinance.level' },
      { type: 'switch', label: '請求', path: 'yahooFinance.request' },
      { type: 'switch', label: '回應', path: 'yahooFinance.response' },
      { type: 'switch', label: '錯誤', path: 'yahooFinance.error' },
      { type: 'switch', label: '資料範圍', path: 'yahooFinance.dataRange' },
    ],
  },
  {
    key: 'frontend',
    title: 'Frontend',
    fields: [
      { type: 'switch', label: '啟用', path: 'frontend.enabled' },
      { type: 'level',  label: '等級', path: 'frontend.level' },
      { type: 'switch', label: '資料獲取', path: 'frontend.dataFetch' },
      { type: 'switch', label: '錯誤', path: 'frontend.error' },
      {
        type: 'custom',
        render: (cfg, update) => (
          <ChartRenderGroup
            cfg={cfg}
            onChange={(v)=>update('frontend.chartRender', v)}
          />
        ),
      },
    ],
  },
  {
    key: 'system',
    title: 'System',
    fields: [
      { type: 'switch', label: '啟用', path: 'system.enabled' },
      { type: 'level',  label: '等級', path: 'system.level' },
      { type: 'switch', label: '快取', path: 'system.cache' },
      { type: 'switch', label: '效能', path: 'system.performance' },
    ],
  },
  {
    key: 'configuration',
    title: 'Configuration',
    fields: [
      { type: 'switch', label: '啟用', path: 'configuration.enabled' },
      { type: 'level',  label: '等級', path: 'configuration.level' },
      { type: 'switch', label: '資訊', path: 'configuration.info' },
      { type: 'switch', label: '錯誤', path: 'configuration.error' },
    ],
  },
  {
    key: 'ai',
    title: 'AI',
    fields: [
      { type: 'switch', label: '啟用', path: 'ai.enabled' },
      { type: 'level',  label: '等級', path: 'ai.level' },
      { type: 'switch', label: '分析', path: 'ai.analysis' },
      { type: 'switch', label: '錯誤', path: 'ai.error' },
    ],
  },
  {
    key: 'monitor',
    title: 'Monitor',
    fields: [
      { type: 'switch', label: '啟用', path: 'monitor.enabled' },
      { type: 'level',  label: '等級', path: 'monitor.level' },
      { type: 'switch', label: '資訊', path: 'monitor.info' },
      { type: 'switch', label: '進度', path: 'monitor.progress' },
      { type: 'switch', label: '完成', path: 'monitor.complete' },
    ],
  },
  {
    key: 'scheduler',
    title: 'Scheduler',
    fields: [
      { type: 'switch', label: '啟用', path: 'scheduler.enabled' },
      { type: 'level',  label: '等級', path: 'scheduler.level' },
      { type: 'switch', label: '資訊', path: 'scheduler.info' },
      { type: 'switch', label: '警告', path: 'scheduler.warn' },
      { type: 'switch', label: '錯誤', path: 'scheduler.error' },
      { type: 'switch', label: '開始', path: 'scheduler.start' },
      { type: 'switch', label: '停止', path: 'scheduler.stop' },
      { type: 'switch', label: '完成', path: 'scheduler.complete' },
    ],
  },
  {
    key: 'dataCollection',
    title: 'Data Collection',
    fields: [
      { type: 'switch', label: '啟用', path: 'dataCollection.enabled' },
      { type: 'level',  label: '等級', path: 'dataCollection.level' },
      { type: 'switch', label: '開始', path: 'dataCollection.start' },
      { type: 'switch', label: '進度', path: 'dataCollection.progress' },
      { type: 'switch', label: '完成', path: 'dataCollection.complete' },
      { type: 'switch', label: '錯誤', path: 'dataCollection.error' },
      { type: 'switch', label: '請求', path: 'dataCollection.request' },
      { type: 'switch', label: '成功', path: 'dataCollection.success' },
      { type: 'switch', label: '資訊', path: 'dataCollection.info' },
    ],
  },
  {
    key: 'stockList',
    title: 'Stock List',
    fields: [
      { type: 'switch', label: '啟用', path: 'stockList.enabled' },
      { type: 'level',  label: '等級', path: 'stockList.level' },
      { type: 'switch', label: '資訊', path: 'stockList.info' },
      { type: 'switch', label: '警告', path: 'stockList.warn' },
      { type: 'switch', label: '錯誤', path: 'stockList.error' },
    ],
  },
  {
    key: 'stockMetadata',
    title: 'Stock Metadata',
    fields: [
      { type: 'switch', label: '啟用', path: 'stockMetadata.enabled' },
      { type: 'level',  label: '等級', path: 'stockMetadata.level' },
      { type: 'switch', label: '資訊', path: 'stockMetadata.info' },
      { type: 'switch', label: '警告', path: 'stockMetadata.warn' },
      { type: 'switch', label: '錯誤', path: 'stockMetadata.error' },
    ],
  },
];

/* =========================
 * 預設方案（Presets）
 * ========================= */
const applyPreset = (name: 'production' | 'debug-frontend' | 'silent', base: LogConfig): LogConfig => {
  const cfg = { ...base };

  if (name === 'production') {
    // 生產：只保留必要 info/error，關閉圖表渲染噪音
    cfg.frontend = {
      ...cfg.frontend,
      level: 'info',
      chartRender: { enabled: false, level: 'info', init:false, indicators:false, resize:false, crosshair:false, cleanup:false, misc:false },
    };
    cfg.api.level = 'info';
    cfg.yahooFinance.level = 'info';
    cfg.system.level = 'info';
  }

  if (name === 'debug-frontend') {
    // 前端除錯：只打開圖表渲染中「indicators」訊息
    cfg.frontend = {
      ...cfg.frontend,
      level: 'debug',
      chartRender: { enabled: true, level: 'debug', init:false, indicators:true, resize:false, crosshair:false, cleanup:false, misc:false },
    };
  }

  if (name === 'silent') {
    // 靜音：把主要類別等級調成 off
    cfg.api.level = 'off' as LogLevelName;
    cfg.yahooFinance.level = 'off' as LogLevelName;
    cfg.frontend.level = 'off' as LogLevelName;
    cfg.system.level = 'off' as LogLevelName;
    // 同時關閉圖表渲染
    cfg.frontend.chartRender = { enabled: false, level: 'off', init:false, indicators:false, resize:false, crosshair:false, cleanup:false, misc:false };
  }

  return cfg;
};

/* =========================
 * 主頁面
 * ========================= */
type StockUpdateStatus = {
  lastUpdated: string;
  version: string;
  totalStocks: number;
  breakdown: { twStocks: number; twETFs: number; usStocks: number; usETFs: number };
};

export default function AdminPage() {
  const [config, setConfig] = useState<LogConfig>(logger.getConfig());
  const [logs, setLogs] = useState<LogLevel[]>(logger.getLogs());
  const [autoScroll, setAutoScroll] = useState(true);
  const [stockStatus, setStockStatus] = useState<StockUpdateStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  // 即時訂閱
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const unsub = logger.subscribe((log) => {
      setLogs(prev => (prev.length >= 1000 ? [...prev.slice(-999), log] : [...prev, log]));
    });
    return () => {
      unsub();
    };
  }, []);
  useEffect(() => { if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, autoScroll]);

  // 股票狀態
  useEffect(() => { (async () => {
    try { const r = await fetch('/api/stocks/update'); const j = await r.json(); if (j?.success) setStockStatus(j.data); } catch {}
  })(); }, []);

  // 共用：更新 config（單一路徑）
  const updatePath = (path: string, value: any) => {
    const merged = setAtPath(config, path, value);
    setConfig(merged);
    logger.updateConfig(merged);
  };

  // 預設方案
  const applyPresetConfig = (p: 'production' | 'debug-frontend' | 'silent') => {
    const next = applyPreset(p, config);
    setConfig(next);
    logger.updateConfig(next);
  };

  // 工具：清空/導出
  const clearLogs = () => { logger.clearLogs(); setLogs([]); };
  const exportLogs = () => {
    const data = logger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `logs-${new Date().toISOString()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const resetConfig = () => { logger.resetConfig(); setConfig(logger.getConfig()); };

  // ======（你原有的股票更新、搜尋/篩選、log viewer 可保留；以下簡化展示）======
  const [q, setQ] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | LogLevel['level']>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const allCategories = useMemo(() => ['all', ...Array.from(new Set(logs.map(l => l.category))).sort()], [logs]);
  const allTags = useMemo(() => ['all', ...Array.from(new Set((logs.flatMap(l => l.tags ?? [])))).sort()], [logs]);
  const filtered = logs.filter(l => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
    if (tagFilter !== 'all' && !(l.tags || []).includes(tagFilter)) return false;
    if (!q) return true;
    const txt = `${l.timestamp} ${l.level} ${l.category} ${l.message} ${JSON.stringify(l.data)}`.toLowerCase();
    return txt.includes(q.toLowerCase());
  });

  // ====== 更新股票列表（範例：執行時暫時靜音 chart render）======
  const updateStockList = async () => {
    setIsUpdating(true);
    setUpdateMessage('正在更新股票列表…');

    // 一鍵暫時靜音渲染 log（避免吵）
    const orig = config.frontend.chartRender;
    const muted: FrontendChartRenderConfig =
      typeof orig === 'boolean'
        ? { enabled: false, level: config.frontend.level ?? 'info', init:false, indicators:false, resize:false, crosshair:false, cleanup:false, misc:false }
        : { ...orig, enabled: false };

    updatePath('frontend.chartRender', muted);

    try {
      const res = await fetch('/api/stocks/update', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data?.success) {
        setUpdateMessage(`✅ ${data.message}`);
        setStockStatus(data.data);
      } else {
        setUpdateMessage(`❌ ${data?.message || '更新失敗'}`);
      }
    } catch (e: any) {
      setUpdateMessage(`❌ 更新失敗: ${e?.message || e}`);
    } finally {
      // 還原 chartRender 設定
      updatePath('frontend.chartRender', orig);
      setIsUpdating(false);
    }
  };

  // ====== UI ======
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">系統後台管理</h1>
          <p className="text-gray-600">日誌配置、股票列表管理與系統監控</p>
        </div>

        {/* 股票管理 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">股票列表管理</h2>
            <button
              onClick={updateStockList}
              disabled={isUpdating}
              className={`px-4 py-2 text-sm font-medium rounded-md ${isUpdating ? 'bg-gray-400 text-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {isUpdating ? '更新中…' : '更新股票列表'}
            </button>
          </div>

          {updateMessage && (
            <div className={`mb-4 p-3 rounded-md ${updateMessage.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {updateMessage}
            </div>
          )}

          {stockStatus && stockStatus.breakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stockStatus.totalStocks || 0}</div>
                <div className="text-sm text-blue-800">總股票數量</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stockStatus.breakdown.twStocks || 0}</div>
                <div className="text-sm text-green-800">台股股票</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stockStatus.breakdown.twETFs || 0}</div>
                <div className="text-sm text-yellow-800">台股 ETF</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{(stockStatus.breakdown.usStocks || 0) + (stockStatus.breakdown.usETFs || 0)}</div>
                <div className="text-sm text-purple-800">美股總數</div>
              </div>
            </div>
          )}

          {stockStatus && (
            <div className="mt-4 text-sm text-gray-600">
              <p>最後更新時間：{stockStatus.lastUpdated ? new Date(stockStatus.lastUpdated).toLocaleString('zh-TW') : '未知'}</p>
              <p>版本：{stockStatus.version || '1.0.0'}</p>
            </div>
          )}
        </div>

        {/* ===== 日誌配置（完全 Schema 驅動） ===== */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">日誌配置</h2>
            <div className="flex items-center gap-2">
              <PresetButton onClick={()=>applyPresetConfig('production')} label="Production"/>
              <PresetButton onClick={()=>applyPresetConfig('debug-frontend')} label="Debug Frontend"/>
              <PresetButton onClick={()=>applyPresetConfig('silent')} label="Silent"/>
              <button onClick={resetConfig} className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">重置配置</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SECTIONS.map(sec => (
              <div key={sec.key} className="space-y-3">
                <h3 className="font-medium text-gray-900">{sec.title}</h3>
                <div className="space-y-2">
                  {sec.fields.map((f, idx) => {
                    if (f.type === 'switch') {
                      const val = !!getAtPath(config, f.path);
                      return <Switch key={idx} label={f.label} hint={f.hint} checked={val} onChange={(v)=>updatePath(f.path, v)} />;
                    }
                    if (f.type === 'level') {
                      const val = (getAtPath(config, f.path, 'info') as LogLevelName);
                      return <Level key={idx} label={f.label ?? '等級'} value={val} onChange={(v)=>updatePath(f.path, v)} />;
                    }
                    // custom
                    return (
                      <div key={idx}>
                        {f.render(config, (p, v) => updatePath(p, v))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 日誌監控（保留你原本的 viewer；下方簡版） ===== */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">日誌監控</h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center text-sm">
                <input type="checkbox" checked={autoScroll} onChange={e=>setAutoScroll(e.target.checked)} className="mr-2"/> 自動捲動
              </label>
              <button onClick={clearLogs} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">清空</button>
              <button onClick={exportLogs} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">導出</button>
            </div>
          </div>

          {/* 搜尋/篩選 */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋訊息/資料…" className="flex-1 min-w-[200px] border rounded px-2 py-1 text-sm"/>
            <select value={levelFilter} onChange={e=>setLevelFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
              <option value="all">所有等級</option><option value="error">error</option><option value="warn">warn</option><option value="info">info</option><option value="debug">debug</option>
            </select>
            <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={tagFilter} onChange={e=>setTagFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-gray-400">尚無日誌（或被篩選掉）</div>
            ) : filtered.map((log, i) => (
              <div key={i} className="mb-2">
                <span className="text-gray-500">[{log.timestamp}]</span>
                <span className={`ml-2 px-2 py-0.5 rounded ${badge(log.level)}`}>{log.level.toUpperCase()}</span>
                <span className="text-blue-400 ml-2">[{log.category}]</span>
                {log.tags?.length ? <span className="text-amber-300 ml-2">{log.tags.join(',')}</span> : null}
                <span className="ml-2 text-white">{log.message}</span>
                {typeof log.data !== 'undefined' && (
                  <pre className="ml-4 mt-1 text-gray-300 whitespace-pre-wrap break-all">
                    {safeStringify(log.data)}
                  </pre>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== 小元件 ===== */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1">
        {label}
        {hint ? <span className="text-gray-400" title={hint}>ⓘ</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} />
    </label>
  );
}

function Level({ value, onChange, label='等級' }: { value: LogLevelName; onChange: (v: LogLevelName) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value as LogLevelName)} className="border rounded px-2 py-0.5">
        <option value="off">off</option>
        <option value="error">error</option>
        <option value="warn">warn</option>
        <option value="info">info</option>
        <option value="debug">debug</option>
      </select>
    </div>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: ()=>void }) {
  return (
    <button onClick={onClick} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">{label}</button>
  );
}

function badge(lvl: LogLevel['level']) {
  return lvl === 'error' ? 'text-red-600 bg-red-50'
       : lvl === 'warn'  ? 'text-yellow-700 bg-yellow-50'
       : lvl === 'debug' ? 'text-gray-600 bg-gray-50'
       : 'text-blue-700 bg-blue-50';
}

/** 減少循環結構與 Error 物件序列化噪音 */
function safeStringify(input: any) {
  const seen = new WeakSet();
  return JSON.stringify(input, function (_k, v) {
    if (typeof v === 'object' && v !== null) { if (seen.has(v)) return '[Circular]'; seen.add(v); }
    if (v instanceof Error) { return { name: v.name, message: v.message, stack: v.stack }; }
    return v;
  }, 2);
}
