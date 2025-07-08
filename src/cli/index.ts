#!/usr/bin/env node

import { program } from 'commander';
import { buildCommand } from './build';
import { devCommand } from './dev';
import { validateCommand } from './validate';

program
  .name('opentool')
  .description('OpenTool CLI for building and developing serverless MCP tools')
  .version('1.0.0');

// Dev command (like next dev)
program
  .command('dev')
  .description('Start MCP server with stdio transport')
  .option('-i, --input <dir>', 'Input directory containing tools', 'tools')
  .option('--watch', 'Watch for file changes', false)
  .action(devCommand);

// Build command (like next build)
program
  .command('build')
  .description('Build tools for deployment')
  .option('-i, --input <dir>', 'Input directory containing tools', 'tools')
  .option('-o, --output <dir>', 'Output directory for built tools', 'dist')
  .option('--name <name>', 'Server name', 'opentool-server')
  .option('--version <version>', 'Server version', '1.0.0')
  .action(buildCommand);

// Validate command
program
  .command('validate')
  .description('Validate tools in directory')
  .option('-i, --input <dir>', 'Input directory containing tools', 'tools')
  .action(validateCommand);

// Parse arguments
program.parse();

export * from './build';
export * from './dev';
export * from './validate';