import type { Confidence, LookupProvider, WeightCandidate } from './types'

interface TypicalEntry {
  /** Matched against the user's query tokens. */
  keywords: string[]
  label: string
  kg: number
  detail: string
}

/**
 * Offline fallback so weight lookup is useful on a static host with no keys and
 * no network. Values are typical packed weights, not measurements - the UI
 * always marks them as estimates.
 */
const ENTRIES: TypicalEntry[] = [
  { keywords: ['laptop', 'notebook computer'], label: 'Laptop (14")', kg: 1.6, detail: 'Typical packed weight' },
  { keywords: ['laptop charger', 'notebook charger', 'power adapter'], label: 'Laptop charger', kg: 0.35, detail: 'Brick plus cable' },
  { keywords: ['tablet', 'ipad'], label: 'Tablet', kg: 0.5, detail: 'With case' },
  { keywords: ['smartphone', 'phone'], label: 'Smartphone', kg: 0.2, detail: 'With case' },
  { keywords: ['phone charger', 'usb charger'], label: 'Phone charger', kg: 0.1, detail: 'Brick plus cable' },
  { keywords: ['power bank', 'powerbank'], label: 'Power bank', kg: 0.25, detail: '10,000 mAh' },
  { keywords: ['headphones', 'headset'], label: 'Over-ear headphones', kg: 0.3, detail: 'With case' },
  { keywords: ['earbuds', 'earphones', 'airpods'], label: 'Earbuds', kg: 0.06, detail: 'Charging case included' },
  { keywords: ['camera'], label: 'Camera body', kg: 0.7, detail: 'Without lens' },
  { keywords: ['lens', 'camera lens'], label: 'Camera lens', kg: 0.45, detail: 'Mid-range prime' },
  { keywords: ['external hard drive', 'ssd', 'hard drive'], label: 'External drive', kg: 0.3, detail: 'Portable SSD' },
  { keywords: ['usb stick', 'flash drive'], label: 'USB stick', kg: 0.02, detail: 'Negligible but not zero' },
  { keywords: ['e-reader', 'ereader', 'kindle'], label: 'E-reader', kg: 0.2, detail: 'With case' },
  { keywords: ['game console', 'switch', 'playstation'], label: 'Games console', kg: 0.35, detail: 'Handheld' },
  { keywords: ['passport'], label: 'Passport', kg: 0.05, detail: 'In a pouch' },
  { keywords: ['wallet'], label: 'Wallet', kg: 0.12, detail: 'Cards and cash' },
  { keywords: ['watch', 'smartwatch'], label: 'Watch', kg: 0.08, detail: 'Wristwatch' },
  { keywords: ['glasses'], label: 'Glasses', kg: 0.03, detail: 'In a case' },
  { keywords: ['glasses case', 'sunglasses case'], label: 'Glasses case', kg: 0.05, detail: 'Hard case' },
  { keywords: ['sunglasses'], label: 'Sunglasses', kg: 0.04, detail: 'Frame plus lenses' },
  { keywords: ['jewellery', 'jewelry', 'ring'], label: 'Jewellery', kg: 0.02, detail: 'Small items pouch' },
  { keywords: ['book', 'paperback', 'novel'], label: 'Paperback book', kg: 0.35, detail: 'Single volume' },
  { keywords: ['notebook', 'notepad'], label: 'Notebook', kg: 0.25, detail: 'A5 ruled' },
  { keywords: ['laptop sleeve', 'laptop bag', 'sleeve'], label: 'Laptop sleeve', kg: 0.3, detail: 'Padded' },
  { keywords: ['backpack', 'rucksack'], label: 'Backpack', kg: 0.9, detail: 'Empty, 25-30 L' },
  { keywords: ['duffel', 'holdall', 'sports bag'], label: 'Duffel bag', kg: 0.8, detail: 'Empty' },
  { keywords: ['handbag', 'purse', 'tote'], label: 'Handbag', kg: 0.6, detail: 'Empty' },
  { keywords: ['toiletry bag', 'toiletries', 'wash bag'], label: 'Toiletry bag (packed)', kg: 0.7, detail: 'Fully packed' },
  { keywords: ['toothbrush'], label: 'Toothbrush', kg: 0.04, detail: 'With head cover' },
  { keywords: ['shampoo', 'body wash', 'lotion'], label: 'Shampoo bottle (100 ml)', kg: 0.13, detail: 'Travel size' },
  { keywords: ['sunscreen', 'after sun'], label: 'Sunscreen (100 ml)', kg: 0.13, detail: 'Travel size' },
  { keywords: ['deodorant'], label: 'Deodorant', kg: 0.12, detail: '100 ml roll-on' },
  { keywords: ['razor'], label: 'Razor', kg: 0.06, detail: 'Travel razor' },
  { keywords: ['towel'], label: 'Bath towel', kg: 0.5, detail: 'One towel' },
  { keywords: ['t-shirts', 't shirt', 'tshirt', 'tee'], label: 'T-shirt', kg: 0.2, detail: 'One, folded' },
  { keywords: ['shirt', 'blouse'], label: 'Shirt', kg: 0.25, detail: 'One, folded' },
  { keywords: ['jeans', 'trousers', 'pants'], label: 'Jeans or trousers', kg: 0.55, detail: 'One pair' },
  { keywords: ['skirt'], label: 'Skirt', kg: 0.3, detail: 'One, folded' },
  { keywords: ['dress'], label: 'Dress', kg: 0.4, detail: 'One, folded' },
  { keywords: ['sweater', 'jumper', 'hoodie'], label: 'Sweater', kg: 0.5, detail: 'One, folded' },
  { keywords: ['jacket'], label: 'Jacket', kg: 0.8, detail: 'Light jacket' },
  { keywords: ['coat', 'winter coat'], label: 'Winter coat', kg: 1.2, detail: 'Puffy, packed' },
  { keywords: ['socks'], label: 'Socks (pair)', kg: 0.1, detail: 'One pair' },
  { keywords: ['underwear', 'boxers'], label: 'Underwear', kg: 0.1, detail: 'One piece' },
  { keywords: ['sleepwear', 'pyjamas', 'pajamas'], label: 'Sleepwear set', kg: 0.4, detail: 'Top and bottoms' },
  { keywords: ['swimsuit', 'swimwear', 'bikini'], label: 'Swimsuit', kg: 0.15, detail: 'Dried' },
  { keywords: ['shoes'], label: 'Shoes (pair)', kg: 0.9, detail: 'Casual, in a bag' },
  { keywords: ['sneakers', 'running shoes', 'trainers'], label: 'Trainers (pair)', kg: 0.7, detail: 'One pair' },
  { keywords: ['boots', 'hiking boots'], label: 'Boots (pair)', kg: 1.6, detail: 'Heavy hiking boots' },
  { keywords: ['sandals', 'flip flops'], label: 'Sandals (pair)', kg: 0.4, detail: 'One pair' },
  { keywords: ['hat', 'cap'], label: 'Hat', kg: 0.12, detail: 'Packable' },
  { keywords: ['scarf'], label: 'Scarf', kg: 0.2, detail: 'Wool or knit' },
  { keywords: ['belt'], label: 'Belt', kg: 0.18, detail: 'Rolled up' },
  { keywords: ['umbrella'], label: 'Umbrella', kg: 0.35, detail: 'Compact folding' },
  { keywords: ['first aid', 'first aid kit'], label: 'First aid kit', kg: 0.3, detail: 'Small pouch' },
  { keywords: ['medication', 'medicine', 'tablets'], label: 'Medication pouch', kg: 0.2, detail: 'Carry-on allowance applies' },
  { keywords: ['adapter', 'plug', 'travel plug'], label: 'Travel adapter', kg: 0.12, detail: 'Plug plus cable' },
  { keywords: ['cable', 'charger cable', 'usb cable'], label: 'Cable', kg: 0.05, detail: '1 m USB cable' },
  { keywords: ['watch charger'], label: 'Watch charger', kg: 0.08, detail: 'Cable plus puck' },
  { keywords: ['water bottle', 'drink bottle'], label: 'Water bottle (1 L)', kg: 1.05, detail: 'Full' },
  { keywords: ['wine'], label: 'Wine bottle', kg: 1.2, detail: 'Full 750 ml' },
  { keywords: ['coffee', 'tea'], label: 'Coffee or tea', kg: 0.4, detail: '250 g bag' },
  { keywords: ['snacks', 'snack'], label: 'Snacks', kg: 0.2, detail: 'One small bag' },
  { keywords: ['diapers', 'nappies'], label: 'Diapers', kg: 0.6, detail: 'Pack of about 12' },
  { keywords: ['documents', 'folder', 'envelope'], label: 'Document folder', kg: 0.2, detail: 'With papers' },
  { keywords: ['gift', 'present'], label: 'Gift', kg: 0.5, detail: 'Loose estimate' },
  { keywords: ['laundry bag', 'laundry'], label: 'Laundry bag', kg: 0.15, detail: 'Empty' },
  { keywords: ['sewing kit', 'repair kit'], label: 'Repair kit', kg: 0.1, detail: 'Small pouch' },
]

const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'pack', 'with', 'and', 'for', 'my', 'size'])

function tokenise(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

function scoreEntry(tokens: string[], keywords: string[]): number {
  let best = 0
  for (const keyword of keywords) {
    for (const token of tokens) {
      if (token === keyword) best = Math.max(best, 100 + keyword.length)
      else if (keyword.startsWith(token) || token.startsWith(keyword)) {
        best = Math.max(best, 40 + Math.min(keyword.length, token.length))
      }
    }
  }
  return best
}

function searchTypical(query: string): WeightCandidate[] {
  const tokens = tokenise(query)
  if (tokens.length === 0) return []

  return ENTRIES.map((entry) => ({ entry, score: scoreEntry(tokens, entry.keywords) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ entry }) => ({
      id: `typical:${entry.label}`,
      label: entry.label,
      detail: entry.detail,
      weightKg: entry.kg,
      confidence: 'low' as Confidence,
      source: 'typical',
    }))
}

export const typicalWeightsProvider: LookupProvider = {
  id: 'typical',
  label: 'Offline typical weights',
  description:
    'Built-in table of typical packed weights. No network, no API key. Treat results as starting points to edit.',
  needsApiKey: false,
  search: async (query, _settings, signal) => {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    return searchTypical(query)
  },
}