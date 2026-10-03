# Cloud sync with Firebase Storage

BagBuddy is local-first. Everything works with no account at all: bags, items and weights
live in `localStorage` and never leave the device. Signing in adds one thing — a copy of
your bags in Firebase Storage, so you can continue a trip on another device.

Live at <https://bag-buddy.netlify.app/>.

## How it works

- **Sign in** with the account menu in the header, top right. Credentials are handled by
  Firebase Authentication (email + password).
- **On first sign-in**, if the account already has bags in the cloud you are asked which
  copy wins. Nothing is overwritten silently.
- **After that**, changes are uploaded automatically about a second after you stop editing.
  The header shows the status: `Local only`, `Syncing…`, `Synced at 14:22`, or
  `Sync problem` with the reason.
- **Sign out** returns the app to local-only. The local copy is untouched, so signing back in
  asks the same question again.

Uploads are serialised, so a burst of edits cannot land out of order, and a failed upload is
reported instead of silently dropped.

## Layout in the bucket

Bucket: `bag-buddy-f0896.firebasestorage.app`

```
rakeshmalik91@gmail.com/state.json
```

One object per account, named after the account's email, holding the whole board:

```json
{
  "version": 1,
  "updatedAt": 1791027710078,
  "state": { "bags": [], "items": [], "unit": "kg" }
}
```

The path is built in `statePath()` in `src/services/cloud/repository.ts`, and the payload is
validated with the same `normaliseBaggageState()` used for `localStorage`, so an old or
hand-edited object cannot break the app.

**Not synced:** the OpenRouter API key. It stays in `localStorage` on the device that set it.
Pushing a credential to a shared bucket is not worth the convenience.

## One-time Firebase console setup

Email/password sign-in already works on the project, and the Storage rules from
`storage.rules` are deployed, so sync works as-is. If you ever need to redeploy them:

```bat
firebase login
firebase deploy --only storage
```

`firebase.json` and `.firebaserc` already point at project `bag-buddy-f0896`. `firebase login`
opens a browser for your Google account, so that step has to be run by you.

### Bucket CORS setup (for direct browser access from any domain)

By default, Google Cloud Storage buckets do not allow cross-origin browser requests. CORS is configured on the bucket using `cors.json`:

```bat
gsutil cors set cors.json gs://bag-buddy-f0896.firebasestorage.app
```

This allows direct browser reads (`getBytes`) and uploads (`uploadString`) from any hosting provider (Netlify, Vercel, Cloudflare, localhost) without needing any backend serverless proxy.

If the rules are ever missing, signing in still succeeds and the upload fails with
`storage/unauthorized`; the account menu says *"Firebase Storage rejected this. The bucket
security rules need to allow your signed-in account."* Nothing is lost — the local copy keeps
working and the next successful upload catches up.

## Known rough edges

- **Transient read failures.** Firebase Storage occasionally gives up with
  `storage/retry-limit-exceeded`, and its error responses omit CORS headers, so the browser
  reports a generic network failure. On a signed-in reload where the local copy is empty and
  the cloud read fails, the board comes up empty with a red dot on the account chip; pressing
  **Sync now** once the network settles restores it. A future improvement is retrying the
  initial read before giving up and saying so more loudly in the empty state.
- **One board per account.** The payload is a single `state.json`. Multiple trips would mean
  either one object per trip plus a small index, or a `trips` array inside the single object;
  the rules already allow any file name under the account folder, so no rules change would be
  needed.
- **`sync.py` covers the download path.** The `--push` restore path is implemented but has not
  been run against the live bucket, because it would overwrite real data. Use `--dry-run`
  first, then the real command.

## The rules

```rules
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{email}/{file} {
      allow read, write, delete: if request.auth != null
                                 && request.auth.token.email != null
                                 && request.auth.token.email.lower() == email.lower();
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

The signed-in account's email claim from the Firebase ID token must equal the folder name, so
one account can never read or overwrite another's bags, and nothing outside an account folder
is reachable. The rules were compiled against the Firebase Storage emulator to confirm they
parse and load; check them in the console under Storage → Rules once deployed.

## Why the Firebase web config is in the repository

`src/services/cloud/config.ts` contains the client configuration. It is not a secret: a
Firebase web config identifies the project and is designed to be shipped to browsers. All
access control comes from Authentication plus the Storage rules above. What **must** never be
committed is a user password or a service-account private key.

The Firebase SDK is loaded with a dynamic `import()` the first time someone opens the account
menu, so visitors who never sign in never download it.

## Local development against the emulators

```bat
firebase emulators:start --only storage
```

The Storage emulator loads `storage.rules` so rule changes can be checked without deploying.
The Auth emulator needs `firebase init emulators` to be wired up first, so a full local
auth + storage round trip is not yet scripted in this repo.

## If you want more than one board

The current payload is a single `state.json` per account. Multiple trips would mean either
one object per trip (`<email>/trips/<id>.json` plus a small index) or a `trips` array inside the
single object. The latter is a smaller change; the rules in `storage.rules` already allow any
file name under the account folder, so no rules change would be needed.

## Local backups

`sync.py` in the repository root pulls these objects down to `data/`. See the README section
"Backing up to a local folder".