import * as path from "path";

export function resolveCompiledPath(outDir: string, originalFile: string, extension = ".js"): string {
  const baseName = path.basename(originalFile).replace(/\.[^.]+$/, "");
  return path.join(outDir, `${baseName}${extension}`);
}

export function requireFresh(modulePath: string): any {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(resolved);
}
