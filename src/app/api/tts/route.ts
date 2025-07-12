import { NextRequest, NextResponse } from "next/server";
import { TextToSpeechClient, TextToSpeechLongAudioSynthesizeClient } from "@google-cloud/text-to-speech";
import { Storage } from "@google-cloud/storage";

const SHORT_TEXT_LIMIT = 5000;

export async function POST(request: NextRequest) {
  try {
    const {
      text,
      voice = "en-US-Wavenet-D",
      speed = 1.0,
    } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 1000000) {
      return NextResponse.json(
        { error: "Text is too long (maximum 1,000,000 characters)" },
        { status: 400 }
      );
    }

    // Initialize the client
    const client = new TextToSpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    const languageCode = voice.split("-").slice(0, 2).join("-");

    // Determine if we need long audio synthesis
    if (text.length <= SHORT_TEXT_LIMIT) {
      // Use standard synthesis for short text
      return await handleShortAudio(client, text, voice, languageCode, speed);
    } else {
      // Use long audio synthesis for longer text
      return await handleLongAudio(client, text, voice, languageCode, speed);
    }
  } catch (error) {
    console.error("Google Cloud TTS Error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech with Google Cloud TTS" },
      { status: 500 }
    );
  }
}

async function handleShortAudio(
  client: TextToSpeechClient,
  text: string,
  voice: string,
  languageCode: string,
  speed: number
) {
  const request_payload = {
    input: { text: text },
    voice: {
      languageCode: languageCode,
      name: voice,
    },
    audioConfig: {
      audioEncoding: "MP3" as const,
      speakingRate: speed,
    },
  };

  const [response] = await client.synthesizeSpeech(request_payload);

  if (!response.audioContent) {
    throw new Error("No audio content received from Google Cloud TTS");
  }

  return new NextResponse(response.audioContent, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": response.audioContent.length.toString(),
    },
  });
}

async function handleLongAudio(
  client: TextToSpeechClient,
  text: string,
  voice: string,
  languageCode: string,
  speed: number
) {
  const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error("Google Cloud Storage bucket not configured");
  }

  // Initialize the long audio synthesis client
  const longAudioClient = new TextToSpeechLongAudioSynthesizeClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });

  // Generate unique filename - use .wav for LINEAR16 encoding
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const outputFileName = `tts-${timestamp}-${randomId}.wav`;
  const outputGcsUri = `gs://${bucketName}/${outputFileName}`;

  // Long audio synthesis request - must use LINEAR16 encoding
  const request_payload = {
    parent: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/global`,
    input: { text: text },
    voice: {
      languageCode: languageCode,
      name: voice,
    },
    audioConfig: {
      audioEncoding: "LINEAR16" as const,
      speakingRate: speed,
      sampleRateHertz: 24000, // Required for LINEAR16
    },
    outputGcsUri: outputGcsUri,
  };

  // Start long audio synthesis
  const [operation] = await longAudioClient.synthesizeLongAudio(request_payload);
  
  if (!operation.name) {
    throw new Error("Failed to start long audio synthesis operation");
  }

  // Return operation name for polling
  return NextResponse.json({
    operationName: operation.name,
    outputFileName: outputFileName,
    isLongAudio: true,
  });
}
