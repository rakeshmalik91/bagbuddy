<div align="center">
  <img src="public/bagbuddy-icon.svg" width="88" height="88" alt="BagBuddy logo" />
  <h1>BagBuddy</h1>
  <p><strong>Your luggage balance copilot.</strong> Drag your things into your bags and see every bag's total weight.</p>
  <p><a href="https://bag-buddy.netlify.app/">bag-buddy.netlify.app</a></p>
</div>

![BagBuddy in dark mode](docs/screenshot.png)

## What it does

- **Any number of bags**, each with an empty weight, an optional limit and its own extras.
- **Any number of items**, each with a name, a weight and optional accessories.
- **Drag and drop** between the tray and the bags, with keyboard and touch support.
- **Per-bag totals**, and a limit that warns as you approach it.
- **Bag and item extras** for the things that travel *with* them: a rain cover, a laptop
  sleeve, the charger in the box.
- **Product names** on everything, which is what weight lookup searches for.
- **kg or lb**, stored in kilograms so switching units never drifts.
- **Undo and redo**, light and dark themes, and one to three item columns per bag.
- **Optional cloud sync** to Firebase Storage, and `sync.py` to back it up locally.

Weight is the only constraint for now. Dimensions are planned: [docs/roadmap.md](docs/roadmap.md).

## Running it

```bat
run.bat              :: installs if needed, then starts the dev server
run_all_tests.bat    :: type check, lint, production build
```

## Weight lookup

Tap the magnifier on any item or bag. Three sources, no key needed for the first two:

| Source | Needs a key | Returns |
| --- | --- | --- |
| Offline typical weights | no | Built-in table of typical packed weights |
| Open Food Facts | no | Real product data, strong for groceries |
| OpenRouter | your own | A model's estimate, which is a guess |

Details and the production path: [docs/weight-lookup.md](docs/weight-lookup.md).

## Backups

```bat
python sync.py
```

Pulls the saved boards into `data/` as readable JSON, limited to the two allowlisted
accounts. See [docs/cloud-sync.md](docs/cloud-sync.md).

## Deploying

Netlify builds `npm run build` and publishes `dist`. There is one serverless function,
`netlify/functions/bagbuddy-state.ts`, which proxies Cloud Storage so the browser is not
blocked by CORS on some networks. Nothing else needs configuring.

## Notes

No analytics, no cookies. Bags live in `localStorage` first; signing in copies them to your
own folder in the bucket under `<email>/state.json`. Any API key you type stays in the
browser and is sent only to that provider.

[CC0 1.0 Universal](LICENSE).
