/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { createSignal, onCleanup, For, Show } from "solid-js"
import { ModelsMdRpc, type ModelsMdStatus } from "./rpc"

// Sidebar view for the server entrypoint: shows which model-instruction files
// were applied for the active session. The server owns the truth and serves it
// over the models-md RPC, pushed on change; this entrypoint only reads it.

function View(props: { session_id: string }) {
  const ctx = usePlugin()
  const rpc = ctx.client.rpc(ModelsMdRpc)
  const [status, setStatus] = createSignal<ModelsMdStatus | undefined>(undefined)
  const [connected, setConnected] = createSignal(false)
  const [collapsed, setCollapsed] = createSignal(false)

  let disposed = false

  async function refresh() {
    try {
      const entry = (await rpc.status({ sessionID: props.session_id })) as ModelsMdStatus
      if (disposed) return
      setConnected(true)
      setStatus(entry.providerID ? entry : undefined)
    } catch {
      if (!disposed) setConnected(false)
    }
  }

  // Fetch once for late mounts; the RPC event keeps it current after that.
  refresh()

  const offUpdated = rpc.events.on("updated", (event) => {
    if (event.data.sessionID === props.session_id) void refresh()
  })

  onCleanup(() => {
    disposed = true
    offUpdated()
  })

  const fileCount = () => status()?.files.length ?? 0

  return (
    <box>
      {/* Clicking the header row collapses/expands the file list, mirroring
          AFT's own sidebar section toggle. */}
      <box
        flexDirection="row"
        gap={1}
        justifyContent="space-between"
        onMouseDown={() => setCollapsed((x) => !x)}
      >
        <box flexDirection="row" gap={1}>
          <text fg={ctx.theme.text.base}>
            <b>{collapsed() ? "▶ " : "▼ "}Models MD</b>
          </text>
          <text fg={connected() ? ctx.theme.text.feedback.success.base : ctx.theme.text.feedback.error.base}>
            ●
          </text>
        </box>
        <text fg={ctx.theme.text.muted}>{fileCount()}</text>
      </box>
      <Show when={!collapsed()}>
        <Show when={status()?.error}>
          {(error) => <text fg={ctx.theme.text.feedback.error.base}>{error()}</text>}
        </Show>
        <For each={status()?.files ?? []}>
          {(file) => (
            <text fg={ctx.theme.text.muted} wrapMode="none">
              {file}
            </text>
          )}
        </For>
      </Show>
    </box>
  )
}

export default Plugin.define({
  id: "models-md",
  setup(ctx) {
    return ctx.ui.slot({
      append: "sidebar.content",
      render: ({ sessionID }) => <View session_id={sessionID} />,
    })
  },
})
