import { NextRequest, NextResponse } from "next/server";
import { TextToSpeechLongAudioSynthesizeClient } from "@google-cloud/text-to-speech";

export async function POST(request: NextRequest) {
  try {
    const { operationName } = await request.json();

    if (!operationName || typeof operationName !== "string") {
      return NextResponse.json(
        { error: "Operation name is required" },
        { status: 400 }
      );
    }

    // Initialize the long audio synthesis client
    const client = new TextToSpeechLongAudioSynthesizeClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    // Check operation status
    const operation = await client.checkSynthesizeLongAudioProgress(operationName);

    if (operation.error) {
      return NextResponse.json({
        status: "error",
        error: operation.error.message || "Unknown error occurred",
      });
    }

    if (operation.done) {
      return NextResponse.json({
        status: "completed",
        result: operation.response,
      });
    } else {
      // Calculate progress if available
      const progress = operation.metadata?.progressPercentage || 0;
      return NextResponse.json({
        status: "processing",
        progress: progress,
      });
    }
  } catch (error) {
    console.error("TTS Status Check Error:", error);
    return NextResponse.json(
      { error: "Failed to check operation status" },
      { status: 500 }
    );
  }
}