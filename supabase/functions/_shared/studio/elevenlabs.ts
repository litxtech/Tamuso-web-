const SES = 'https://api.elevenlabs.io/v1/sound-generation';
const MUZIK = 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128';
const SESLI = 'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM';

type Sonuc = { ok: true; bytes: Uint8Array; mime: string } | { ok: false; code: string; status?: number };

function anahtar(key: string): HeadersInit {
  return { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' };
}

export async function elevenSfxOlustur(key: string, prompt: string, ambience: boolean): Promise<Sonuc> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const res = await fetch(SES, {
      method: 'POST',
      headers: anahtar(key),
      body: JSON.stringify({
        text: prompt.slice(0, 450),
        duration_seconds: ambience ? 8 : 2.5,
        prompt_influence: 0.45,
        model_id: 'eleven_text_to_sound_v2',
        loop: ambience,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, code: res.status === 401 ? 'ELEVEN_AUTH' : 'ELEVEN_SFX', status: res.status };
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 800) return { ok: false, code: 'ELEVEN_EMPTY' };
    return { ok: true, bytes, mime: 'audio/mpeg' };
  } catch {
    return { ok: false, code: 'ELEVEN_TIMEOUT' };
  } finally {
    clearTimeout(timer);
  }
}

export async function elevenMuzikOlustur(key: string, prompt: string): Promise<Sonuc> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28_000);
  try {
    const res = await fetch(MUZIK, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        prompt: prompt.slice(0, 400),
        music_length_ms: 10000,
        model_id: 'music_v2',
        force_instrumental: true,
        store_for_inpainting: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, code: 'ELEVEN_MUSIC', status: res.status };
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 800) return { ok: false, code: 'ELEVEN_EMPTY' };
    return { ok: true, bytes, mime: 'audio/mpeg' };
  } catch {
    return { ok: false, code: 'ELEVEN_TIMEOUT' };
  } finally {
    clearTimeout(timer);
  }
}

export async function elevenSesOlustur(key: string, text: string): Promise<Sonuc> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(SESLI, {
      method: 'POST',
      headers: anahtar(key),
      body: JSON.stringify({
        text: text.slice(0, 280),
        model_id: 'eleven_multilingual_v2',
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, code: 'ELEVEN_VOICE', status: res.status };
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 800) return { ok: false, code: 'ELEVEN_EMPTY' };
    return { ok: true, bytes, mime: 'audio/mpeg' };
  } catch {
    return { ok: false, code: 'ELEVEN_TIMEOUT' };
  } finally {
    clearTimeout(timer);
  }
}
