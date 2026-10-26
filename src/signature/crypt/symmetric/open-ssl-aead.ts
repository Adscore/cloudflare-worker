import { DecryptError } from "../errors/decrypt-error";
import { OpenSSL } from "./open-ssl";
import { decodeStringToUint8Array } from "../../utils/decode-string-to-uint8-array";

/**
 * OpenSSL-based symmetric cryptography
 *
 */
export class OpenSSLAEAD extends OpenSSL {
  public static readonly METHOD: number = 0x0201;

  protected tagLength = 16;

  public constructor() {
    super("aes-256-gcm");
  }

  /**
   * Decrypt using key
   *
   * @param string payload       Content to decrypt
   * @param string key           Decryption key
   * @param string aad           Additional authentication data
   * @return string               Decrypted payload
   * @throws DecryptError
   */
  public async decryptWithKey(
    payload: Uint8Array,
    key: Uint8Array | string,
    aad: string = "",
  ): Promise<Uint8Array> {
    const {
      method: method,
      iv: iv,
      tag: tag,
      data: data,
    } = this.parse(payload, {
      iv: this.ivLengths[this.method],
      tag: this.tagLength,
    });

    if (method !== OpenSSLAEAD.METHOD) {
      throw new DecryptError("Unrecognized payload");
    }

    const keyBytes =
      typeof key === "string" ? decodeStringToUint8Array(key) : key;

    if (keyBytes.length !== this.getKeyLength()) {
      throw new DecryptError("Invalid key length");
    }

    return this.decode(
      data ?? new Uint8Array(),
      this.method,
      keyBytes,
      iv,
      tag,
    );
  }
}
