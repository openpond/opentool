import { z } from 'zod';

declare const PAYMENT_SCHEMA_VERSION: 1;
declare const paymentSchemaVersionSchema: z.ZodLiteral<1>;
type PaymentSchemaVersion = z.infer<typeof paymentSchemaVersionSchema>;
declare const decimalStringSchema: z.ZodString;
declare const currencySchema: z.ZodObject<{
    code: z.ZodEffects<z.ZodString, string, string>;
    symbol: z.ZodOptional<z.ZodString>;
    decimals: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodOptional<z.ZodDefault<z.ZodEnum<["fiat", "crypto"]>>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    symbol?: string | undefined;
    decimals?: number | undefined;
    kind?: "fiat" | "crypto" | undefined;
    description?: string | undefined;
}, {
    code: string;
    symbol?: string | undefined;
    decimals?: number | undefined;
    kind?: "fiat" | "crypto" | undefined;
    description?: string | undefined;
}>;
type Currency = z.infer<typeof currencySchema>;
declare const paymentAmountSchema: z.ZodObject<{
    value: z.ZodString;
    currency: z.ZodObject<{
        code: z.ZodEffects<z.ZodString, string, string>;
        symbol: z.ZodOptional<z.ZodString>;
        decimals: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodOptional<z.ZodDefault<z.ZodEnum<["fiat", "crypto"]>>>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        symbol?: string | undefined;
        decimals?: number | undefined;
        kind?: "fiat" | "crypto" | undefined;
        description?: string | undefined;
    }, {
        code: string;
        symbol?: string | undefined;
        decimals?: number | undefined;
        kind?: "fiat" | "crypto" | undefined;
        description?: string | undefined;
    }>;
    display: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    currency: {
        code: string;
        symbol?: string | undefined;
        decimals?: number | undefined;
        kind?: "fiat" | "crypto" | undefined;
        description?: string | undefined;
    };
    display?: string | undefined;
}, {
    value: string;
    currency: {
        code: string;
        symbol?: string | undefined;
        decimals?: number | undefined;
        kind?: "fiat" | "crypto" | undefined;
        description?: string | undefined;
    };
    display?: string | undefined;
}>;
type PaymentAmount = z.infer<typeof paymentAmountSchema>;
declare const cryptoAssetSchema: z.ZodObject<{
    symbol: z.ZodString;
    network: z.ZodOptional<z.ZodString>;
    chainId: z.ZodOptional<z.ZodNumber>;
    address: z.ZodOptional<z.ZodString>;
    decimals: z.ZodOptional<z.ZodNumber>;
    standard: z.ZodOptional<z.ZodDefault<z.ZodEnum<["erc20", "spl", "custom"]>>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    decimals?: number | undefined;
    description?: string | undefined;
    network?: string | undefined;
    chainId?: number | undefined;
    address?: string | undefined;
    standard?: "custom" | "erc20" | "spl" | undefined;
}, {
    symbol: string;
    decimals?: number | undefined;
    description?: string | undefined;
    network?: string | undefined;
    chainId?: number | undefined;
    address?: string | undefined;
    standard?: "custom" | "erc20" | "spl" | undefined;
}>;
type CryptoAsset = z.infer<typeof cryptoAssetSchema>;
declare const facilitatorConfigSchema: z.ZodObject<{
    url: z.ZodString;
    vendor: z.ZodOptional<z.ZodString>;
    verifyPath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    settlePath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    apiKey: z.ZodOptional<z.ZodString>;
    apiKeyEnv: z.ZodOptional<z.ZodString>;
    apiKeyHeader: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    url: string;
    vendor?: string | undefined;
    verifyPath?: string | undefined;
    settlePath?: string | undefined;
    apiKey?: string | undefined;
    apiKeyEnv?: string | undefined;
    apiKeyHeader?: string | undefined;
    headers?: Record<string, string> | undefined;
    timeoutMs?: number | undefined;
}, {
    url: string;
    vendor?: string | undefined;
    verifyPath?: string | undefined;
    settlePath?: string | undefined;
    apiKey?: string | undefined;
    apiKeyEnv?: string | undefined;
    apiKeyHeader?: string | undefined;
    headers?: Record<string, string> | undefined;
    timeoutMs?: number | undefined;
}>;
type FacilitatorConfig = z.infer<typeof facilitatorConfigSchema>;
declare const settlementTermsSchema: z.ZodObject<{
    windowSeconds: z.ZodOptional<z.ZodNumber>;
    targetConfirmations: z.ZodOptional<z.ZodNumber>;
    finalityDescription: z.ZodOptional<z.ZodString>;
    slaDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    windowSeconds?: number | undefined;
    targetConfirmations?: number | undefined;
    finalityDescription?: string | undefined;
    slaDescription?: string | undefined;
}, {
    windowSeconds?: number | undefined;
    targetConfirmations?: number | undefined;
    finalityDescription?: string | undefined;
    slaDescription?: string | undefined;
}>;
type SettlementTerms = z.infer<typeof settlementTermsSchema>;
declare const paymentFieldSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    description: z.ZodOptional<z.ZodString>;
    example: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: string;
    label: string;
    description?: string | undefined;
    required?: boolean | undefined;
    example?: string | undefined;
}, {
    key: string;
    label: string;
    description?: string | undefined;
    required?: boolean | undefined;
    example?: string | undefined;
}>;
type PaymentField = z.infer<typeof paymentFieldSchema>;
declare const x402ProofSchema: z.ZodObject<{
    mode: z.ZodLiteral<"x402">;
    scheme: z.ZodString;
    network: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
    facilitator: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        vendor: z.ZodOptional<z.ZodString>;
        verifyPath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        settlePath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        apiKey: z.ZodOptional<z.ZodString>;
        apiKeyEnv: z.ZodOptional<z.ZodString>;
        apiKeyHeader: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    }, {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    }>>;
    verifier: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    network: string;
    mode: "x402";
    scheme: string;
    version?: number | undefined;
    facilitator?: {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    } | undefined;
    verifier?: string | undefined;
}, {
    network: string;
    mode: "x402";
    scheme: string;
    version?: number | undefined;
    facilitator?: {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    } | undefined;
    verifier?: string | undefined;
}>;
type X402ProofConfig = z.infer<typeof x402ProofSchema>;
declare const directProofSchema: z.ZodObject<{
    mode: z.ZodLiteral<"direct">;
    proofTypes: z.ZodArray<z.ZodString, "atleastone">;
    verifier: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        description: z.ZodOptional<z.ZodString>;
        example: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }, {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }>, "many">>;
    allowsManualReview: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    mode: "direct";
    proofTypes: [string, ...string[]];
    verifier?: string | undefined;
    instructions?: string | undefined;
    fields?: {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }[] | undefined;
    allowsManualReview?: boolean | undefined;
}, {
    mode: "direct";
    proofTypes: [string, ...string[]];
    verifier?: string | undefined;
    instructions?: string | undefined;
    fields?: {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }[] | undefined;
    allowsManualReview?: boolean | undefined;
}>;
type DirectProofConfig = z.infer<typeof directProofSchema>;
declare const paymentProofSchema: z.ZodDiscriminatedUnion<"mode", [z.ZodObject<{
    mode: z.ZodLiteral<"x402">;
    scheme: z.ZodString;
    network: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
    facilitator: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        vendor: z.ZodOptional<z.ZodString>;
        verifyPath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        settlePath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        apiKey: z.ZodOptional<z.ZodString>;
        apiKeyEnv: z.ZodOptional<z.ZodString>;
        apiKeyHeader: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    }, {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    }>>;
    verifier: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    network: string;
    mode: "x402";
    scheme: string;
    version?: number | undefined;
    facilitator?: {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    } | undefined;
    verifier?: string | undefined;
}, {
    network: string;
    mode: "x402";
    scheme: string;
    version?: number | undefined;
    facilitator?: {
        url: string;
        vendor?: string | undefined;
        verifyPath?: string | undefined;
        settlePath?: string | undefined;
        apiKey?: string | undefined;
        apiKeyEnv?: string | undefined;
        apiKeyHeader?: string | undefined;
        headers?: Record<string, string> | undefined;
        timeoutMs?: number | undefined;
    } | undefined;
    verifier?: string | undefined;
}>, z.ZodObject<{
    mode: z.ZodLiteral<"direct">;
    proofTypes: z.ZodArray<z.ZodString, "atleastone">;
    verifier: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        description: z.ZodOptional<z.ZodString>;
        example: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }, {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }>, "many">>;
    allowsManualReview: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    mode: "direct";
    proofTypes: [string, ...string[]];
    verifier?: string | undefined;
    instructions?: string | undefined;
    fields?: {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }[] | undefined;
    allowsManualReview?: boolean | undefined;
}, {
    mode: "direct";
    proofTypes: [string, ...string[]];
    verifier?: string | undefined;
    instructions?: string | undefined;
    fields?: {
        key: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        example?: string | undefined;
    }[] | undefined;
    allowsManualReview?: boolean | undefined;
}>]>;
type PaymentProofConfig = z.infer<typeof paymentProofSchema>;
declare const paymentOptionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodObject<{
        value: z.ZodString;
        currency: z.ZodObject<{
            code: z.ZodEffects<z.ZodString, string, string>;
            symbol: z.ZodOptional<z.ZodString>;
            decimals: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodOptional<z.ZodDefault<z.ZodEnum<["fiat", "crypto"]>>>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        }, {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        }>;
        display: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    }, {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    }>;
    asset: z.ZodObject<{
        symbol: z.ZodString;
        network: z.ZodOptional<z.ZodString>;
        chainId: z.ZodOptional<z.ZodNumber>;
        address: z.ZodOptional<z.ZodString>;
        decimals: z.ZodOptional<z.ZodNumber>;
        standard: z.ZodOptional<z.ZodDefault<z.ZodEnum<["erc20", "spl", "custom"]>>>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        decimals?: number | undefined;
        description?: string | undefined;
        network?: string | undefined;
        chainId?: number | undefined;
        address?: string | undefined;
        standard?: "custom" | "erc20" | "spl" | undefined;
    }, {
        symbol: string;
        decimals?: number | undefined;
        description?: string | undefined;
        network?: string | undefined;
        chainId?: number | undefined;
        address?: string | undefined;
        standard?: "custom" | "erc20" | "spl" | undefined;
    }>;
    payTo: z.ZodString;
    resource: z.ZodOptional<z.ZodString>;
    proof: z.ZodDiscriminatedUnion<"mode", [z.ZodObject<{
        mode: z.ZodLiteral<"x402">;
        scheme: z.ZodString;
        network: z.ZodString;
        version: z.ZodOptional<z.ZodNumber>;
        facilitator: z.ZodOptional<z.ZodObject<{
            url: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            verifyPath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            settlePath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            apiKey: z.ZodOptional<z.ZodString>;
            apiKeyEnv: z.ZodOptional<z.ZodString>;
            apiKeyHeader: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            timeoutMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            vendor?: string | undefined;
            verifyPath?: string | undefined;
            settlePath?: string | undefined;
            apiKey?: string | undefined;
            apiKeyEnv?: string | undefined;
            apiKeyHeader?: string | undefined;
            headers?: Record<string, string> | undefined;
            timeoutMs?: number | undefined;
        }, {
            url: string;
            vendor?: string | undefined;
            verifyPath?: string | undefined;
            settlePath?: string | undefined;
            apiKey?: string | undefined;
            apiKeyEnv?: string | undefined;
            apiKeyHeader?: string | undefined;
            headers?: Record<string, string> | undefined;
            timeoutMs?: number | undefined;
        }>>;
        verifier: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        network: string;
        mode: "x402";
        scheme: string;
        version?: number | undefined;
        facilitator?: {
            url: string;
            vendor?: string | undefined;
            verifyPath?: string | undefined;
            settlePath?: string | undefined;
            apiKey?: string | undefined;
            apiKeyEnv?: string | undefined;
            apiKeyHeader?: string | undefined;
            headers?: Record<string, string> | undefined;
            timeoutMs?: number | undefined;
        } | undefined;
        verifier?: string | undefined;
    }, {
        network: string;
        mode: "x402";
        scheme: string;
        version?: number | undefined;
        facilitator?: {
            url: string;
            vendor?: string | undefined;
            verifyPath?: string | undefined;
            settlePath?: string | undefined;
            apiKey?: string | undefined;
            apiKeyEnv?: string | undefined;
            apiKeyHeader?: string | undefined;
            headers?: Record<string, string> | undefined;
            timeoutMs?: number | undefined;
        } | undefined;
        verifier?: string | undefined;
    }>, z.ZodObject<{
        mode: z.ZodLiteral<"direct">;
        proofTypes: z.ZodArray<z.ZodString, "atleastone">;
        verifier: z.ZodOptional<z.ZodString>;
        instructions: z.ZodOptional<z.ZodString>;
        fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            description: z.ZodOptional<z.ZodString>;
            example: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            key: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            example?: string | undefined;
        }, {
            key: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            example?: string | undefined;
        }>, "many">>;
        allowsManualReview: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        mode: "direct";
        proofTypes: [string, ...string[]];
        verifier?: string | undefined;
        instructions?: string | undefined;
        fields?: {
            key: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            example?: string | undefined;
        }[] | undefined;
        allowsManualReview?: boolean | undefined;
    }, {
        mode: "direct";
        proofTypes: [string, ...string[]];
        verifier?: string | undefined;
        instructions?: string | undefined;
        fields?: {
            key: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            example?: string | undefined;
        }[] | undefined;
        allowsManualReview?: boolean | undefined;
    }>]>;
    settlement: z.ZodOptional<z.ZodObject<{
        windowSeconds: z.ZodOptional<z.ZodNumber>;
        targetConfirmations: z.ZodOptional<z.ZodNumber>;
        finalityDescription: z.ZodOptional<z.ZodString>;
        slaDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        windowSeconds?: number | undefined;
        targetConfirmations?: number | undefined;
        finalityDescription?: string | undefined;
        slaDescription?: string | undefined;
    }, {
        windowSeconds?: number | undefined;
        targetConfirmations?: number | undefined;
        finalityDescription?: string | undefined;
        slaDescription?: string | undefined;
    }>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    amount: {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    };
    asset: {
        symbol: string;
        decimals?: number | undefined;
        description?: string | undefined;
        network?: string | undefined;
        chainId?: number | undefined;
        address?: string | undefined;
        standard?: "custom" | "erc20" | "spl" | undefined;
    };
    payTo: string;
    proof: {
        network: string;
        mode: "x402";
        scheme: string;
        version?: number | undefined;
        facilitator?: {
            url: string;
            vendor?: string | undefined;
            verifyPath?: string | undefined;
            settlePath?: string | undefined;
            apiKey?: string | undefined;
            apiKeyEnv?: string | undefined;
            apiKeyHeader?: string | undefined;
            headers?: Record<string, string> | undefined;
            timeoutMs?: number | undefined;
        } | undefined;
        verifier?: string | undefined;
    } | {
        mode: "direct";
        proofTypes: [string, ...string[]];
        verifier?: string | undefined;
        instructions?: string | undefined;
        fields?: {
            key: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            example?: string | undefined;
        }[] | undefined;
        allowsManualReview?: boolean | undefined;
    };
    description?: string | undefined;
    resource?: string | undefined;
    settlement?: {
        windowSeconds?: number | undefined;
        targetConfirmations?: number | undefined;
        finalityDescription?: string | undefined;
        slaDescription?: string | undefined;
    } | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    title: string;
    amount: {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    };
    asset: {
        symbol: string;
        decimals?: number | undefined;
        description?: string | undefined;
        network?: string | undefined;
        chainId?: number | undefined;
        address?: string | undefined;
        standard?: "custom" | "erc20" | "spl" | undefined;
    };
    payTo: string;
    proof: {
        network: string;
        mode: "x402";
        scheme: string;
        version?: number | undefined;
        facilitator?: {
            url: string;
            vendor?: string | undefined;
            verifyPath?: string | undefined;
            settlePath?: string | undefined;
            apiKey?: string | undefined;
            apiKeyEnv?: string | undefined;
            apiKeyHeader?: string | undefined;
            headers?: Record<string, string> | undefined;
            timeoutMs?: number | undefined;
        } | undefined;
        verifier?: string | undefined;
    } | {
        mode: "direct";
        proofTypes: [string, ...string[]];
        verifier?: string | undefined;
        instructions?: string | undefined;
        fields?: {
            key: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            example?: string | undefined;
        }[] | undefined;
        allowsManualReview?: boolean | undefined;
    };
    description?: string | undefined;
    resource?: string | undefined;
    settlement?: {
        windowSeconds?: number | undefined;
        targetConfirmations?: number | undefined;
        finalityDescription?: string | undefined;
        slaDescription?: string | undefined;
    } | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
type PaymentOption = z.infer<typeof paymentOptionSchema>;
declare const paymentRequirementsSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    message: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    resource: z.ZodOptional<z.ZodString>;
    accepts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        amount: z.ZodObject<{
            value: z.ZodString;
            currency: z.ZodObject<{
                code: z.ZodEffects<z.ZodString, string, string>;
                symbol: z.ZodOptional<z.ZodString>;
                decimals: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodOptional<z.ZodDefault<z.ZodEnum<["fiat", "crypto"]>>>;
                description: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            }, {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            }>;
            display: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        }, {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        }>;
        asset: z.ZodObject<{
            symbol: z.ZodString;
            network: z.ZodOptional<z.ZodString>;
            chainId: z.ZodOptional<z.ZodNumber>;
            address: z.ZodOptional<z.ZodString>;
            decimals: z.ZodOptional<z.ZodNumber>;
            standard: z.ZodOptional<z.ZodDefault<z.ZodEnum<["erc20", "spl", "custom"]>>>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        }, {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        }>;
        payTo: z.ZodString;
        resource: z.ZodOptional<z.ZodString>;
        proof: z.ZodDiscriminatedUnion<"mode", [z.ZodObject<{
            mode: z.ZodLiteral<"x402">;
            scheme: z.ZodString;
            network: z.ZodString;
            version: z.ZodOptional<z.ZodNumber>;
            facilitator: z.ZodOptional<z.ZodObject<{
                url: z.ZodString;
                vendor: z.ZodOptional<z.ZodString>;
                verifyPath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                settlePath: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                apiKey: z.ZodOptional<z.ZodString>;
                apiKeyEnv: z.ZodOptional<z.ZodString>;
                apiKeyHeader: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                timeoutMs: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            }, {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            }>>;
            verifier: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        }, {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        }>, z.ZodObject<{
            mode: z.ZodLiteral<"direct">;
            proofTypes: z.ZodArray<z.ZodString, "atleastone">;
            verifier: z.ZodOptional<z.ZodString>;
            instructions: z.ZodOptional<z.ZodString>;
            fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodString;
                label: z.ZodString;
                required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                description: z.ZodOptional<z.ZodString>;
                example: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }, {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }>, "many">>;
            allowsManualReview: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        }, {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        }>]>;
        settlement: z.ZodOptional<z.ZodObject<{
            windowSeconds: z.ZodOptional<z.ZodNumber>;
            targetConfirmations: z.ZodOptional<z.ZodNumber>;
            finalityDescription: z.ZodOptional<z.ZodString>;
            slaDescription: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        }, {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        }>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        amount: {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        };
        asset: {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        };
        payTo: string;
        proof: {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        } | {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        };
        description?: string | undefined;
        resource?: string | undefined;
        settlement?: {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        } | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        id: string;
        title: string;
        amount: {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        };
        asset: {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        };
        payTo: string;
        proof: {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        } | {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        };
        description?: string | undefined;
        resource?: string | undefined;
        settlement?: {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        } | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "atleastone">;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    fallbackText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: 1;
    accepts: [{
        id: string;
        title: string;
        amount: {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        };
        asset: {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        };
        payTo: string;
        proof: {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        } | {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        };
        description?: string | undefined;
        resource?: string | undefined;
        settlement?: {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        } | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, ...{
        id: string;
        title: string;
        amount: {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        };
        asset: {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        };
        payTo: string;
        proof: {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        } | {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        };
        description?: string | undefined;
        resource?: string | undefined;
        settlement?: {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        } | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[]];
    message?: string | undefined;
    title?: string | undefined;
    resource?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    fallbackText?: string | undefined;
}, {
    schemaVersion: 1;
    accepts: [{
        id: string;
        title: string;
        amount: {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        };
        asset: {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        };
        payTo: string;
        proof: {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        } | {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        };
        description?: string | undefined;
        resource?: string | undefined;
        settlement?: {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        } | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, ...{
        id: string;
        title: string;
        amount: {
            value: string;
            currency: {
                code: string;
                symbol?: string | undefined;
                decimals?: number | undefined;
                kind?: "fiat" | "crypto" | undefined;
                description?: string | undefined;
            };
            display?: string | undefined;
        };
        asset: {
            symbol: string;
            decimals?: number | undefined;
            description?: string | undefined;
            network?: string | undefined;
            chainId?: number | undefined;
            address?: string | undefined;
            standard?: "custom" | "erc20" | "spl" | undefined;
        };
        payTo: string;
        proof: {
            network: string;
            mode: "x402";
            scheme: string;
            version?: number | undefined;
            facilitator?: {
                url: string;
                vendor?: string | undefined;
                verifyPath?: string | undefined;
                settlePath?: string | undefined;
                apiKey?: string | undefined;
                apiKeyEnv?: string | undefined;
                apiKeyHeader?: string | undefined;
                headers?: Record<string, string> | undefined;
                timeoutMs?: number | undefined;
            } | undefined;
            verifier?: string | undefined;
        } | {
            mode: "direct";
            proofTypes: [string, ...string[]];
            verifier?: string | undefined;
            instructions?: string | undefined;
            fields?: {
                key: string;
                label: string;
                description?: string | undefined;
                required?: boolean | undefined;
                example?: string | undefined;
            }[] | undefined;
            allowsManualReview?: boolean | undefined;
        };
        description?: string | undefined;
        resource?: string | undefined;
        settlement?: {
            windowSeconds?: number | undefined;
            targetConfirmations?: number | undefined;
            finalityDescription?: string | undefined;
            slaDescription?: string | undefined;
        } | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[]];
    message?: string | undefined;
    title?: string | undefined;
    resource?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    fallbackText?: string | undefined;
}>;
type PaymentRequirementsDefinition = z.infer<typeof paymentRequirementsSchema>;
declare const x402PaymentHeaderSchema: z.ZodObject<{
    x402Version: z.ZodNumber;
    scheme: z.ZodString;
    network: z.ZodString;
    payload: z.ZodUnknown;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    network: string;
    scheme: string;
    x402Version: number;
    payload?: unknown;
    correlationId?: string | undefined;
}, {
    network: string;
    scheme: string;
    x402Version: number;
    payload?: unknown;
    correlationId?: string | undefined;
}>;
type X402PaymentHeader = z.infer<typeof x402PaymentHeaderSchema>;
declare const directPaymentPayloadSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    optionId: z.ZodString;
    proofType: z.ZodString;
    payload: z.ZodUnknown;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: 1;
    optionId: string;
    proofType: string;
    metadata?: Record<string, unknown> | undefined;
    payload?: unknown;
}, {
    schemaVersion: 1;
    optionId: string;
    proofType: string;
    metadata?: Record<string, unknown> | undefined;
    payload?: unknown;
}>;
type DirectPaymentPayload = z.infer<typeof directPaymentPayloadSchema>;
declare const paymentSuccessMetadataSchema: z.ZodObject<{
    optionId: z.ZodString;
    verifier: z.ZodOptional<z.ZodString>;
    txHash: z.ZodOptional<z.ZodString>;
    networkId: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodObject<{
        value: z.ZodString;
        currency: z.ZodObject<{
            code: z.ZodEffects<z.ZodString, string, string>;
            symbol: z.ZodOptional<z.ZodString>;
            decimals: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodOptional<z.ZodDefault<z.ZodEnum<["fiat", "crypto"]>>>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        }, {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        }>;
        display: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    }, {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    }>>;
    settledAt: z.ZodOptional<z.ZodString>;
    payload: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    optionId: string;
    verifier?: string | undefined;
    amount?: {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    } | undefined;
    payload?: unknown;
    txHash?: string | undefined;
    networkId?: string | undefined;
    settledAt?: string | undefined;
}, {
    optionId: string;
    verifier?: string | undefined;
    amount?: {
        value: string;
        currency: {
            code: string;
            symbol?: string | undefined;
            decimals?: number | undefined;
            kind?: "fiat" | "crypto" | undefined;
            description?: string | undefined;
        };
        display?: string | undefined;
    } | undefined;
    payload?: unknown;
    txHash?: string | undefined;
    networkId?: string | undefined;
    settledAt?: string | undefined;
}>;
type PaymentSuccessMetadata = z.infer<typeof paymentSuccessMetadataSchema>;
declare const paymentFailureSchema: z.ZodObject<{
    reason: z.ZodString;
    code: z.ZodOptional<z.ZodDefault<z.ZodEnum<["verifier_not_found", "verification_failed", "invalid_payload", "unsupported_option", "missing_header", "unknown"]>>>;
    retryable: z.ZodOptional<z.ZodBoolean>;
    detail: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    code?: "unknown" | "verifier_not_found" | "verification_failed" | "invalid_payload" | "unsupported_option" | "missing_header" | undefined;
    retryable?: boolean | undefined;
    detail?: unknown;
}, {
    reason: string;
    code?: "unknown" | "verifier_not_found" | "verification_failed" | "invalid_payload" | "unsupported_option" | "missing_header" | undefined;
    retryable?: boolean | undefined;
    detail?: unknown;
}>;
type PaymentFailure = z.infer<typeof paymentFailureSchema>;

declare const HEADER_X402 = "X-PAYMENT";
declare const HEADER_DIRECT = "X-PAYMENT-PROOF";
declare const HEADER_PAYMENT_RESPONSE = "X-PAYMENT-RESPONSE";
declare const x402RequirementSchema: z.ZodObject<{
    scheme: z.ZodString;
    network: z.ZodString;
    maxAmountRequired: z.ZodString;
    asset: z.ZodString;
    payTo: z.ZodString;
    resource: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    outputSchema: z.ZodOptional<z.ZodUnknown>;
    maxTimeoutSeconds: z.ZodOptional<z.ZodNumber>;
    extra: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    network: string;
    scheme: string;
    asset: string;
    payTo: string;
    maxAmountRequired: string;
    description?: string | undefined;
    resource?: string | undefined;
    mimeType?: string | undefined;
    outputSchema?: unknown;
    maxTimeoutSeconds?: number | undefined;
    extra?: Record<string, unknown> | null | undefined;
}, {
    network: string;
    scheme: string;
    asset: string;
    payTo: string;
    maxAmountRequired: string;
    description?: string | undefined;
    resource?: string | undefined;
    mimeType?: string | undefined;
    outputSchema?: unknown;
    maxTimeoutSeconds?: number | undefined;
    extra?: Record<string, unknown> | null | undefined;
}>;
type X402Requirement = z.infer<typeof x402RequirementSchema>;
interface X402RequirementsResponse {
    x402Version: number;
    error?: string;
    accepts: X402Requirement[];
}
interface PaymentRequiredBody extends PaymentRequirementsDefinition {
    x402?: X402RequirementsResponse;
}
type PaymentAttempt = {
    type: "x402";
    headerName: typeof HEADER_X402;
    raw: string;
    payload: X402PaymentHeader;
} | {
    type: "direct";
    headerName: typeof HEADER_DIRECT;
    raw: string;
    payload: DirectPaymentPayload;
};
interface ExtractAttemptsResult {
    attempts: PaymentAttempt[];
    failures: PaymentFailure[];
}
interface PaymentVerificationContext {
    attempt: PaymentAttempt;
    option: PaymentOption;
    definition: PaymentRequirementsDefinition;
    settle?: boolean;
}
interface PaymentVerificationResult {
    success: boolean;
    optionId: string;
    attemptType: PaymentAttempt["type"];
    metadata?: PaymentSuccessMetadata;
    failure?: PaymentFailure;
    responseHeaders?: Record<string, string>;
}
type PaymentVerifier = (context: PaymentVerificationContext) => Promise<PaymentVerificationResult>;
interface VerifyPaymentOptions {
    definition: PaymentRequirementsDefinition;
    request?: Request;
    attempts?: PaymentAttempt[];
    settle?: boolean;
    verifiers?: Record<string, PaymentVerifier>;
    fetchImpl?: typeof fetch;
}
declare function createPaymentRequiredBody(definition: PaymentRequirementsDefinition): PaymentRequiredBody;
declare function paymentRequiredResponse(definition: PaymentRequirementsDefinition, init?: ResponseInit): Response;
declare function extractPaymentAttempts(source: Request): ExtractAttemptsResult;
declare function verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult>;
declare function createPaymentResponseHeader(metadata: PaymentSuccessMetadata): string;
declare const PAYMENT_HEADERS: {
    readonly x402: "X-PAYMENT";
    readonly direct: "X-PAYMENT-PROOF";
    readonly response: "X-PAYMENT-RESPONSE";
};

interface DefinedPayment {
    definition: PaymentRequirementsDefinition;
    verifiers: Record<string, PaymentVerifier>;
    metadata?: Record<string, unknown>;
    message?: string;
}
interface RequirePaymentOptions {
    settle?: boolean;
    verifiers?: Record<string, PaymentVerifier>;
    fetchImpl?: typeof fetch;
    onFailure?: (result: PaymentVerificationResult) => Response;
}
interface RequirePaymentSuccess {
    payment: PaymentSuccessMetadata;
    headers: Record<string, string>;
    optionId: string;
    result: PaymentVerificationResult;
}
type RequirePaymentOutcome = Response | RequirePaymentSuccess;
declare class PaymentRequiredError extends Error {
    readonly response: Response;
    readonly verification: PaymentVerificationResult | undefined;
    constructor(response: Response, verification?: PaymentVerificationResult);
}
type PaymentContext = RequirePaymentSuccess;
declare function getPaymentContext(request: Request): PaymentContext | undefined;
declare function withPaymentRequirement(handler: (request: Request) => Promise<Response> | Response, payment: DefinedPayment | PaymentRequirementsDefinition, options?: RequirePaymentOptions): (request: Request) => Promise<Response>;
interface DefinePaymentConfig {
    amount: string | number;
    payTo: string;
    currency?: string;
    message?: string;
    resource?: string;
    acceptedMethods?: ("x402" | "402")[];
    acceptedCurrencies?: string[];
    chainIds?: number[];
    facilitator?: "opentool" | "coinbase" | string | X402ProofConfig["facilitator"];
    metadata?: Record<string, unknown>;
    verifiers?: Record<string, PaymentVerifier>;
    x402?: X402Config;
    direct?: DirectConfig;
}
interface X402Config {
    id?: string;
    facilitator?: string | X402ProofConfig["facilitator"];
    network?: string;
    assetAddress?: string;
    scheme?: string;
    version?: number;
    settlement?: SettlementTerms;
}
interface DirectConfig {
    id?: string;
    verifierId?: string;
    proofType?: string;
    token?: string;
    verify?: PaymentVerifier;
    instructions?: string;
    fields?: PaymentField[];
    allowsManualReview?: boolean;
    settlement?: SettlementTerms;
}
declare function definePayment(config: DefinePaymentConfig): DefinedPayment;
declare function requirePayment(request: Request, payment: DefinedPayment | PaymentRequirementsDefinition, options?: RequirePaymentOptions): Promise<RequirePaymentOutcome>;

export { type RequirePaymentOutcome as $, paymentFailureSchema as A, type PaymentFailure as B, type Currency as C, type DirectProofConfig as D, type X402Requirement as E, type FacilitatorConfig as F, type X402RequirementsResponse as G, HEADER_PAYMENT_RESPONSE as H, type PaymentRequiredBody as I, type PaymentAttempt as J, type ExtractAttemptsResult as K, type PaymentVerificationContext as L, type PaymentVerificationResult as M, type PaymentVerifier as N, createPaymentRequiredBody as O, PAYMENT_SCHEMA_VERSION as P, paymentRequiredResponse as Q, extractPaymentAttempts as R, type SettlementTerms as S, verifyPayment as T, createPaymentResponseHeader as U, type VerifyPaymentOptions as V, PAYMENT_HEADERS as W, type X402ProofConfig as X, type DefinedPayment as Y, type RequirePaymentOptions as Z, type RequirePaymentSuccess as _, type PaymentSchemaVersion as a, PaymentRequiredError as a0, type PaymentContext as a1, getPaymentContext as a2, withPaymentRequirement as a3, type DefinePaymentConfig as a4, type X402Config as a5, type DirectConfig as a6, definePayment as a7, requirePayment as a8, paymentAmountSchema as b, currencySchema as c, decimalStringSchema as d, type PaymentAmount as e, cryptoAssetSchema as f, type CryptoAsset as g, facilitatorConfigSchema as h, paymentFieldSchema as i, type PaymentField as j, directProofSchema as k, paymentProofSchema as l, type PaymentProofConfig as m, paymentOptionSchema as n, type PaymentOption as o, paymentSchemaVersionSchema as p, paymentRequirementsSchema as q, type PaymentRequirementsDefinition as r, settlementTermsSchema as s, x402PaymentHeaderSchema as t, type X402PaymentHeader as u, directPaymentPayloadSchema as v, type DirectPaymentPayload as w, x402ProofSchema as x, paymentSuccessMetadataSchema as y, type PaymentSuccessMetadata as z };
