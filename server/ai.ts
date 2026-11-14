/* Structured AI calls with a JSON schema, on Gemini or Claude. The model writes; our code checks and scores.
   Keys live only in the server's .env — never in the repo or the browser.
   AI_PROVIDER=gemini|anthropic picks the first choice; if it fails with an account/quota error (402/403/429)
   and the other provider has a key, the call is retried there, so one depleted account doesn't take the product down. */

export interface AiImage { mimeType: string; dataBase64: string }   // image/* or application/pdf

export interface AiCall {
  system: string;
  prompt: string;
  schema: object;               // JSON-schema-like (OpenAPI subset): {type:'object', properties, required, enum, items…}
  images?: AiImage[];
  temperature?: number;
  timeoutMs?: number;
}

class AiError extends Error { constructor(msg: string, public status = 0) { super(msg); } }

const env = (k: string) => (process.env[k] || '').trim();
const hasGemini = () => !!env('GEMINI_API_KEY');
const hasClaude = () => !!env('ANTHROPIC_API_KEY');

export async function geminiJSON<T>(opts: AiCall): Promise<T> {
  const first = env('AI_PROVIDER') === 'anthropic' || !hasGemini() ? 'anthropic' : 'gemini';
  const order: ('gemini' | 'anthropic')[] = first === 'gemini' ? ['gemini', 'anthropic'] : ['anthropic', 'gemini'];
  let last: unknown = new Error('No AI provider is configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)');
  for (const p of order) {
    if (p === 'gemini' && !hasGemini()) continue;
    if (p === 'anthropic' && !hasClaude()) continue;
    try {
      return p === 'gemini' ? await callGemini<T>(opts) : await callClaude<T>(opts);
    } catch (e) {
      last = e;
      const st = e instanceof AiError ? e.status : 0;
      // Fall through to the other provider only for account/quota/outage errors, not for a bad request.
      if (!(st === 402 || st === 403 || st === 429 || st >= 500 || st === 0)) throw e;
      console.warn(`[ai] ${p} failed (${st}): ${(e as Error).message.slice(0, 160)}`);
    }
  }
  throw last;
}

/* ---------------- Gemini ---------------- */
async function callGemini<T>(opts: AiCall): Promise<T> {
  const parts: object[] = [{text: opts.prompt}];
  for (const im of opts.images ?? []) parts.push({inline_data: {mime_type: im.mimeType, data: im.dataBase64}});
  const body = {
    system_instruction: {parts: [{text: opts.system}]},
    contents: [{role: 'user', parts}],
    generationConfig: {temperature: opts.temperature ?? 0.4, responseMimeType: 'application/json', responseSchema: opts.schema},
  };
  const model = env('GEMINI_MODEL') || 'gemini-3.5-flash';
  return withRetry(async (signal) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: {'content-type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY')}, body: JSON.stringify(body), signal,
    });
    if (!res.ok) throw new AiError(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
    const j = await res.json() as {candidates?: {content?: {parts?: {text?: string}[]}}[]};
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try { return JSON.parse(text) as T; } catch { throw new AiError('Gemini returned invalid JSON', 502); }
  }, opts.timeoutMs);
}

/* ---------------- Claude ---------------- */
async function callClaude<T>(opts: AiCall): Promise<T> {
  const content: object[] = [];
  for (const im of opts.images ?? []) {
    content.push(im.mimeType === 'application/pdf'
      ? {type: 'document', source: {type: 'base64', media_type: 'application/pdf', data: im.dataBase64}}
      : {type: 'image', source: {type: 'base64', media_type: im.mimeType, data: im.dataBase64}});
  }
  content.push({type: 'text', text: opts.prompt});
  // Forcing a single tool whose input_schema is our schema is the reliable way to get schema-shaped JSON from Claude.
  const body = {
    model: env('ANTHROPIC_MODEL') || 'claude-sonnet-5-5',
    max_tokens: 4096,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    tools: [{name: 'respond', description: 'Return the answer in exactly this structure.', input_schema: toJsonSchema(opts.schema)}],
    tool_choice: {type: 'tool', name: 'respond'},
    messages: [{role: 'user', content}],
  };
  return withRetry(async (signal) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: {'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01'},
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new AiError(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status === 529 ? 503 : res.status);
    const j = await res.json() as {content?: {type: string; input?: unknown}[]};
    const use = j.content?.find((b) => b.type === 'tool_use');
    if (!use?.input) throw new AiError('Claude returned no structured answer', 502);
    return use.input as T;
  }, opts.timeoutMs);
}

/** Gemini's responseSchema allows upper-case OpenAPI types and `nullable`; JSON Schema wants lower-case types. */
function toJsonSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(toJsonSchema);
  if (!s || typeof s !== 'object') return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (k === 'type' && typeof v === 'string') out.type = v.toLowerCase();
    else if (k === 'nullable' || k === 'propertyOrdering') continue;
    else out[k] = toJsonSchema(v);
  }
  return out;
}

async function withRetry<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs = 60_000): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try { return await fn(ctl.signal); }
    catch (e) {
      last = e;
      const st = e instanceof AiError ? e.status : 0;
      if (!(st === 429 || st >= 500 || (e as Error).name === 'AbortError')) throw e;   // retry only transient failures
    } finally { clearTimeout(t); }
  }
  throw last;
}
