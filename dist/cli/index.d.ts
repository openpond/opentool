#!/usr/bin/env node
import { M as Metadata, I as InternalToolDefinition } from '../validate-BgNU5laL.js';
export { G as GenerateMetadataOptions, a as GenerateMetadataResult, V as ValidateOptions, g as generateMetadata, b as generateMetadataCommand, l as loadAndValidateTools, v as validateCommand, c as validateFullCommand } from '../validate-BgNU5laL.js';
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
