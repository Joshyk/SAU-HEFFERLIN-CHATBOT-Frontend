export async function consumeReadableStream(
  stream: ReadableStream<Uint8Array>,
  callback: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const abortReader = () => {
    void reader.cancel()
  }

  signal.addEventListener("abort", abortReader, { once: true })

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        const remainingText = decoder.decode()
        if (remainingText) {
          callback(remainingText)
        }
        break
      }

      if (value) {
        callback(decoder.decode(value, { stream: true }))
      }
    }
  } catch (error) {
    if (signal.aborted) {
      console.error("Stream reading was aborted:", error)
    } else {
      console.error("Error consuming stream:", error)
    }
  } finally {
    signal.removeEventListener("abort", abortReader)
    reader.releaseLock()
  }
}
