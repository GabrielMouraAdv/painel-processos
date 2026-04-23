import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_DOCUMENTOS = "documentos";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient: SupabaseClient | null = null;

function ensureEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.",
    );
  }
}

function ensureServerEnv(): void {
  ensureEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin nao configurado. Defina SUPABASE_SERVICE_ROLE_KEY no .env para uploads e exclusoes.",
    );
  }
}

function getServerClient(): SupabaseClient {
  ensureServerEnv();
  if (!serverClient) {
    serverClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}

export async function uploadFile(
  file: ArrayBuffer | Uint8Array | Buffer,
  path: string,
  contentType: string,
): Promise<string> {
  const client = getServerClient();
  const body =
    file instanceof ArrayBuffer
      ? Buffer.from(file)
      : Buffer.isBuffer(file)
        ? file
        : Buffer.from(file);
  const { error } = await client.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, body, {
      contentType,
      upsert: false,
    });
  if (error) {
    throw new Error(`Falha no upload: ${error.message}`);
  }
  return path;
}

export async function deleteFile(path: string): Promise<void> {
  const client = getServerClient();
  const { error } = await client.storage
    .from(BUCKET_DOCUMENTOS)
    .remove([path]);
  if (error) {
    throw new Error(`Falha ao remover arquivo: ${error.message}`);
  }
}

export function getPublicUrl(path: string): string {
  ensureEnv();
  const base = SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET_DOCUMENTOS}/${path}`;
}

export async function ensureBucket(): Promise<void> {
  const client = getServerClient();
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) return;
  if (buckets?.some((b) => b.name === BUCKET_DOCUMENTOS)) return;
  await client.storage.createBucket(BUCKET_DOCUMENTOS, { public: true });
}
