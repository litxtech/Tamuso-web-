export type DosyaRaporu = {
  ok: boolean;
  code: string;
  triangles: number | null;
  bytes: number;
};

export function glbDogrula(bytes: Uint8Array): DosyaRaporu {
  if (bytes.byteLength < 20 || bytes.byteLength > 18_000_000) {
    return { ok: false, code: bytes.byteLength > 18_000_000 ? 'TOO_LARGE' : 'SHORT', triangles: null, bytes: bytes.byteLength };
  }
  if (bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) {
    return { ok: false, code: 'FORMAT', triangles: null, bytes: bytes.byteLength };
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let json: { meshes?: { primitives?: { indices?: number }[] }[]; accessors?: { count?: number }[] } | null = null;
  while (offset + 8 <= bytes.byteLength) {
    const len = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    offset += 8;
    if (len <= 0 || offset + len > bytes.byteLength) break;
    if (type === 0x4e4f534a) {
      try {
        json = JSON.parse(new TextDecoder().decode(bytes.subarray(offset, offset + len)));
      } catch {
        json = null;
      }
    }
    offset += len;
  }
  let triangles = 0;
  for (const mesh of json?.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const index = prim.indices;
      const count = index == null ? 0 : json?.accessors?.[index]?.count ?? 0;
      triangles += Math.floor(count / 3);
    }
  }
  if (triangles > 200_000) {
    return { ok: false, code: 'TOO_DENSE', triangles, bytes: bytes.byteLength };
  }
  return { ok: true, code: 'OK', triangles: triangles || null, bytes: bytes.byteLength };
}

export function sesDogrula(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 800 || bytes.byteLength > 8_000_000) return false;
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  const wav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  return id3 || frame || wav;
}

export function gorselDogrula(bytes: Uint8Array, mime: string): boolean {
  if (bytes.byteLength < 32 || bytes.byteLength > 4_000_000) return false;
  if (mime === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50;
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === 'image/webp') return bytes[0] === 0x52 && bytes[8] === 0x57;
  return false;
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
