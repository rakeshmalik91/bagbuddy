import type { Confidence, LookupProvider, WeightCandidate } from './types'

const API_ROOT = 'https://openrouter.ai/api/v1'
const APP_TITLE = 'BagBuddy'

export interface OpenRouterModel {
  id: string
  name: string
  free: boolean
}

interface ModelEntry {
  id?: string
  name?: string
  pricing?: { prompt?: string; completion?: string }
}

function isFree(entry: ModelEntry): boolean {
  return Number(entry.pricing?.prompt) === 0 && Number(entry.pricing?.completion) === 0
}

/**
 * The public model catalogue needs no API key, so the picker never hardcodes a
 * model id that OpenRouter could retire.
 */
export async function listOpenRouterModels(signal: AbortSignal): Promise<OpenRouterModel[]> {
  const response = await fetch(`${API_ROOT}/models`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`OpenRouter model list failed with ${response.status}`)
  }

  const payload = (await response.json()) as { data?: ModelEntry[] }
  const models = (payload.data ?? [])
    .filter((entry): entry is ModelEntry & { id: string } => typeof entry.id === 'string')
    .map((entry) => ({
      id: entry.id,
      name: entry.name ?? entry.id,
      free: isFree(entry),
    }))

  return models.sort((a, b) => {
    if (a.free !== b.free) return a.free ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

const SYSTEM_PROMPT = [
  'You estimate the packed weight of consumer products for a luggage packing planner.',
  'Reply with JSON only, no prose and no markdown fences, in this shape:',
  '{"candidates":[{"label":"short product name","weightKg":0.25,"confidence":4,"note":"one short sentence"}]}',
  'Rules: weightKg is the weight of one typical retail unit including packaging; use kilograms;',
  'confidence is 1-5 where 1 is a wild guess and 5 is a well-known figure;',
  'return at most 5 candidates, most likely first.',
].join(' ')

interface ParsedCandidate {
  label?: unknown
  weightKg?: unknown
  confidence?: unknown
  note?: unknown
}

function toConfidence(value: unknown): Confidence {
  const score = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(score) || score <= 2) return 'low'
  if (score < 4) return 'medium'
  return 'high'
}

function parseCandidates(content: string): WeightCandidate[] {
  const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('The model did not return JSON.')

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { candidates?: ParsedCandidate[] }
  const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : []

  return candidates.flatMap((candidate, index) => {
    const weightKg = Number(candidate.weightKg)
    if (!Number.isFinite(weightKg) || weightKg <= 0) return []

    const label = typeof candidate.label === 'string' ? candidate.label.trim() : ''
    const note = typeof candidate.note === 'string' ? candidate.note.trim() : ''
    return [
      {
        id: `openrouter:${index}:${label}`,
        label: label || 'Estimated item',
        detail: note || 'Model estimate, verify before packing',
        weightKg,
        confidence: toConfidence(candidate.confidence),
        source: 'openrouter',
      },
    ]
  })
}

function describeError(status: number): string {
  if (status === 401) return 'OpenRouter rejected the API key (401).'
  if (status === 402) return 'OpenRouter reports no credit available (402).'
  if (status === 429) return 'OpenRouter rate limit reached (429). Try again shortly.'
  return `OpenRouter responded with ${status}.`
}

export const openRouterProvider: LookupProvider = {
  id: 'openrouter',
  label: 'OpenRouter LLM estimate',
  description:
    'Sends the product name to a language model and asks for a typical weight. This is a model estimate, not a scraped catalogue figure. Requires your own OpenRouter API key, kept in this browser only.',
  needsApiKey: true,
  search: async (query, settings, signal) => {
    if (!settings.openRouterApiKey) {
      throw new Error('Add an OpenRouter API key to use this provider.')
    }
    if (!settings.openRouterModel) {
      throw new Error('Pick a model to use for estimates.')
    }

    const response = await fetch(`${API_ROOT}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.openRouterApiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': APP_TITLE,
      },
      body: JSON.stringify({
        model: settings.openRouterModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Product: ${query}` },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(describeError(response.status))
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = payload.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error('OpenRouter returned an unexpected response shape.')
    }

    const candidates = parseCandidates(content)
    if (candidates.length === 0) {
      throw new Error('The model returned no usable weights.')
    }
    return candidates
  },
}