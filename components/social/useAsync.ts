'use client';
// useAsync — tiny data-loading hook. `key` identifies the request (change it to refetch);
// `reload()` refetches the same key. Out-of-order responses are ignored.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

export function useAsync<T>(key: string, fn: () => Promise<T>): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ id: string; data?: T; error?: unknown } | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const id = `${key}#${nonce}`;

  useEffect(() => {
    let alive = true;
    fnRef.current().then(
      (data) => alive && setState({ id, data }),
      (error) => alive && setState({ id, error }),
    );
    return () => {
      alive = false;
    };
  }, [id]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = state && state.id === id ? state : null;
  return { data: current?.data, error: current?.error, loading: !current, reload };
}
