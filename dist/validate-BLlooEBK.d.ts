import { z } from 'zod';
import { Y as DefinedPayment } from './index-D3DaM5Rs.js';

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
    }, "strict", z.ZodTypeAny, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }>>;
    payment: z.ZodOptional<z.ZodObject<{
        amountUSDC: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        x402: z.ZodOptional<z.ZodBoolean>;
        plain402: z.ZodOptional<z.ZodBoolean>;
        acceptedMethods: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodLiteral<"x402">, z.ZodLiteral<"402">]>, "many">>;
        acceptedCurrencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        chainIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        facilitator: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">>>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">>;
}, "strip", z.ZodAny, z.objectOutputType<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    annotations: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
        idempotentHint: z.ZodOptional<z.ZodBoolean>;
        openWorldHint: z.ZodOptional<z.ZodBoolean>;
        requiresPayment: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }>>;
    payment: z.ZodOptional<z.ZodObject<{
        amountUSDC: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        x402: z.ZodOptional<z.ZodBoolean>;
        plain402: z.ZodOptional<z.ZodBoolean>;
        acceptedMethods: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodLiteral<"x402">, z.ZodLiteral<"402">]>, "many">>;
        acceptedCurrencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        chainIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        facilitator: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">>>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">>;
}, z.ZodAny, "strip">, z.objectInputType<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    annotations: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
        idempotentHint: z.ZodOptional<z.ZodBoolean>;
        openWorldHint: z.ZodOptional<z.ZodBoolean>;
        requiresPayment: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }>>;
    payment: z.ZodOptional<z.ZodObject<{
        amountUSDC: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        x402: z.ZodOptional<z.ZodBoolean>;
        plain402: z.ZodOptional<z.ZodBoolean>;
        acceptedMethods: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodLiteral<"x402">, z.ZodLiteral<"402">]>, "many">>;
        acceptedCurrencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        chainIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        facilitator: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">>>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">>;
}, z.ZodAny, "strip">>;
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
    }, "strict", z.ZodTypeAny, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }, {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    }>>;
    payment: z.ZodOptional<z.ZodObject<{
        amountUSDC: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        x402: z.ZodOptional<z.ZodBoolean>;
        plain402: z.ZodOptional<z.ZodBoolean>;
        acceptedMethods: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodLiteral<"x402">, z.ZodLiteral<"402">]>, "many">>;
        acceptedCurrencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        chainIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        facilitator: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }>>;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">>>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">>;
}, "strict", z.ZodTypeAny, {
    description: string;
    name: string;
    payment?: {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    } | undefined;
    annotations?: {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    } | undefined;
    discovery?: z.objectOutputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip"> | undefined;
    chains?: (string | number)[] | undefined;
    inputSchema?: any;
}, {
    description: string;
    name: string;
    payment?: {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    } | undefined;
    annotations?: {
        title?: string | undefined;
        readOnlyHint?: boolean | undefined;
        destructiveHint?: boolean | undefined;
        idempotentHint?: boolean | undefined;
        openWorldHint?: boolean | undefined;
        requiresPayment?: boolean | undefined;
    } | undefined;
    discovery?: z.objectInputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip"> | undefined;
    chains?: (string | number)[] | undefined;
    inputSchema?: any;
}>;
type Tool = z.infer<typeof ToolSchema>;
declare const MetadataSchema: z.ZodObject<{
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
    payment: z.ZodOptional<z.ZodObject<{
        amountUSDC: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        x402: z.ZodOptional<z.ZodBoolean>;
        plain402: z.ZodOptional<z.ZodBoolean>;
        acceptedMethods: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodLiteral<"x402">, z.ZodLiteral<"402">]>, "many">>;
        acceptedCurrencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        chainIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        facilitator: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }, {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    }>>;
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
        }, "strict", z.ZodTypeAny, {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
            requiresPayment?: boolean | undefined;
        }, {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
            requiresPayment?: boolean | undefined;
        }>>;
        payment: z.ZodOptional<z.ZodObject<{
            amountUSDC: z.ZodOptional<z.ZodNumber>;
            description: z.ZodOptional<z.ZodString>;
            x402: z.ZodOptional<z.ZodBoolean>;
            plain402: z.ZodOptional<z.ZodBoolean>;
            acceptedMethods: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodLiteral<"x402">, z.ZodLiteral<"402">]>, "many">>;
            acceptedCurrencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            chainIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            facilitator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            description?: string | undefined;
            x402?: boolean | undefined;
            facilitator?: string | undefined;
            amountUSDC?: number | undefined;
            plain402?: boolean | undefined;
            acceptedMethods?: ("x402" | "402")[] | undefined;
            acceptedCurrencies?: string[] | undefined;
            chainIds?: number[] | undefined;
        }, {
            description?: string | undefined;
            x402?: boolean | undefined;
            facilitator?: string | undefined;
            amountUSDC?: number | undefined;
            plain402?: boolean | undefined;
            acceptedMethods?: ("x402" | "402")[] | undefined;
            acceptedCurrencies?: string[] | undefined;
            chainIds?: number[] | undefined;
        }>>;
        discovery: z.ZodOptional<z.ZodObject<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        }, "strip", z.ZodAny, z.objectOutputType<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        }, z.ZodAny, "strip">, z.objectInputType<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        }, z.ZodAny, "strip">>>;
        chains: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">>;
    }, "strict", z.ZodTypeAny, {
        description: string;
        name: string;
        payment?: {
            description?: string | undefined;
            x402?: boolean | undefined;
            facilitator?: string | undefined;
            amountUSDC?: number | undefined;
            plain402?: boolean | undefined;
            acceptedMethods?: ("x402" | "402")[] | undefined;
            acceptedCurrencies?: string[] | undefined;
            chainIds?: number[] | undefined;
        } | undefined;
        annotations?: {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
            requiresPayment?: boolean | undefined;
        } | undefined;
        discovery?: z.objectOutputType<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        }, z.ZodAny, "strip"> | undefined;
        chains?: (string | number)[] | undefined;
        inputSchema?: any;
    }, {
        description: string;
        name: string;
        payment?: {
            description?: string | undefined;
            x402?: boolean | undefined;
            facilitator?: string | undefined;
            amountUSDC?: number | undefined;
            plain402?: boolean | undefined;
            acceptedMethods?: ("x402" | "402")[] | undefined;
            acceptedCurrencies?: string[] | undefined;
            chainIds?: number[] | undefined;
        } | undefined;
        annotations?: {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
            requiresPayment?: boolean | undefined;
        } | undefined;
        discovery?: z.objectInputType<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        }, z.ZodAny, "strip"> | undefined;
        chains?: (string | number)[] | undefined;
        inputSchema?: any;
    }>, "many">;
    discovery: z.ZodOptional<z.ZodObject<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, "strip", z.ZodAny, z.objectOutputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">, z.objectInputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip">>>;
    promptExamples: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    iconPath: z.ZodOptional<z.ZodString>;
    videoPath: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    animation_url: z.ZodOptional<z.ZodString>;
    chains: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">>;
}, "strict", z.ZodTypeAny, {
    version: string;
    category: string;
    name: string;
    metadataSpecVersion: string;
    displayName: string;
    tools: {
        description: string;
        name: string;
        payment?: {
            description?: string | undefined;
            x402?: boolean | undefined;
            facilitator?: string | undefined;
            amountUSDC?: number | undefined;
            plain402?: boolean | undefined;
            acceptedMethods?: ("x402" | "402")[] | undefined;
            acceptedCurrencies?: string[] | undefined;
            chainIds?: number[] | undefined;
        } | undefined;
        annotations?: {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
            requiresPayment?: boolean | undefined;
        } | undefined;
        discovery?: z.objectOutputType<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        }, z.ZodAny, "strip"> | undefined;
        chains?: (string | number)[] | undefined;
        inputSchema?: any;
    }[];
    description?: string | undefined;
    payment?: {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    } | undefined;
    discovery?: z.objectOutputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip"> | undefined;
    chains?: (string | number)[] | undefined;
    author?: string | undefined;
    repository?: string | undefined;
    website?: string | undefined;
    termsOfService?: string | undefined;
    mcpUrl?: string | undefined;
    promptExamples?: string[] | undefined;
    iconPath?: string | undefined;
    videoPath?: string | undefined;
    image?: string | undefined;
    animation_url?: string | undefined;
}, {
    version: string;
    category: string;
    name: string;
    displayName: string;
    tools: {
        description: string;
        name: string;
        payment?: {
            description?: string | undefined;
            x402?: boolean | undefined;
            facilitator?: string | undefined;
            amountUSDC?: number | undefined;
            plain402?: boolean | undefined;
            acceptedMethods?: ("x402" | "402")[] | undefined;
            acceptedCurrencies?: string[] | undefined;
            chainIds?: number[] | undefined;
        } | undefined;
        annotations?: {
            title?: string | undefined;
            readOnlyHint?: boolean | undefined;
            destructiveHint?: boolean | undefined;
            idempotentHint?: boolean | undefined;
            openWorldHint?: boolean | undefined;
            requiresPayment?: boolean | undefined;
        } | undefined;
        discovery?: z.objectInputType<{
            keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            category: z.ZodOptional<z.ZodString>;
            useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        }, z.ZodAny, "strip"> | undefined;
        chains?: (string | number)[] | undefined;
        inputSchema?: any;
    }[];
    description?: string | undefined;
    payment?: {
        description?: string | undefined;
        x402?: boolean | undefined;
        facilitator?: string | undefined;
        amountUSDC?: number | undefined;
        plain402?: boolean | undefined;
        acceptedMethods?: ("x402" | "402")[] | undefined;
        acceptedCurrencies?: string[] | undefined;
        chainIds?: number[] | undefined;
    } | undefined;
    discovery?: z.objectInputType<{
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodOptional<z.ZodString>;
        useCases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirements: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        pricing: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        compatibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        documentation: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    }, z.ZodAny, "strip"> | undefined;
    chains?: (string | number)[] | undefined;
    metadataSpecVersion?: string | undefined;
    author?: string | undefined;
    repository?: string | undefined;
    website?: string | undefined;
    termsOfService?: string | undefined;
    mcpUrl?: string | undefined;
    promptExamples?: string[] | undefined;
    iconPath?: string | undefined;
    videoPath?: string | undefined;
    image?: string | undefined;
    animation_url?: string | undefined;
}>;
type Metadata = z.infer<typeof MetadataSchema>;

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
    payment?: DefinedPayment | null;
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

export { type BuildConfig as B, type GenerateMetadataOptions as G, HTTP_METHODS as H, type InternalToolDefinition as I, type McpConfig as M, type ServerConfig as S, type ToolResponse as T, type ValidateOptions as V, generateMetadataCommand as a, type ToolContent as b, type HttpMethod as c, type HttpHandlerDefinition as d, type Tool as e, type ToolMetadataOverrides as f, generateMetadata as g, type Metadata as h, type GenerateMetadataResult as i, validateFullCommand as j, loadAndValidateTools as l, validateCommand as v };
