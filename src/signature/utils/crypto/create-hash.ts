import { convertInternalHashNameIntoWebCryptos } from "./convert-internal-hash-name-into-web-cryptos";

export async function createHash(
  algorithm: string,
  input: Uint8Array | string
): Promise<Uint8Array> {
  let hash = convertInternalHashNameIntoWebCryptos(algorithm);

  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : input;

  const arrayBuffer = await crypto.subtle.digest(hash, data);
  return new Uint8Array(arrayBuffer);
}
