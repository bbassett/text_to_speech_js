This app is 100% vibe coded, and is not production ready, I haven't even looked at this code beyond a couple files.

A Next.js web app that converts text (or URLs) to speech using Google Cloud Text-to-Speech. Audio streams back sentence by sentence, and users sign in with Clerk.

## Google Cloud Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Cloud Text-to-Speech API**
3. Create a **Service Account** (IAM & Admin > Service Accounts), grant it the `Cloud Text-to-Speech Admin` role
4. Generate a JSON key for the service account and save it to the project root (e.g. `google-credentials.json`)

## Configuration

Create a `.env` file with your values (`npx clerk@latest init` fills in the Clerk keys):

```
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-credentials.json
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start TTS'ing.

### Docker

```bash
docker compose up
```
