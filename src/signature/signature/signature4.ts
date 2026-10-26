import { Judge } from "../definition/judge";
import { AbstractSignature, Payload } from "./abstract-signature";
import { VerifyError } from "./error/verify-error";
import { VersionError } from "./error/version-error";
import { ParseError } from "../errors/parse-error";
import { arrayKeyExists } from "../utils/php/array-key-exists";
import { sprintf } from "../utils/php/sprintf";
import { AdscoreError } from "../errors/adscore-error";
import { empty } from "../utils/php/empty";
import { hashEquals } from "../utils/php/hash-equals";
import { inet_ntop } from "locutus/php/network/inet_ntop";
import { inet_pton } from "locutus/php/network/inet_pton";
import { ip2long, long2ip } from "../utils/php/ip";
import { uInt8ArrayToString } from "../utils/uint8-array-to-string";
import { AbstractFormatter } from "../formatter/abstract-formatter";
import { AsymmetricOpenSSL } from "../crypt/asymmetric/open-ssl";
import { createHmac } from "../utils/crypto/create-hmac";
import { isset } from "../utils/php/isset";
import { unpack } from "../utils/php/unpack";
import { substrBinary } from "../utils/php/substr";
import { strlen } from "../utils/php/strlen";

/**
 * Signature v4 parser
 */
export class Signature4 extends AbstractSignature {
  public readonly VERSION: number = 4;

  private readonly FIELD_IDS: Record<
    number,
    { name: string | null; type: string }
  > = {
    /* ulong fields */
    0x00: { name: "requestTime", type: "ulong" },
    0x01: { name: "signatureTime", type: "ulong" },

    0x10: { name: "ipv4", type: "ulong" } /* Debug field */,
    /* ushort fields */
    0x40: { name: null, type: "ushort" } /* Reserved for future use */,
    /* uchar fields */
    0x80: { name: "masterSignType", type: "uchar" },
    0x81: { name: "customerSignType", type: "uchar" },
    /* string fields */
    0xc0: { name: "masterToken", type: "string" },
    0xc1: { name: "customerToken", type: "string" },
    0xc2: { name: "masterToken6", type: "string" },
    0xc3: { name: "customerToken6", type: "string" },
    0xc4: { name: "ipv6", type: "string" },
    0xc5: { name: "masterChecksum", type: "string" },

    0xd0: { name: "userAgent", type: "string" } /* Debug field */,
  };

  public HASH_SHA256 = 1; /* Default HASH: using SHA256 */
  public SIGN_SHA256 = 2; /* Default SIGN: using SHA256 */

  private SIMPLE_TYPES: Record<string, { unpack: string; size: number }> = {
    uchar: { unpack: "Cx/Cv", size: 2 },
    ushort: { unpack: "Cx/nv", size: 3 },
    ulong: { unpack: "Cx/Nv", size: 5 },
    string: { unpack: "Cx/nv", size: 3 /* + length(value) */ },
  };

  protected verificationData: Record<string, any> | null = null;

  public constructor(payload: Payload | null = null) {
    super();
    this.payload = payload;
  }

  /**
   * Simplified signature parsing/validation
   * @param string signature
   * @param array ipAddresses
   * @param string userAgent
   * @param string cryptKey
   * @param AbstractFormatter|null formatter
   * @return self
   */
  public static async createFromRequest(
    signature: string,
    ipAddresses: string[],
    userAgent: string,
    cryptKey: Uint8Array,
    formatter: AbstractFormatter | null = null,
  ): Promise<AbstractSignature> {
    const obj = new Signature4();
    obj.parse(signature, formatter);

    await obj.verify(ipAddresses, userAgent, cryptKey);

    return obj;
  }

  public parse(
    signature: string,
    formatter: AbstractFormatter | null = null,
  ): void {
    formatter ??= this.getDefaultFormatter();
    this.payload = this.parseStructure(signature, formatter);
  }

  protected getHashBase(
    result: number,
    requestTime: number,
    signatureTime: number,
    ipAddress: string,
    userAgent: string,
  ): string {
    return [result, requestTime, signatureTime, ipAddress, userAgent].join(
      "\n",
    );
  }

  protected signData(
    data: string,
    privateKey: string,
    algorithm: string = "sha256",
  ): Uint8Array {
    throw new Error("Not supported");
  }

  protected async verifyData(
    data: string,
    signature: Uint8Array,
    publicKey: Uint8Array,
    algorithm: string = "sha256",
  ): Promise<boolean> {
    const crypt = new AsymmetricOpenSSL(algorithm);
    return await crypt.verify(data, signature, publicKey);
  }

  protected async hashData(
    data: string,
    salt: Uint8Array,
    algorithm: string = "sha256",
  ): Promise<Uint8Array> {
    const binaryData = new TextEncoder().encode(data);

    return await createHmac(algorithm, binaryData, salt);
  }

  public getVerificationData(): Payload | null {
    return this.verificationData;
  }

  /**
   * Verifies signature
   * @param array ipAddresses
   * @param string userAgent
   * @param string cryptKey
   * @param string signRole
   * @param array|null results
   * @return bool
   * @throws VerifyError
   */
  public async verify(
    ipAddresses: string[],
    userAgent: string,
    cryptKey: Uint8Array,
    signRole: string = "customer",
    results: any | null = null,
  ): Promise<boolean> {
    results ??= Judge.RESULTS;
    if (!isset(this.payload?.[signRole + "Token"])) {
      throw new VerifyError("Invalid sign role");
    }

    const signType = this.payload?.[signRole + "SignType"];

    for (let ipAddress of ipAddresses) {
      /* Detect whether it's IPv4 or IPv6, normalize */
      const longIp = ip2long(ipAddress);

      ipAddress = "";

      let token: Uint8Array = new Uint8Array();

      let v = 4;
      if (longIp !== false) {
        ipAddress = long2ip(longIp);
        token = this.payload?.[signRole + "Token"];
      } else {
        const packed = inet_pton(ipAddress);
        if (packed === false) {
          continue;
        }
        const ntop = inet_ntop(packed);
        if (ntop === false) {
          continue;
        }
        ipAddress = ntop;
        token = this.payload?.[signRole + "Token6"] ?? null;
        v = 6;
        if (token === null) {
          continue;
        }
      }

      /* Check all possible results */
      for (let result in results) {
        let meta = results[Number(result)];

        meta = typeof meta === "object" ? meta : {};
        const signatureBase = this.getHashBase(
          Number(result),
          this.payload?.["requestTime"],
          this.payload?.["signatureTime"],
          ipAddress,
          userAgent,
        );
        switch (signType) {
          case this.HASH_SHA256:
            const xToken = await this.hashData(
              signatureBase,
              cryptKey,
              "sha256",
            );

            const enc = new TextEncoder();

            if (await hashEquals(xToken, token)) {
              this.verificationData = {
                verdict: meta["verdict"] ?? null,
                result: Number(result),
                [`ipv${v}.ip`]: ipAddress,
                embeddedIpV6: this.verifyEmbeddedIpv6(
                  Number(result),
                  cryptKey,
                  userAgent,
                  signRole,
                ),
              };
              this.result = Number(result);
              return true;
            }
            break;
          case this.SIGN_SHA256:
            const xValid = await this.verifyData(
              signatureBase,
              token,
              cryptKey,
              "sha256",
            );

            if (xValid) {
              this.verificationData = {
                verdict: meta["verdict"] ?? null,
                result: Number(result),
                "ipv{v}.ip": ipAddress,
                embeddedIpV6: this.verifyEmbeddedIpv6(
                  Number(result),
                  cryptKey,
                  userAgent,
                  signRole,
                ),
              };
              this.result = Number(result);
              return true;
            }
            break;
          default:
            throw new VerifyError(
              "Unrecognized sign type: " + uInt8ArrayToString(signType),
            );
        }
      }
    }
    throw new VerifyError("No verdict matched", 10);
  }

  /**
   * Allows to transport IPv6 over sessions
   * @param int result
   * @param string key
   * @param string userAgent
   * @param string signRole
   * @return string|null
   */
  protected async verifyEmbeddedIpv6(
    result: number,
    key: Uint8Array,
    userAgent: string,
    signRole: string,
  ): Promise<string | null> {
    if (
      !isset(this.payload?.["ipV6"]) ||
      empty(this.payload?.["ipV6"]) ||
      !isset(this.payload?.[signRole + "TokenV6"]) ||
      empty(this.payload?.[signRole + "TokenV6"]) ||
      !isset(this.payload?.[signRole + "Checksum"]) ||
      !isset(this.payload?.[signRole + "SignType"])
    ) {
      return null;
    }

    const checksum = await this.hashData(
      this.payload?.[signRole + "Token"] + this.payload?.[signRole + "TokenV6"],
      key,
      "haval128,4",
    );
    if (!(await hashEquals(checksum, this.payload?.[signRole + "Checksum"]))) {
      return null;
    }

    const ipAddress = inet_ntop(this.payload?.["ipV6"]);
    if (empty(ipAddress) || !ipAddress) {
      return null;
    }

    const signType = this.payload?.[signRole + "SignType"];
    const signatureBase = this.getHashBase(
      result,
      this.payload?.["requestTime"],
      this.payload?.["signatureTime"],
      ipAddress,
      userAgent,
    );
    switch (signType) {
      case this.HASH_SHA256:
        const xToken = await this.hashData(signatureBase, key, "sha256");
        if (await hashEquals(xToken, this.payload?.[signRole + "TokenV6"])) {
          return ipAddress;
        }
      /* Customer verification unsupported */
    }
    return null;
  }

  private readStructureField(
    signature: Uint8Array,
    type: string,
  ): { result: number | bigint | Uint8Array; signatureSubarray: Uint8Array } {
    if (!isset(this.SIMPLE_TYPES[type])) {
      throw new ParseError('Unsupported variable type "' + type + '"');
    }

    const unpackFmtStr = this.SIMPLE_TYPES[type]["unpack"];
    const fieldSize = this.SIMPLE_TYPES[type]["size"];

    switch (type) {
      case "uchar":
      case "ushort":
      case "ulong":
        const v = unpack(unpackFmtStr, signature)["v"] ?? null;
        if (v === null) {
          throw new ParseError("Premature end of signature");
        }
        return {
          result: v,
          signatureSubarray: substrBinary(signature, fieldSize),
        };
      case "string":
        let length = unpack(unpackFmtStr, signature)["v"] ?? null;

        if (length === null) {
          throw new ParseError("Premature end of signature");
        }

        if (Number(length) & 0x8000) {
          /* For future use */
          length = Number(length) & 0xff;
        }

        const v2 = substrBinary(signature, fieldSize, Number(length));

        if (strlen(v2) !== length) {
          throw new ParseError("Premature end of signature");
        }

        return {
          result: v2,
          signatureSubarray: substrBinary(signature, fieldSize + length),
        };
      default:
        throw new ParseError('Unsupported variable type "' + type + '"');
    }
  }

  /**
   * Decodes physical layer of signature
   * @param string input
   * @return array
   * @throws ParseError
   * @throws VersionError
   */
  protected parseStructure(
    input: string,
    formatter: AbstractFormatter,
  ): Payload {
    let signature = formatter.parse(input);

    if (!signature?.length) {
      throw new ParseError("Not a valid base64 signature payload");
    }

    const data = unpack("Cversion/CfieldNum", signature);

    if (data["version"] !== this.VERSION) {
      throw new VersionError(`Signature version not supported`);
    } else {
      signature = substrBinary(signature, 2);
    }

    for (let i = 0; i < Number(data.fieldNum); i++) {
      const fieldId = Number(unpack("CfieldId", signature)["fieldId"]) ?? null;

      if (fieldId === null) {
        throw new ParseError("Premature end of signature");
      }

      let fieldTypeDef: {
        type: string | null;
        name: string | null;
      } = { name: null, type: null };

      if (!arrayKeyExists(fieldId, this.FIELD_IDS)) {
        /* Determine field name and size */

        const t = this.FIELD_IDS[fieldId & 0xc0]["type"];

        fieldTypeDef = {
          /* Guess field size, but leave unrecognized */ type: t,
          name: sprintf("%s%02x", t, i),
        };
      } else {
        fieldTypeDef = this.FIELD_IDS[fieldId];
      }

      if (fieldTypeDef.name === null || fieldTypeDef.type === null) {
        throw new ParseError(
          "Invalid Field ID",
          new AdscoreError("fieldTypeDef name or type is null"),
        );
      }

      const { result, signatureSubarray } = this.readStructureField(
        signature,
        fieldTypeDef["type"],
      );

      signature = signatureSubarray;

      data[fieldTypeDef["name"]] = result;
    }

    delete data.fieldNum;

    return data;
  }
}
