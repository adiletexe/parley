/* Gemini over REST with a JSON response schema. The model writes; our code checks and scores.
   GEMINI_API_KEY lives only in the server's .env — never in the repo or the browser. */

const KEY = () => process.env.GEMINI_API_KEY || '';
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash';

export interface AiImage { mimeType: string; dataBase64: string }

export async function geminiJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: object;               // OpenAPI-style schema (Gemini responseSchema)
  images?: AiImage[];
  temperature?: number;
  timeoutMs?: number;
}): Promise<T> {
  if (!KEY()) throw new Error('GEMINI_API_KEY is not set');
  const parts: object[] = [{text: opts.prompt}];
  for (const im of opts.images ?? []) parts.push({inline_data: {mime_type: im.mimeType, data: im.dataBase64}});
  const body = {
    system_instruction: {parts: [{text: opts.system}]},
    contents: [{role: 'user', parts}],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      responseMimeType: 'application/json',
      responseSchema: opts.schema,
    },
  };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 45_000);
  try {
    let last: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent?key=${KEY()}`, {
        method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body), signal: ctl.signal,
      });
      if (!res.ok) { last = new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`); if (res.status >= 500 || res.status === 429) continue; throw last; }
      const j = await res.json() as {candidates?: {content?: {parts?: {text?: string}[]}}[]};
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      try { return JSON.parse(text) as T; } catch (e) { last = new Error('Gemini returned invalid JSON'); }
    }
    throw last;
  } finally { clearTimeout(t); }
}
