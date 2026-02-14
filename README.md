This app is 100% vibe coded, and is not production ready, I haven't even looked at this code beyond a couple files.

A Next.js web app that converts text (or URLs) to speech using Google Cloud Text-to-Speech. Supports short and long-form audio synthesis with automatic GCS storage for longer files.

## Google Cloud Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Cloud Text-to-Speech API** and **Cloud Storage API**
3. Create a **Service Account** (IAM & Admin > Service Accounts), grant it the `Cloud Text-to-Speech Admin` and `Storage Object Admin` roles
4. Generate a JSON key for the service account and save it to the project root (e.g. `google-credentials.json`)
5. Create a **Cloud Storage bucket** for long audio output

## Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-credentials.json
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
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
