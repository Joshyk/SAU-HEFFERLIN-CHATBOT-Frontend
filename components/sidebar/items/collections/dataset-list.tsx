"use client"

import { Badge } from "@/components/ui/badge"
import { DatasetSummary, DatasetsResponse } from "@/types/dataset"
import { IconDatabase } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"

interface DatasetListProps {
  searchTerm: string
}

export const DatasetList: FC<DatasetListProps> = ({ searchTerm }) => {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [defaultDatasetId, setDefaultDatasetId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadDatasets = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/datasets", {
          cache: "no-store",
          signal: controller.signal
        })

        const payload = (await response.json()) as Partial<DatasetsResponse> & {
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load datasets.")
        }

        setDatasets(Array.isArray(payload.datasets) ? payload.datasets : [])
        setDefaultDatasetId(
          typeof payload.defaultDatasetId === "string"
            ? payload.defaultDatasetId
            : null
        )
      } catch (error) {
        if (controller.signal.aborted) return

        setError(
          error instanceof Error ? error.message : "Failed to load datasets."
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadDatasets()

    return () => controller.abort()
  }, [])

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredDatasets = datasets.filter(dataset => {
    if (!normalizedSearchTerm) return true

    return [
      dataset.name,
      dataset.id,
      dataset.ragName,
      dataset.filename,
      dataset.configPath
    ]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(normalizedSearchTerm))
  })

  return (
    <div className="mt-4 space-y-2">
      <div className="text-muted-foreground px-2 text-xs font-medium uppercase tracking-wide">
        Backend Datasets
      </div>

      {isLoading ? (
        <div className="text-muted-foreground px-2 text-sm">
          Loading datasets...
        </div>
      ) : error ? (
        <div className="text-destructive px-2 text-sm">{error}</div>
      ) : filteredDatasets.length === 0 ? (
        <div className="text-muted-foreground px-2 text-sm">
          No datasets found.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDatasets.map(dataset => (
            <div
              key={dataset.id}
              className="bg-background flex items-start gap-3 rounded-md border p-2"
            >
              <IconDatabase
                size={18}
                className="text-muted-foreground mt-0.5 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-semibold">
                    {dataset.name}
                  </div>

                  {defaultDatasetId === dataset.id && (
                    <Badge variant="secondary" className="shrink-0">
                      Default
                    </Badge>
                  )}
                </div>

                <div className="text-muted-foreground truncate text-xs">
                  ID: {dataset.id}
                </div>

                <div className="text-muted-foreground truncate text-xs">
                  RAG: {dataset.ragName}
                </div>

                <div className="text-muted-foreground truncate text-xs">
                  File: {dataset.filename}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
