import { ByteOperations } from "../byte-operations";

/**
 * Partial Implementation of PHP's `unpack`, see https://www.php.net/manual/en/function.unpack
 */
export function unpack(
  format: string,
  input: Uint8Array
): Record<string, number | bigint | Uint8Array> {
  const instructions = format?.split("/");

  let currentBytesOffset = 0;

  const result: Record<string, number | bigint> = {};

  for (const instruction of instructions) {
    const { code, name } = getCodeAndName(instruction);

    const { bytesOffset, decodedData } = decode(
      input,
      code,
      currentBytesOffset
    );

    currentBytesOffset += bytesOffset;

    result[name] = decodedData;
  }

  return result;
}

function decode(
  input: Uint8Array,
  code: string,
  offset: number
): { decodedData: number | bigint; bytesOffset: number } {
  if (offset > input.length) {
    throw new Error(
      `Buffer overflow. Current: ${input.length}, requested: ${offset}`
    );
  }

  switch (code) {
    // signed char
    case "c":
      return {
        bytesOffset: 1,
        decodedData: new ByteOperations(input).readInt8(offset),
      };

    // unsigned char
    case "C":
      return {
        bytesOffset: 1,
        decodedData: new ByteOperations(input).readUInt8(offset),
      };

    // unsigned short (always 16 bit, big endian byte order)
    case "n":
      return {
        bytesOffset: 2,
        decodedData: new ByteOperations(input).readInt16BE(offset),
      };

    // 	unsigned long (always 32 bit, big endian byte order)
    case "N":
      return {
        bytesOffset: 4,
        decodedData: new ByteOperations(input).readUInt32BE(offset),
      };

    // unsigned long long (always 64 bit, big endian byte order)
    case "J":
      return {
        bytesOffset: 8,
        decodedData: new ByteOperations(input).readBigUInt64BE(offset),
      };

    // 	unsigned short (always 16 bit, little endian byte order)
    case "v":
      return {
        bytesOffset: 2,
        decodedData: new ByteOperations(input).readInt16LE(offset),
      };
  }

  throw new Error(`Unrecognized instruction: ${code}`);
}

function getCodeAndName(instruction: string): {
  name: string;
  code: string;
} {
  if (!instruction?.length) {
    throw new Error("Empty instruction");
  }

  return {
    code: instruction.charAt(0),
    name: instruction.substring(1),
  };
}
