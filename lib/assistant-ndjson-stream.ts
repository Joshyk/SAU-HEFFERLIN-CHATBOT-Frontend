type AssistantNdjsonMessage = {
  message?: {
    role?: unknown
    content?: unknown
  }
}

export type AssistantNdjsonParseError = {
  line: string
  error: unknown
}

export type AssistantNdjsonParseResult = {
  content: string
  errors: AssistantNdjsonParseError[]
}

function emptyParseResult(): AssistantNdjsonParseResult {
  return {
    content: "",
    errors: []
  }
}

function normalizeNdjsonLine(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line
}

function parseAssistantContentLine(line: string): string {
  const parsed = JSON.parse(line) as AssistantNdjsonMessage
  const content = parsed.message?.content
  return typeof content === "string" ? content : ""
}

export function createAssistantNdjsonStreamParser() {
  let buffer = ""

  const parseLine = (
    line: string,
    result: AssistantNdjsonParseResult
  ): void => {
    const normalizedLine = normalizeNdjsonLine(line)
    if (!normalizedLine.trim()) return

    try {
      result.content += parseAssistantContentLine(normalizedLine)
    } catch (error) {
      result.errors.push({
        line: normalizedLine,
        error
      })
    }
  }

  const drain = (flush = false): AssistantNdjsonParseResult => {
    const result = emptyParseResult()

    while (true) {
      const newlineIndex = buffer.indexOf("\n")
      if (newlineIndex === -1) break

      const line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      parseLine(line, result)
    }

    if (flush) {
      parseLine(buffer, result)
      buffer = ""
    }

    return result
  }

  return {
    push(chunk: string): AssistantNdjsonParseResult {
      if (!chunk) return emptyParseResult()

      buffer += chunk
      return drain()
    },

    flush(): AssistantNdjsonParseResult {
      return drain(true)
    }
  }
}
