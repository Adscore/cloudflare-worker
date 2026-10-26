import { InvalidArgumentError } from "../errors/invalid-argument-error";
import { substrBinary } from "../utils/php/substr";
import { AbstractStruct } from "./abstract-struct";
import { Json, JsonType } from "./json";
import { Rfc3986, Rfc3986Type } from "./rfc3986";
import { Msgpack, MsgpackType } from "./msgpack";

export class StructFactory {
  /**
   * Return Struct class
   * @param string $name
   * @return AbstractStruct
   */
  public static create(name: string | Uint8Array): AbstractStruct {

    const nameAsString = typeof name === 'string' ? name : new TextDecoder().decode(name);

    switch (nameAsString) {
      case JsonType:
      case "Json":
      case "json":
        return new Json();

      case Rfc3986Type:
      case "Rfc3986":
      case "rfc3986":
        return new Rfc3986();

      case MsgpackType:
      case "Msgpack":
      case "msgpack":
        return new Msgpack();

      default:
        throw new InvalidArgumentError("Unsupported struct class");
    }
  }

  /**
   * Returns Struct class basing on payload
   * @param string $payload
   * @return AbstractStruct
   */
  public static createFromPayload(payload: Uint8Array): AbstractStruct {
    const header = substrBinary(payload, 0, 1);
    return StructFactory.create(header);
  }
}
