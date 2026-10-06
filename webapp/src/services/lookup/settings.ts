import type { LookupSettings } from './types'

const STORAGE_KEY = 'bagbuddy:lookup:v1'

const EMPTY: LookupSettings = {
  openRouterApiKey: '',
  openRouterModel: '',
  lastProviderId: '',
}

export function loadLookupSettings(): LookupSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY
    const record = parsed as Record<string, unknown>
    return {
      openRouterApiKey: typeof record.openRouterApiKey === 'string' ? record.openRouterApiKey : '',
      openRouterModel:
        typeof record.openRouterModel === 'string' ? record.openRouterModel : '',
      lastProviderId:
        typeof record.lastProviderId === 'string' ? record.lastProviderId : '',
    }
  } catch {
    return EMPTY
  }
}

export function saveLookupSettings(settings: LookupSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage blocked; the key simply will not be remembered.
  }
}