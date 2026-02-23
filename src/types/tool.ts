// OpenTool strict authoring types
// One tool = one method (GET-only default profile with schedule, or POST-only one-off with schema)

import type { z } from "zod";

export type CronSpec = {
  /**
   * Standard 5–6 field cron expression (optionally wrapped in `cron(...)`).
   */
  cron: string;
  enabled?: boolean;
  notifyEmail?: boolean;
};

export type ToolCategory = "strategy" | "tracker" | "orchestrator";

export type ToolAsset = {
  venue: string;
  chain: string | number;
  assetSymbols: string[];
  pair?: string;
  leverage?: number;
  walletAddress?: string;
};

export type ConnectedApp = {
  appId: string;
  deploymentId: string;
  toolName: string;
  displayName?: string;
  method?: "GET" | "POST";
  body?: unknown;
};

export type TemplatePreviewProfile = {
  title?: string;
  subtitle: string;
  description: string;
};

export type ToolProfile = {
  description?: string;
  category?: ToolCategory;
  schedule?: CronSpec;
  notifyEmail?: boolean;
  chains?: Array<string | number>;
  assets?: ToolAsset[];
  connectedApps?: ConnectedApp[];
  policies?: Array<Record<string, unknown>>;
  templateConfig?: {
    version: number | string;
    schema?: Record<string, unknown>;
    defaults?: Record<string, unknown>;
    envVar?: string;
  };
  templatePreview?: TemplatePreviewProfile;
};

export type GetHandler = (req: Request) => Promise<Response> | Response;
export type PostHandler = (req: Request) => Promise<Response> | Response;

// GET-only tool (default scheduled profile)
export type ToolModuleGET = {
  profile: ToolProfile;
  GET: GetHandler;
  POST?: never;
  schema?: never;
};

// POST-only tool (one-off, parameterized)
export type ToolModulePOST<B = unknown> = {
  profile?: ToolProfile;
  POST: PostHandler;
  schema: z.ZodType<B>;
  GET?: never;
};

export type ToolModule = ToolModuleGET | ToolModulePOST<any>;
