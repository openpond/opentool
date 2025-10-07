#!/usr/bin/env node

import { program } from "commander";
import { buildCommand } from "./build";
import { devCommand } from "./dev";
import { generateMetadataCommand } from "./generate-metadata";
import { validateCommand, validateFullCommand } from "./validate";

program
  .name("opentool")
  .description("OpenTool CLI for building and developing serverless MCP tools")
  .version("1.0.0");

// Dev command
program
  .command("dev")
  .description("Start HTTP dev server (optional MCP stdio)")
  .option("-i, --input <dir>", "Input directory containing tools", "tools")
  .option("-p, --port <port>", "Port to listen on", "7000")
  .option("--stdio", "Expose MCP stdio transport", false)
  .option("--no-watch", "Disable file watching")
  .action((cmdOptions) => {
    devCommand({
      input: cmdOptions.input,
      port: Number(cmdOptions.port ?? 7000),
      watch: cmdOptions.watch,
      stdio: cmdOptions.stdio,
    });
  });

// Build command
program
  .command("build")
  .description("Build tools for deployment")
  .option("-i, --input <dir>", "Input directory containing tools", "tools")
  .option("-o, --output <dir>", "Output directory for built tools", "dist")
  .option("--name <name>", "Server name", "opentool-server")
  .option("--version <version>", "Server version", "1.0.0")
  .action(buildCommand);

// Validate command (metadata only)
program
  .command("validate")
  .description("Validate metadata for registry submission")
  .option("-i, --input <dir>", "Input directory containing tools", "tools")
  .action(validateCommand);

// Full validation command (tools + metadata)
program
  .command("validate-full")
  .description("Full validation of tools and metadata")
  .option("-i, --input <dir>", "Input directory containing tools", "tools")
  .action(validateFullCommand);

// Generate metadata command
program
  .command("metadata")
  .description("Generate OpenTool metadata JSON without building")
  .option("-i, --input <dir>", "Input directory containing tools", "tools")
  .option(
    "-o, --output <file>",
    "Output file path for metadata.json",
    "metadata.json"
  )
  .option("--name <name>", "Server name", "opentool-server")
  .option("--version <version>", "Server version", "1.0.0")
  .action(generateMetadataCommand);

// Parse arguments
program.parse();

export * from "./build";
export * from "./dev";
export * from "./generate-metadata";
export * from "./validate";
