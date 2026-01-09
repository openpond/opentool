import { z } from 'zod';
import { X402Payment } from './x402/index.js';

declare const PaymentConfigSchema: z.ZodUnion<readonly [z.ZodObject<{
    definition: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodObject<{
            code: z.ZodString;
            symbol: z.ZodString;
            decimals: z.ZodNumber;
        }, z.core.$strip>;
        asset: z.ZodObject<{
            symbol: z.ZodString;
            network: z.ZodString;
            address: z.ZodString;
            decimals: z.ZodNumber;
        }, z.core.$strip>;
        payTo: z.ZodString;
        resource: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        scheme: z.ZodString;
        network: z.ZodString;
        facilitator: z.ZodObject<{
            url: z.ZodString;
            verifyPath: z.ZodOptional<z.ZodString>;
            settlePath: z.ZodOptional<z.ZodString>;
            apiKeyHeader: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$loose>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
type PaymentConfig = z.infer<typeof PaymentConfigSchema>;
declare const ToolMetadataOverridesSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    annotations: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
        idempotentHint: z.ZodOptional<z.ZodBoolean>;
        openWorldHint: z.ZodOptional<z.ZodBoolean>;
        requiresPayment: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    payment: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        definition: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodObject<{
                code: z.ZodString;
                symbol: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            asset: z.ZodObject<{
                symbol: z.ZodString;
                network: z.ZodString;
                address: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            payTo: z.ZodString;
            resource: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            scheme: z.ZodString;
            network: z.ZodString;
            facilitator: z.ZodObject<{
                url: z.ZodString;
                verifyPath: z.ZodOptional<z.ZodString>;
                settlePath: z.ZodOptional<z.ZodString>;
                apiKeyHeader: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$loose>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString>>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    }, z.core.$catchall<z.ZodAny>>>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
}, z.core.$catchall<z.ZodAny>>;
type ToolMetadataOverrides = z.infer<typeof ToolMetadataOverridesSchema>;
declare const ToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    inputSchema: z.ZodAny;
    annotations: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
        idempotentHint: z.ZodOptional<z.ZodBoolean>;
        openWorldHint: z.ZodOptional<z.ZodBoolean>;
        requiresPayment: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    payment: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        definition: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodObject<{
                code: z.ZodString;
                symbol: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            asset: z.ZodObject<{
                symbol: z.ZodString;
                network: z.ZodString;
                address: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            payTo: z.ZodString;
            resource: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            scheme: z.ZodString;
            network: z.ZodString;
            facilitator: z.ZodObject<{
                url: z.ZodString;
                verifyPath: z.ZodOptional<z.ZodString>;
                settlePath: z.ZodOptional<z.ZodString>;
                apiKeyHeader: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$loose>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString>>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    }, z.core.$catchall<z.ZodAny>>>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
    notifyEmail: z.ZodOptional<z.ZodBoolean>;
    category: z.ZodOptional<z.ZodEnum<{
        strategy: "strategy";
        tracker: "tracker";
        orchestrator: "orchestrator";
    }>>;
}, z.core.$strict>;
type Tool = z.infer<typeof ToolSchema>;
declare const MetadataSchema: z.ZodObject<{
    metadataSpecVersion: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    repository: z.ZodOptional<z.ZodString>;
    website: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
    termsOfService: z.ZodOptional<z.ZodString>;
    mcpUrl: z.ZodOptional<z.ZodString>;
    payment: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        definition: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodObject<{
                code: z.ZodString;
                symbol: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            asset: z.ZodObject<{
                symbol: z.ZodString;
                network: z.ZodString;
                address: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            payTo: z.ZodString;
            resource: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            scheme: z.ZodString;
            network: z.ZodString;
            facilitator: z.ZodObject<{
                url: z.ZodString;
                verifyPath: z.ZodOptional<z.ZodString>;
                settlePath: z.ZodOptional<z.ZodString>;
                apiKeyHeader: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$loose>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString>>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    }, z.core.$catchall<z.ZodAny>>>;
    promptExamples: z.ZodOptional<z.ZodArray<z.ZodString>>;
    iconPath: z.ZodOptional<z.ZodString>;
    videoPath: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    animation_url: z.ZodOptional<z.ZodString>;
    keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
    useCases: z.ZodOptional<z.ZodArray<z.ZodString>>;
    capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
}, z.core.$catchall<z.ZodAny>>;
type Metadata = z.infer<typeof MetadataSchema>;
declare const BuildMetadataSchema: z.ZodObject<{
    metadataSpecVersion: z.ZodDefault<z.ZodString>;
    name: z.ZodString;
    displayName: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    repository: z.ZodOptional<z.ZodString>;
    website: z.ZodOptional<z.ZodString>;
    category: z.ZodString;
    termsOfService: z.ZodOptional<z.ZodString>;
    mcpUrl: z.ZodOptional<z.ZodString>;
    payment: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        definition: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodObject<{
                code: z.ZodString;
                symbol: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            asset: z.ZodObject<{
                symbol: z.ZodString;
                network: z.ZodString;
                address: z.ZodString;
                decimals: z.ZodNumber;
            }, z.core.$strip>;
            payTo: z.ZodString;
            resource: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            scheme: z.ZodString;
            network: z.ZodString;
            facilitator: z.ZodObject<{
                url: z.ZodString;
                verifyPath: z.ZodOptional<z.ZodString>;
                settlePath: z.ZodOptional<z.ZodString>;
                apiKeyHeader: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$loose>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        inputSchema: z.ZodAny;
        annotations: z.ZodOptional<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            readOnlyHint: z.ZodOptional<z.ZodBoolean>;
            destructiveHint: z.ZodOptional<z.ZodBoolean>;
            idempotentHint: z.ZodOptional<z.ZodBoolean>;
            openWorldHint: z.ZodOptional<z.ZodBoolean>;
            requiresPayment: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        payment: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            definition: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodObject<{
                    code: z.ZodString;
                    symbol: z.ZodString;
                    decimals: z.ZodNumber;
                }, z.core.$strip>;
                asset: z.ZodObject<{
                    symbol: z.ZodString;
                    network: z.ZodString;
                    address: z.ZodString;
                    decimals: z.ZodNumber;
                }, z.core.$strip>;
                payTo: z.ZodString;
                resource: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                scheme: z.ZodString;
                network: z.ZodString;
                facilitator: z.ZodObject<{
                    url: z.ZodString;
                    verifyPath: z.ZodOptional<z.ZodString>;
                    settlePath: z.ZodOptional<z.ZodString>;
                    apiKeyHeader: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
                metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, z.core.$strip>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$loose>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
        discovery: z.ZodOptional<z.ZodObject<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString>>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        }, z.core.$catchall<z.ZodAny>>>;
        chains: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
        notifyEmail: z.ZodOptional<z.ZodBoolean>;
        category: z.ZodOptional<z.ZodEnum<{
            strategy: "strategy";
            tracker: "tracker";
            orchestrator: "orchestrator";
        }>>;
    }, z.core.$strict>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString>>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    }, z.core.$catchall<z.ZodAny>>>;
    promptExamples: z.ZodOptional<z.ZodArray<z.ZodString>>;
    iconPath: z.ZodOptional<z.ZodString>;
    videoPath: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    animation_url: z.ZodOptional<z.ZodString>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
}, z.core.$strict>;
type BuildMetadata = z.infer<typeof BuildMetadataSchema>;

type CronSpec = {
    /**
     * AWS EventBridge schedule expression (`cron(...)` or `rate(...)`).
     */
    cron: string;
    enabled?: boolean;
    notifyEmail?: boolean;
};
type ToolCategory = "strategy" | "tracker" | "orchestrator";
type ToolProfileGET = {
    description: string;
    schedule: CronSpec;
    fixedAmount?: string;
    tokenSymbol?: string;
    limits?: {
        concurrency?: number;
        dailyCap?: number;
    };
    category?: ToolCategory;
};
type ToolProfilePOST = {
    description?: string;
    notifyEmail?: boolean;
    category?: ToolCategory;
};
type GetHandler = (req: Request) => Promise<Response> | Response;
type PostHandler = (req: Request) => Promise<Response> | Response;
type ToolModuleGET = {
    profile: ToolProfileGET;
    GET: GetHandler;
    POST?: never;
    schema?: never;
};
type ToolModulePOST<B = unknown> = {
    profile?: ToolProfilePOST;
    POST: PostHandler;
    schema: z.ZodType<B>;
    GET?: never;
};
type ToolModule = ToolModuleGET | ToolModulePOST<any>;

interface ToolContent {
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
}
interface ToolResponse {
    content: ToolContent[];
    isError?: boolean;
}
declare const HTTP_METHODS: readonly ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
type HttpMethod = (typeof HTTP_METHODS)[number];
interface HttpHandlerDefinition {
    method: HttpMethod;
    handler: (request: Request) => Promise<Response> | Response;
}
type ScheduleType = "cron" | "rate";
interface NormalizedSchedule {
    type: ScheduleType;
    expression: string;
    authoredEnabled?: boolean;
    notifyEmail?: boolean;
}
interface McpConfig {
    enabled: boolean;
    mode?: "stdio" | "lambda" | "dual";
    defaultMethod?: string;
    metadataOverrides?: Partial<ToolMetadataOverrides>;
}
interface InternalToolDefinition<TSchema extends z.ZodSchema | undefined = z.ZodSchema | undefined> {
    filename: string;
    schema?: TSchema;
    inputSchema?: unknown;
    metadata: ToolMetadataOverrides | null;
    httpHandlers: HttpHandlerDefinition[];
    mcpConfig?: McpConfig | null;
    sourcePath?: string;
    handler?: (params: any) => Promise<ToolResponse>;
    payment?: X402Payment | null;
    schedule?: NormalizedSchedule | null;
    notifyEmail?: boolean;
    profileDescription?: string | null;
    profileCategory?: ToolCategory;
}
interface ServerConfig {
    name: string;
    version: string;
    tools: InternalToolDefinition[];
}
interface BuildConfig {
    toolsDir: string;
    outputDir: string;
    serverName?: string;
    serverVersion?: string;
}

interface GenerateMetadataOptions {
    input: string;
    output?: string;
}
interface GenerateMetadataResult {
    metadata: Metadata;
    defaultsApplied: string[];
    tools: InternalToolDefinition[];
    outputPath: string;
}
declare function generateMetadataCommand(options: GenerateMetadataOptions): Promise<void>;
declare function generateMetadata(options: GenerateMetadataOptions): Promise<GenerateMetadataResult>;

interface ValidateOptions {
    input: string;
}
interface LoadToolsOptions {
    projectRoot?: string;
}
declare function validateCommand(options: ValidateOptions): Promise<void>;
declare function validateFullCommand(options: ValidateOptions): Promise<void>;
declare function loadAndValidateTools(toolsDir: string, options?: LoadToolsOptions): Promise<InternalToolDefinition[]>;

export { type BuildConfig as B, type CronSpec as C, type GenerateMetadataOptions as G, HTTP_METHODS as H, type InternalToolDefinition as I, type Metadata as M, type NormalizedSchedule as N, type PaymentConfig as P, type ScheduleType as S, type ToolResponse as T, type ValidateOptions as V, type GenerateMetadataResult as a, generateMetadata as b, validateFullCommand as c, type ToolContent as d, type HttpMethod as e, type HttpHandlerDefinition as f, generateMetadataCommand as g, type McpConfig as h, type ServerConfig as i, type Tool as j, type ToolMetadataOverrides as k, loadAndValidateTools as l, type BuildMetadata as m, type ToolCategory as n, type ToolProfileGET as o, type ToolProfilePOST as p, type GetHandler as q, type PostHandler as r, type ToolModuleGET as s, type ToolModulePOST as t, type ToolModule as u, validateCommand as v };
