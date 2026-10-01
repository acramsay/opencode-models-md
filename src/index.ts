import { join } from "node:path"
import type { Plugin } from "@opencode/plugin"
import { ModelsMdRpc, type ModelsMdStatus } from "./rpc"
import { modelsMdRoot, selectFiles } from "./select"

const statusBySession = new Map<string, ModelsMdStatus>()

export default {
  id: "models-md",
  async setup(ctx) {
    const registration = await ctx.rpc.register(ModelsMdRpc, {
      status: async (input) => statusBySession.get((input as { sessionID: string }).sessionID) ?? {},
    })

    // The "context" hook runs immediately before each agent model request;
    // event.system is the mutable list of system parts.
    await ctx.session.hook("context", async (event) => {
      const { providerID, id: modelID } = event.model
      const root = modelsMdRoot()
      const setStatus = (patch: Partial<ModelsMdStatus>) => {
        statusBySession.set(event.sessionID, {
          providerID,
          modelID,
          files: [],
          updatedAt: Date.now(),
          ...patch,
        })
        registration.events.emit("updated", { sessionID: event.sessionID }).catch(() => {})
      }

      try {
        // Files are read per request, so edits apply without restarting opencode.
        const files = await Array.fromAsync(
          new Bun.Glob("**/*.md").scan({ cwd: root, onlyFiles: true, followSymlinks: true }),
        )

        if (files.length === 0) {
          console.warn(`[models-md] no instruction files found under ${root}`)
          setStatus({})
          return
        }

        const matched = selectFiles(files, providerID, modelID)
        setStatus({ files: matched })

        for (const rel of matched) {
          event.system.push({ type: "text", text: await Bun.file(join(root, rel)).text() })
          console.info(`[models-md] loaded ${rel} for ${providerID}/${modelID}`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setStatus({ error: message })
        console.error("[models-md] failed to apply model instructions", err)
      }
    })
  },
} satisfies Plugin.Plugin
