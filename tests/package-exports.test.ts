import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import tsupConfig from "../tsup.config";

type PackageExports = Record<string, { import?: string }>;

function distImportToSourceEntry(importPath: string): string {
  if (!importPath.startsWith("./dist/") || !importPath.endsWith(".js")) {
    throw new Error(`Unsupported export import path: ${importPath}`);
  }
  return importPath.replace("./dist/", "src/").replace(/\.js$/, ".ts");
}

test("package exports import targets are covered by tsup entrypoints", () => {
  const packageJsonPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    exports?: PackageExports;
  };
  const exportsMap = packageJson.exports ?? {};
  const entrypoints = new Set(
    (Array.isArray(tsupConfig.entry) ? tsupConfig.entry : [tsupConfig.entry]).filter(
      (entry): entry is string => typeof entry === "string",
    ),
  );

  for (const config of Object.values(exportsMap)) {
    if (!config?.import) continue;
    assert.equal(
      entrypoints.has(distImportToSourceEntry(config.import)),
      true,
      `Missing tsup entry for export target ${config.import}`,
    );
  }
});
