import type { Confidence, LookupProvider, WeightCandidate } from './types'

const SEARCH_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl'
const FIELDS = ['product_name', 'brands', 'quantity', 'serving_size', 'categories', 'code']
const MAX_PACKAGE_RESULTS = 6
const MAX_SERVING_RESULTS = 2

const MASS_UNITS: Record<string, number> = {
  mg: 1e-6,
  g: 1e-3,
  gr: 1e-3,
  gram: 1e-3,
  grams: 1e-3,
  kg: 1,
  kgs: 1,
  kilogram: 1,
  kilograms: 1,
  oz: 0.028349523125,
  ounce: 0.028349523125,
  ounces: 0.028349523125,
  lb: 0.45359237,
  lbs: 0.45359237,
  pound: 0.45359237,
  pounds: 0.45359237,
}

/** Volume-to-mass factors assume water. Honest but approximate. */
const VOLUME_UNITS: Record<string, number> = {
  ml: 0.001,
  cl: 0.01,
  dl: 0.1,
  l: 1,
  litre: 1,
  liter: 1,
  litres: 1,
  liters: 1,
  floz: 0.0295735295625,
}

interface OffProduct {
  product_name?: string
  brands?: string
  quantity?: string
  serving_size?: string
  categories?: string
  code?: string
}

interface ParsedQuantity {
  kg: number
  fromVolume: boolean
  multiPack: boolean
}

/**
 * Pulls a mass out of free-form packaging text such as "500 g", "6 x 100 g",
 * "1,5 l" or "12 fl oz". Returns `null` when nothing usable is present.
 */
export function parseQuantityToKg(raw: string): ParsedQuantity | null {
  const text = raw.toLowerCase().replace(/,/g, '.').replace(/\bfl\.?\s*oz/g, 'floz')
  const pattern = /(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?)\s*)?([a-z]+)/g

  for (const match of text.matchAll(pattern)) {
    const amount = Number.parseFloat(match[1]!)
    const packSize = match[2] === undefined ? 1 : Number.parseFloat(match[2])
    const unit = match[3]!
    if (!Number.isFinite(amount) || !Number.isFinite(packSize)) continue

    const mass = MASS_UNITS[unit]
    if (mass !== undefined) {
      return { kg: amount * packSize * mass, fromVolume: false, multiPack: match[2] !== undefined }
    }

    const volume = VOLUME_UNITS[unit]
    if (volume !== undefined) {
      return { kg: amount * packSize * volume, fromVolume: true, multiPack: match[2] !== undefined }
    }
  }

  return null
}

function toCandidate(product: OffProduct, field: 'quantity' | 'serving_size'): WeightCandidate | null {
  const raw = product[field]
  if (typeof raw !== 'string' || raw.trim().length === 0) return null

  const parsed = parseQuantityToKg(raw)
  if (!parsed || parsed.kg <= 0) return null

  const name = product.product_name?.trim() || 'Unnamed product'
  const brand = product.brands?.split(',')[0]?.trim()
  const notes: string[] = []
  if (brand) notes.push(brand)
  notes.push(field === 'quantity' ? `Package size: ${raw.trim()}` : `Serving size: ${raw.trim()}`)
  if (parsed.multiPack) notes.push('multipack')
  if (parsed.fromVolume) notes.push('volume, density assumed 1 kg/L')

  const confidence: Confidence =
    field === 'quantity' ? (parsed.fromVolume ? 'low' : 'high') : 'medium'

  return {
    id: `openfoodfacts:${product.code ?? name}:${field}`,
    label: name,
    detail: notes.join(' · '),
    weightKg: parsed.kg,
    confidence,
    source: 'openfoodfacts',
  }
}

export const openFoodFactsProvider: LookupProvider = {
  id: 'openfoodfacts',
  label: 'Open Food Facts',
  description:
    'Free public product database, no API key. Strong for packaged food and groceries, patchy for electronics and clothing.',
  needsApiKey: false,
  search: async (query, _settings, signal) => {
    const url = new URL(SEARCH_ENDPOINT)
    url.searchParams.set('search_terms', query)
    url.searchParams.set('search_simple', '1')
    url.searchParams.set('action', 'process')
    url.searchParams.set('json', '1')
    url.searchParams.set('page_size', '10')
    url.searchParams.set('fields', FIELDS.join(','))

    let response: Response
    try {
      response = await fetch(url, {
        signal,
        headers: { Accept: 'application/json' },
      })
    } catch (cause) {
      if (signal.aborted) throw cause
      // Open Food Facts throttles hard and its error responses omit CORS
      // headers, so a plain rate-limit looks like a network failure here.
      throw new Error(
        'Could not reach Open Food Facts. It throttles or blocks browsers from time to time — try again shortly, or use another source.',
        { cause },
      )
    }

    if (!response.ok) {
      throw new Error(
        `Open Food Facts responded with ${response.status}. This is usually temporary rate limiting.`,
      )
    }

    const payload = (await response.json()) as { products?: OffProduct[] }
    const products = payload.products ?? []

    // Package sizes are the useful answer; serving sizes are a fallback that only
    // fills the remaining slots so the list stays readable.
    const packageSizes: WeightCandidate[] = []
    const servingSizes: WeightCandidate[] = []
    for (const product of products) {
      const fromQuantity = toCandidate(product, 'quantity')
      if (fromQuantity) packageSizes.push(fromQuantity)
      if (packageSizes.length >= MAX_PACKAGE_RESULTS) break
    }
    for (const product of products) {
      const fromServing = toCandidate(product, 'serving_size')
      if (fromServing) servingSizes.push(fromServing)
      if (servingSizes.length >= MAX_SERVING_RESULTS) break
    }

    return [...packageSizes, ...servingSizes]
  },
}