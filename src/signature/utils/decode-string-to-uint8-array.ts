export function decodeStringToUint8Array(
  input: string | Uint8Array | false | null | undefined,
): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (!input || typeof input !== "string") {
    return new Uint8Array(0);
  }
  const result = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    result[i] = input.charCodeAt(i) & 0xff;
  }
  return result;
}
