import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/cli/index.ts",
    "src/x402/index.ts",
    "src/wallet/index.ts",
    "src/ai/index.ts",
    "src/store/index.ts",
    "src/adapters/hyperliquid/index.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  outDir: "dist",
  shims: true,
  skipNodeModulesBundle: true,
});
