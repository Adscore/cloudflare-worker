import { AbstractStruct } from "./abstract-struct";
import { decode } from "@msgpack/msgpack";

export const MsgpackType = "M";

/**
 * Msgpack serialization adapter
 */
export class Msgpack extends AbstractStruct {
  public readonly TYPE: string = MsgpackType;

  /**
   * Packs structure into serialized format
   * @param mixed data
   * @return Uint8Array
   */
  public pack(data: any): Uint8Array {
    throw new Error("Not supported");
  }

  /**
   * Unpacks structure from serialized format
   * @param Uint8Array data
   * @return object
   */
  public unpack(data: Uint8Array): object {
    const rawData = super.unpack(data) as Uint8Array;
    const structure = decode(rawData);
    if (typeof structure !== "object" || structure === null) {
      throw new Error("Unexpected payload structure");
    }
    return structure as object;
  }
}
