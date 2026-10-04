import { openFoodFactsProvider } from './openFoodFacts'
import { openRouterProvider } from './openRouter'
import { typicalWeightsProvider } from './typicalWeights'
import type { LookupProvider } from './types'

export const LOOKUP_PROVIDERS: LookupProvider[] = [
  typicalWeightsProvider,
  openFoodFactsProvider,
  openRouterProvider,
]

export const DEFAULT_PROVIDER_ID = typicalWeightsProvider.id

export function getLookupProvider(id: string): LookupProvider | undefined {
  return LOOKUP_PROVIDERS.find((provider) => provider.id === id)
}

export type { Confidence, LookupProvider, LookupSettings, WeightCandidate } from './types'