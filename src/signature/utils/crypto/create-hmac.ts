import { convertInternalHashNameIntoWebCryptos } from "./convert-internal-hash-name-into-web-cryptos";

export async function createHmac(
  algo: string,
  input: Uint8Array,
  secret: Uint8Array
) {
  let hash = convertInternalHashNameIntoWebCryptos(algo);

  let algorithm = { name: "HMAC", hash };

  let key = await crypto.subtle.importKey(
    "raw",
    secret,
    algorithm,
    false,
    ["sign", "verify"]
  );

  let signature = await crypto.subtle.sign(algorithm.name, key, input);

  return new Uint8Array(signature);
}
