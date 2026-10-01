import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import plugin from "./index"

// Point the plugin at a throwaway config dir and write the given instruction
// files under opencode/models-md/. Returns a restore function.
function withModels(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "models-md-"))
  const root = join(dir, "opencode", "models-md")
  mkdirSync(root, { recursive: true })
  for (const [name, text] of Object.entries(files)) {
    const target = join(root, name)
    mkdirSync(join(target, ".."), { recursive: true })
    writeFileSync(target, text)
  }
  const previous = process.env.XDG_CONFIG_HOME
  process.env.XDG_CONFIG_HOME = dir
  return () => {
    if (previous === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = previous
    rmSync(dir, { recursive: true, force: true })
  }
}

function fakeCtx() {
  const handlers: Record<string, (event: never) => unknown> = {}
  let statusHandler: ((input: { sessionID: string }) => Promise<unknown>) | undefined
  const emitted: Array<{ name: string; data: unknown }> = []
  const ctx = {
    rpc: {
      register: async (
        _definition: unknown,
        handlersIn: { status: (input: { sessionID: string }) => Promise<unknown> },
      ) => {
        statusHandler = handlersIn.status
        return {
          events: {
            emit: async (name: string, data: unknown) => {
              emitted.push({ name, data })
            },
          },
        }
      },
    },
    session: {
      hook: async (name: string, cb: (event: never) => unknown) => {
        handlers[name] = cb
        return { dispose: async () => {} }
      },
    },
  }
  return { ctx, handlers, emitted, status: () => statusHandler! }
}

describe("entry", () => {
  test("exposes id and setup", () => {
    expect(plugin.id).toBe("models-md")
    expect(typeof plugin.setup).toBe("function")
  })
})

describe("context hook", () => {
  test("injects matched files as system text and reports status", async () => {
    const restore = withModels({ "claude.md": "claude instructions", "kimi.md": "kimi instructions" })
    try {
      const { ctx, handlers, emitted, status } = fakeCtx()
      await plugin.setup(ctx as never)

      const event = {
        sessionID: "ses_1",
        model: { providerID: "openrouter", id: "anthropic/claude-opus-5" },
        system: [] as Array<{ type: string; text: string }>,
      }
      await handlers.context(event as never)

      expect(event.system.map((part) => part.text)).toEqual(["claude instructions"])
      expect(emitted.at(-1)).toEqual({ name: "updated", data: { sessionID: "ses_1" } })

      const entry = (await status()({ sessionID: "ses_1" })) as {
        providerID: string
        modelID: string
        files: string[]
      }
      expect(entry.providerID).toBe("openrouter")
      expect(entry.modelID).toBe("anthropic/claude-opus-5")
      expect(entry.files).toEqual(["claude.md"])
    } finally {
      restore()
    }
  })

  test("does not inject anything when the directory is empty", async () => {
    const restore = withModels({})
    try {
      const { ctx, handlers, status } = fakeCtx()
      await plugin.setup(ctx as never)

      const event = { sessionID: "ses_2", model: { providerID: "mock", id: "m" }, system: [] }
      await handlers.context(event as never)

      expect(event.system).toEqual([])
      const entry = (await status()({ sessionID: "ses_2" })) as { files: string[] }
      expect(entry.files).toEqual([])
    } finally {
      restore()
    }
  })
})
