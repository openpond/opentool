# Workflow Basic Example

This example demonstrates how the `opentool build` command now emits Workflow DevKit bundles when a `workflows/` directory is present.

## Layout

```
examples/workflow-basic/
├── tools/
│   └── echo.ts          # Standard HTTP tool compiled by OpenTool
└── workflows/
    └── sample.ts        # Workflow entrypoint + steps using "use workflow" / "use step"
```

## Building

```bash
node dist/cli/index.js build \
  --input examples/workflow-basic/tools \
  --output examples/workflow-basic/dist
```

With Node.js >= 22 installed, the build outputs both the usual `tools/` bundle and `.well-known/workflow/v1/{flow,step,webhook}.js` bundles.

Check the generated files:

```bash
ls examples/workflow-basic/dist
ls examples/workflow-basic/dist/.well-known/workflow/v1
```

You can inspect the manifest with:

```bash
cat examples/workflow-basic/dist/.well-known/workflow/v1/manifest.json
```

To run the workflow in a project, use `workflow/api`'s `start()` function pointing at the generated bundles (deployment worker integration forthcoming).
