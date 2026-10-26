import { InvalidArgumentError } from "../errors/invalid-argument-error";
import { substrBinary } from "../utils/php/substr";
import { pack } from "../utils/php/pack";
import { OpenSSL } from "./symmetric/open-ssl";
import { OpenSSLAEAD } from "./symmetric/open-ssl-aead";
import { Secretbox } from "./symmetric/secretbox";
import { uInt8ArrayToString } from "../utils/uint8-array-to-string";

export type CryptType = "OpenSSL" | "OpenSSLAEAD" | "Secretbox";

export class CryptFactory {
  /**
   * Returns Crypt instance
   * @param string $name
   * @return OpenSSL|OpenSSLAEAD|Secretbox
   */
  public static create(name: CryptType | string | Uint8Array) {
    const nameAsString =
      typeof name === "string" ? name : uInt8ArrayToString(name);

    switch (nameAsString) {
      case uInt8ArrayToString(pack("v", OpenSSL.METHOD)):
      case "OpenSSL":
      case "openssl":
        return new OpenSSL();
      case uInt8ArrayToString(pack("v", OpenSSLAEAD.METHOD)):
      case "OpenSSLAEAD":
      case "opensslaead":
        return new OpenSSLAEAD();
      case uInt8ArrayToString(pack("v", Secretbox.METHOD)):
      case "Secretbox":
      case "secretbox":
        return new Secretbox();
      default:
        throw new InvalidArgumentError("Unsupported crypt class");
    }
  }

  /**
   * Returns Crypt instance based on payload header
   * @param string $payload
   * @return OpenSSL
   */
  public static createFromPayload(payload: Uint8Array) {
    const header = substrBinary(payload, 0, 2);
    return CryptFactory.create(header);
  }

  /**
   * Returns Crypt instance based on algorithm/library combination ID
   * @param int $code
   * @return object
   */
  public static createFromId(code: number) {
    const name = pack("v", code);
    return CryptFactory.create(name);
  }
}
