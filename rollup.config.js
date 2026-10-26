import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const removeExportsPlugin = function () {
  return {
    async renderChunk(bundle) {
      const code = bundle.replace("export { webWorker as default };", "");
      return { code, map: null };
    },
  };
};

const extractWasmPlugin = function () {
  return {
    name: "extract-wasm",
    resolveId(source) {
      if (source === "./libsodium.wasm") {
        return { id: "libsodium.wasm", external: true };
      }
      return null;
    },
    transform(code, id) {
      if (id.endsWith("libsodium.mjs")) {
        const match = code.match(/\("([A-Za-z0-9+/=]{1000,})"\)/);
        if (!match) {
          return null;
        }

        const wasmBuffer = Buffer.from(match[1], "base64");
        this.emitFile({
          type: "asset",
          fileName: "libsodium.wasm",
          source: wasmBuffer,
        });

        const inlineWasmPattern =
          /\(F\?\?=\(A=>\{[\s\S]*?\}\)\("[A-Za-z0-9+/=]+"\),A\(\(await async function\(A,g,C\)\{[\s\S]*?\}\(0,F,C\)\)\.instance\)\)/;

        const replacement =
          "A((await (async () => { const res = await WebAssembly.instantiate(libsodiumWasm, C); return res instanceof WebAssembly.Instance ? res : res.instance; })()))";

        const transformedCode =
          `import libsodiumWasm from "./libsodium.wasm";\n` +
          code.replace(inlineWasmPattern, replacement);

        return { code: transformedCode, map: null };
      }

      if (id.endsWith("libsodium-wrappers.mjs")) {
        // Cloudflare Workers disallow crypto.getRandomValues in top-level global scope
        // during module initialization (`await sodium.ready` at worker creation).
        const transformedCode = code.replace(
          "return globalThis.crypto.getRandomValues(e),e[0]>>>0",
          "try{return globalThis.crypto.getRandomValues(e),e[0]>>>0}catch{return 0}",
        );
        return { code: transformedCode, map: null };
      }

      if (id.endsWith("variables.ts")) {
        return {
          code: code.replace(
            "export const DEBUG = false;",
            "export const DEBUG = Boolean(globalThis.__ADSCORE_DEBUG__);",
          ),
          map: null,
        };
      }

      return null;
    },
    renderChunk(code) {
      return {
        code: code
          .replace(
            "const DEBUG = Boolean(globalThis.__ADSCORE_DEBUG__);",
            "const DEBUG = false;",
          )
          .replace(
            "export { cookieName, webWorker as default };",
            "export { webWorker as default };",
          ),
        map: null,
      };
    },
  };
};

export default {
  input: "src/web-worker/web-worker.ts",
  output: {
    dir: "dist",
    entryFileNames: "worker.js",
    format: "es",
    paths: {
      "libsodium.wasm": "./libsodium.wasm",
    },
  },
  moduleContext: (id) => {
    if (id.includes("@msgpack")) {
      return "globalThis";
    }
  },
  plugins: [
    extractWasmPlugin(),
    typescript(),
    nodeResolve(),
    commonjs({ transformMixedEsModules: true }),
  ],
};
