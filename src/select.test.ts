import { describe, expect, test } from "bun:test"
import { selectFiles } from "./select"

const FILES = [
  "claude.md",
  "claude-opus.md",
  "claude-opus-5.md",
  "anthropic.md",
  "anthropic/claude-opus.md",
  "openrouter/claude.md",
  "kimi.md",
]

describe("selectFiles", () => {
  test("root files match on the model axis and sort broadest-first", () => {
    expect(selectFiles(FILES, "anthropic", "claude-opus-5")).toEqual([
      "claude.md",
      "anthropic.md",
      "claude-opus.md",
      "claude-opus-5.md",
      "anthropic/claude-opus.md",
    ])
  })

  test("a route-prefixed modelID matches family files by leaf", () => {
    expect(selectFiles(FILES, "openrouter", "anthropic/claude-opus-5")).toEqual([
      "claude.md",
      "claude-opus.md",
      "claude-opus-5.md",
      "openrouter/claude.md",
    ])
  })

  test("prefix matching stops at a hyphen boundary", () => {
    expect(selectFiles(["openrouter.md"], "openrouter", "gpt-5")).toEqual(["openrouter.md"])
    expect(selectFiles(["openrouter.md"], "open", "gpt-5")).toEqual([])
  })

  test("nested directories pin the provider axis", () => {
    expect(selectFiles(["anthropic/claude.md"], "anthropic", "claude-opus-5")).toEqual([
      "anthropic/claude.md",
    ])
    expect(selectFiles(["anthropic/claude.md"], "openrouter", "claude-opus-5")).toEqual([])
  })
})
