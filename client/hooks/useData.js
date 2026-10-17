import { useState, useEffect } from 'react';
import { api } from '../api';
export function useData(path, notify, poll = false) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    const load = () =>
      api(path)
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
      clearInterval(timer);
    };
  }, [path, notify, poll]);
  return [data, setData];
}
