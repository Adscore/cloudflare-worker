export function substr(input: string, offset: number, length?: number): string {
  if (length !== undefined) {
    // substring accept `end` where in PHP it accept `length`
    return input.substring(offset, offset + length);
  }

  return input.substring(offset, length);
}

export function substrBinary(
  input: Uint8Array,
  offset: number,
  length?: number
): Uint8Array {

  if (length !== undefined) {
    return input.slice(offset, offset + length);
  }

  return input.slice(offset);
}
