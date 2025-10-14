import * as fs from "fs";
import * as path from "path";
import { tmpdir } from "os";
import { build, type BuildOptions } from "esbuild";

interface TranspileOptions {
  entryPoints: string[];
  projectRoot: string;
  outDir?: string;
  format: "cjs" | "esm";
  bundle?: boolean;
  external?: string[];
}

function resolveTsconfig(projectRoot: string): string | undefined {
  const candidate = path.join(projectRoot, "tsconfig.json");
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return undefined;
}

interface TranspileResult {
  outDir: string;
  cleanup(): void;
}

export async function transpileWithEsbuild(options: TranspileOptions): Promise<TranspileResult> {
  if (options.entryPoints.length === 0) {
    throw new Error("No entry points provided for esbuild transpilation");
  }

  const projectRoot = options.projectRoot;
  const tempBase = options.outDir ?? fs.mkdtempSync(path.join(tmpdir(), "opentool-"));
  if (!fs.existsSync(tempBase)) {
    fs.mkdirSync(tempBase, { recursive: true });
  }

  const tsconfig = resolveTsconfig(projectRoot);

  const buildOptions: BuildOptions = {
    entryPoints: options.entryPoints,
    outdir: tempBase,
    bundle: options.bundle ?? false,
    format: options.format,
    platform: "node",
    target: "node20",
    logLevel: "warning",
    sourcesContent: false,
    sourcemap: false,
    loader: {
      ".ts": "ts",
      ".tsx": "tsx",
      ".cts": "ts",
      ".mts": "ts",
      ".js": "js",
      ".jsx": "jsx",
      ".mjs": "js",
      ".cjs": "js",
      ".json": "json",
    },
    metafile: false,
    allowOverwrite: true,
    absWorkingDir: projectRoot,
  };

  if (options.external && options.external.length > 0) {
    buildOptions.external = options.external;
  }

  if (!buildOptions.bundle) {
    buildOptions.packages = "external";
  }

  if (tsconfig) {
    buildOptions.tsconfig = tsconfig;
  }

  await build(buildOptions);

  if (options.format === "esm") {
    const packageJsonPath = path.join(tempBase, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      fs.writeFileSync(packageJsonPath, JSON.stringify({ type: "module" }), "utf8");
    }
  }

  const cleanup = () => {
    if (options.outDir) {
      return;
    }
    fs.rmSync(tempBase, { recursive: true, force: true });
  };

  return { outDir: tempBase, cleanup };
}
