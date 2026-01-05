// OpenTool strict authoring types
// One tool = one method (GET-only default profile with schedule, or POST-only one-off with schema)

import type { z } from "zod";

export type CronSpec = {
  /**
   * AWS EventBridge schedule expression (`cron(...)` or `rate(...)`).
   */
  cron: string;
  enabled?: boolean;
  notifyEmail?: boolean;
};

export type ToolProfileGET = {
  description: string;
  schedule: CronSpec; // required for GET-only tools
  fixedAmount?: string; // UX hint only
  tokenSymbol?: string; // UX hint only
  limits?: { concurrency?: number; dailyCap?: number };
};

export type ToolProfilePOST = {
  description?: string; // optional for POST-only
};

export type GetHandler = (req: Request) => Promise<Response> | Response;
export type PostHandler = (req: Request) => Promise<Response> | Response;

// GET-only tool (default scheduled profile)
export type ToolModuleGET = {
  profile: ToolProfileGET;
  GET: GetHandler;
  POST?: never;
  schema?: never;
};

// POST-only tool (one-off, parameterized)
export type ToolModulePOST<B = unknown> = {
  profile?: ToolProfilePOST;
  POST: PostHandler;
  schema: z.ZodType<B>;
  GET?: never;
};

export type ToolModule = ToolModuleGET | ToolModulePOST<any>;
