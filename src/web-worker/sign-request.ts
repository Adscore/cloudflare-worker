import { base64Decode, encodeBase64 } from "../signature/utils/php/base64";

export async function signRequest(
  requestKey: string,
  ipAddress: string,
  userAgent: string
): Promise<string | undefined> {
  const invalidRequestKey =
    !requestKey ||
    requestKey.length === 0 ||
    requestKey.indexOf("<request_key>") === 0 ||
    requestKey.includes("_or_leave_empty") ||
    requestKey.includes("paste_") ||
    requestKey.startsWith("<");

  if (invalidRequestKey) {
    return undefined;
  }

  const secret = base64Decode(requestKey);
  const encoder = new TextEncoder();

  const body = [ipAddress, userAgent].join("\n");

  const algorithm = { name: "HMAC", hash: "SHA-256" };

  const key = await crypto.subtle.importKey("raw", secret, algorithm, false, [
    "sign",
    "verify",
  ]);

  const signature = await crypto.subtle.sign(
    algorithm.name,
    key,
    encoder.encode(body)
  );

  const digest = encodeBase64(signature);

  return digest;
}
