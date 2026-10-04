export type Confidence = 'low' | 'medium' | 'high'

export interface WeightCandidate {
  /** Stable key for React lists. */
  id: string
  label: string
  /** Secondary line: brand, category, or the reasoning behind the number. */
  detail: string
  weightKg: number
  confidence: Confidence
  /** Provider id, shown as the provenance badge. */
  source: string
}

export interface LookupSettings {
  openRouterApiKey: string
  openRouterModel: string
}

export interface LookupProvider {
  id: string
  label: string
  description: string
  /** When true the provider is disabled until an API key is stored. */
  needsApiKey: boolean
  search(query: string, settings: LookupSettings, signal: AbortSignal): Promise<WeightCandidate[]>
}