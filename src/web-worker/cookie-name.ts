import { ADSCORE_ZONE_API_KEY } from "./variables";

export function getCookieName(apiKey: string = ADSCORE_ZONE_API_KEY): string {
  return "VerifiedByAdscore_" + apiKey;
}

export const cookieName = getCookieName();


