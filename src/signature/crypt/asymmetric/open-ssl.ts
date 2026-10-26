import { InvalidArgumentError } from "../../errors/invalid-argument-error";
import { derToP1363 } from "../../utils/crypto/convert-der-signature-to-p1363";
import { convertInternalHashNameIntoWebCryptos } from "../../utils/crypto/convert-internal-hash-name-into-web-cryptos";
import { AbstractAsymmetricCrypt } from "./abstract-asymmetric-crypt";

function getHashes() {
  return ["SHA-256", "SHA-384", "SHA-512"];
}

export class AsymmetricOpenSSL extends AbstractAsymmetricCrypt {
  protected algo: string = "sha256";
  protected options: number = 1; // Placeholder for OPENSSL_RAW_DATA

  constructor(algo: string = "sha256") {
    super();

    const convertedAlgo = convertInternalHashNameIntoWebCryptos(algo);

    if (!getHashes().includes(convertedAlgo)) {
      throw new InvalidArgumentError(`Invalid hash method "${algo}"`);
    }
    this.algo = convertedAlgo;
  }

  /**
   * Verify signature
   * @param data The string of data used to generate the signature previously
   * @param signature A raw binary string
   * @param publicKey OpenSSL asymmetric key
   * @return boolean
   * @throws VerifyError
   */
  public async verify(
    data: string,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    const binaryData = new TextEncoder().encode(data);

    const algo = {
      name: "ECDSA",
      namedCurve: "P-256",
      hash: "SHA-256",
    };

    const key = await this.importPublicKey(publicKey, algo);

    const isValid = await crypto.subtle.verify(
      algo,
      key,
      derToP1363(signature),
      binaryData
    );

    return isValid;
  }

  /**
   * Generate signature
   * @param data The string of data you wish to sign
   * @param privateKey OpenSSL asymmetric key
   * @return string Computed signature
   */
  public sign(data: string, privateKey: string): Uint8Array {
    throw new Error("Not supported");
  }

  /**
   * Create EC keypair
   * @param curveName Curve name
   * @return Compacted private key
   */
  public static createEcPrivateKey(
    curveName: string = "prime256v1"
  ): Uint8Array {
    throw new Error("Not supported");
  }

  /**
   * Retrieve public key in PEM format from compacted private key
   * @param data Compacted key
   * @return Public key in PEM format
   */
  public static getPublicKeyPem(data: string): string {
    throw new Error("Not supported");
  }

  private importPublicKey(pem: Uint8Array, algo: EcKeyImportParams) {
    return crypto.subtle.importKey("spki", pem, algo, false, ["verify"]);
  }
}
