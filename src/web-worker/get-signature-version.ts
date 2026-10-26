import { base64Decode } from "../signature/utils/php/base64";
import { unpack } from "../signature/utils/php/unpack";

export function getSignatureVersion(payload: string) {
  const data = unpack("Cversion/CfieldNum", base64Decode(payload));

  return data?.["version"];
}
