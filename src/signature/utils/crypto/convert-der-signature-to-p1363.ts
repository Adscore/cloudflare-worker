import { ByteOperations } from "../byte-operations";
import { contactUint8Array } from "../contact-uint8-array";
import { substrBinary } from "../php/substr";

const UINT32_READ_BUFFER = new Uint8Array(4);

/**
 * Partial signature library
 * From: https://www.npmjs.com/package/@litert/signatures
 * Apache 2.0 License: https://github.com/litert/signatures.js?tab=Apache-2.0-1-ov-file#readme
 */
export function derToP1363(der: Uint8Array): Uint8Array {
  let ctx: [number, number] = [0, 0];

  let [, offset] = derReadLength(der, 1);

  ctx = derReadLength(der, ++offset);
  offset = ctx[1];

  const r = removePrependZero(der.slice(offset, offset + ctx[0]));

  offset += ctx[0];

  ctx = derReadLength(der, ++offset);

  offset = ctx[1];

  const s = removePrependZero(der.slice(offset, offset + ctx[0]));

  if (s.length > r.length) {
    return contactUint8Array([new Uint8Array(s.length - r.length), r, s]);
  } else if (r.length > s.length) {
    return contactUint8Array([r, new Uint8Array(r.length - s.length), s]);
  }

  return contactUint8Array([r, s]);
}

export function derReadLength(
  input: Uint8Array,
  offset: number
): [number, number] {
  let length = input[offset++];

  /**
   * Using long form length if it's larger than 0x7F.
   *
   * @see https://stackoverflow.com/a/47099047
   */
  if (length > 0x7f) {
    const llen = length & 0x7f;
    UINT32_READ_BUFFER.fill(0);

    const source = substrBinary(input, offset, offset + llen);

    const targetStart = 4 - llen;

    UINT32_READ_BUFFER.set(
      substrBinary(source, 0, 4 - targetStart),
      targetStart
    );

    length = new ByteOperations(UINT32_READ_BUFFER).readUInt32BE(0);
    offset += llen;
  }

  return [length, offset];
}

function removePrependZero(bf: Uint8Array): Uint8Array {
  let i = 0;

  for (; i < bf.length && !bf[i]; i++);

  if (i === bf.length) {
    return bf.slice(0, 1);
  }

  return bf.slice(i);
}
