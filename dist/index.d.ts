import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { I as InternalToolDefinition, T as ToolResponse } from './validate-uetwG5jo.js';
export { B as BuildConfig, m as BuildMetadata, H as HTTP_METHODS, f as HttpHandlerDefinition, e as HttpMethod, h as McpConfig, M as Metadata, N as NormalizedSchedule, P as PaymentConfig, S as ScheduleType, i as ServerConfig, j as Tool, d as ToolContent, k as ToolMetadataOverrides, b as generateMetadata, g as generateMetadataCommand, l as loadAndValidateTools, v as validateCommand } from './validate-uetwG5jo.js';
import { z, ZodSchema } from 'zod';
export { CurrencySpec, DEFAULT_FACILITATOR, DefineX402PaymentConfig, EIP3009Authorization, PAYMENT_HEADERS, RequireX402PaymentOptions, RequireX402PaymentOutcome, RequireX402PaymentSuccess, SUPPORTED_CURRENCIES, X402BrowserClient, X402BrowserClientConfig, X402Client, X402ClientConfig, X402FacilitatorConfig, X402PayRequest, X402PayResult, X402Payment, X402PaymentContext, X402PaymentDefinition, X402PaymentRequiredError, X402VerificationResult, defineX402Payment, getX402PaymentContext, payX402, payX402WithWallet, requireX402Payment, withX402Payment } from './x402/index.js';
export { DEFAULT_CHAIN, DEFAULT_TOKENS, chains, getRpcUrl, registry, tokens, wallet, walletToolkit } from './wallet/index.js';
export { HyperliquidApiError, HyperliquidApproveBuilderFeeOptions, HyperliquidApproveBuilderFeeResponse, HyperliquidBuilderApprovalError, HyperliquidBuilderApprovalRecordInput, HyperliquidBuilderFee, HyperliquidClearinghouseState, HyperliquidDepositResult, HyperliquidEnvironment, HyperliquidExchangeClient, HyperliquidExchangeResponse, HyperliquidGrouping, HyperliquidGuardError, HyperliquidInfoClient, HyperliquidOrderIntent, HyperliquidOrderOptions, HyperliquidOrderResponse, HyperliquidOrderStatus, HyperliquidTermsError, HyperliquidTermsRecordInput, HyperliquidTriggerOptions, HyperliquidTriggerType, HyperliquidWithdrawResult, NonceSource, __hyperliquidInternals, approveHyperliquidBuilderFee, batchModifyHyperliquidOrders, cancelAllHyperliquidOrders, cancelHyperliquidOrders, cancelHyperliquidOrdersByCloid, cancelHyperliquidTwapOrder, createHyperliquidSubAccount, createMonotonicNonceFactory, depositToHyperliquidBridge, fetchHyperliquidAssetCtxs, fetchHyperliquidClearinghouseState, fetchHyperliquidFrontendOpenOrders, fetchHyperliquidHistoricalOrders, fetchHyperliquidMeta, fetchHyperliquidMetaAndAssetCtxs, fetchHyperliquidOpenOrders, fetchHyperliquidOrderStatus, fetchHyperliquidPreTransferCheck, fetchHyperliquidSpotAssetCtxs, fetchHyperliquidSpotClearinghouseState, fetchHyperliquidSpotMeta, fetchHyperliquidSpotMetaAndAssetCtxs, fetchHyperliquidUserFills, fetchHyperliquidUserFillsByTime, fetchHyperliquidUserRateLimit, getHyperliquidMaxBuilderFee, modifyHyperliquidOrder, placeHyperliquidOrder, placeHyperliquidTwapOrder, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, reserveHyperliquidRequestWeight, scheduleHyperliquidCancel, sendHyperliquidSpot, setHyperliquidPortfolioMargin, transferHyperliquidSubAccount, updateHyperliquidIsolatedMargin, updateHyperliquidLeverage, withdrawFromHyperliquid } from './adapters/hyperliquid/index.js';
export { AIAbortError, AIClientConfig, AIError, AIFetchError, AIRequestMetadata, AIResponseError, ChatCompletionChoice, ChatCompletionLogProbs, ChatCompletionResponse, ChatCompletionUsage, ChatMessage, ChatMessageContentPart, ChatMessageContentPartImageUrl, ChatMessageContentPartText, ChatMessageRole, DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, FunctionToolDefinition, GenerateTextOptions, GenerateTextResult, GenerationParameters, JsonSchema, ResolvedAIClientConfig, ResponseErrorDetails, StreamTextOptions, StreamTextResult, StreamingEventHandlers, ToolChoice, ToolDefinition, ToolExecutionPolicy, WEBSEARCH_TOOL_DEFINITION, WEBSEARCH_TOOL_NAME, WebSearchOptions, createAIClient, ensureTextContent, flattenMessageContent, generateText, getModelConfig, isStreamingSupported, isToolCallingSupported, listModels, normalizeModelName, resolveConfig, resolveToolset, streamText } from './ai/index.js';
export { StoreAction, StoreError, StoreEventInput, StoreOptions, StoreResponse, StoreRetrieveParams, StoreRetrieveResult, retrieve, store } from './store/index.js';
export { C as ChainMetadata, i as ChainReference, a as ChainTokenMap, H as Hex, g as HexAddress, R as RpcProviderOptions, h as RpcUrlResolver, T as TokenMetadata, l as TurnkeyOptions, k as TurnkeySignWith, r as WalletBaseContext, s as WalletContext, c as WalletFullContext, n as WalletOptions, m as WalletOptionsBase, b as WalletPrivateKeyOptions, j as WalletProviderType, f as WalletReadonlyContext, e as WalletReadonlyOptions, W as WalletRegistry, o as WalletSendTransactionParams, q as WalletSignerContext, p as WalletTransferParams, d as WalletTurnkeyOptions } from './types-BVLpaY4O.js';
import 'viem';
import 'viem/accounts';

/**
 * Create local development server for MCP tooling.
 */
declare function createDevServer(tools: InternalToolDefinition[]): Server;
/**
 * Create stdio server for use with AWS Lambda MCP Adapter
 */
declare function createStdioServer(tools?: InternalToolDefinition[]): Promise<void>;
declare function resolveRuntimePath(value: string): string;

type CronSpec = {
    /**
     * AWS EventBridge schedule expression (`cron(...)` or `rate(...)`).
     */
    cron: string;
    enabled?: boolean;
};
type ToolProfileGET = {
    description: string;
    schedule: CronSpec;
    fixedAmount?: string;
    tokenSymbol?: string;
    limits?: {
        concurrency?: number;
        dailyCap?: number;
    };
};
type ToolProfilePOST = {
    description?: string;
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

interface CreateMcpAdapterOptions {
    name: string;
    schema?: ZodSchema;
    httpHandlers: Record<string, ((request: Request) => Promise<Response> | Response) | undefined>;
    defaultMethod?: string;
}
/**
 * Create an adapter that bridges MCP `call_tool` invocations to Web Standard handlers.
 */
declare function createMcpAdapter(options: CreateMcpAdapterOptions): (rawArguments: unknown) => Promise<ToolResponse>;
declare function responseToToolResponse(response: Response): Promise<ToolResponse>;

export { type CronSpec, type GetHandler, InternalToolDefinition, type PostHandler, type ToolModule, type ToolModuleGET, type ToolModulePOST, type ToolProfileGET, type ToolProfilePOST, ToolResponse, createDevServer, createMcpAdapter, createStdioServer, resolveRuntimePath, responseToToolResponse };
