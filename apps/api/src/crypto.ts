export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Google refresh token 等の秘密情報を保存する際の暗号鍵を SESSION_SECRET から導出する。
 * 専用の secret を別途追加運用せずに済むよう、既存の SESSION_SECRET をドメイン分離した
 * 文字列と一緒にハッシュ化して鍵にする。
 */
async function deriveEncryptionKey(sessionSecret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`logue-secret-encryption:${sessionSecret}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** AES-GCM で暗号化し、"iv:ciphertext"（いずれも base64url）の形式で返す。 */
export async function encryptSecret(plaintext: string, sessionSecret: string): Promise<string> {
  const key = await deriveEncryptionKey(sessionSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${base64UrlEncode(iv)}:${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

export async function decryptSecret(encoded: string, sessionSecret: string): Promise<string> {
  const [ivPart, cipherPart] = encoded.split(":");
  if (!ivPart || !cipherPart) {
    throw new Error("不正な暗号化データ形式です");
  }
  const key = await deriveEncryptionKey(sessionSecret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(ivPart) },
    key,
    base64UrlDecode(cipherPart),
  );
  return new TextDecoder().decode(plaintext);
}
