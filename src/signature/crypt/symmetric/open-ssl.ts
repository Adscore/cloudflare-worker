import { AbstractSymmetricCrypt } from "./abstract-symmetric-crypt";
import { InvalidArgumentError } from "../../errors/invalid-argument-error";
import { DecryptError } from "../errors/decrypt-error";
import { CryptParseError } from "../errors/parse-error";
import { decodeStringToUint8Array } from "../../utils/decode-string-to-uint8-array";

export class OpenSSL extends AbstractSymmetricCrypt {
  public static readonly METHOD: number = 0x0200;

  protected method: string = "aes-256-cbc";
  protected algo: string = "sha256";
  protected options: number = 0;
  protected ivLengths: { [key: string]: number } = {
    ["aes-128-cbc"]: 16,
    ["aes-192-cbc"]: 16,
    ["aes-256-cbc"]: 16,
    ["aes-128-gcm"]: 12,
    ["aes-192-gcm"]: 12,
    ["aes-256-gcm"]: 12,
  };

  constructor(method: string = "aes-256-cbc", algo: string = "sha256") {
    super();

    const validMethods = [
      "aes-128-cbc",
      "aes-192-cbc",
      "aes-256-cbc",
      "aes-128-gcm",
      "aes-192-gcm",
      "aes-256-gcm",
    ];
    if (!validMethods.includes(method)) {
      throw new InvalidArgumentError(`Invalid cipher method "${method}"`);
    }
    this.method = method;
    const validAlgorithms = ["sha256", "sha512"];
    if (!validAlgorithms.includes(algo)) {
      throw new InvalidArgumentError(`Invalid hash method "${algo}"`);
    }
    this.algo = algo;
  }

  public async key(password: Uint8Array, salt?: string): Promise<Uint8Array> {
    throw new Error("Not supported");
  }

  protected getIvLength(): number {
    switch (this.method) {
      case "aes-128-cbc":
      case "aes-192-cbc":
      case "aes-256-cbc":
        return 16;
      case "aes-128-gcm":
      case "aes-192-gcm":
      case "aes-256-gcm":
        return 12;
      default:
        throw new InvalidArgumentError(`Unsupported method "${this.method}"`);
    }
  }

  protected getKeyLength(): number {
    switch (this.method) {
      case "aes-128-cbc":
      case "aes-128-gcm":
        return 16;
      case "aes-192-cbc":
      case "aes-192-gcm":
        return 24;
      case "aes-256-cbc":
      case "aes-256-gcm":
        return 32;
      default:
        throw new InvalidArgumentError(`Unsupported method "${this.method}"`);
    }
  }

  public encryptWithKey(data: string, key: Uint8Array): string {
    throw new Error("Not supported");
  }

  public async decryptWithKey(
    payload: Uint8Array,
    key: Uint8Array | string,
  ): Promise<Uint8Array> {
    const { method, iv, data } = this.parse(payload, {
      iv: this.ivLengths[this.method],
    });
    if (method !== OpenSSL.METHOD) {
      throw new DecryptError("Unrecognized payload");
    }

    if (!data || data.length === 0) {
      throw new CryptParseError("Premature data end");
    }

    if (data.length % 16 !== 0) {
      throw new DecryptError("Invalid ciphertext length");
    }

    const keyBytes =
      typeof key === "string" ? decodeStringToUint8Array(key) : key;

    if (keyBytes.length !== this.getKeyLength()) {
      throw new DecryptError("Invalid key length");
    }

    return this.decode(data, this.method, keyBytes, iv);
  }

  protected async decode(
    encryptedData: Uint8Array,
    method: string,
    key: Uint8Array | string,
    iv: Uint8Array,
    tag?: Uint8Array,
  ) {
    const keyBytes =
      typeof key === "string" ? decodeStringToUint8Array(key) : key;

    if (keyBytes.length !== this.getKeyLength()) {
      throw new DecryptError("Invalid key length");
    }

    if (method.endsWith("-cbc")) {
      if (!encryptedData || encryptedData.length === 0) {
        throw new CryptParseError("Premature data end");
      }

      if (encryptedData.length % 16 !== 0) {
        throw new DecryptError("Invalid ciphertext length");
      }
    }

    const tagLength = tag?.length ?? 0;

    const algorithmName = method
      .replace("-128", "")
      .replace("-192", "")
      .replace("-256", "");

    const algorithm = {
      name: algorithmName,
      iv,
      tagLength: tagLength * 8,
    };

    try {
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        false,
        ["decrypt"],
      );

      const combinedData = new Uint8Array(encryptedData.length + tagLength);
      combinedData.set(encryptedData, 0);

      // in original lib, `crypto` has native `.setAuthTag(tag)` which `crypto.subtle` lacks
      if (!!tag && tagLength > 0) {
        combinedData.set(tag, encryptedData.length); // Append the authTag to the end
      }

      const decryptedBuffer = await crypto.subtle.decrypt(
        algorithm,
        cryptoKey,
        combinedData,
      );

      return new Uint8Array(decryptedBuffer);
    } catch (e: any) {
      if (e instanceof DecryptError || e instanceof CryptParseError) {
        throw e;
      }
      throw new DecryptError(e?.message || "Not a valid payload");
    }
  }
}
