import { supabase } from '../../../lib/supabase';

export type AsistanMesaj = {
  role: 'user' | 'assistant';
  content: string;
};

export type AsistanKart = {
  type: 'room' | 'live' | 'user' | 'agency';
  id: string;
  title: string;
  subtitle?: string | null;
  cover_url?: string | null;
  href: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type AiAsistanSonuc =
  | { ok: true; reply: string; cards: AsistanKart[] }
  | { ok: false; code?: string };

/**
 * Tamuso DeepSeek asistanı — araçlarla oda/canlı/kişi listeler.
 */
export async function AiAsistanSohbet(input: {
  message: string;
  language: string;
  history?: AsistanMesaj[];
}): Promise<AiAsistanSonuc> {
  const message = input.message.trim();
  if (!message) return { ok: false, code: 'empty' };

  const { data, error } = await supabase.functions.invoke('deepseek-assistant', {
    body: {
      message,
      language: input.language,
      history: (input.history ?? []).slice(-10),
    },
  });

  if (error || !data?.ok) {
    return { ok: false, code: data?.code ?? error?.message };
  }

  const cards = Array.isArray(data.cards) ? (data.cards as AsistanKart[]) : [];
  return {
    ok: true,
    reply: String(data.reply ?? ''),
    cards,
  };
}
