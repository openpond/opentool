import * as path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const requireModule = createRequire(import.meta.url);

export function resolveCompiledPath(
  outDir: string,
  originalFile: string,
  extension = ".js"
): string {
  const baseName = path.basename(originalFile).replace(/\.[^.]+$/, "");
  return path.join(outDir, `${baseName}${extension}`);
}

export function requireFresh(modulePath: string): any {
  const resolved = requireModule.resolve(modulePath);
  delete requireModule.cache[resolved];
  return requireModule(resolved);
}

export async function importFresh(modulePath: string): Promise<any> {
  const fileUrl = pathToFileURL(modulePath).href;
  const cacheBuster = `t=${Date.now()}-${Math.random()}`;
  const separator = fileUrl.includes("?") ? "&" : "?";
  return import(`${fileUrl}${separator}${cacheBuster}`);
}
