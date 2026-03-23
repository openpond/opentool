import { promises as fs } from "node:fs";
import path from "node:path";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
};

const ROOT = path.resolve(process.cwd());
const TEMPLATES_DIR = path.join(ROOT, "templates");

async function readJson(filePath: string): Promise<PackageJson> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as PackageJson;
}

async function writeJson(filePath: string, data: PackageJson) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function listTemplatePackagePaths() {
  const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(TEMPLATES_DIR, entry.name, "package.json"));
}

async function syncTemplate(templatePath: string) {
  const rootPkg = await readJson(path.join(ROOT, "package.json"));
  const templatePkg = await readJson(templatePath);

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

  await writeJson(templatePath, templatePkg);
}

async function syncTemplates() {
  const templatePaths = await listTemplatePackagePaths();
  await Promise.all(templatePaths.map((templatePath) => syncTemplate(templatePath)));
}

syncTemplates().catch((error) => {
  const message = error instanceof Error ? error.message : "sync failed";
  console.error(message);
  process.exit(1);
});
