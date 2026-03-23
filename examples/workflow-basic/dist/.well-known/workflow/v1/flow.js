// biome-ignore-all lint: generated file
/* eslint-disable */
import { workflowEntrypoint } from 'workflow/runtime';

const workflowCode = `var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// workflows/sample.ts
var sample_exports = {};
__export(sample_exports, {
  helloWorkflow: () => helloWorkflow
});
async function helloWorkflow(name) {
  const greeting = await buildGreeting(name);
  await recordGreeting(greeting);
  return greeting;
}
__name(helloWorkflow, "helloWorkflow");
async function buildGreeting(name) {
  return globalThis[Symbol.for("WORKFLOW_USE_STEP")]("step//examples/workflow-basic/workflows/sample.ts//buildGreeting")(name);
}
__name(buildGreeting, "buildGreeting");
async function recordGreeting(message) {
  return globalThis[Symbol.for("WORKFLOW_USE_STEP")]("step//examples/workflow-basic/workflows/sample.ts//recordGreeting")(message);
}
__name(recordGreeting, "recordGreeting");
helloWorkflow.workflowId = "workflow//examples/workflow-basic/workflows/sample.ts//helloWorkflow";

// virtual-entry.js
globalThis.__private_workflows = /* @__PURE__ */ new Map();
Object.values(sample_exports).map((item) => item?.workflowId && globalThis.__private_workflows.set(item.workflowId, item));
`;

export const POST = workflowEntrypoint(workflowCode);