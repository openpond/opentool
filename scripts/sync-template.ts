import { promises as fs } from "node:fs";
import path from "node:path";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
};

const ROOT = path.resolve(process.cwd());
const TEMPLATE = path.join(ROOT, "templates", "base", "package.json");

async function readJson(filePath: string): Promise<PackageJson> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as PackageJson;
}

async function writeJson(filePath: string, data: PackageJson) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function syncTemplate() {
  const rootPkg = await readJson(path.join(ROOT, "package.json"));
  const templatePkg = await readJson(TEMPLATE);

  templatePkg.dependencies = {
    ...templatePkg.dependencies,
    opentool: rootPkg.version
      ? `^${rootPkg.version}`
      : templatePkg.dependencies?.opentool,
    zod: rootPkg.dependencies?.zod || templatePkg.dependencies?.zod,
  };
  templatePkg.devDependencies = {
    ...templatePkg.devDependencies,
    typescript: rootPkg.devDependencies?.typescript || templatePkg.devDependencies?.typescript,
    "@types/node":
      rootPkg.devDependencies?.["@types/node"] || templatePkg.devDependencies?.["@types/node"],
  };
  templatePkg.overrides = {
    ...templatePkg.overrides,
    esbuild: rootPkg.dependencies?.esbuild || templatePkg.overrides?.esbuild,
  };

  await writeJson(TEMPLATE, templatePkg);
}

syncTemplate().catch((error) => {
  const message = error instanceof Error ? error.message : "sync failed";
  console.error(message);
  process.exit(1);
});
