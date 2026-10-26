import { AbstractSignature } from "../signature/signature/abstract-signature";
import { Judge } from "../signature/definition/judge";
import { Signature4 } from "../signature/signature/signature4";
import { Signature5 } from "../signature/signature/signature5";
import { removeHeadersFromKey } from "../signature/utils/remove-key-headers";
import { base64Decode } from "../signature/utils/php/base64";
import { toLoggable } from "./to-loggable";
import { AdscoreResource } from "./adscore-resource";
import { getCookie } from "./get-cookie";
import { getSignatureVersion } from "./get-signature-version";
import { signRequest } from "./sign-request";
import sodium from "libsodium-wrappers";
import {
  ADSCORE_ZONE_API_KEY,
  ADSCORE_ZONE_REQUEST_KEY,
  ADSCORE_ZONE_RESPONSE_KEY,
  ALLOWED_VERDICTS,
  DEBUG,
} from "./variables";
import { cookieName, getCookieName } from "./cookie-name";

export { cookieName };

export interface WorkerEnv {
  ADSCORE_ZONE_RESPONSE_KEY?: string;
  ADSCORE_ZONE_API_KEY?: string;
  ALLOWED_VERDICTS?: string | string[];
  ADSCORE_ZONE_REQUEST_KEY?: string;
  DEBUG?: boolean | string;
}

interface WorkerConfig {
  responseKey: string;
  apiKey: string;
  allowedVerdicts: string | string[];
  requestKey: string;
  envDebug: boolean | undefined;
  cookieName: string;
}

// Load wasm when worker is created
await sodium.ready;

function resolveAllowedVerdicts(
  envVerdicts: string | string[] | undefined,
): string | string[] {
  if (Array.isArray(envVerdicts)) {
    return envVerdicts;
  }
  if (typeof envVerdicts === "string" && envVerdicts.trim().length > 0) {
    const trimmed = envVerdicts.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Fall through to comma-separated parsing
      }
    }
    return trimmed
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return ALLOWED_VERDICTS;
}

function resolveEnvDebug(
  envDebug: boolean | string | undefined,
): boolean | undefined {
  if (typeof envDebug === "boolean") {
    return envDebug;
  }
  if (typeof envDebug === "string" && envDebug.trim().length > 0) {
    const normalized = envDebug.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return undefined;
}

function isPlaceholder(val: string | undefined): boolean {
  if (!val) {
    return true;
  }
  return (
    val.startsWith("<") ||
    val.includes("paste_") ||
    val.includes("_or_leave_empty")
  );
}

function resolveConfig(env?: WorkerEnv): WorkerConfig {
  const apiKey =
    typeof env?.ADSCORE_ZONE_API_KEY === "string" &&
    env.ADSCORE_ZONE_API_KEY.length > 0 &&
    !isPlaceholder(env.ADSCORE_ZONE_API_KEY)
      ? env.ADSCORE_ZONE_API_KEY
      : !isPlaceholder(ADSCORE_ZONE_API_KEY)
        ? ADSCORE_ZONE_API_KEY
        : "";

  const responseKey =
    typeof env?.ADSCORE_ZONE_RESPONSE_KEY === "string" &&
    env.ADSCORE_ZONE_RESPONSE_KEY.length > 0 &&
    !isPlaceholder(env.ADSCORE_ZONE_RESPONSE_KEY)
      ? env.ADSCORE_ZONE_RESPONSE_KEY
      : !isPlaceholder(ADSCORE_ZONE_RESPONSE_KEY)
        ? ADSCORE_ZONE_RESPONSE_KEY
        : "";

  const requestKey =
    typeof env?.ADSCORE_ZONE_REQUEST_KEY === "string" &&
    env.ADSCORE_ZONE_REQUEST_KEY.length > 0 &&
    !isPlaceholder(env.ADSCORE_ZONE_REQUEST_KEY)
      ? env.ADSCORE_ZONE_REQUEST_KEY
      : !isPlaceholder(ADSCORE_ZONE_REQUEST_KEY)
        ? ADSCORE_ZONE_REQUEST_KEY
        : "";

  return {
    apiKey,
    responseKey,
    requestKey,
    allowedVerdicts: resolveAllowedVerdicts(env?.ALLOWED_VERDICTS),
    envDebug: resolveEnvDebug(env?.DEBUG),
    cookieName: getCookieName(apiKey),
  };
}

function getClientIps(request: Request): string[] {
  return [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("X-Forwarded-For"),
  ].filter((ip): ip is string => Boolean(ip));
}

function extractCookieSignature(
  cookieHeader: string | null,
  expectedCookieName: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const rawCookie = getCookie(cookieHeader, expectedCookieName);
  if (!rawCookie) {
    return null;
  }
  try {
    return decodeURIComponent(rawCookie);
  } catch {
    return null;
  }
}

function isCloudflareWebEditor(request: Request): boolean {
  return request.headers.get("cf-worker") === "cloudflarepreviews.com";
}

export default {
  async fetch(
    request: Request,
    env?: WorkerEnv,
    ctx?: unknown,
  ): Promise<Response> {
    // 1. Cloudflare Web Editor preview bypass
    // Cloudflare Web Editor hides real client IP (Adscore sees real one).
    // Signature would fail verification, so OK page is returned.
    if (isCloudflareWebEditor(request)) {
      return AdscoreResource.okPage(request);
    }

    // 2. Static protocol / policy metadata endpoints
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname.endsWith("/w3c/p3p.xml")) {
      return AdscoreResource.p3pXmlEntry(request);
    }
    if (requestUrl.pathname.endsWith("/w3c/Full_P3P_Policy.xml")) {
      return AdscoreResource.p3pXmlFull(request);
    }

    const config = resolveConfig(env);
    const ipAddresses = getClientIps(request);
    const userAgent = request.headers.get("User-Agent") ?? "";
    const isCookieCheck = requestUrl.search === "?AdscoreCookieCheck";
    const isHtmlRequest = !isCookieCheck;

    // 3. Existing session cookie verification
    const cookieSignature = extractCookieSignature(
      request.headers.get("Cookie"),
      config.cookieName,
    );
    if (cookieSignature) {
      const verdict = await getVerdict(
        cookieSignature,
        ipAddresses,
        userAgent,
        config,
      );

      if (config.allowedVerdicts.indexOf(verdict as any) > -1) {
        if (isCookieCheck) {
          return AdscoreResource.okPage(request);
        }
        return fetch(request);
      }
      return AdscoreResource.blockPage(isHtmlRequest);
    }

    // 4. Reject unverified cookie check probes
    if (isCookieCheck || requestUrl.search === `?${config.cookieName}`) {
      return AdscoreResource.blockPage(false);
    }

    // 5. POST validation callback from screening page
    if (request.method === "POST") {
      const signature = await request.text();

      if (signature !== "") {
        const verdict = await getVerdict(
          signature,
          ipAddresses,
          userAgent,
          config,
        );
        if (config.allowedVerdicts.indexOf(verdict as any) > -1) {
          return AdscoreResource.refreshPage(signature, config.apiKey);
        }
        return AdscoreResource.blockPage(isHtmlRequest);
      }
    }

    // 6. Screening page for unverified requests (request is signed lazily only here)
    if (!isHtmlRequest) {
      return AdscoreResource.blockPage(false);
    }

    const signedRequest = await signRequest(
      config.requestKey,
      ipAddresses[0] ?? "",
      userAgent,
    );

    return AdscoreResource.screeningPage(signedRequest, config.apiKey);
  },
};

function debugLog(envDebug: boolean | undefined, ...args: unknown[]): void {
  if (envDebug !== undefined) {
    if (envDebug) {
      console.log(...args);
    }
    return;
  }
  if (DEBUG) {
    console.log(...args);
  }
}

async function getVerdict(
  signature: string,
  ipAddress: string[],
  userAgent: string,
  config: WorkerConfig,
): Promise<any> {
  let verdict: any = -1;

  if (!config.responseKey) {
    return verdict;
  }

  try {
    let result: null | AbstractSignature = null;
    const version = getSignatureVersion(signature);
    const cryptKey = base64Decode(
      removeHeadersFromKey(config.responseKey),
    );

    switch (version) {
      case 4:
        result = await Signature4.createFromRequest(
          signature,
          ipAddress,
          userAgent,
          cryptKey,
        );
        break;
      case 5:
        result = await Signature5.createFromRequest(
          signature,
          ipAddress,
          userAgent,
          cryptKey,
        );
        break;

      default:
        throw new Error("Unsupported signature version");
    }

    const resultCode = result?.getResult() ?? -1;
    const judgeResult = Judge.RESULTS[resultCode];
    verdict = judgeResult?.verdict ?? -1;

    debugLog(
      config.envDebug,
      `Adscore detection result: ${verdict} (${judgeResult?.name ?? "Unknown"})`,
      {
        version,
        resultCode,
        verdict,
        name: judgeResult?.name ?? "Unknown",
        allowedVerdicts: config.allowedVerdicts,
        isAllowed: config.allowedVerdicts.indexOf(verdict as any) > -1,
        ipAddress,
        userAgent,
        zoneId: toLoggable((result as Signature5 | null)?.getZoneId?.()),
        encryptionType: result?.getEncryptionType(),
        structType: result?.getStructType(),
        payload: toLoggable(result?.getPayload()),
      },
    );
  } catch (e) {
    console.error(e);
  }

  return verdict;
}
