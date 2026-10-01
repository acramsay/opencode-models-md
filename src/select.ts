import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"

// Model-specific instructions, analogous to AGENTS.md but scoped by provider
// and/or model. Files live under `models-md/` in the opencode config directory;
// each path segment is a prefix matched on hyphen boundaries against the active
// provider or model.
//
//   claude.md                    every claude-* model, any provider/route
//   claude-opus.md               every claude-opus-* model
//   claude-opus-5.md             claude-opus-5 (and its -fast/-thinking variants)
//   anthropic.md                 the anthropic provider
//   anthropic/claude-opus.md     anthropic provider AND claude-opus-* model
//
// Matching rule (identical for every segment):
//   segment X matches string S  <=>  S === X  OR  S starts with "X-"
//
//   - The FILENAME is matched against the modelID and its leaf, so family files
//     match even when a route prefixes the modelID (openrouter reports
//     "anthropic/claude-opus-5").
//   - A single-segment (root) file also tries the provider, so a provider or
//     family name works on either axis.
//   - Each DIRECTORY segment is matched against the provider and is required
//     (AND), so nesting pins both axes.
//
// Matches are appended broadest-first so a narrower file gets the last word.

export const modelsMdRoot = () =>
  join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "opencode", "models-md")

const hits = (prefix: string, value: string) => value === prefix || value.startsWith(prefix + "-")

// Fewer segments = broader; a shorter prefix within the same depth is broader.
const breadth = (rel: string) => rel.split("/").length

export function selectFiles(files: readonly string[], providerID: string, modelID: string): string[] {
  const modelLeaf = basename(modelID)
  const modelHits = (prefix: string) => hits(prefix, modelID) || hits(prefix, modelLeaf)

  return files
    .filter((rel) => {
      const stem = rel.slice(0, -".md".length)
      const dir = dirname(stem)
      const name = basename(stem)

      if (dir === ".") {
        // Root file: name matches on either axis.
        return modelHits(name) || hits(name, providerID)
      }
      // Nested: every directory segment is a provider prefix (AND) and the
      // filename is the model prefix.
      const providerOk = dir.split("/").every((seg) => hits(seg, providerID))
      return providerOk && modelHits(name)
    })
    .sort((a, b) => breadth(a) - breadth(b) || a.length - b.length || a.localeCompare(b))
}
