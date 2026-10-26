/**
 * Partial Buffer.js polyfill
 * From: https://github.com/feross/buffer
 * MIT License: https://github.com/feross/buffer?tab=License-1-ov-file#readme
 */
export class ByteOperations extends Uint8Array {
  public writeInt8(value: number, offset = 0, noAssert?: boolean) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) this.checkInt(this, value, offset, 1, 0x7f, -0x80);
    if (value < 0) value = 0xff + value + 1;
    this[offset] = value & 0xff;
    return offset + 1;
  }

  writeUInt8(value: number, offset = 0, noAssert?: boolean) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) this.checkInt(this, value, offset, 1, 0xff, 0);
    this[offset] = value & 0xff;
    return offset + 1;
  }

  writeInt16BE(value: number, offset = 0, noAssert?: boolean) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) this.checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    this[offset] = value >>> 8;
    this[offset + 1] = value & 0xff;
    return offset + 2;
  }

  writeUInt32BE(value: number, offset = 0, noAssert?: boolean) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) this.checkInt(this, value, offset, 4, 0xffffffff, 0);
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 0xff;
    return offset + 4;
  }

  writeBigUInt64BE(value: bigint, offset = 0) {
    return this.wrtBigUInt64BE(
      this,
      value,
      offset,
      BigInt(0) as any,
      BigInt("0xffffffffffffffff") as any
    );
  }

  writeInt16LE(value: number, offset = 0, noAssert?: boolean) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) this.checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    this[offset] = value & 0xff;
    this[offset + 1] = value >>> 8;
    return offset + 2;
  }

  readInt8(offset = 0, noAssert?: boolean) {
    offset = offset >>> 0;
    if (!noAssert) this.checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80)) return this[offset];
    return (0xff - this[offset] + 1) * -1;
  }

  readUInt8(offset = 0, noAssert?: boolean) {
    offset = offset >>> 0;
    if (!noAssert) this.checkOffset(offset, 1, this.length);
    return this[offset];
  }

  readInt16BE(offset = 0, noAssert?: boolean) {
    offset = offset >>> 0;
    if (!noAssert) this.checkOffset(offset, 2, this.length);
    const val = this[offset + 1] | (this[offset] << 8);
    return val & 0x8000 ? val | 0xffff0000 : val;
  }

  readUInt32BE(offset = 0, noAssert?: boolean) {
    offset = offset >>> 0;
    if (!noAssert) this.checkOffset(offset, 4, this.length);

    return (
      this[offset] * 0x1000000 +
      ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3])
    );
  }

  readInt16LE(offset = 0, noAssert?: boolean) {
    offset = offset >>> 0;
    if (!noAssert) this.checkOffset(offset, 2, this.length);
    const val = this[offset] | (this[offset + 1] << 8);
    return val & 0x8000 ? val | 0xffff0000 : val;
  }

  readBigUInt64BE(offset = 0) {
    offset = offset >>> 0;
    this.validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === undefined || last === undefined) {
      throw new Error("Out of bounds");
    }

    const hi =
      first * 2 ** 24 +
      this[++offset] * 2 ** 16 +
      this[++offset] * 2 ** 8 +
      this[++offset];

    const lo =
      this[++offset] * 2 ** 24 +
      this[++offset] * 2 ** 16 +
      this[++offset] * 2 ** 8 +
      last;

    return (BigInt(hi) << BigInt(32)) + BigInt(lo);
  }

  private validateNumber(value: number, name: string) {
    if (typeof value !== "number") {
      throw new Error("Invalid arg type");
    }
  }

  private checkBounds(buf: Uint8Array, offset: number, byteLength: number) {
    this.validateNumber(offset, "offset");
    if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
      throw new Error("Out of bounds");
    }
  }

  private checkIntBI(
    value: bigint,
    min: bigint,
    max: bigint,
    buf: Uint8Array,
    offset: number,
    byteLength: number
  ) {
    if (value > max || value < min) {
      const n = typeof min === "bigint" ? "n" : "";
      let range;
      if (byteLength > 3) {
        if (min === 0n || min === BigInt(0)) {
          range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
        } else {
          range =
            `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
            `${(byteLength + 1) * 8 - 1}${n}`;
        }
      } else {
        range = `>= ${min}${n} and <= ${max}${n}`;
      }
      throw new Error("Out of range");
    }
    this.checkBounds(buf, offset, byteLength);
  }

  private wrtBigUInt64BE(
    buf: Uint8Array,
    value: bigint,
    offset: number,
    min: number,
    max: number
  ) {
    this.checkIntBI(value, min as any, max as any, buf, offset, 7);

    let lo = Number(value & BigInt(0xffffffff));
    buf[offset + 7] = lo;
    lo = lo >> 8;
    buf[offset + 6] = lo;
    lo = lo >> 8;
    buf[offset + 5] = lo;
    lo = lo >> 8;
    buf[offset + 4] = lo;
    let hi = Number((value >> BigInt(32)) & BigInt(0xffffffff));
    buf[offset + 3] = hi;
    hi = hi >> 8;
    buf[offset + 2] = hi;
    hi = hi >> 8;
    buf[offset + 1] = hi;
    hi = hi >> 8;
    buf[offset] = hi;
    return offset + 8;
  }

  private checkInt(
    buf: Uint8Array,
    value: number,
    offset: number,
    ext: number,
    max: number,
    min: number
  ) {
    if (value > max || value < min)
      throw new RangeError('"value" argument is out of bounds');
    if (offset + ext > buf.length) throw new RangeError("Index out of range");
  }

  private boundsError(value: number, length: number, type: string) {
    if (Math.floor(value) !== value) {
      this.validateNumber(value, type);
      throw new Error(`Out of range`);
    }

    if (length < 0) {
      throw new Error("Out of bounds");
    }

    throw new Error("Out of range");
  }

  private checkOffset(offset: number, ext: number, length: number) {
    if (offset % 1 !== 0 || offset < 0)
      throw new RangeError("offset is not uint");
    if (offset + ext > length)
      throw new RangeError("Trying to access beyond buffer length");
  }
}
