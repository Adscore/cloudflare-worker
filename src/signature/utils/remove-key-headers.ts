export function removeHeadersFromKey(key: string) {
  // get the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";

  if (!key.includes(pemHeader) && !key.includes(pemFooter)) {
    return key;
  }

  let pemContents = key.substring(
    pemHeader.length,
    key.length - pemFooter.length - 1
  );

  // remove line endings
  pemContents = pemContents.replace(/\n|\r/g, "");

  return pemContents;
}
