import { AbstractSymmetricCrypt } from "./abstract-symmetric-crypt";
import sodium from "libsodium-wrappers";
import { DecryptError } from "../errors/decrypt-error";
import { decodeStringToUint8Array } from "../../utils/decode-string-to-uint8-array";

/**
 * Sodium-based symmetric cryptography
 */
export class Secretbox extends AbstractSymmetricCrypt {
  public static readonly METHOD: number = 0x0101;
  public static readonly NONCE_BYTES: number = 24;
  public static readonly KEY_BYTES: number = 32;

  /**
   * Generates secretbox key from password and salt
   */
  public async key(password: Uint8Array, salt?: string): Promise<Uint8Array> {
    throw new Error("Not supported");
  }

  /**
   * Encrypt using key
   * @param string data Content to encrypt
   * @param Uint8Array key Encryption key
   * @return string Encrypted payload
   */
  public encryptWithKey(data: string, key: Uint8Array): string {
    throw new Error("Not supported");
  }

  /**
   * Decrypt using key
   * @param Uint8Array payload Content to decrypt
   * @param Uint8Array | string key Decryption key
   * @return Promise<Uint8Array> Decrypted payload
   * @throws DecryptError
   */
  public async decryptWithKey(
    payload: Uint8Array,
    key: Uint8Array | string
  ): Promise<Uint8Array> {
    const { method, iv, data } = this.parse(payload, {
      iv: Secretbox.NONCE_BYTES,
    });

    if (method !== Secretbox.METHOD) {
      throw new DecryptError("Unrecognized payload");
    }

    if (data === undefined) {
      throw new DecryptError("Not a valid payload");
    }

    const keyBytes =
      typeof key === "string" ? decodeStringToUint8Array(key) : key;

    if (keyBytes.length !== Secretbox.KEY_BYTES) {
      throw new DecryptError("Invalid key length");
    }

    try {
      await sodium.ready;
      const decrypted = sodium.crypto_secretbox_open_easy(data, iv, keyBytes);
      return decrypted;
    } catch (e: any) {
      throw new DecryptError(e?.message || "Not a valid payload");
    }
  }
}
