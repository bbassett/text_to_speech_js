This app is 100% vibe coded, and is not production ready, I haven't even looked at this code beyond a couple files.

A Next.js web app that converts text (or URLs) to speech using Google Cloud Text-to-Speech. Audio streams back sentence by sentence, and users sign in with Clerk.

## Google Cloud Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Cloud Text-to-Speech API**
3. Create a **Service Account** (IAM & Admin > Service Accounts), grant it the `Cloud Text-to-Speech Admin` role
4. Generate a JSON key for the service account. Its whole contents go into Infisical as `GOOGLE_CREDENTIALS_JSON`

## Secrets

App secrets live in [Infisical](https://infisical.com) (Cloud US), project
`voicewhip`, in `dev` (local) and `prod` (deploys) environments:

```
GOOGLE_CREDENTIALS_JSON             # service account key JSON
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   # Clerk dashboard -> API keys
CLERK_SECRET_KEY
CERTIFICATE_PEM                     # prod only: Cloudflare Origin Certificate for voicewhip.com
PRIVATE_KEY_PEM                     # prod only
```

One-time local setup:

```bash
brew install infisical/get-cli/infisical
infisical login
infisical init        # links this repo to the project; commits .infisical.json (not secret)
```

## Getting Started

```bash
npm install
npm run dev           # runs under `infisical run --env=dev`
```

Open [http://localhost:3000](http://localhost:3000) to start TTS'ing.

## Deploying

Pushes to `main` build an image to GHCR and deploy it to the server with
[Kamal](https://kamal-deploy.org) (`.github/workflows/deploy.yml`, `config/deploy.yml`).
The site is served at https://voicewhip.com behind Cloudflare.

The workflow needs these on the GitHub repo:

- Secrets: `WG_CONFIG` (WireGuard config to reach the server), `SSH_PRIVATE_KEY`
- Variables: `INFISICAL_IDENTITY_ID`, `INFISICAL_PROJECT_SLUG`, `CLERK_PUBLISHABLE_KEY`
  (production publishable key, baked into the image at build time)
- A `production` environment
