# Deploying to Firebase Hosting

Pushing to `main` deploys the site to Firebase Hosting. The live URLs are
<https://bag-buddy-f0896.web.app/> and <https://bag-buddy-f0896.firebaseapp.com/>.

The workflow is `.github/workflows/deploy.yml`. It runs `npm ci`, the type check, lint and the
production build in `webapp/`, then deploys, so a commit that fails a check never reaches the
live site. It can also be run by hand from the Actions tab ("Run workflow").

## One-time setup

Deploying from GitHub needs a way in that does not involve a long-lived key. This project uses
**Workload Identity Federation** (WIF): GitHub hands Google a short-lived OIDC token, Google
exchanges it for credentials scoped to one service account. There is no private key in the
repository and nothing to rotate when someone leaves.

Two `gcloud` commands create everything. `gcloud` needs its own install; the commands below are
run from a shell where `gcloud auth login` has already been done as an owner of
`bag-buddy-f0896`.

Enable the required Google Cloud APIs:

```bash
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project=bag-buddy-f0896
```

Create the service account and give it only what hosting needs:

```bash
gcloud iam service-accounts create bagbuddy-deploy \
  --display-name="BagBuddy GitHub deploy" \
  --project=bag-buddy-f0896

gcloud projects add-iam-policy-binding bag-buddy-f0896 \
  --member="serviceAccount:bagbuddy-deploy@bag-buddy-f0896.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

gcloud projects add-iam-policy-binding bag-buddy-f0896 \
  --member="serviceAccount:bagbuddy-deploy@bag-buddy-f0896.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

`roles/firebasehosting.admin` allows publishing the site. `roles/serviceusage.serviceUsageConsumer`
is needed because the CLI checks that the Firebase Hosting API is enabled on the project.

Then attach the repository to that account:

```bash
PROJECT_NUMBER=$(gcloud projects describe bag-buddy-f0896 --format="value(projectNumber)")

gcloud iam workload-identity-pools create github \
  --project="$PROJECT_NUMBER" \
  --location="global" \
  --display-name="BagBuddy GitHub"

gcloud iam workload-identity-pools providers create-oidc bagbuddy \
  --project="$PROJECT_NUMBER" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="BagBuddy repo" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='rakeshmalik91/bagbuddy'"
```

The `attribute-condition` is the important line: it pins the provider to this one repository, so
another fork cannot mint a token that Google will honour.

Allow the repository to use that provider:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  bagbuddy-deploy@bag-buddy-f0896.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/rakeshmalik91/bagbuddy"
```

## The two secrets

In the repository, Settings → Secrets and variables → Actions, add:

| Secret | Value |
| --- | --- |
| `WIF_PROVIDER` | `projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/bagbuddy` |
| `WIF_SERVICE_ACCOUNT` | `bagbuddy-deploy@bag-buddy-f0896.iam.gserviceaccount.com` |

Both are identifiers, not credentials. `WIF_PROVIDER` can be read off from
`gcloud iam workload-identity-pools providers describe bagbuddy --project="$PROJECT_NUMBER"
--location="global" --workload-identity-pool="github"`.

To confirm the wiring without pushing a commit, run the workflow from the Actions tab. It should
finish on "Deploy hosting" and the site should pick up the same build.

## What is not deployed

The workflow deploys `--only hosting`, on purpose. `webapp/storage.rules` guards the cloud-sync
buckets, and a site deploy should not be able to rewrite them by accident. Deploy them
separately, by hand, when they actually change:

```bash
cd webapp
firebase deploy --only storage
```

## Deploying by hand

From `webapp/`, with `firebase login` already done on the machine:

```bash
npm run build
firebase deploy --only hosting
```

`webapp/firebase.json` holds the hosting config and `webapp/.firebaserc` names the default
project, which is why these run from `webapp/` and not the repository root. `--only hosting`
matters here for the same reason as in the workflow: without it a bare `firebase deploy` also
pushes storage rules.

## Caching, and why new deploys show up

Hashed files under `dist/assets/` are served with a one-year immutable cache, and `/` and
`/index.html` are served `no-cache`. That pairing is deliberate: without the second rule a
deploy can look unchanged for up to an hour, because the browser is holding the old
`index.html` that points at assets which no longer exist.

The `Cache-Control` on `/assets/**` is only safe because Vite puts a content hash in every
asset filename. If a file's contents change, its name changes with them, so the cached copy is
never the wrong copy.

## If the deploy fails

- **`Permission denied` or `403`** on publish: the service account is missing
  `roles/firebasehosting.admin`, or its IAM binding does not cover this repository. Re-check the
  `add-iam-policy-binding` step above.
- **`Service Usage` / API not enabled**: the account is missing
  `roles/serviceusage.serviceUsageConsumer`. The API also has to be enabled on the project,
  which it already is, since the site is live.
- **The auth step fails before any deploy**: the secrets are named differently from the table
  above, or the `attribute-condition` does not match this repository's full name,
  `rakeshmalik91/bagbuddy`. A renamed or transferred repository needs the condition updated.
- **Build or lint failures**: nothing was deployed. The workflow runs the same checks as
  `run_all_tests.bat`, and its log names the failing step.

## Rolling back

Hosting keeps previous versions. In the Firebase console under Hosting, pick an earlier version
and click "Roll back", or publish the previous commit again. To go further back than the
console lists, `firebase hosting:clone` makes a new site from a named version.
