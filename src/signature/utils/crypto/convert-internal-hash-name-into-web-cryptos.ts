export function convertInternalHashNameIntoWebCryptos(algo: string) {
  let hash = "SHA-256";

  switch (algo.toLowerCase()) {
    case "sha256":
    case "sha-256":
      hash = "SHA-256";
      break;
    case "sha512":
    case "sha-512":
      hash = "SHA-512";
      break;
    default:
      throw new Error("Unsupported HASH algorithm");
  }
  return hash;
}
