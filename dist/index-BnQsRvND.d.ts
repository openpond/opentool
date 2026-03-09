import { I as InternalToolDefinition } from './index-9Z3wo28l.js';

interface ValidateOptions {
    input: string;
}
interface LoadToolsOptions {
    projectRoot?: string;
}
declare function validateCommand(options: ValidateOptions): Promise<void>;
declare function validateFullCommand(options: ValidateOptions): Promise<void>;
declare function loadAndValidateTools(toolsDir: string, options?: LoadToolsOptions): Promise<InternalToolDefinition[]>;

export { type ValidateOptions as V, validateFullCommand as a, loadAndValidateTools as l, validateCommand as v };
