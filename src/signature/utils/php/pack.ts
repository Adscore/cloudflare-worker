import { ByteOperations } from "../byte-operations";
import { contactUint8Array } from "../contact-uint8-array";

/**
 * Partial Implementation of PHP's `pack`, see https://www.php.net/manual/en/function.pack
 */
export function pack(
  format: string,
  ...inputs: Array<number | bigint>
): Uint8Array {
  const instructions = format?.split("");

  if (instructions.length !== inputs.length) {
    throw new Error(
      `Invalid format length, expected ${inputs.length} number of codes`
    );
  }

  const result: Uint8Array[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const { code, name } = getCodeAndName(instructions[i]);
    const encodedData = encode(inputs[i], code);
    result.push(encodedData);
  }

  return contactUint8Array(result);
}

function encode(input: number | bigint, code: string): Uint8Array {
  switch (code) {
    // signed char
    case "c":
      throwIfBigInt(input, "char");
      const c = new ByteOperations(new Uint8Array(1));
      c.writeInt8(input);
      return c;
    // unsigned char
    case "C":
      throwIfBigInt(input, "char");
      const C = new ByteOperations(new Uint8Array(1));
      C.writeUInt8(input);
      return C;

    // unsigned short (always 16 bit, big endian byte order)
    case "n":
      throwIfBigInt(input, "short");
      const n = new ByteOperations(new Uint8Array(2));
      n.writeInt16BE(input);
      return n;

    // 	unsigned long (always 32 bit, big endian byte order)
    case "N":
      throwIfBigInt(input, "short");
      const N = new ByteOperations(new Uint8Array(4));
      N.writeUInt32BE(input);
      return N;

    // unsigned long long (always 64 bit, big endian byte order)
    case "J":
      const j = new ByteOperations(new Uint8Array(8));
      j.writeBigUInt64BE(BigInt(input));
      return j;

    // 	unsigned short (always 16 bit, little endian byte order)
    case "v":
      throwIfBigInt(input, "short");
      const v = new ByteOperations(new Uint8Array(2));
      v.writeInt16LE(input);
      return v;
  }

  throw new Error(`Unrecognized instruction: ${code}`);
}

function throwIfBigInt(
  input: number | bigint,
  type: string
): asserts input is number {
  if (typeof input === "bigint") {
    throw new Error("Cannot write bigint into " + type);
  }
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
