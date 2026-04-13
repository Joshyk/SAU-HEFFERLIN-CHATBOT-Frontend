export interface DatasetSummary {
  id: string
  name: string
  ragName: string
  configPath: string
  filename: string
}

export interface DatasetsResponse {
  datasets: DatasetSummary[]
  defaultDatasetId: string | null
}
