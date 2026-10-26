export function base64Decode(base64Input: string): Uint8Array {
  let repairedBase64Input = repairBase64(base64Input);

  var binaryString = atob(repairedBase64Input);

  var bytes = new Uint8Array(binaryString.length);

  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

export function encodeBase64(input: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(input)));
}

/**
 * Replace `-` to `+` and `_` to `/` that atob do not support.
 */
function repairBase64(base64Input: string) {
  const charMap: Record<string, string> = {
    "-": "+",
    _: "/",
  };

  let repairedBase64Input = "";

  for (const char of base64Input) {
    if (charMap[char] !== undefined) {
      repairedBase64Input += charMap[char];
    } else {
      repairedBase64Input += char;
    }
  }

  return repairedBase64Input?.trim();
}
