# Weight lookup

You can always type a weight by hand — that is the primary path and always works. This
document describes the optional lookup feature: what it does today, what it honestly
cannot do, and how to make it better if the app grows.

## What is built

The lookup dialog is opened with the magnifier on any item row, or from the magnifier
inside the *Add item* form. It is a thin shell over a list of interchangeable providers.

**What it searches:** the item's *product name* if it has one, otherwise its display name.
This is why the two fields exist. "Laptop" finds nothing; "MacBook Air 14" M3" finds a real
figure. When a candidate from a real product source is applied to an item that has no product
name yet, the result's label is written into that field, so the board improves as you use it.

It is a thin shell over a list of interchangeable providers:

```ts
// src/services/lookup/types.ts
interface LookupProvider {
  id: string
  label: string
  description: string
  needsApiKey: boolean
  search(query: string, settings: LookupSettings, signal: AbortSignal): Promise<WeightCandidate[]>
}
```

Every provider returns the same shape, so adding a fourth source is one file plus one line
in the registry in `src/services/lookup/index.ts`:

```ts
export interface WeightCandidate {
  id: string
  label: string
  detail: string          // brand, category, or the model's reasoning
  weightKg: number
  confidence: 'low' | 'medium' | 'high'
  source: string          // becomes the item's provenance badge
}
```

Whichever candidate you press **Use** on writes the weight into the item and records the
source. Items whose weight did not come from a human show *"estimated via `<source>`"*
instead of *"manually entered"*, and editing the number by hand resets that badge. The
provenance is deliberately visible: a lookup number is a starting point, not a fact.

### 1. Offline typical weights — `typicalWeights.ts`

A table of around 70 common travel items (laptop, jeans, shoes (pair), passport,
toiletry bag, camera body…). Token-overlap scoring, no network, no key. It is the default
provider so the feature does something useful the moment someone opens the app.

Every entry is `confidence: 'low'` and is described as *typical packed weight*, not a
measurement.

### 2. Open Food Facts — `openFoodFacts.ts`

The free open product database. No API key, no registration, and it sends
`Access-Control-Allow-Origin`, so a static site can call it directly from the browser:

```
GET https://world.openfoodfacts.org/cgi/search.pl
      ?search_terms=nutella
      &search_simple=1&action=process&json=1
      &page_size=10
      &fields=product_name,brands,quantity,serving_size,categories,code
```

`parseQuantityToKg` pulls a mass out of real-world packaging text. It is the fiddly part,
because these strings are inconsistent:

| Raw `quantity` | Parsed | Note |
| --- | --- | --- |
| `400 g` | 0.4 kg | the common case |
| `1 kg` | 1 kg | |
| `6 x 100 g` | 0.6 kg | multipack multiplier |
| `1,5 l` | 1.5 kg | comma decimal separator, volume ⇒ assumed density 1 kg/L |
| `12 fl oz` | 0.355 kg | `fl oz` is folded to `floz` first |
| `15 gram` | 0.015 kg | spelled-out units are in the map |

Confidence is `high` when it came from `quantity` (the package size), `medium` when it came
from `serving_size` (that is one portion, not the whole product), and `low` when the figure
was volume-derived. Only the six best package sizes and two serving sizes are returned, so
the list stays readable.

### 3. OpenRouter LLM estimate — `openRouter.ts`

Asks a chat model for a typical weight of the product:

```json
{"candidates":[{"label":"14-inch laptop","weightKg":1.6,"confidence":4,"note":"…"}]}
```

The model list is fetched from OpenRouter's **public** catalogue endpoint, which needs no
key, and the picker is sorted so free models come first. That means no model id is
hardcoded and nothing breaks when OpenRouter retires a slug.

**Read this before trusting it:** this is a language model estimating from what it
remembered in training. It is *not* looking the product up. Most chat models have no live
web access, so a model that says "a 65 W laptop charger weighs 0.4 kg" is reasoning, not
retrieval. Treat every result as `low` confidence and check anything that matters against
the packaging. The dialog says the same thing under the results.

The API key is entered by the user, kept in `localStorage`, and sent straight from the
browser to OpenRouter. It is never part of the bundle. Do not commit one.

## What was verified in a browser, and what was not

The important constraint for a static site is CORS: a provider is only usable from the
browser if it sends `Access-Control-Allow-Origin`. Tested from the page, not from a server:

| Endpoint | Browser-usable | Notes |
| --- | --- | --- |
| `world.openfoodfacts.org/cgi/search.pl` | yes | Works, returns real data. **Intermittent**: it throttles and returns 503, and its error responses omit the CORS header, so the browser reports a generic network failure. The error message in the provider says so. |
| `world.openfoodfacts.org/api/v2/search` | **no** | Fails CORS. Use `cgi/search.pl`. |
| `world.openfoodfacts.org/api/v2/product/{barcode}.json` | yes | Good for a future barcode scanner. |
| `en.wikipedia.org/w/api.php`, `www.wikidata.org/w/api.php` | yes | Need `origin=*`. Low product-weight coverage. |
| `openrouter.ai/api/v1/models` | yes | Public, no key. |
| `api.duckduckgo.com` instant answer | yes | Reachable but returns nothing about product weights. Not useful here. |

## Making this production-grade

The honest summary: **from a static page, no keyless public search engine will give you a
reliable product weight.** What exists is a product database (Open Food Facts, patchy
outside food) or a model guessing (OpenRouter). If the lookup becomes a headline feature,
the pieces worth adding, in order of value:

1. **A Netlify Function proxy.** Netlify Functions are free on the Hobby plan and require
   no server to operate, so this is still consistent with "no server". It solves three
   problems at once: keeps the API key out of the browser, adds a caching layer, and lets
   you send a real `User-Agent` — which is exactly what Open Food Facts asks for and what
   stops them throttling you.

   ```
   netlify/functions/weight-lookup.ts
   ```

   ```ts
   import type { Handler } from '@netlify/functions'

   const cache = new Map<string, { expires: number; body: string }>()

   export const handler: Handler = async (event) => {
     const query = new URLSearchParams(event.queryStringParameters ?? {}).get('q')
     if (!query) return { statusCode: 400, body: JSON.stringify({ error: 'missing q' }) }

     const key = `off:${query.toLowerCase()}`
     const hit = cache.get(key)
     if (hit && hit.expires > Date.now()) {
       return { statusCode: 200, headers: json(), body: hit.body }
     }

     const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
     url.searchParams.set('search_terms', query)
     url.searchParams.set('search_simple', '1')
     url.searchParams.set('action', 'process')
     url.searchParams.set('json', '1')
     url.searchParams.set('page_size', '10')
     url.searchParams.set('fields', 'product_name,brands,quantity,serving_size,code')

     const response = await fetch(url, { headers: { 'User-Agent': 'BagBuddy/1.0 (+https://github.com/rakeshmalik91/bagbuddy)' } })
     if (!response.ok) return { statusCode: 502, body: JSON.stringify({ error: 'upstream failed' }) }

     const body = await response.text()
     cache.set(key, { expires: Date.now() + 60 * 60 * 1000, body })
     return { statusCode: 200, headers: json(), body }
   }

   const json = () => ({ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
   ```

   Then point the provider at `/.netlify/functions/weight-lookup?q=…` instead of the Open
   Food Facts host. Nothing else in the app changes.

2. **Barcode scanning.** `getUserMedia` plus a barcode library maps a product to an Open
   Food Facts record directly. Far more reliable than typing a product name, and it is the
   single biggest accuracy win available.

3. **A retrieval-backed model instead of a guessing model.** If you want a genuine
   "look it up on the internet" behaviour, use a provider with search grounding enabled and
   ask it to cite the product page. That needs a paid API and the key must live in a
   function, never in the bundle.

4. **A confidence gate.** Refuse to apply a `low` confidence result without a confirmation
   step, and remember how often a user overrides it. Useful telemetry for deciding whether
   the provider is worth keeping.

5. **Sharing a weight table.** Let users export a `weights.json` of their own items and
   import it on another device. Makes the offline table personalised without needing any
   backend.

## Adding a provider

1. Create `src/services/lookup/<name>.ts` exporting a `LookupProvider`.
2. Return `WeightCandidate[]`, or throw an `Error` with a message worth showing a human.
   Never return an empty array for a failure — the UI distinguishes "no results" from
   "it broke".
3. Register it in `LOOKUP_PROVIDERS` in `src/services/lookup/index.ts`.
4. Check it is CORS-usable from the browser, or route it through a function.