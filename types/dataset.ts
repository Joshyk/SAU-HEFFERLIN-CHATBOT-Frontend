export interface DatasetSummary {
  id: string
  name: string
  ragName: string
  collectionId?: string
  faithId?: string
  configPath: string
  filename: string
}

export interface DatasetsResponse {
  datasets: DatasetSummary[]
  defaultDatasetId: string | null
  defaultCollectionId?: string | null
  defaultFaithId?: string | null
}
