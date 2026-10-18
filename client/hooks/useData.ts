import type { Notify } from '../types.ts';
import { useState, useEffect } from 'react';
import { api } from '../api.ts';
export function useData<T>(path: string, notify: Notify, poll = false) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let active = true;
    const load = () =>
      api<T>(path)
        .then((r) => {
          if (active) setData(r);
        })
        .catch((e) => {
          if (active) notify(e.message);
        });
    load();
    const timer = poll
      ? setInterval(() => {
          if (!document.hidden) load();
        }, 4000)
      : null;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [path, notify, poll]);
  return [data, setData] as const;
}
