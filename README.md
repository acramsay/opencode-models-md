# opencode-models-md

[opencode](https://opencode.ai) v2 plugin that injects model-specific
instructions into the system prompt. Think AGENTS.md, but scoped to a provider
or a model.

Before every model request the plugin matches the session's active provider and
model against files under the opencode config directory and appends each match
as a system part. A sidebar section lists the files that applied, so you can see
when the rules you wrote are live. Files are read per request and edits take
effect without a restart.

## Install

Add the package to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@acramsay/opencode-models-md"]
}
```

opencode installs the package and loads both entrypoints. The server entrypoint
reads the files and serves status; the TUI entrypoint renders the sidebar
section.

## Instruction files

Files live under `<config>/opencode/models-md/`, where `<config>` is
`$XDG_CONFIG_HOME` or `~/.config`. Each path segment is a prefix matched on
hyphen boundaries, so `claude` matches `claude-opus-5` but `open` does not match
`openrouter`.

The filename is matched against the model ID and its leaf, which matters when a
route prefixes the model ID: openrouter reports `anthropic/claude-opus-5`, and a
file named `claude.md` still matches. A file at the root is also matched against
the provider, so a provider name works on either axis. A directory segment is
matched against the provider only, so nesting pins both axes.

| File | Matches |
| --- | --- |
| `claude.md` | every `claude-*` model, any provider |
| `claude-opus.md` | every `claude-opus-*` model |
| `claude-opus-5.md` | `claude-opus-5` and its `-fast` / `-thinking` variants |
| `anthropic.md` | the `anthropic` provider |
| `anthropic/claude-opus.md` | the `anthropic` provider and `claude-opus-*` models |

Broader files come first, so a narrow file gets the last word.

## Development

```
bun install
bun run typecheck
bun run test              # unit: file selection and the context hook
bun run test:integration  # spawns opencode against a local provider stub
```

Unit tests are co-located in `src/*.test.ts` and use a throwaway config
directory, so they need nothing external.

Integration tests (`test/integration.test.ts`) spawn a real
`opencode run --standalone` in a throwaway project against a local
OpenAI-compatible stub. There is no provider key and no network. The test asserts
the matched instruction reaches the captured outbound request. It is local and
opt-in, and skips with a hint when `opencode` is not on PATH. Set
`MODELS_MD_TEST_OPENCODE` to use a different binary.

## Releases

Trunk-based: work merges to `main` and semantic-release runs in CI on every push
to `main`. Conventional commits drive the bumps (`feat` minor, `fix` patch,
breaking changes major); each release publishes to npm, updates `package.json`
and `CHANGELOG.md`, and creates a GitHub release. Never push a `v*` tag by hand,
and never publish from a local machine.

MIT license.
