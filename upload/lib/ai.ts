/** One place for all model calls. Uses a free Gemini key if set, otherwise an Anthropic key. */
export interface AiImage {
  mimeType: string;
  /** base64 without the data: prefix */
  data: string;
}

export interface GenerateOptions {
  system: string;
  user: string;
  image?: AiImage;
  json?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

async function gemini(key: string, o: GenerateOptions, signal: AbortSignal): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const parts: any[] = [];
  if (o.image) parts.push({ inlineData: { mimeType: o.image.mimeType, data: o.image.data } });
  parts.push({ text: o.user });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: o.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: o.maxTokens ?? 2048,
        temperature: 0.3,
        ...(o.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) {
    console.error('[ai] Gemini error', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
}

async function anthropic(key: string, o: GenerateOptions, signal: AbortSignal): Promise<string | null> {
  const content: any[] = [];
  if (o.image) content.push({ type: 'image', source: { type: 'base64', media_type: o.image.mimeType, data: o.image.data } });
  content.push({ type: 'text', text: o.user });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: o.maxTokens ?? 1200,
      system: o.system,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    console.error('[ai] Anthropic error', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  return (data.content ?? []).map((c: any) => (c.type === 'text' ? c.text : '')).join('');
}

/** Returns the model's text, or null if no key is set or the call failed (callers must have a fallback). */
export async function generate(o: GenerateOptions): Promise<string | null> {
  const g = process.env.GEMINI_API_KEY;
  const a = process.env.ANTHROPIC_API_KEY;
  if (!g && !a) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 25000);
  try {
    return g ? await gemini(g, o, ctrl.signal) : await anthropic(a!, o, ctrl.signal);
  } catch (e) {
    console.error('[ai] call failed:', e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function extractJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export const LANGUAGES: Record<string, string> = { en: 'English', hi: 'Hindi', te: 'Telugu', es: 'Spanish' };
