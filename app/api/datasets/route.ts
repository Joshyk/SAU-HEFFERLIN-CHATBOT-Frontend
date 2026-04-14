import { DatasetsResponse, DatasetSummary } from "@/types/dataset"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

const CHAT_CONFIG_FILE_PATTERN = /^chat\..+\.ya?ml$/i

const getBackendBaseUrl = () => {
  const backendBaseUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_OLLAMA_URL

  if (!backendBaseUrl) {
    throw new Error(
      "Missing BACKEND_API_URL or NEXT_PUBLIC_OLLAMA_URL for datasets proxy."
    )
  }

  return backendBaseUrl.endsWith("/")
    ? backendBaseUrl.slice(0, -1)
    : backendBaseUrl
}

const humanizeDatasetName = (input: string) => {
  return input
    .replace(/\.[^.]+$/u, "")
    .replace(/^chat\./u, "")
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b\w/gu, char => char.toUpperCase())
}

const normalizeYamlString = (value: string) => {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

const extractRagName = (contents: string) => {
  const match = contents.match(/^\s*rag_name\s*:\s*(.+?)\s*$/m)
  return match ? normalizeYamlString(match[1]) : ""
}

const getLocalDatasetDirectories = () => {
  const configured = process.env.CHAT_CONFIGS_DIRECTORY?.trim()

  if (configured) {
    return [
      path.isAbsolute(configured)
        ? configured
        : path.resolve(process.cwd(), configured)
    ]
  }

  return [
    path.resolve(
      process.cwd(),
      "../SAU-HEFFERLIN-CHATBOT-Backend/system-configs"
    ),
    path.resolve(process.cwd(), "system-configs")
  ]
}

const loadLocalDatasets = async (): Promise<DatasetsResponse> => {
  for (const directory of getLocalDatasetDirectories()) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true })
      const filenames = entries
        .filter(entry => entry.isFile() && CHAT_CONFIG_FILE_PATTERN.test(entry.name))
        .map(entry => entry.name)
        .sort((left, right) => left.localeCompare(right))

      if (filenames.length === 0) continue

      const datasets = await Promise.all(
        filenames.map(async filename => {
          const configPath = path.join(directory, filename)
          const contents = await fs.readFile(configPath, "utf-8")
          const id = filename.replace(/^chat\./u, "").replace(/\.ya?ml$/iu, "")
          const ragName = extractRagName(contents) || id

          return {
            id,
            name: humanizeDatasetName(ragName),
            ragName,
            collectionId: ragName,
            faithId: ragName,
            configPath: path.relative(process.cwd(), configPath),
            filename
          } satisfies DatasetSummary
        })
      )

      return {
        datasets,
        defaultDatasetId: datasets[0]?.id ?? null,
        defaultCollectionId: datasets[0]?.collectionId ?? null,
        defaultFaithId: datasets[0]?.faithId ?? null
      }
    } catch {
      // Try the next candidate directory.
    }
  }

  throw new Error("Failed to load datasets.")
}

const loadProxyDatasets = async (): Promise<DatasetsResponse> => {
  const backendUrl = new URL("/api/datasets", getBackendBaseUrl())

  const response = await fetch(backendUrl, {
    cache: "no-store"
  })

  const payload = (await response.json()) as Partial<DatasetsResponse> & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error || "Failed to load datasets.")
  }

  return {
    datasets: Array.isArray(payload.datasets) ? payload.datasets : [],
    defaultDatasetId:
      typeof payload.defaultDatasetId === "string" ? payload.defaultDatasetId : null,
    defaultCollectionId:
      typeof payload.defaultCollectionId === "string"
        ? payload.defaultCollectionId
        : null,
    defaultFaithId:
      typeof payload.defaultFaithId === "string" ? payload.defaultFaithId : null
  }
}

export async function GET() {
  try {
    return Response.json(await loadProxyDatasets())
  } catch (error) {
    console.error("Failed to proxy datasets, falling back to local configs:", error)

    try {
      return Response.json(await loadLocalDatasets())
    } catch (fallbackError) {
      console.error("Failed to load local datasets:", fallbackError)

      return Response.json(
        {
          error: "Failed to load datasets."
        },
        {
          status: 500
        }
      )
    }
  }
}
