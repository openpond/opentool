import * as fs from "fs";
import * as path from "path";
import { JsonSchema7Type } from "@alcyone-labs/zod-to-json-schema";
import {
  AuthoredMetadata,
  AuthoredMetadataSchema,
  DiscoveryMetadata,
  Metadata,
  MetadataSchema,
  METADATA_SPEC_VERSION,
  PaymentConfig,
  Tool,
  ToolMetadataOverrides,
  ToolMetadataOverridesSchema,
} from "../../types/metadata";
import { InternalToolDefinition } from "../../types/index";
import { transpileWithEsbuild } from "../../utils/esbuild";
import { importFresh, resolveCompiledPath } from "../../utils/module-loader";

interface LoadAuthoredMetadataResult {
  metadata: AuthoredMetadata;
  sourcePath: string;
}

const METADATA_ENTRY = "metadata.ts";

export async function loadAuthoredMetadata(projectRoot: string): Promise<LoadAuthoredMetadataResult> {
  const absPath = path.join(projectRoot, METADATA_ENTRY);
  if (!fs.existsSync(absPath)) {
    throw new Error(
      `metadata.ts not found in ${projectRoot}. Create metadata.ts to describe your agent.`
    );
  }

  const tempDir = path.join(projectRoot, ".opentool-temp");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  const { outDir, cleanup } = await transpileWithEsbuild({
    entryPoints: [absPath],
    projectRoot,
    format: "esm",
    outDir: tempDir,
  });

  try {
    const compiledPath = resolveCompiledPath(outDir, METADATA_ENTRY);
    const moduleExports = await importFresh(compiledPath);
    const metadataExport = extractMetadataExport(moduleExports);
    const parsed = AuthoredMetadataSchema.parse(metadataExport);
    return { metadata: parsed, sourcePath: absPath };
  } finally {
    cleanup();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function extractMetadataExport(moduleExports: unknown): unknown {
  if (!moduleExports || typeof moduleExports !== "object") {
    throw new Error("metadata.ts must export a metadata object");
  }

  const exportsObject = moduleExports as Record<string, unknown>;
  if (exportsObject.metadata) {
    return exportsObject.metadata;
  }

  if (exportsObject.default && typeof exportsObject.default === "object") {
    const defaultExport = exportsObject.default as Record<string, unknown>;
    if (defaultExport.metadata) {
      return defaultExport.metadata;
    }
    return defaultExport;
  }

  return moduleExports;
}

interface PackageInfo {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  repository?: string | { url?: string };
  homepage?: string;
  type?: string;
}

function readPackageJson(projectRoot: string): PackageInfo {
  const packagePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(packagePath, "utf8");
    return JSON.parse(content) as PackageInfo;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error}`);
  }
}

interface MetadataBuildOptions {
  projectRoot: string;
  tools: InternalToolDefinition[];
}

export interface MetadataBuildResult {
  metadata: Metadata;
  defaultsApplied: string[];
  sourceMetadataPath: string;
}

export async function buildMetadataArtifact(options: MetadataBuildOptions): Promise<MetadataBuildResult> {
  const projectRoot = options.projectRoot;
  const packageInfo = readPackageJson(projectRoot);
  const { metadata: authored, sourcePath } = await loadAuthoredMetadata(projectRoot);
  const defaultsApplied: string[] = [];

  const folderName = path.basename(projectRoot);

  const name = resolveField(
    "name",
    authored.name,
    () => packageInfo.name ?? folderName,
    defaultsApplied,
    "package.json name"
  );

  const displayName = resolveField(
    "displayName",
    authored.displayName,
    () => {
      const source = packageInfo.name ?? folderName;
      return source
        .split(/[-_]/)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
    },
    defaultsApplied,
    "package.json name"
  );

  const versionRaw = resolveField(
    "version",
    authored.version,
    () => packageInfo.version ?? "0.1.0",
    defaultsApplied,
    "package.json version"
  );
  const version = typeof versionRaw === "number" ? String(versionRaw) : versionRaw;

  const category = determineCategory(authored, defaultsApplied);

  const description = authored.description ?? packageInfo.description;
  if (!authored.description && packageInfo.description) {
    defaultsApplied.push("description → package.json description");
  }

  const author = authored.author ?? packageInfo.author;
  if (!authored.author && packageInfo.author) {
    defaultsApplied.push("author → package.json author");
  }

  const repository = authored.repository ?? extractRepository(packageInfo.repository);
  if (!authored.repository && repository) {
    defaultsApplied.push("repository → package.json repository");
  }

  const website = authored.website ?? packageInfo.homepage;
  if (!authored.website && packageInfo.homepage) {
    defaultsApplied.push("website → package.json homepage");
  }

  const payment = resolvePayment(authored, defaultsApplied);

  const baseImage = authored.image ?? authored.iconPath;
  const animation = authored.animation_url ?? authored.videoPath;

  const discovery = buildDiscovery(authored);

  const metadataTools: Tool[] = options.tools.map((tool) => {
    const overrides: ToolMetadataOverrides = tool.metadata
      ? ToolMetadataOverridesSchema.parse(tool.metadata)
      : {};
    const toolName = overrides.name ?? tool.filename;
    const toolDescription = overrides.description ?? `${toolName} tool`;
    const toolPayment = overrides.payment ?? payment ?? undefined;
    if (!overrides.payment && toolPayment && payment && toolPayment === payment) {
      defaultsApplied.push(`tool ${toolName} payment → agent payment`);
    }

    const toolDiscovery = overrides.discovery ?? undefined;
    const toolChains = overrides.chains ?? authored.chains ?? undefined;

    const toolDefinition: Tool = {
      name: toolName,
      description: toolDescription,
      inputSchema: tool.inputSchema as JsonSchema7Type,
    };

    if (overrides.annotations) {
      toolDefinition.annotations = overrides.annotations;
    }
    if (toolPayment) {
      toolDefinition.payment = toolPayment;
    }
    if (toolDiscovery) {
      toolDefinition.discovery = toolDiscovery;
    }
    if (toolChains) {
      toolDefinition.chains = toolChains;
    }

    return toolDefinition;
  });

  const metadata: Metadata = MetadataSchema.parse({
    metadataSpecVersion: authored.metadataSpecVersion ?? METADATA_SPEC_VERSION,
    name,
    displayName,
    version,
    description,
    author,
    repository,
    website,
    category,
    termsOfService: authored.termsOfService,
    mcpUrl: authored.mcpUrl,
    payment: payment ?? undefined,
    tools: metadataTools,
    discovery,
    promptExamples: authored.promptExamples,
    iconPath: authored.iconPath,
    videoPath: authored.videoPath,
    image: baseImage,
    animation_url: animation,
    chains: authored.chains,
  });

  return {
    metadata,
    defaultsApplied,
    sourceMetadataPath: sourcePath,
  };
}

function resolveField<T>(
  field: string,
  value: T | undefined,
  fallback: () => T,
  defaultsApplied: string[],
  fallbackLabel: string
): T {
  if (value !== undefined && value !== null && value !== "") {
    return value;
  }
  const resolved = fallback();
  defaultsApplied.push(`${field} → ${fallbackLabel}`);
  return resolved;
}

function determineCategory(authored: AuthoredMetadata, defaultsApplied: string[]): string {
  if (authored.category) {
    return authored.category;
  }
  if (Array.isArray(authored.categories) && authored.categories.length > 0) {
    defaultsApplied.push("category → metadata.categories[0]");
    return authored.categories[0];
  }
  defaultsApplied.push("category → default category");
  return "utility";
}

function extractRepository(repository: PackageInfo["repository"]): string | undefined {
  if (!repository) {
    return undefined;
  }
  if (typeof repository === "string") {
    return repository;
  }
  return repository.url;
}

function resolvePayment(authored: AuthoredMetadata, defaults: string[]): PaymentConfig | undefined {
  if (authored.payment) {
    return authored.payment;
  }

  const discoveryPricing = authored.discovery?.pricing as Record<string, unknown> | undefined;
  const legacyPricing = authored.pricing as Record<string, unknown> | undefined;
  const pricing = discoveryPricing ?? legacyPricing;

  if (!pricing) {
    return undefined;
  }

  const amount = typeof pricing.defaultAmount === "number" ? pricing.defaultAmount : 0;
  const sourceLabel = discoveryPricing
    ? "discovery.pricing.defaultAmount"
    : "pricing.defaultAmount";
  defaults.push(`payment → synthesized from ${sourceLabel}`);

  const acceptedMethodsRaw = Array.isArray(pricing.acceptedMethods)
    ? (pricing.acceptedMethods as string[])
    : ["402"];
  const acceptedMethods = acceptedMethodsRaw.map((method) =>
    method === "x402" ? "x402" : "402"
  ) as ("x402" | "402")[];
  return {
    amountUSDC: amount,
    description: typeof pricing.description === "string" ? pricing.description : undefined,
    x402: acceptedMethods.includes("x402"),
    plain402: acceptedMethods.includes("402"),
    acceptedMethods,
    acceptedCurrencies: Array.isArray(pricing.acceptedCurrencies)
      ? (pricing.acceptedCurrencies as string[])
      : ["USDC"],
    chains: Array.isArray(pricing.chains)
      ? (pricing.chains as (string | number)[])
      : [8453],
  } satisfies PaymentConfig;
}

function buildDiscovery(authored: AuthoredMetadata): DiscoveryMetadata | undefined {
  const legacyDiscovery: DiscoveryMetadata = {};

  if (Array.isArray(authored.keywords) && authored.keywords.length > 0) {
    legacyDiscovery.keywords = authored.keywords;
  }
  if (Array.isArray(authored.useCases) && authored.useCases.length > 0) {
    legacyDiscovery.useCases = authored.useCases;
  }
  if (Array.isArray(authored.capabilities) && authored.capabilities.length > 0) {
    legacyDiscovery.capabilities = authored.capabilities;
  }
  if (authored.requirements) {
    legacyDiscovery.requirements = authored.requirements;
  }
  if (authored.compatibility) {
    legacyDiscovery.compatibility = authored.compatibility;
  }
  if (Array.isArray(authored.categories) && authored.categories.length > 0) {
    legacyDiscovery.category = authored.categories[0];
  }
  if (authored.pricing) {
    legacyDiscovery.pricing = authored.pricing;
  }

  const merged = {
    ...legacyDiscovery,
    ...(authored.discovery ?? {}),
  } as DiscoveryMetadata;

  return Object.keys(merged).length > 0 ? merged : undefined;
}
