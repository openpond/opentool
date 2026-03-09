#!/usr/bin/env node
import { e as Metadata, I as InternalToolDefinition } from '../index-9Z3wo28l.js';
import 'zod';
import '../payment-BLm1ltur.js';

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

export { type BuildOptions, type DevOptions, type GenerateMetadataOptions, type GenerateMetadataResult, type ValidateOptions, buildCommand, buildProject, devCommand, generateMetadata, generateMetadataCommand, loadAndValidateTools, validateCommand, validateFullCommand };
