# Roadmap

BagBuddy shipped **weight first**. This document records what is deliberately missing
today and how the dimensions phase is intended to work, so the design decisions are not
lost before they are written.

## Status

| Area | State |
| --- | --- |
| Multiple bags, empty (tare) weight per bag | done |
| Configurable accessories weight per bag and per item | done |
| Item display name plus optional product name | done |
| Multiple items, manual weight per item | done |
| Drag and drop between tray and bags, reorder inside bags | done |
| Per-bag total weight | done |
| Optional per-bag weight limit with over-limit warning | done |
| kg / lb display | done |
| Optional weight lookup from public sources | done, see [weight-lookup.md](weight-lookup.md) |
| Item dimensions | **not started** |
| Volume / space utilisation | **not started** |
| Packing geometry (does it actually fit) | **not started** |
| Export / share a packing list | not started |
| Multiple trips | not started |

## Why weight alone is not enough

Weight answers *"will they let me board?"*. It does not answer *"will it close?"*. Three
bags can weigh 7 kg each and one of them still will not zip.

Volume alone is not enough either, because shape matters: a rolled towel fills a cylinder
that a rigid box cannot use. So the dimensions phase needs three things, in this order.

## Phase 2 — dimensions and volume

### Step 1: capture dimensions

Extend the data model. Keep it optional and nullable so existing saved trips still load.

```ts
interface Item {
  // existing fields …
  dimensionsMm: { length: number; width: number; height: number } | null
  compressible: boolean        // clothing, soft toys: can be squashed
  rigid: boolean               // boxes, bottles: keep their shape
}

interface Bag {
  // existing fields …
  interiorMm: { length: number; width: number; height: number } | null
  maxFillPercent: number       // bags are rarely packed to 100%, e.g. 85
}
```

Millimetres as the stored unit, for the same reason kilograms is the stored weight unit:
one canonical unit, converted only for display.

UI work: a second input row per item behind a *"Size"* toggle so the default view stays
as simple as it is now. Items without dimensions must remain valid and keep working —
they should simply be excluded from volume calculations and listed as "size unknown".

### Step 2: volume accounting (the cheap win)

Compute `sum(item volume)` against `bag interior volume × maxFillPercent`.

This is a bounding-box approximation: it over-counts, because it ignores gaps and treats
every item as a box. That is fine as a first signal, and it already catches the common
mistake of trying to bring eleven litres of liquids into a twenty-litre cabin bag.

Report it as a percentage, and treat it as advisory. It should never be shown as a hard
failure.

### Step 3: real packing geometry

Only worth building if the volume signal proves annoying. Three escalating approaches:

1. **Shelf / layer packing.** Divide the bag interior into horizontal layers of a chosen
   height. Within a layer, place items side by side along the length and width until the
   layer is full, then start the next layer. Cheap, deterministic, and roughly matches how
   people actually pack. This is the sweet spot for a browser-only app.
2. **Footprint visualisation.** A top-down length × width diagram per layer showing which
   item occupies which rectangle, plus a layer list. Makes step 1 legible, and gives the
   user a real "why won't this fit" answer.
3. **Voxel / grid occupancy.** Rasterise the bag interior and the items onto a coarse grid
   (10 mm cells is plenty) and place items one at a time into the first free position,
   trying each of the six axis-aligned rotations. Much better fit quality, more code, and
   noticeably slower on a large load-out — so it needs a worker or a bounded item count.

Rotate items on all six axes for boxes; cylinders can be treated as boxes that fit in two
orientations. `compressible` items get a volume discount rather than a real shape.

### Step 4: airline reality

- **Linear dimensions.** Several airlines cap *any single* bag at 158 cm linear
  (length + width + height). Add a warning against the bag's own interior dimensions.
- **Volumetric weight.** Air cargo and some budget carriers bill `max(actual weight,
  volume ÷ 6000)` for dimensions in cm. Show "chargeable weight" as a third number next to
  real weight.
- **Liquids.** 100 ml cabin rule, 1 L per bag in checked luggage. Could be a tag on items
  that produces a warning when both the item and the bag are cabin baggage.

## Where the numbers will come from

- **Manual entry** stays the primary path. Same as weight, same reason.
- **Open Food Facts already publishes dimensions** in its product records, so the existing
  lookup dialog can fill in `length × width × height` as well as weight. The parsing work is
  the same shape as the weight parsing already in
  `src/services/lookup/openFoodFacts.ts`.
- **Barcode scanning** would make this much better than typing: a camera-based barcode
  scan maps to an Open Food Facts record. It is a good candidate for the phase after
  dimensions, and it works with the existing product lookup.

## Design constraints to keep

- Static site. No server required for any of the above; the dimension maths is pure client
  side. Netlify Functions stay optional and are only needed if API keys must be hidden.
- Every new field optional. A saved trip from today must keep loading and must not break
  any existing calculation.
- Weight stays the primary number. Dimensions are advisory until the geometry is good
  enough to trust.
- Deterministic, inspectable results. A packing suggestion a user cannot explain to
  themselves is worse than no suggestion at all.

## Later ideas

- Export a trip as Markdown or PDF, and paste it back in.
- Multiple trips, switchable, instead of one shared board.
- Trip templates: a carry-on-only trip with a bag preset already filled in.
- Preset bag specs for common luggage, so the empty weight and interior dimensions do not
  have to be typed every time.
- Per-item "last used" tracking, so frequently packed things surface first.