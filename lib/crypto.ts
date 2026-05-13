import crypto from "node:crypto";

// AES-256-GCM para campos sensiveis no banco (ex.: tokens de bots).
// A chave esta em ENCRYPTION_KEY (base64, 32 bytes). Use
//   openssl rand -base64 32
// para gerar.

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY nao configurada");
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
  } catch {
    throw new Error("ENCRYPTION_KEY invalida: nao consegui decodificar base64");
  }
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY invalida: precisa de ${KEY_BYTES} bytes (atual: ${buf.length})`,
    );
  }
  cachedKey = buf;
  return buf;
}

// Encripta uma string e devolve um payload base64 contendo iv + tag + cipher.
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_BYTES + 16 + 1) {
    throw new Error("Payload criptografado invalido");
  }
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + 16);
  const enc = buf.subarray(IV_BYTES + 16);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function tryDecrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}
