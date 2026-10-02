/**
 * deepseek-assistant — JWT auth → DeepSeek tool-calling agent.
 * Lists real rooms/lives/users via tools. Secret: DEEPSEEK_API_KEY.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders,
  deepseekChatMessages,
  json,
  langLabel,
  type ChatMessage,
} from '../_shared/deepseek/helpers.ts';
import { TAMUSO_ASSISTANT_SYSTEM } from '../_shared/deepseek/knowledge.ts';
import {
  ASSISTANT_TOOLS,
  executeAssistantTool,
  type AsistanKart,
} from '../_shared/deepseek/tools.ts';

const MAX_MSG = 1200;
const MAX_HISTORY = 10;
const MAX_TOOL_ROUNDS = 3;

type ChatMsg = { role: 'user' | 'assistant'; content: string };

type Body = {
  message?: string;
  language?: string;
  history?: ChatMsg[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim();

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);

  if (!apiKey) return json({ ok: false, code: 'CONFIG_ERROR' }, 503);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const message = (body.message ?? '').trim().slice(0, MAX_MSG);
  if (!message) return json({ error: 'empty' }, 400);

  const admin = createClient(supabaseUrl, service);

  const { data: flag } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'ai_assistant_enabled')
    .maybeSingle();
  if (flag && flag.enabled === false) {
    return json({ ok: false, code: 'FEATURE_DISABLED' }, 403);
  }

  const { data: kill } = await admin
    .from('kill_switches')
    .select('active')
    .eq('key', 'kill_ai_assistant')
    .maybeSingle();
  if (kill?.active) {
    return json({ ok: false, code: 'FEATURE_DISABLED' }, 403);
  }

  const lang = (body.language ?? 'en').trim().toLowerCase().slice(0, 8);
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string',
        )
        .slice(-MAX_HISTORY)
    : [];

  const system =
    TAMUSO_ASSISTANT_SYSTEM +
    `\n\n## Current user language\nReply in ${langLabel(lang)} (code: ${lang}).`;

  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.trim().slice(0, MAX_MSG),
    })),
    { role: 'user', content: message },
  ];

  const collectedCards: AsistanKart[] = [];
  const seenIds = new Set<string>();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await deepseekChatMessages({
      apiKey,
      messages,
      tools: ASSISTANT_TOOLS,
      temperature: 0.35,
      maxTokens: 900,
    });

    if (!result.ok) {
      const status = result.status === 429 ? 429 : 502;
      return json({ ok: false, code: result.code }, status);
    }

    const msg = result.message;
    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    const toolCalls = msg.tool_calls;
    if (!toolCalls?.length) {
      const reply = (msg.content ?? '').trim();
      return json({
        ok: true,
        reply:
          reply ||
          (collectedCards.length
            ? lang.startsWith('tr')
              ? 'İşte bulduklarım — birine dokunarak açabilirsin.'
              : 'Here is what I found — tap a card to open.'
            : lang.startsWith('tr')
              ? 'Şu an uygun sonuç bulamadım.'
              : 'I could not find matching results right now.'),
        cards: collectedCards,
        model: 'deepseek-chat',
      });
    }

    for (const call of toolCalls) {
      const name = call.function?.name ?? '';
      const args = call.function?.arguments ?? '{}';
      const toolOut = await executeAssistantTool(userClient, name, args);
      for (const c of toolOut.cards) {
        const k = `${c.type}:${c.id}`;
        if (!seenIds.has(k)) {
          seenIds.add(k);
          collectedCards.push(c);
        }
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name,
        content: JSON.stringify({
          ok: toolOut.ok,
          summary: toolOut.summary,
          count: toolOut.count,
          error: toolOut.error ?? null,
          items: toolOut.cards.map((c) => ({
            type: c.type,
            id: c.id,
            title: c.title,
            subtitle: c.subtitle,
            href: c.href,
          })),
        }),
      });
    }
  }

  // Max rounds exhausted — return whatever we have
  return json({
    ok: true,
    reply: lang.startsWith('tr')
      ? 'İşte bulabildiğim sonuçlar.'
      : 'Here are the results I found.',
    cards: collectedCards,
    model: 'deepseek-chat',
  });
});
