import { AbstractSymmetricCrypt } from "../crypt/symmetric/abstract-symmetric-crypt";
import { AbstractFormatter } from "../formatter/abstract-formatter";
import { AbstractStruct } from "../struct/abstract-struct";
import { isset } from "../utils/php/isset";
import { strcmp } from "../utils/php/strcmp";
import { unpack } from "../utils/php/unpack";
import { AbstractSignature, Payload } from "./abstract-signature";
import { CryptFactory } from "../crypt/crypt-factory";
import { StructFactory } from "../struct/struct.factory";
import { inet_pton } from "locutus/php/network/inet_pton";
import { VerifyError } from "./error/verify-error";
import { SignatureParseError } from "./error/parse-error";
import { substrBinary } from "../utils/php/substr";
import { decodeStringToUint8Array } from "../utils/decode-string-to-uint8-array";

export type CryptKeyCallback = (zoneId: number | bigint) => Uint8Array | string;

/**
 * Signature v5 envelope/parser
 */
export class Signature5 extends AbstractSignature {
  public VERSION = 5;
  protected HEADER_LENGTH = 11;

  protected zoneId: number | bigint | undefined;

  /**
   * Creates a new signature envelope
   */
  constructor(zoneId?: bigint, payload?: Payload) {
    super();
    this.zoneId = zoneId;
    this.payload = payload ?? null;
  }

  /**
   * Retrieve zone ID
   * @return int|null
   */
  public getZoneId(): bigint | number | undefined {
    return this.zoneId;
  }

  /**
   * Embed new zone ID
   * @param int zoneId
   * @return void
   */
  public setZoneId(zoneId: bigint): void {
    this.zoneId = zoneId;
  }

  /**
   * Simplified signature parsing/validation
   * @param string signature
   * @param array ipAddresses
   * @param string userAgent
   * @param Closure|string cryptKey
   * @param AbstractFormatter|null formatter
   * @return self
   */
  public static async createFromRequest(
    signature: string,
    ipAddresses: Array<string>,
    userAgent: string,
    cryptKey: Uint8Array | CryptKeyCallback,
    formatter: AbstractFormatter | null = null,
  ): Promise<AbstractSignature> {
    const obj = new Signature5();
    await obj.parse(signature, this.toCallback(cryptKey), formatter);

    obj.verify(ipAddresses, userAgent);
    return obj;
  }

  private static toCallback(
    input: Uint8Array | CryptKeyCallback,
  ): CryptKeyCallback {
    if (input instanceof Uint8Array) {
      return (zoneId: number | bigint) => input;
    }

    return input;
  }

  /**
   * Default V5 signature validator
   * @param array result
   * @param array ipAddresses
   * @param string userAgent
   * @throws Error
   */
  public verify(ipAddresses: Array<string>, userAgent: string): boolean {
    if (
      isset(this.payload?.["ipv4.ip"]) &&
      typeof this.payload?.["ipv4.ip"] !== "string"
    ) {
      throw new VerifyError("Invalid IPv4 address");
    }

    let ipv4V = 4;
    if (isset(this.payload?.["ipv4.v"])) {
      const v =
        typeof this.payload?.["ipv4.v"] === "string" &&
        /^\d+$/.test(this.payload?.["ipv4.v"])
          ? Number(this.payload?.["ipv4.v"])
          : this.payload?.["ipv4.v"];
      if (typeof v !== "number" || v <= 0) {
        throw new VerifyError("Invalid IPv4 mask");
      }
      ipv4V = v;
    }

    if (
      isset(this.payload?.["ipv6.ip"]) &&
      typeof this.payload?.["ipv6.ip"] !== "string"
    ) {
      throw new VerifyError("Invalid IPv6 address");
    }

    let ipv6V = 16;
    if (isset(this.payload?.["ipv6.v"])) {
      const v =
        typeof this.payload?.["ipv6.v"] === "string" &&
        /^\d+$/.test(this.payload?.["ipv6.v"])
          ? Number(this.payload?.["ipv6.v"])
          : this.payload?.["ipv6.v"];
      if (typeof v !== "number" || v <= 0) {
        throw new VerifyError("Invalid IPv6 mask");
      }
      ipv6V = v;
    }

    let matchingIp = null;

    for (const ipAddress of ipAddresses) {
      const nIpAddress = decodeStringToUint8Array(inet_pton(ipAddress));

      if (
        // ip v4
        (isset(this.payload?.["ipv4.ip"]) &&
          this.payload?.["ipv4.ip"] !== "" &&
          this.bytesCompare(
            nIpAddress,
            decodeStringToUint8Array(inet_pton(this.payload?.["ipv4.ip"])),
            ipv4V,
          )) ||
        // ip v6
        (isset(this.payload?.["ipv6.ip"]) &&
          this.payload?.["ipv6.ip"] !== "" &&
          this.bytesCompare(
            nIpAddress,
            decodeStringToUint8Array(inet_pton(this.payload?.["ipv6.ip"])),
            ipv6V,
          ))
      ) {
        matchingIp = ipAddress;
        break;
      }
    }

    if (matchingIp === null) {
      throw new VerifyError("Signature IP mismatch");
    }

    if (!isset(this.payload?.["b.ua"])) {
      throw new VerifyError("Signature contains no user agent");
    }

    if (typeof this.payload?.["b.ua"] !== "string") {
      throw new VerifyError("Invalid user agent");
    }

    if (
      typeof userAgent !== "string" ||
      strcmp(this.payload?.["b.ua"], userAgent) !== 0
    ) {
      throw new VerifyError("Signature user agent mismatch");
    }

    if (isset(this.payload?.["result"])) {
      const res =
        typeof this.payload?.["result"] === "string" &&
        /^\d+$/.test(this.payload?.["result"])
          ? Number(this.payload?.["result"])
          : this.payload?.["result"];
      if (typeof res !== "number") {
        throw new VerifyError("Invalid result");
      }
      this.result = res;
    } else {
      this.result = null;
    }

    return true;
  }

  /**
   * Produce an encrypted signature
   * @param AdScore\Common\Struct\AbstractStruct struct
   * @param AdScore\Common\Crypt\Symmetric\AbstractSymmetricCrypt crypt
   * @param string cryptKey
   * @param AdScore\Common\Formatter\AbstractFormatter formatter		Signature formatter
   * @return string
   */
  public format(
    struct: AbstractStruct,
    crypt: AbstractSymmetricCrypt,
    cryptKey: Uint8Array,
    formatter: AbstractFormatter | null = null,
  ): string {
    throw new Error("Not supported");
  }

  /**
   * Parses and decodes a signature
   * @param string signature Formatted signature
   * @param Closure onCryptKeyRequest Zone ID is passed as parameter, this callback should return a decryption key
   * @param AdScore\Common\Formatter\AbstractFormatter formatter Signature format decoder
   */
  public async parse(
    signature: string,
    onCryptKeyRequest: (zoneId: bigint | number) => Uint8Array | string,
    formatter: AbstractFormatter | null = null,
  ): Promise<void> {
    formatter ??= this.getDefaultFormatter();
    const payload = formatter?.parse(signature);
    if (payload.length <= this.HEADER_LENGTH) {
      throw new SignatureParseError("Malformed signature");
    }

    const { version, length, zone_id } = unpack(
      "Cversion/nlength/Jzone_id",
      new Uint8Array(payload ?? []),
    );
    if (version !== this.VERSION) {
      throw new SignatureParseError("Invalid signature version");
    }

    const encryptedPayload = substrBinary(
      payload,
      this.HEADER_LENGTH,
      Number(length),
    );

    if (encryptedPayload.length < Number(length)) {
      throw new SignatureParseError("Truncated signature payload");
    }

    this.payload = (await this.decryptPayload(
      encryptedPayload,
      onCryptKeyRequest(zone_id as bigint),
    )) as any;

    this.zoneId = zone_id as bigint;
  }

  /**
   * Decrypts and unpacks payload
   * @param string payload
   * @param string key
   * @return array
   */
  protected async decryptPayload(
    payload: Uint8Array,
    key: Uint8Array | string,
  ): Promise<object> {
    const crypt = CryptFactory.createFromPayload(payload);
    const decryptedPayload = await crypt.decryptWithKey(payload, key);

    const struct = StructFactory.createFromPayload(decryptedPayload);

    const unpackedPayload = struct.unpack(decryptedPayload);

    if (typeof unpackedPayload !== "object") {
      throw new SignatureParseError(
        "Unexpected payload type " + typeof unpackedPayload,
      );
    }

    this.structType = struct.constructor.name;
    this.encryptionType = crypt.constructor.name;

    return unpackedPayload;
  }
}
