/* One fetch helper for the whole app: JSON in, JSON out, errors as readable messages. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) { super(message); }
}

export async function api<T>(path: string, opts: {method?: string; body?: unknown; form?: FormData; signal?: AbortSignal} = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    headers: opts.form ? undefined : opts.body !== undefined ? {'content-type': 'application/json'} : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    credentials: 'same-origin',
    signal: opts.signal,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (isJson && (data as {error?: string}).error) || `Request failed (${res.status})`;
    // A plan that ran out while a page was open: tell MeProvider, so the shell swaps the page for the locked card.
    if (res.status === 402 && isJson && (data as {paywall?: boolean}).paywall) window.dispatchEvent(new Event('parley:paywall'));
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

/** Fire-and-forget funnel analytics (our own table; no third-party tracker). */
export function track(name: string, data?: Record<string, unknown>) {
  void fetch('/api/event', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name, data}), keepalive: true}).catch(() => {});
}
