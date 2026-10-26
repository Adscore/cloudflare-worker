const decoder = new TextDecoder();

export function uInt8ArrayToString(
  input: Uint8Array | any,
  type: "hex" | "chars" = "chars"
): string {
  const isUIntArray = input instanceof Uint8Array;

  if (!isUIntArray) {
    return input?.toString();
  }

  switch (type) {
    case "chars":
      return decoder.decode(input);

    case "hex":
      let result = "";

      input.forEach((val) => (result += val.toString(16).padStart(2, "0")));

      return result;
  }

  throw new Error("Unsupported type: " + type);
}
