/** Shared DeepSeek helpers — API key never logged. */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders });
}

export const DEEPSEEK_BASE = 'https://api.deepseek.com';
export const DEEPSEEK_MODEL = 'deepseek-chat';

export const LANG_NAMES: Record<string, string> = {
  tr: 'Turkish',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  ar: 'Arabic',
  fr: 'French',
  fil: 'Filipino',
};

export function langLabel(code: string): string {
  const c = code.trim().toLowerCase().split('-')[0] ?? 'en';
  return LANG_NAMES[c] ?? code;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type ToolDef = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export async function deepseekChatMessages(input: {
  apiKey: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  maxTokens?: number;
}): Promise<
  | { ok: true; message: ChatMessage; raw: unknown }
  | { ok: false; code: string; status?: number }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const body: Record<string, unknown> = {
      model: DEEPSEEK_MODEL,
      messages: input.messages,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 1200,
    };
    if (input.tools?.length) {
      body.tools = input.tools;
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 429) return { ok: false, code: 'RATE_LIMIT', status: 429 };
      if (res.status === 401 || res.status === 403) {
        return { ok: false, code: 'CONFIG_ERROR', status: res.status };
      }
      return { ok: false, code: 'PROVIDER_ERROR', status: res.status };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: ChatMessage }>;
    };
    const message = data.choices?.[0]?.message;
    if (!message) return { ok: false, code: 'EMPTY_RESPONSE' };
    return { ok: true, message, raw: data };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, code: 'TIMEOUT' };
    }
    return { ok: false, code: 'PROVIDER_ERROR' };
  } finally {
    clearTimeout(timeout);
  }
}

/** Simple single-turn helper (translate etc.) */
export async function deepseekChat(input: {
  apiKey: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<
  | { ok: true; content: string }
  | { ok: false; code: string; status?: number }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const body: Record<string, unknown> = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 1024,
    };
    if (input.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 429) return { ok: false, code: 'RATE_LIMIT', status: 429 };
      if (res.status === 401 || res.status === 403) {
        return { ok: false, code: 'CONFIG_ERROR', status: res.status };
      }
      return { ok: false, code: 'PROVIDER_ERROR', status: res.status };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, code: 'EMPTY_RESPONSE' };
    return { ok: true, content };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, code: 'TIMEOUT' };
    }
    return { ok: false, code: 'PROVIDER_ERROR' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
