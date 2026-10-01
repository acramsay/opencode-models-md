import type { Rpc } from "@opencode/plugin/rpc"

// Shape returned by the `status` method. The RPC definition below is the wire
// contract; this type is the TypeScript view of it for both entrypoints.
export type ModelsMdStatus = {
  providerID: string
  modelID: string
  files: string[]
  updatedAt: number
  error?: string
}

// Status RPC owned by the server entrypoint and consumed by the TUI one. The
// TUI reaches the server through its own client, so no loopback server, port
// discovery, or shared filesystem state is needed. Rpc.define is identity, so
// this is a plain definition object.
export const ModelsMdRpc = {
  id: "models-md",
  methods: {
    status: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          providerID: { type: "string" },
          modelID: { type: "string" },
          files: { type: "array", items: { type: "string" } },
          updatedAt: { type: "number" },
          error: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  events: {
    updated: {
      schema: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
    },
  },
} satisfies Rpc.PortableDefinition
