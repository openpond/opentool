// biome-ignore-all lint: generated file
/* eslint-disable */

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// virtual-entry.js
var virtual_entry_exports = {};
__export(virtual_entry_exports, {
  POST: () => import_runtime2.stepEntrypoint
});
module.exports = __toCommonJS(virtual_entry_exports);
var import_builtins = require("workflow/internal/builtins");

// workflows/sample.ts
var import_private = require("workflow/internal/private");
async function buildGreeting(name) {
  return `Hello, ${name}!`;
}
__name(buildGreeting, "buildGreeting");
async function recordGreeting(message) {
  console.log("Greeting recorded", {
    message
  });
}
__name(recordGreeting, "recordGreeting");
(0, import_private.registerStepFunction)("step//examples/workflow-basic/workflows/sample.ts//buildGreeting", buildGreeting);
(0, import_private.registerStepFunction)("step//examples/workflow-basic/workflows/sample.ts//recordGreeting", recordGreeting);

// virtual-entry.js
var import_runtime2 = require("workflow/runtime");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
