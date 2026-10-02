import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from 'npm:@aws-sdk/client-s3@3.686.0';
import { FetchHttpHandler } from 'npm:@smithy/fetch-http-handler@3.2.8';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.686.0';

export type R2Env = {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucket: string;
};

export function r2EnvOku(): R2Env | null {
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')?.trim() ?? '';
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')?.trim() ?? '';
  const endpoint = Deno.env.get('R2_ENDPOINT')?.trim() ?? '';
  const bucket = Deno.env.get('R2_BUCKET')?.trim() ?? '';
  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) return null;
  return { accessKeyId, secretAccessKey, endpoint, bucket };
}

function istemci(env: R2Env): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: env.endpoint,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    forcePathStyle: true,
    maxAttempts: 1,
    requestHandler: new FetchHttpHandler({ requestTimeout: 8_000 }),
  });
}

function r2Hatasi(err: unknown): { ok: false; code: string; httpStatus: number | null } {
  if (err instanceof Error && err.message === 'SURE') return { ok: false, code: 'R2_TIMEOUT', httpStatus: null };
  const row = err && typeof err === 'object' ? err as { name?: string; $metadata?: { httpStatusCode?: number } } : {};
  const httpStatus = row.$metadata?.httpStatusCode ?? null;
  const name = String(row.name ?? 'PUT').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  if (httpStatus === 401 || httpStatus === 403) return { ok: false, code: 'R2_AUTH', httpStatus };
  if (httpStatus != null && httpStatus >= 500) return { ok: false, code: 'R2_UNAVAILABLE', httpStatus };
  console.error(JSON.stringify({ studio: 'r2', code: name, httpStatus }));
  return { ok: false, code: httpStatus ? `R2_${httpStatus}` : 'R2_PUT', httpStatus };
}

export async function r2Yukle(env: R2Env, key: string, body: Uint8Array, mime: string): Promise<{ ok: true } | { ok: false; code: string; httpStatus: number | null }> {
  try {
    const client = istemci(env);
    await client.send(new PutObjectCommand({
      Bucket: env.bucket,
      Key: key,
      Body: body,
      ContentType: mime,
    }));
    return { ok: true };
  } catch (err) {
    return r2Hatasi(err);
  }
}

export function oyunAnahtari(gameId: string, version: number, klasor: string, dosya: string): string {
  return `games/${gameId}/versions/${version}/${klasor}/${dosya}`;
}

export async function r2VarMi(env: R2Env, key: string): Promise<boolean> {
  try {
    const client = istemci(env);
    await client.send(new HeadObjectCommand({ Bucket: env.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function r2Imza(env: R2Env, key: string, saniye = 600): Promise<string | null> {
  try {
    const client = istemci(env);
    return await getSignedUrl(client, new GetObjectCommand({ Bucket: env.bucket, Key: key }), { expiresIn: saniye });
  } catch {
    return null;
  }
}

export async function r2Sil(env: R2Env, key: string): Promise<boolean> {
  try {
    const client = istemci(env);
    await client.send(new DeleteObjectCommand({ Bucket: env.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
