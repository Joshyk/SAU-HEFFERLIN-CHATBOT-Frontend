import { createAssistantNdjsonStreamParser } from "@/lib/assistant-ndjson-stream"
import { describe, expect, it } from "@jest/globals"

function assistantLine(content: string): string {
  return `${JSON.stringify({
    message: {
      role: "assistant",
      content
    }
  })}\n`
}

describe("createAssistantNdjsonStreamParser", () => {
  it("reassembles assistant content when NDJSON lines are split across chunks", () => {
    const parser = createAssistantNdjsonStreamParser()
    const answerLine = assistantLine("Answer body")
    const sourcesLine = assistantLine("\n\n### Sources\n1. [Doc](url)")

    expect(parser.push(answerLine + sourcesLine.slice(0, 17))).toEqual({
      content: "Answer body",
      errors: []
    })
    expect(parser.push(sourcesLine.slice(17))).toEqual({
      content: "\n\n### Sources\n1. [Doc](url)",
      errors: []
    })
    expect(parser.flush()).toEqual({
      content: "",
      errors: []
    })
  })

  it("parses multiple complete NDJSON lines in one chunk", () => {
    const parser = createAssistantNdjsonStreamParser()

    expect(parser.push(assistantLine("one") + assistantLine(" two"))).toEqual({
      content: "one two",
      errors: []
    })
  })

  it("preserves whitespace-only assistant content", () => {
    const parser = createAssistantNdjsonStreamParser()

    expect(parser.push(assistantLine(" ") + assistantLine("\n"))).toEqual({
      content: " \n",
      errors: []
    })
  })

  it("flushes a final line without a trailing newline", () => {
    const parser = createAssistantNdjsonStreamParser()
    const lineWithoutNewline = assistantLine("last chunk").trimEnd()

    expect(parser.push(lineWithoutNewline)).toEqual({
      content: "",
      errors: []
    })
    expect(parser.flush()).toEqual({
      content: "last chunk",
      errors: []
    })
  })

  it("handles CRLF-delimited NDJSON lines", () => {
    const parser = createAssistantNdjsonStreamParser()
    const line = assistantLine("windows newline").replace("\n", "\r\n")

    expect(parser.push(line)).toEqual({
      content: "windows newline",
      errors: []
    })
  })

  it("keeps parsing later lines after a malformed complete line", () => {
    const parser = createAssistantNdjsonStreamParser()
    const result = parser.push("{bad json}\n" + assistantLine("still works"))

    expect(result.content).toBe("still works")
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].line).toBe("{bad json}")
  })

  it("ignores non-string assistant content", () => {
    const parser = createAssistantNdjsonStreamParser()
    const nonStringLine = `${JSON.stringify({
      message: {
        role: "assistant",
        content: [{ type: "text", text: "ignored" }]
      }
    })}\n`

    expect(parser.push(nonStringLine + assistantLine("visible"))).toEqual({
      content: "visible",
      errors: []
    })
  })
})
