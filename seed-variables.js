import * as fs from "fs";
import { variables } from "./variables.js";

const fileName = "./dist/worker.js";

function resolveAllowedVerdicts() {
  const envVerdicts = process.env.ALLOWED_VERDICTS;
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
  return variables.ALLOWED_VERDICTS;
}

function resolveDebug() {
  if (
    typeof process.env.DEBUG === "string" &&
    process.env.DEBUG.trim().length > 0
  ) {
    const normalized = process.env.DEBUG.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return Boolean(variables.DEBUG);
}

function resolveKey(envKey, fileKey) {
  const key = envKey || fileKey || "";
  if (
    typeof key === "string" &&
    (key.includes("_or_leave_empty") ||
      key.startsWith("<paste_") ||
      key.startsWith("paste_"))
  ) {
    return "";
  }
  return key;
}

fs.readFile(fileName, "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  let modifiedData = data
    .replace(
      "<response_key>",
      resolveKey(
        process.env.ADSCORE_ZONE_RESPONSE_KEY,
        variables.ADSCORE_ZONE_RESPONSE_KEY,
      ),
    )
    .replace(
      "<api_key>",
      resolveKey(
        process.env.ADSCORE_ZONE_API_KEY,
        variables.ADSCORE_ZONE_API_KEY,
      ),
    )
    .replace(
      "`<expected_verdicts>`",
      JSON.stringify(resolveAllowedVerdicts()) ?? "",
    )
    .replace(
      "<request_key>",
      resolveKey(
        process.env.ADSCORE_ZONE_REQUEST_KEY,
        variables.ADSCORE_ZONE_REQUEST_KEY,
      ),
    )
    .replace(
      "const DEBUG = false;",
      `const DEBUG = ${resolveDebug()};`,
    );

  fs.writeFile(fileName, modifiedData, "utf8", (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`CF Worker file ready: ${fileName}`);
  });
});

