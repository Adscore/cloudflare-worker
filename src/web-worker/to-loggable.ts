import { encodeBase64 } from "../signature/utils/php/base64";

/**
 * Converts values that Cloudflare log serialization can't handle
 * (BigInt, binary data, Map) into JSON-friendly representations.
 */
export function toLoggable(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Uint8Array) {
    return { base64: encodeBase64(value.slice().buffer) };
  }
  if (Array.isArray(value)) {
    return value.map(toLoggable);
  }
  if (value instanceof Map) {
    return toLoggable(Object.fromEntries(value));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toLoggable(item)]),
    );
  }
  return value;
}

