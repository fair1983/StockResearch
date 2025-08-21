'use client';

import { useEffect } from 'react';
import { installConsoleBridge } from '@/lib/console-bridge';
import { logger } from '@/lib/logger';

export default function ConsoleSilencer() {
  useEffect(() => {
    const restore = installConsoleBridge(() => logger.getConfig());
    return restore;
  }, []);
  return null;
}
