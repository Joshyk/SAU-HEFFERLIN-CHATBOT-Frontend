import { ChatbotUIContext } from "@/context/context"
import { DatasetSummary, DatasetsResponse } from "@/types/dataset"
import { IconDatabase } from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select"

interface CollectionSelectProps {}

export const CollectionSelect: FC<CollectionSelectProps> = () => {
  const { selectedCollection, setSelectedCollection, selectedChat } =
    useContext(ChatbotUIContext)

  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [defaultDatasetId, setDefaultDatasetId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isLocked = !!selectedChat

  useEffect(() => {
    const controller = new AbortController()

    const loadDatasets = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/datasets", {
          cache: "no-store",
          signal: controller.signal
        })
        const payload = (await response.json()) as Partial<DatasetsResponse> & {
          error?: string
        }
        if (response.ok) {
          const list = Array.isArray(payload.datasets) ? payload.datasets : []
          setDatasets(list)
          const defId =
            typeof payload.defaultDatasetId === "string"
              ? payload.defaultDatasetId
              : null
          setDefaultDatasetId(defId)

          // Auto-select the default dataset if nothing is selected yet
          if (!selectedCollection && defId) {
            const def = list.find(d => d.id === defId) || null
            if (def) {
              setSelectedCollection({
                id: def.id,
                name: def.name,
                collectionId: def.collectionId,
                faithId: def.faithId
              })
            }
          }
        }
      } catch {
        // ignore abort errors
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadDatasets()
    return () => controller.abort()
  }, [selectedCollection, setSelectedCollection])

  return (
    <div className="flex items-center space-x-2">
      <IconDatabase size={24} />
      <Select
        disabled={isLocked || isLoading}
        value={selectedCollection?.id || ""}
        onValueChange={value => {
          if (value === "__none__") {
            setSelectedCollection(null)
            return
          }
          const dataset = datasets.find(d => d.id === value)
          if (dataset) {
            setSelectedCollection({
              id: dataset.id,
              name: dataset.name,
              collectionId: dataset.collectionId,
              faithId: dataset.faithId
            })
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={isLoading ? "Loading..." : "Select dataset"}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No dataset</SelectItem>
          {datasets.map(dataset => (
            <SelectItem key={dataset.id} value={dataset.id}>
              {dataset.name}
              {defaultDatasetId === dataset.id ? " (Default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
