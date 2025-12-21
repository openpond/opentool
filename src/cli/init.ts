import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type InitOptions = {
  dir?: string;
  name?: string;
  description?: string;
  force?: boolean;
};

function resolveTemplateDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../templates/base");
}

async function directoryIsEmpty(targetDir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(targetDir);
    return entries.length === 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return true;
    }
    throw error;
  }
}

async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

function toPackageName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "opentool-project";
}

function toDisplayName(value: string): string {
  return value
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase()) || "OpenTool Project";
}

async function updatePackageJson(
  targetDir: string,
  name: string,
  description?: string
) {
  const filePath = path.join(targetDir, "package.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const pkg = JSON.parse(raw) as Record<string, unknown>;
  pkg.name = toPackageName(name);
  if (description) {
    pkg.description = description;
  }
  await fs.writeFile(filePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
}

async function updateMetadata(
  targetDir: string,
  name: string,
  description?: string
) {
  const filePath = path.join(targetDir, "metadata.ts");
  const raw = await fs.readFile(filePath, "utf-8");
  const displayName = toDisplayName(name);
  const resolvedDescription = description || "OpenTool project";
  const updated = raw
    .replace(/name:\s*\".*?\"/, `name: "${toPackageName(name)}"`)
    .replace(/displayName:\s*\".*?\"/, `displayName: "${displayName}"`)
    .replace(/description:\s*\".*?\"/, `description: "${resolvedDescription}"`);
  await fs.writeFile(filePath, updated, "utf-8");
}

export async function initCommand(options: InitOptions): Promise<void> {
  const targetDir = path.resolve(process.cwd(), options.dir || ".");
  const templateDir = resolveTemplateDir();
  const empty = await directoryIsEmpty(targetDir);

  if (!empty && !options.force) {
    throw new Error(
      `Directory not empty: ${targetDir}. Use --force to overwrite.`
    );
  }

  await copyDir(templateDir, targetDir);

  const projectName = options.name || path.basename(targetDir);
  const description = options.description;
  await updatePackageJson(targetDir, projectName, description);
  await updateMetadata(targetDir, projectName, description);
}
