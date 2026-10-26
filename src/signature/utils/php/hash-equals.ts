import { createHash } from "../crypto/create-hash";

export async function hashEquals(input: Uint8Array, compare: Uint8Array) {
  try {
    const a = await createHash("sha256", input);
    const b = await createHash("sha256", compare);

    const decoder = new TextDecoder();

    return decoder.decode(a) === decoder.decode(b);
  } catch (e) {
    console.error(e);
    return false;
  }
}
