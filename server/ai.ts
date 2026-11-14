/* Structured AI calls with a JSON schema, on Gemini or Claude. The model writes; our code checks and scores.
   Keys live only in the server's .env — never in the repo or the browser.
   AI_PROVIDER=gemini|anthropic picks the first choice; if it fails with an account/quota error (402/403/429)
   and the other provider has a key, the call is retried there, so one depleted account doesn't take the product down. */

import Anthropic from '@anthropic-ai/sdk';

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

/* A ceiling on model calls per day, so a loop or a scraper can't drain the API balance (AI_DAILY_CAP, default 400). */
let capDay = '', capUsed = 0;
function spendOne() {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== capDay) { capDay = day; capUsed = 0; }
  if (++capUsed > Number(env('AI_DAILY_CAP') || 400)) throw new AiError('Parley is very busy right now. Please try again in a little while.', 429);
}

export async function geminiJSON<T>(opts: AiCall): Promise<T> {
  spendOne();
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
/* Structured outputs (output_config.format) keep the answer schema-shaped; forced tool_choice is a 400 on current models.
   Server-side fallbacks ("default") re-run a declined request on a fallback model inside the same call. */
let claude: Anthropic | null = null;

async function callClaude<T>(opts: AiCall): Promise<T> {
  claude ??= new Anthropic({apiKey: env('ANTHROPIC_API_KEY'), maxRetries: 1});
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const im of opts.images ?? []) {
    content.push(im.mimeType === 'application/pdf'
      ? {type: 'document', source: {type: 'base64', media_type: 'application/pdf', data: im.dataBase64}}
      : {type: 'image', source: {type: 'base64', media_type: im.mimeType as 'image/png', data: im.dataBase64}});
  }
  content.push({type: 'text', text: opts.prompt});
  try {
    const res = await claude.beta.messages.create({
      model: env('ANTHROPIC_MODEL') || 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Low effort: these are short structured answers and the person is waiting on them.
      output_config: {effort: (env('ANTHROPIC_EFFORT') || 'low') as 'low', format: {type: 'json_schema', schema: toJsonSchema(opts.schema) as Record<string, unknown>}},
      system: opts.system,
      messages: [{role: 'user', content}],
    }, {timeout: opts.timeoutMs ?? 90_000});
    if (res.stop_reason === 'refusal') throw new AiError('The model declined this request', 422);
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    try { return JSON.parse(text) as T; } catch { throw new AiError('Claude returned invalid JSON', 502); }
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.APIError) throw new AiError(`Claude ${e.status}: ${e.message.slice(0, 300)}`, e.status ?? 0);
    throw e;
  }
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
  if (out.type === 'object' && out.properties && !('additionalProperties' in out)) out.additionalProperties = false;
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
