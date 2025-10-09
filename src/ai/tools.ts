import {
  ToolDefinition,
  ToolExecutionPolicy,
  WebSearchOptions,
} from "./types";

export const WEBSEARCH_TOOL_NAME = "websearch";

export const WEBSEARCH_TOOL_DEFINITION: ToolDefinition = {
  type: "function",
  function: {
    name: WEBSEARCH_TOOL_NAME,
    description:
      "Search the web using the OpenPond search engine. Returns relevant results with titles, URLs, and text content.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5)",
        },
      },
      required: ["query"],
    },
  },
};

export function resolveToolset(
  tools: ToolDefinition[] | undefined,
  policy: ToolExecutionPolicy | undefined
): ToolDefinition[] | undefined {
  if (!policy) {
    return tools;
  }

  const resolved: ToolDefinition[] = tools ? [...tools] : [];

  if (policy.webSearch) {
    const alreadyIncluded = resolved.some(
      (tool) =>
        tool.type === "function" && tool.function?.name === WEBSEARCH_TOOL_NAME
    );
    if (!alreadyIncluded) {
      resolved.push(materializeWebSearchTool(policy.webSearch));
    }
  }

  return resolved.length > 0 ? resolved : undefined;
}

function materializeWebSearchTool(options: WebSearchOptions): ToolDefinition {
  if (!options || Object.keys(options).length === 0) {
    return WEBSEARCH_TOOL_DEFINITION;
  }

  const baseParameters =
    WEBSEARCH_TOOL_DEFINITION.function.parameters ??
    ({} as Record<string, unknown>);
  const baseProperties =
    (baseParameters.properties as Record<string, unknown> | undefined) ?? {};

  const properties: Record<string, unknown> = { ...baseProperties };

  if (options.limit !== undefined) {
    const existingLimit = baseProperties["limit"];
    const limitSchema: Record<string, unknown> =
      typeof existingLimit === "object" && existingLimit !== null
        ? { ...(existingLimit as Record<string, unknown>) }
        : {
            type: "number",
            description:
              "Maximum number of results to return (default: 5)",
          };

    limitSchema.default = options.limit;
    properties.limit = limitSchema;
  }

  if (options.includeImages) {
    properties.includeImages = {
      type: "boolean",
      description: "Whether to include representative images in results.",
      default: true,
    };
  }

  return {
    ...WEBSEARCH_TOOL_DEFINITION,
    function: {
      ...WEBSEARCH_TOOL_DEFINITION.function,
      parameters: {
        ...WEBSEARCH_TOOL_DEFINITION.function.parameters,
        properties,
      },
    },
  } as ToolDefinition;
}
