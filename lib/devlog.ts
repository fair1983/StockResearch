// lib/devlog.ts
import { logger } from '@/lib/logger';

export const dbg = (tag: string) => (...args: any[]) => {
  const cfg = logger.getConfig();
  // 只在 frontend.level=debug 且 chartRender.enabled=true 時輸出
  const cr = cfg.frontend.chartRender;
  const can = (cfg.frontend.level === 'debug') && (typeof cr === 'boolean' ? cr : !!cr?.enabled);
  if (can) console.debug(`[${tag}]`, ...args);
};
