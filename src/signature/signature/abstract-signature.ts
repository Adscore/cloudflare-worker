import { AbstractFormatter } from "../formatter/abstract-formatter";
import { Base64 } from "../formatter/base64";
import { substrBinary } from "../utils/php/substr";
import { VerifyError } from "./error/verify-error";
import { CryptKeyCallback } from "./signature5";

export type Payload = Record<string, any>;

/**
 * Abstract signature
 */
export abstract class AbstractSignature {
  protected payload: Payload | null = null;
  protected result: number | null = null;

  protected structType?: string;
  protected encryptionType?: string;

  /**
   * Retrieve embedded payload
   * @return Payload | null
   */
  public getPayload(): Payload | null {
    return this.payload;
  }

  /**
   * Embed new payload
   * @param payload
   * @return void
   */
  public setPayload(payload: Payload): void {
    this.payload = payload;
  }

  /**
   * Returns name of the struct (serializer) class used to decode the payload
   * @return string | undefined
   */
  public getStructType(): string | undefined {
    return this.structType;
  }

  /**
   * Returns name of the crypt class used to decrypt the payload
   * @return string | undefined
   */
  public getEncryptionType(): string | undefined {
    return this.encryptionType;
  }

  /**
   * Returns verification result
   */
  public getResult(): number {
    if (this.result === null) {
      throw new VerifyError("Result unavailable for unverified signature");
    }
    return this.result;
  }

  /**
   * Simplified signature parsing/validation
   * @param signature Signature content
   * @param ipAddresses Array of client's IP addresses
   * @param userAgent Client's User Agent
   * @param cryptKey Signature decoding key
   * @param formatter Optional formatter (if signature content is not a standard Base64)
   * @return AbstractSignature
   */
  public static createFromRequest(
    signature: string,
    ipAddresses: Array<string>,
    userAgent: string,
    cryptKey: Uint8Array | CryptKeyCallback | string,
    formatter: AbstractFormatter | null = null
  ): AbstractSignature | Promise<AbstractSignature> {
    throw new Error("Not implemented");
  }

  /**
   * Returns default formatter
   * @return AbstractFormatter
   */
  protected getDefaultFormatter(): AbstractFormatter {
    return new Base64(Base64.BASE64_VARIANT_URLSAFE_NO_PADDING, true);
  }

  public bytesCompare(
    known: Uint8Array | null,
    user: Uint8Array | null,
    n: number
  ): boolean {
    if (known === null || user === null) {
      return false;
    }

    if (known.length < n || user.length < n) {
      return false;
    }
    
    return this.hashEquals(substrBinary(known, 0, n), substrBinary(user, 0, n));
  }

  private hashEquals(known: Uint8Array, user: Uint8Array): boolean {
    if (known.length !== user.length) {
      return false;
    }

    return known.every((value, index) => value === user[index]);
  }
}
