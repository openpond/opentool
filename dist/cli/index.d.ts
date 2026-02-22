#!/usr/bin/env node
import { M as Metadata, I as InternalToolDefinition } from '../validate-C4a9tmrQ.js';
export { G as GenerateMetadataOptions, a as GenerateMetadataResult, V as ValidateOptions, b as generateMetadata, g as generateMetadataCommand, l as loadAndValidateTools, v as validateCommand, c as validateFullCommand } from '../validate-C4a9tmrQ.js';
import 'zod';
import '../x402/index.js';
import 'viem';

interface BuildOptions {
    input: string;
    output: string;
    name?: string;
    version?: string;
}
interface BuildArtifacts {
    metadata: Metadata;
    defaultsApplied: string[];
    tools: InternalToolDefinition[];
    compiledTools: CompiledToolArtifact[];
    workflowBundles: WorkflowBundleArtifact | null;
    toolsManifestPath: string | null;
    sharedModules?: SharedModulesInfo | null;
}
interface CompiledToolArtifact {
    name: string;
    filename: string;
    modulePath: string;
    httpMethods: string[];
    mcpEnabled: boolean;
    defaultMcpMethod?: string;
    hasWallet: boolean;
}
interface WorkflowBundleArtifact {
    sourceDir: string;
    outputDir: string;
    stepsBundlePath: string;
    workflowsBundlePath: string;
    webhookBundlePath: string;
    clientBundlePath?: string;
    manifestPath?: string;
}
interface SharedModulesInfo {
    count: number;
    outputDir: string;
}
declare function buildCommand(options: BuildOptions): Promise<void>;
declare function buildProject(options: BuildOptions): Promise<BuildArtifacts>;

interface DevOptions {
    input: string;
    port?: number;
    watch?: boolean;
    stdio?: boolean;
}
declare function devCommand(options: DevOptions): Promise<void>;

export { type BuildOptions, type DevOptions, buildCommand, buildProject, devCommand };
