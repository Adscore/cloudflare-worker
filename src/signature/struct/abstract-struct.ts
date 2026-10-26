import { strlen } from "../utils/php/strlen";
import { strpos } from "../utils/php/strpos";
import { substrBinary } from "../utils/php/substr";
import { uInt8ArrayToString } from "../utils/uint8-array-to-string";

/**
 * Common base for serialization/deserialization methods
 *
 */
export abstract class AbstractStruct {
  abstract TYPE: string;

  /**
   * Packs structure into serialized format
   * @param mixed $data
   * @return string
   */
  public pack(data: string | Uint8Array): string | Uint8Array {
    throw new Error('Not supported');
  }

  /**
   * Unpacks structure from serialized format
   * @param string $data
   * @return mixed
   */
  public unpack(data: Uint8Array): string | object {
    if (strpos(uInt8ArrayToString(data), this.TYPE) !== 0) {
      throw new Error("Unexpected serializer type");
    }

    return substrBinary(data, strlen(this.TYPE));
  }
}
