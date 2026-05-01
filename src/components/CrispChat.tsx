'use client';

import { useEffect } from 'react';
import { Env } from '@/libs/Env';

/**
 * Loads the Crisp chat widget on the client.
 * Renders nothing if NEXT_PUBLIC_CRISP_WEBSITE_ID is not set.
 */
export function CrispChat() {
  useEffect(() => {
    const id = Env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!id) return;

    (window as any).$crisp = [];
    (window as any).CRISP_WEBSITE_ID = id;

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
