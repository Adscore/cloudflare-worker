import { substrBinary } from "../../utils/php/substr";
import { arraySum } from "../../utils/php/array-sum";
import { unpack } from "../../utils/php/unpack";
import { CryptParseError } from "../errors/parse-error";

export abstract class AbstractSymmetricCrypt {
  public static readonly METHOD_SIZE = 2;

  public abstract encryptWithKey(data: string, key: Uint8Array): string;
  public abstract decryptWithKey(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array>;
  public abstract key(password: Uint8Array, salt?: string): Promise<Uint8Array>;
  
  protected parse(
    payload: Uint8Array,
    lengths: Record<string, number>
  ): { method?: number; data?: Uint8Array; [key: string]: any } {
    if (
      payload.length <
      AbstractSymmetricCrypt.METHOD_SIZE + arraySum(lengths)
    ) {
      throw new CryptParseError("Premature data end");
    }
    let pos = AbstractSymmetricCrypt.METHOD_SIZE;

    const result = unpack("vmethod", substrBinary(payload, 0, pos));

    for (const [key, length] of Object.entries(lengths)) {
      result[key] = substrBinary(payload, pos, length);
      pos += length;
    }

    result["data"] = substrBinary(payload, pos);

    return result;
  }
}
